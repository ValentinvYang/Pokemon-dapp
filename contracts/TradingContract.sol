// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TradingContract is ReentrancyGuard {
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
  IERC721 public pokemonContract;

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

  constructor(address _pokemonContract) {
    pokemonContract = IERC721(_pokemonContract); // Address of the deployed Pokémon NFT contract
  }

  //Modifier to check if sender is owner of the Pokemon
  modifier onlyPokemonOwner(uint256 pokemonId) {
    require(
      pokemonContract.ownerOf(pokemonId) == msg.sender,
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
  ) external onlyPokemonOwner(pokemonId) {
    require(price > 0, "Price must be larger than zero");

    if (isAuction) {
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
  }

  //Function to place a bid on a Pokemon listed for auction
  function placeBid(
    uint256 pokemonId
  ) external payable auctionOngoing(pokemonId) {
    Listing storage listing = listings[pokemonId];
    require(
      msg.value > listing.highestBid,
      "Bid must be higher than the current highest bid"
    );

    //Refund the previous highest bidder
    if (listing.highestBidder != address(0)) {
      payable(listing.highestBidder).transfer(listing.highestBid);
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

    //Check if there was a bid placed
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

    //Remove listing after auction ends
    delete listings[pokemonId];
  }

  function removeListing(
    uint256 pokemonId
  ) external onlyPokemonOwner(pokemonId) nonReentrant {
    Listing storage listing = listings[pokemonId];
    require(listing.seller != address(0), "Listing does not exist");

    //If it's an auction, refund the previous highest bidder
    if (listing.isAuction && listing.highestBidder != address(0)) {
      payable(listing.highestBidder).transfer(listing.highestBid);
    }

    //Return Pokemon to the seller
    pokemonContract.transferFrom(address(this), listing.seller, pokemonId);

    emit ListingRemoved(pokemonId);

    delete listings[pokemonId];
  }
}
