// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract TradingContract is
  ReentrancyGuard,
  IERC721Receiver,
  Ownable,
  Pausable
{
  struct Listing {
    address seller;
    uint256 pokemonId;
    uint256 price;
    bool isAuction;
    uint256 auctionEndTime;
    uint256 finalizeDelay;
  }

  struct Commitment {
    bytes32 commitHash;
    uint256 deposit;
    bool revealed;
    uint256 revealedAmount;
    uint256 commitTime; //for tie-breaker
  }

  mapping(uint256 => Listing) public listings;
  uint256[] public activeListingIds;

  mapping(uint256 => mapping(address => Commitment)) public commitments;
  mapping(uint256 => address[]) public committedBidders;

  //Pull payment pattern for auction bids to prevent Reentrancy and Dos attacks
  mapping(address => uint256) public pendingRefunds;
  mapping(uint256 => uint256) public auctionRewards;
  IERC721 public pokemonContract;
  uint256 public constant FINALIZER_FEE = 0.0015 ether; //Approx. $3 USD assuming 1 ETH = $2000

  event Listed(uint256 indexed pokemonId, uint256 price, bool isAuction);
  event BidCommitted(uint256 indexed pokemonId, address indexed bidder);
  event BidRevealed(
    uint256 indexed pokemonId,
    address indexed bidder,
    uint256 amount
  );
  event PokemonSold(
    uint256 indexed pokemonId,
    uint256 price,
    address indexed buyer
  );
  event Withdrawn(address indexed user, uint256 amount);
  event ListingRemoved(uint256 indexed pokemonId);
  event TokenReceived(address operator, address from, uint256 tokenId);
  event RewardPaid(address finalizer, uint256 rewardAmount);

  constructor(address _pokemonContract) Ownable(msg.sender) {
    pokemonContract = IERC721(_pokemonContract); // Address of the deployed Pokémon NFT contract
  }

  //Allow the contract to receive a Pokemon
  function onERC721Received(
    address operator,
    address from,
    uint256 tokenId,
    bytes calldata data
  ) external override returns (bytes4) {
    //Ensure only PokemonContract can send tokens:
    require(
      msg.sender == address(pokemonContract),
      "Only PokemonContract tokens accepted"
    );
    emit TokenReceived(operator, from, tokenId);

    return IERC721Receiver.onERC721Received.selector;
  }

  //Modifier to check if sender is owner of the Pokemon
  modifier onlyPokemonOwner(uint256 pokemonId) {
    require(
      pokemonContract.ownerOf(pokemonId) == msg.sender,
      "You must own the Pokemon to list it"
    );
    _; //Indicate beginning of function
  }

  //Modifier to check if sender is owner of the listing
  modifier onlyListingSeller(uint256 pokemonId) {
    require(
      listings[pokemonId].seller == msg.sender,
      "You must own the Pokemon to list it"
    );
    _; //Indicate beginning of function
  }

  //Modifier to check if auction is still ongoing
  modifier auctionOngoing(uint256 pokemonId) {
    require(listings[pokemonId].isAuction, "Not an auction");

    require(
      block.timestamp < listings[pokemonId].auctionEndTime,
      "Auction ended"
    );
    _;
  }

  //List a Pokemon
  function listPokemon(
    uint256 pokemonId,
    uint256 price,
    bool isAuction,
    uint256 auctionDuration,
    uint256 _finalizeDelay
  ) external payable onlyPokemonOwner(pokemonId) whenNotPaused {
    require(price > 0, "Price must be larger than zero");

    if (isAuction) {
      require(msg.value >= FINALIZER_FEE, "Must send ETH for finalizer reward");

      require(
        auctionDuration > 0,
        "Auction duration must be greater than zero"
      );

      require(
        _finalizeDelay >= 120,
        "Finalize delay must be at least 120 seconds"
      );
    }

    listings[pokemonId] = Listing({
      seller: msg.sender,
      pokemonId: pokemonId,
      price: price,
      isAuction: isAuction,
      auctionEndTime: isAuction ? block.timestamp + auctionDuration : 0,
      finalizeDelay: isAuction ? _finalizeDelay : 0
    });

    activeListingIds.push(pokemonId);

    if (isAuction) {
      auctionRewards[pokemonId] = msg.value;
    }

    //Transfer Pokemon to the Contract -> Cannot be listed twice.
    pokemonContract.safeTransferFrom(msg.sender, address(this), pokemonId);

    emit Listed(pokemonId, price, isAuction);
  }

  //Function to buy Pokemon for a fixed price
  function buyPokemon(
    uint256 pokemonId
  ) external payable nonReentrant whenNotPaused {
    Listing storage listing = listings[pokemonId];
    require(
      !listing.isAuction,
      "Pokemon is listed for an auction, not for a fixed price"
    );
    require(msg.value >= listing.price, "Insufficient funds to purchase");
    require(listing.seller != address(0), "Listing does not exist");
    require(listing.seller != msg.sender, "Cannot buy your own listing");

    //Transfer Pokemon to buyer and funds to seller:
    pokemonContract.safeTransferFrom(address(this), msg.sender, pokemonId);
    payable(listing.seller).transfer(msg.value);

    //Emit event that Pokemon is sold
    emit PokemonSold(pokemonId, listing.price, msg.sender);

    //Remove listing
    delete listings[pokemonId];
    _removeListingById(pokemonId);
    emit ListingRemoved(pokemonId);
  }

  //Commit a bid on an auction
  function commitBid(
    uint256 pokemonId,
    bytes32 commitHash
  ) external payable auctionOngoing(pokemonId) whenNotPaused {
    Listing storage listing = listings[pokemonId];
    require(listing.isAuction, "Not an auction");

    Commitment storage existing = commitments[pokemonId][msg.sender];
    require(existing.commitHash == bytes32(0), "Already committed");

    require(msg.value >= listing.price, "Bid must be at least minimum price");

    require(
      msg.sender != listing.seller,
      "Seller cannot bid on their own listing"
    );

    commitments[pokemonId][msg.sender] = Commitment({
      commitHash: commitHash,
      deposit: msg.value,
      revealed: false,
      revealedAmount: 0,
      commitTime: block.timestamp
    });

    committedBidders[pokemonId].push(msg.sender);

    emit BidCommitted(pokemonId, msg.sender);
  }

  //When auction has ended, users should reveal their bid
  function revealBid(
    uint256 pokemonId,
    uint256 amount,
    string memory salt
  ) external {
    Listing storage listing = listings[pokemonId];
    require(listing.isAuction, "Not an auction");
    require(block.timestamp >= listing.auctionEndTime, "Auction not ended");

    Commitment storage c = commitments[pokemonId][msg.sender];
    require(c.commitHash != bytes32(0), "No commitment found");
    require(!c.revealed, "Already revealed");
    require(
      keccak256(abi.encodePacked(amount, salt)) == c.commitHash,
      "Invalid reveal"
    );

    c.revealed = true;
    c.revealedAmount = amount;

    emit BidRevealed(pokemonId, msg.sender, amount);
  }

  //Finalize auction and transfer Pokemon to highest bidder
  function finalizeAuction(
    uint256 pokemonId
  ) external nonReentrant whenNotPaused {
    Listing storage listing = listings[pokemonId];
    require(listing.isAuction, "Not an auction");
    require(
      block.timestamp >= listing.auctionEndTime + listing.finalizeDelay,
      "Cannot finalize yet - waiting for reveal window"
    );

    address winner;
    address previousWinner;
    uint256 highest = 0;
    uint256 earliestCommit = type(uint256).max;
    uint256 rewardAmount = auctionRewards[pokemonId];

    for (uint i = 0; i < committedBidders[pokemonId].length; i++) {
      address bidder = committedBidders[pokemonId][i];
      Commitment storage c = commitments[pokemonId][bidder];

      if (!c.revealed) {
        //If not revealed, refund the bidder
        pendingRefunds[bidder] += c.deposit;
        continue;
      }

      if (c.revealedAmount > highest && c.revealedAmount <= c.deposit) {
        // Refund old highest bidder before replacing
        if (previousWinner != address(0)) {
          pendingRefunds[previousWinner] += commitments[pokemonId][
            previousWinner
          ].deposit;
        }

        highest = c.revealedAmount;
        winner = bidder;
        earliestCommit = c.commitTime;
        previousWinner = bidder;
      } else if (
        c.revealedAmount == highest &&
        c.revealedAmount <= c.deposit &&
        c.commitTime < earliestCommit
      ) {
        // Same amount, but earlier commit wins
        if (previousWinner != address(0) && previousWinner != bidder) {
          pendingRefunds[previousWinner] += commitments[pokemonId][
            previousWinner
          ].deposit;
        }

        winner = bidder;
        earliestCommit = c.commitTime;
        previousWinner = bidder;
      } else {
        // Not winning -> Refund
        pendingRefunds[bidder] += c.deposit;
      }
    }

    //First Cleanup:
    for (uint i = 0; i < committedBidders[pokemonId].length; i++) {
      address bidder = committedBidders[pokemonId][i];
      delete commitments[pokemonId][bidder];
    }

    //Check if no valid bids were placed
    if (winner == address(0)) {
      pokemonContract.safeTransferFrom(
        address(this),
        listing.seller,
        pokemonId
      );
      emit PokemonSold(pokemonId, 0, listing.seller); //Emit with price 0, since no bids
    } else {
      //Transfer Pokemon to highest bidder
      pokemonContract.safeTransferFrom(address(this), winner, pokemonId);
      payable(listing.seller).transfer(highest);
      emit PokemonSold(pokemonId, highest, winner);
    }

    //Send reward to the finalizer
    if (rewardAmount > 0) {
      pendingRefunds[msg.sender] += rewardAmount;
      emit RewardPaid(msg.sender, rewardAmount);
    }

    //Clean up listing after auction is finished
    delete listings[pokemonId];
    _removeListingById(pokemonId);
    delete auctionRewards[pokemonId];
    delete committedBidders[pokemonId];

    emit ListingRemoved(pokemonId);
  }

  function removeListing(
    uint256 pokemonId
  ) external onlyListingSeller(pokemonId) nonReentrant whenNotPaused {
    Listing storage listing = listings[pokemonId];
    require(listing.seller != address(0), "Listing does not exist");

    //If it's an auction, ensure it hasn't ended yet
    if (listing.isAuction) {
      require(
        block.timestamp < listing.auctionEndTime,
        "Cannot remove listing after auction ended"
      );

      //Refund all bidders
      for (uint256 i = 0; i < committedBidders[pokemonId].length; i++) {
        address bidder = committedBidders[pokemonId][i];
        Commitment storage c = commitments[pokemonId][bidder];
        if (c.commitHash != bytes32(0)) {
          pendingRefunds[bidder] += c.deposit;
          delete commitments[pokemonId][bidder];
        }
      }
      delete committedBidders[pokemonId];
    }

    //Return Pokemon to the seller
    pokemonContract.safeTransferFrom(address(this), listing.seller, pokemonId);

    emit ListingRemoved(pokemonId);

    delete listings[pokemonId];
    _removeListingById(pokemonId);
  }

  function withdrawRefund() external nonReentrant whenNotPaused {
    uint256 amount = pendingRefunds[msg.sender];
    require(amount > 0, "No refund available");

    pendingRefunds[msg.sender] = 0; //Prevent reentrancy
    payable(msg.sender).transfer(amount);

    emit Withdrawn(msg.sender, amount);
  }

  function _removeListingById(uint256 pokemonId) internal {
    uint256 l = activeListingIds.length;
    for (uint256 i = 0; i < l; i++) {
      if (activeListingIds[i] == pokemonId) {
        activeListingIds[i] = activeListingIds[l - 1];
        activeListingIds.pop();
        break;
      }
    }
  }

  function getListing(uint256 pokemonId) public view returns (Listing memory) {
    return listings[pokemonId];
  }

  function getAllListingsWithDetails()
    external
    view
    returns (Listing[] memory)
  {
    uint256 l = activeListingIds.length;
    Listing[] memory result = new Listing[](l);
    for (uint256 i = 0; i < l; i++) {
      result[i] = listings[activeListingIds[i]];
    }
    return result;
  }

  function getUserListings(
    address user
  ) external view returns (Listing[] memory) {
    uint256 count = 0;
    for (uint256 i = 0; i < activeListingIds.length; i++) {
      if (listings[activeListingIds[i]].seller == user) {
        count++;
      }
    }

    Listing[] memory userListings = new Listing[](count);
    uint256 index = 0;
    for (uint256 i = 0; i < activeListingIds.length; i++) {
      if (listings[activeListingIds[i]].seller == user) {
        userListings[index] = listings[activeListingIds[i]];
        index++;
      }
    }

    return userListings;
  }

  function getCommitment(
    uint256 pokemonId,
    address bidder
  )
    external
    view
    returns (bytes32 commitHash, bool revealed, uint256 revealedAmount)
  {
    Commitment storage c = commitments[pokemonId][bidder];
    return (c.commitHash, c.revealed, c.revealedAmount);
  }

  function getRevealed(
    uint256 pokemonId,
    address bidder
  ) external view returns (bool revealed) {
    Commitment storage c = commitments[pokemonId][bidder];
    return c.revealed;
  }

  function hasCommitted(
    uint256 pokemonId,
    address bidder
  ) external view returns (bool) {
    Commitment storage c = commitments[pokemonId][bidder];
    return c.commitHash != bytes32(0);
  }

  function isListed(uint256 pokemonId) public view returns (bool) {
    return listings[pokemonId].seller != address(0);
  }

  function getSellerOf(uint256 tokenId) external view returns (address) {
    return listings[tokenId].seller;
  }

  //Emergency Stop Functionality
  function pause() external onlyOwner {
    _pause();
  }

  function unpause() external onlyOwner {
    _unpause();
  }
}
