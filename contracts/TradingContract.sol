// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TradingContract is ReentrancyGuard, IERC721Receiver {
  struct Listing {
    address seller;
    uint256 pokemonId;
    uint256 price;
    bool isAuction;
    uint256 auctionEndTime;
    address highestBidder;
    uint256 highestBid;
  }

  mapping(uint256 => Listing) public listings;

  //Pull payment pattern for auction bids to prevent Reentrancy and Dos attacks
  mapping(address => uint256) public pendingRefunds;
  mapping(uint256 => uint256) public auctionRewards;
  IERC721 public pokemonContract;
  uint256 public constant FINALIZER_FEE = 0.0001 ether;

  event Listed(uint256 indexed pokemonId, uint256 price, bool isAuction);
  event BidPlaced(
    uint256 indexed pokemonId,
    uint256 bidAmount,
    address indexed bidder
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

  constructor(address _pokemonContract) {
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
    uint256 auctionDuration
  ) external payable onlyPokemonOwner(pokemonId) {
    require(price > 0, "Price must be larger than zero");

    if (isAuction) {
      require(msg.value >= FINALIZER_FEE, "Must send ETH for finalizer reward");

      require(
        auctionDuration > 0,
        "Auction duration must be greater than zero"
      );
    }

    listings[pokemonId] = Listing({
      seller: msg.sender,
      pokemonId: pokemonId,
      price: price,
      isAuction: isAuction,
      auctionEndTime: isAuction ? block.timestamp + auctionDuration : 0,
      highestBidder: address(0),
      highestBid: 0
    });

    if (isAuction) {
      auctionRewards[pokemonId] = msg.value;
    }

    //Transfer Pokemon to the Contract -> Cannot be listed twice.
    pokemonContract.safeTransferFrom(msg.sender, address(this), pokemonId);

    emit Listed(pokemonId, price, isAuction);
  }

  //Function to buy Pokemon for a fixed price
  function buyPokemon(uint256 pokemonId) external payable nonReentrant {
    Listing storage listing = listings[pokemonId];
    require(
      !listing.isAuction,
      "Pokemon is listed for an auction, not for a fixed price"
    );
    require(msg.value >= listing.price, "Insufficient funds to purchase");
    require(listing.seller != address(0), "Listing does not exist");

    //Transfer Pokemon to buyer and funds to seller:
    pokemonContract.safeTransferFrom(address(this), msg.sender, pokemonId);
    payable(listing.seller).transfer(msg.value);

    //Emit event that Pokemon is sold
    emit PokemonSold(pokemonId, listing.price, msg.sender);

    //Remove listing
    delete listings[pokemonId];
    emit ListingRemoved(pokemonId);
  }

  //Function to place a bid on a Pokemon listed for auction
  function placeBid(
    uint256 pokemonId
  ) external payable auctionOngoing(pokemonId) {
    Listing storage listing = listings[pokemonId];

    uint256 minimumBid = listing.highestBid + 0.0001 ether;
    require(
      msg.value >= minimumBid,
      "Bid must be at least 0.0001 ETH higher than previous bid"
    );

    //Refund the previous highest bidder
    if (listing.highestBidder != address(0)) {
      pendingRefunds[listing.highestBidder] += listing.highestBid;
    }

    //Update the highest bidder and bid amount
    listing.highestBid = msg.value;
    listing.highestBidder = msg.sender;

    emit BidPlaced(pokemonId, msg.value, msg.sender);
  }

  //Finalize auction and transfer Pokemon to highest bidder
  function finalizeAuction(uint256 pokemonId) external nonReentrant {
    Listing storage listing = listings[pokemonId];
    require(listing.isAuction, "Not an auction");
    require(block.timestamp >= listing.auctionEndTime, "Auction not ended");

    uint256 rewardAmount = auctionRewards[pokemonId];

    //Check if no bids were placed
    if (listing.highestBidder == address(0)) {
      pokemonContract.safeTransferFrom(
        address(this),
        listing.seller,
        pokemonId
      );
      emit PokemonSold(pokemonId, 0, listing.seller); //Emit with price 0, since no bids
    } else {
      //Transfer Pokemon to highest bidder
      pokemonContract.safeTransferFrom(
        address(this),
        listing.highestBidder,
        pokemonId
      );
      payable(listing.seller).transfer(listing.highestBid);
      emit PokemonSold(pokemonId, listing.highestBid, listing.highestBidder);
    }

    //Send reward to the finalizer
    if (rewardAmount > 0) {
      payable(msg.sender).transfer(rewardAmount);
      emit RewardPaid(msg.sender, rewardAmount);
    }

    //Clean up listing after auction is finished
    delete listings[pokemonId];
    delete auctionRewards[pokemonId];

    emit ListingRemoved(pokemonId);
  }

  function removeListing(
    uint256 pokemonId
  ) external onlyListingSeller(pokemonId) nonReentrant {
    Listing storage listing = listings[pokemonId];
    require(listing.seller != address(0), "Listing does not exist");

    //If it's an auction, refund the previous highest bidder
    if (listing.isAuction && listing.highestBidder != address(0)) {
      payable(listing.highestBidder).transfer(listing.highestBid);
    }

    //Return Pokemon to the seller
    pokemonContract.safeTransferFrom(address(this), listing.seller, pokemonId);

    emit ListingRemoved(pokemonId);

    delete listings[pokemonId];
  }

  function withdrawRefund() external nonReentrant {
    uint256 amount = pendingRefunds[msg.sender];
    require(amount > 0, "No refund available");

    pendingRefunds[msg.sender] = 0; //Prevent reentrancy
    payable(msg.sender).transfer(amount);

    emit Withdrawn(msg.sender, amount);
  }
}
