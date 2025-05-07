// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// OpenZeppelin modules for security, access control, and token interaction
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title TradingContract
 * @dev This contract manages fixed-price and auction-based trading of Pokemon NFTs.
 * Supports commit-reveal style bidding, secure withdrawals via pull-payment pattern,
 * and includes on-chain listing rules to ensure fairness and decentralization.
 */

contract TradingContract is
  ReentrancyGuard,
  IERC721Receiver,
  Ownable,
  Pausable
{

  // --- Data Structures ---

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

  // --- Constants (On-chain Limits) ---

  uint256 public constant MAX_PRICE = 100 ether;
  uint256 public constant MIN_PRICE = 0.001 ether;

  uint256 public constant MAX_AUCTION_DURATION = 7 days;
  uint256 public constant MIN_AUCTION_DURATION = 100;

  uint256 public constant MAX_BID = 200 ether; 

  uint256 public constant MAX_FINALIZE_DELAY = 1 days;
  uint256 public constant MIN_FINALIZE_DELAY = 120;

  uint256 public constant FINALIZER_FEE = 0.0015 ether; //Approx. $3 USD assuming 1 ETH = $2000

  // --- State Variables ---

  IERC721 public pokemonContract; // ERC721 Pokemon token contract

  uint256[] public activeListingIds; // track all active listings

  mapping(uint256 => Listing) public listings; // pokemonId => listing

  mapping(uint256 => mapping(address => Commitment)) public commitments; // pokemonId => bidder => commitment
  mapping(uint256 => address[]) public committedBidders; // pokemonId => list of bidders 

  mapping(address => uint256) public pendingRefunds; // Pull-based refunds
  mapping(uint256 => uint256) public auctionRewards; // For finalizer fees

  // --- Events ---

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

  /// @notice Initializes the trading contract with the address of the deployed Pokemon NFT contract
  /// @param _pokemonContract The address of the ERC721-compliant Pokemon contract
  constructor(address _pokemonContract) Ownable(msg.sender) {
    pokemonContract = IERC721(_pokemonContract); // Address of the deployed Pokemon NFT contract
  }

  /// @notice Required implementation to receive ERC721 tokens via safeTransferFrom
  /// @dev Only accepts Pokemon from the Pokemon contract
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

  // --- Modifiers ---

  /// @notice Ensures the caller is the current owner of the Pokemon
  modifier onlyPokemonOwner(uint256 pokemonId) {
    require(
      pokemonContract.ownerOf(pokemonId) == msg.sender,
      "You must own the Pokemon to list it"
    );
    _; 
  }

  /// @notice Ensures the caller is the seller who listed the given Pokemon
  modifier onlyListingSeller(uint256 pokemonId) {
    require(
      listings[pokemonId].seller == msg.sender,
      "You must own the Pokemon to list it"
    );
    _; 
  }

  /// @notice Ensures the auction is active and has not ended
  modifier auctionOngoing(uint256 pokemonId) {
    require(listings[pokemonId].seller != address(0), "Listing does not exist");
    require(listings[pokemonId].isAuction, "Not an auction");

    require(
      block.timestamp < listings[pokemonId].auctionEndTime,
      "Auction ended"
    );
    _;
  }

  // --- Listing Functionality ---

  /// @notice List a Pokemon either at a fixed price or for auction
  /// @param pokemonId ID of the Pokemon being listed
  /// @param price Price in wei (for fixed price or min bid for auctions)
  /// @param isAuction True if this is an auction listing
  /// @param auctionDuration Duration in seconds the auction should run (if auction)
  /// @param _finalizeDelay Duration in seconds a bidder can reveal after the auction (if auction)
  function listPokemon(
    uint256 pokemonId,
    uint256 price,
    bool isAuction,
    uint256 auctionDuration,
    uint256 _finalizeDelay
  ) external payable onlyPokemonOwner(pokemonId) whenNotPaused {
    // Enforce global min/max price bounds
    require(price >= MIN_PRICE && price <= MAX_PRICE, "Invalid price");

    if (isAuction) {
      require(msg.value >= FINALIZER_FEE, "Must send ETH for finalizer reward");
      require(auctionDuration >= MIN_AUCTION_DURATION && auctionDuration <= MAX_AUCTION_DURATION, "Invalid duration");
      require(_finalizeDelay >= MIN_FINALIZE_DELAY && _finalizeDelay <= MAX_FINALIZE_DELAY, "Invalid finalize delay");
    }

    // Create Listing entry
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
      // Store finalizer fee for later reward payout
      auctionRewards[pokemonId] = msg.value;
    }

    // Transfer Pokemon to the Contract -> Cannot be listed twice.
    pokemonContract.safeTransferFrom(msg.sender, address(this), pokemonId);

    emit Listed(pokemonId, price, isAuction);
  }

  /// @notice Buy a listed Pokemon at a fixed price
  /// @dev Transfers the token and funds in a single transaction
  /// @param pokemonId The ID of the listed Pokemon
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

    emit PokemonSold(pokemonId, listing.price, msg.sender);

    //Clean up listing
    delete listings[pokemonId];
    _removeListingById(pokemonId);
    emit ListingRemoved(pokemonId);
  }

  /// @notice Commit a sealed bid on an auction
  /// @dev Follows the commit-reveal pattern. Caller sends ETH with a hash of (bidAmount, salt)
  /// @param pokemonId The ID of the auction listing
  /// @param commitHash The keccak256 hash of (bidAmount, salt)
  function commitBid(
    uint256 pokemonId,
    bytes32 commitHash
  ) external payable auctionOngoing(pokemonId) whenNotPaused {
    Listing storage listing = listings[pokemonId];

    Commitment storage existing = commitments[pokemonId][msg.sender];
    require(existing.commitHash == bytes32(0), "Already committed");

    require(msg.value >= listing.price, "Bid must be at least minimum price");
    require(msg.value <= MAX_BID, "Bid exceeds maximum allowed");
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

  /// @notice Reveal a previously committed bid after the auction ends
  /// @param pokemonId The ID of the auction listing
  /// @param amount The original bid amount (must match committed value)
  /// @param salt The secret salt used during commitment
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

    // Validate commitment
    require(
      keccak256(abi.encodePacked(amount, salt)) == c.commitHash,
      "Invalid reveal"
    );

    c.revealed = true;
    c.revealedAmount = amount;

    emit BidRevealed(pokemonId, msg.sender, amount);
  }

  /// @notice Finalize the auction and transfer the NFT to the winner
  /// @dev Can be called by anyone after the reveal window ends; uses a tiebreaker on commitTime
  /// @param pokemonId The ID of the auction listing
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

    // Determine highest valid bid
    for (uint i = 0; i < committedBidders[pokemonId].length; i++) {
      address bidder = committedBidders[pokemonId][i];
      Commitment storage c = commitments[pokemonId][bidder];

      if (!c.revealed) {
        //If not revealed, refund the bidder
        pendingRefunds[bidder] += c.deposit;
        continue;
      }

      if (c.revealedAmount > highest && c.revealedAmount <= c.deposit) {
        // New highest bid: refund previous winner
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
        // Tie on bid amount: earlier commit wins
        if (previousWinner != address(0) && previousWinner != bidder) {
          pendingRefunds[previousWinner] += commitments[pokemonId][
            previousWinner
          ].deposit;
        }

        winner = bidder;
        earliestCommit = c.commitTime;
        previousWinner = bidder;

      } else {
        // Lower or invalid bid: refund
        pendingRefunds[bidder] += c.deposit;
      }
    }

    // Clean up commitments:
    for (uint i = 0; i < committedBidders[pokemonId].length; i++) {
      address bidder = committedBidders[pokemonId][i];
      delete commitments[pokemonId][bidder];
    }

    if (winner == address(0)) {
      // No valid bids: return Pokemon to seller
      pokemonContract.safeTransferFrom(
        address(this),
        listing.seller,
        pokemonId
      );
      emit PokemonSold(pokemonId, 0, listing.seller); //Emit with price 0, since no bids
    } else {
      // Winner found: transfer NFT and send funds to seller
      pokemonContract.safeTransferFrom(address(this), winner, pokemonId);
      payable(listing.seller).transfer(highest);
      emit PokemonSold(pokemonId, highest, winner);
    }

    // Send reward to the finalizer
    if (rewardAmount > 0) {
      pendingRefunds[msg.sender] += rewardAmount;
      emit RewardPaid(msg.sender, rewardAmount);
    }

    // Final cleanup
    delete listings[pokemonId];
    _removeListingById(pokemonId);
    delete auctionRewards[pokemonId];
    delete committedBidders[pokemonId];

    emit ListingRemoved(pokemonId);
  }

  /// @notice Allows the seller to remove their active listing
  /// @dev Auctions can only be removed if no bids have been committed yet
  /// @param pokemonId The ID of the Pokemon being delisted
  function removeListing(
    uint256 pokemonId
  ) external onlyListingSeller(pokemonId) nonReentrant whenNotPaused {
    Listing storage listing = listings[pokemonId];
    require(listing.seller != address(0), "Listing does not exist");

    if (listing.isAuction) {
      // Ensure auction is still active and no one has committed a bid
      require(
        block.timestamp < listing.auctionEndTime,
        "Cannot remove listing after auction ended"
      );
      require(
        committedBidders[pokemonId].length == 0,
        "Cannot remove listing after a bid has been placed"
      );
    }

    //Return Pokemon to the seller
    pokemonContract.safeTransferFrom(address(this), listing.seller, pokemonId);

    emit ListingRemoved(pokemonId);

    delete listings[pokemonId];
    _removeListingById(pokemonId);
  }

  /// @notice Withdraw ETH from refunds (due to lost bids or finalizer rewards)
  function withdrawRefund() external nonReentrant whenNotPaused {
    uint256 amount = pendingRefunds[msg.sender];
    require(amount > 0, "No refund available");

    pendingRefunds[msg.sender] = 0; //Prevent reentrancy
    payable(msg.sender).transfer(amount);

    emit Withdrawn(msg.sender, amount);
  }

  /// @dev Internal function to remove a listing ID from activeListingIds[]
  /// @param pokemonId The ID to remove
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

  // --- View Functions ---

  /// @notice Get full details of a listing
  /// @param pokemonId The ID of the Pokemon
  /// @return Listing struct
  function getListing(uint256 pokemonId) public view returns (Listing memory) {
    return listings[pokemonId];
  }

  /// @notice Fetch all current active listings
  /// @return Array of Listing structs
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

  /// @notice Get all listings created by a specific user
  /// @param user Address of the listing creator
  /// @return Array of Listing structs
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

  /// @notice Get commitment hash and reveal status of a bidder
  /// @param pokemonId The listing ID
  /// @param bidder Address of the bidder
  /// @return commitHash The hash committed
  /// @return revealed Whether the bid has been revealed
  /// @return revealedAmount The amount revealed
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

  /// @notice Check whether a bid has been revealed
  /// @param pokemonId The listing ID
  /// @param bidder Address of the bidder
  /// @return revealed Whether the bid is revealed
  function getRevealed(
    uint256 pokemonId,
    address bidder
  ) external view returns (bool revealed) {
    Commitment storage c = commitments[pokemonId][bidder];
    return c.revealed;
  }

  /// @notice Check whether a user has committed a bid on a listing
  /// @param pokemonId The listing ID
  /// @param bidder Address of the bidder
  /// @return True if committed, false otherwise
  function hasCommitted(
    uint256 pokemonId,
    address bidder
  ) external view returns (bool) {
    Commitment storage c = commitments[pokemonId][bidder];
    return c.commitHash != bytes32(0);
  }

  /// @notice Returns the number of bidders for a given auction
  /// @param pokemonId The ID of the listed Pokemon
  function getBidderCount(uint256 pokemonId) external view returns (uint256) {
      return committedBidders[pokemonId].length;
  }

  /// @notice Returns true if a Pokemon is actively listed
  /// @param pokemonId ID of the Pokemon
  function isListed(uint256 pokemonId) public view returns (bool) {
    return listings[pokemonId].seller != address(0);
  }

  /// @notice Returns the seller of a listed Pokemon
  /// @param tokenId The token ID
  /// @return The seller's address
  function getSellerOf(uint256 tokenId) external view returns (address) {
    return listings[tokenId].seller;
  }

  // --- Emergency Controls ---

  /// @notice Pause all trading actions (onlyOwner)
  function pause() external onlyOwner {
    _pause();
  }

  /// @notice Unpause trading (onlyOwner)
  function unpause() external onlyOwner {
    _unpause();
  }
}
