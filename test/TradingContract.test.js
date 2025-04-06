const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = hre;

describe("TradingContract", function () {
  let pokemonContract;
  let tradingContract;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    pokemonContract = await ethers.deployContract("PokemonContract", [
      "PokemonContract",
      "PKM",
    ]);
    await pokemonContract.waitForDeployment();

    tradingContract = await ethers.deployContract("TradingContract", [
      pokemonContract.target,
    ]);
    await tradingContract.waitForDeployment();

    for (let i = 0; i < 3; i++) {
      await pokemonContract
        .connect(owner)
        .mintPokemon(
          `Pokemon ${i + 1}`,
          `Type ${i + 1}`,
          ethers.parseEther("1")
        );
      //Set approval for tradingContract
      await pokemonContract.connect(owner).approve(tradingContract.target, i);

      await tradingContract
        .connect(owner)
        .listPokemon(i, ethers.parseEther("1"), false, 0);
    }
  });

  describe("Listing a Pokémon", function () {
    it("Should allow owner to list a Pokémon for sale", async function () {
      const pokemonId = 0;
      const listing = await tradingContract.listings(pokemonId);
      expect(listing.price).to.equal(ethers.parseEther("1"));
      expect(listing.seller).to.equal(owner.address);
      expect(listing.isAuction).to.equal(false);
    });

    it("Should fail to list a Pokémon if not owned by sender", async function () {
      const pokemonId = 0;
      await expect(
        tradingContract
          .connect(addr1)
          .listPokemon(pokemonId, ethers.parseEther("1"), false, 0)
      ).to.be.reverted;
    });
  });

  describe("Buying a Pokémon", function () {
    it("Should allow buyer to buy a Pokémon at the listed price", async function () {
      const pokemonId = 0;
      const initialBalance = await ethers.provider.getBalance(owner.address);

      await expect(
        tradingContract
          .connect(addr1)
          .buyPokemon(pokemonId, { value: ethers.parseEther("1") })
      )
        .to.emit(tradingContract, "PokemonSold")
        .withArgs(pokemonId, ethers.parseEther("1"), addr1.address);

      const listing = await tradingContract.listings(pokemonId);
      expect(listing.seller).to.equal(ethers.ZeroAddress);
      expect(await pokemonContract.ownerOf(pokemonId)).to.equal(addr1.address);

      const finalBalance = await ethers.provider.getBalance(owner.address);
      expect(finalBalance - initialBalance).to.be.closeTo(
        ethers.parseEther("1"),
        ethers.parseEther("0.01")
      );
    });

    it("Should fail to buy a Pokémon if price is insufficient", async function () {
      const pokemonId = 0;
      await expect(
        tradingContract
          .connect(addr1)
          .buyPokemon(pokemonId, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("Insufficient funds to purchase");
    });
  });

  describe("Auction Functionality", function () {
    it("Should allow to list a Pokémon for auction", async function () {
      /*
      Testcase: addr1 buys a Pokemon and then should be able to list it in an auction.
      */
      const pokemonId = 0;
      const auctionDuration = 60 * 60;
      await expect(
        tradingContract
          .connect(addr1)
          .buyPokemon(pokemonId, { value: ethers.parseEther("1") })
      )
        .to.emit(tradingContract, "PokemonSold")
        .withArgs(pokemonId, ethers.parseEther("1"), addr1.address);

      await pokemonContract
        .connect(addr1)
        .approve(tradingContract.target, pokemonId);

      await tradingContract
        .connect(addr1)
        .listPokemon(
          pokemonId,
          ethers.parseEther("0.5"),
          true,
          auctionDuration
        );

      const listing = await tradingContract.listings(pokemonId);
      expect(listing.isAuction).to.equal(true);

      const block = await ethers.provider.getBlock("latest");
      expect(listing.auctionEndTime).to.be.greaterThan(block.timestamp);
    });

    /////////////////////////////////////////////////////////////////////////////////
    //Fix these testcases: Owner of the Pokemon needs to approve the TradingContract

    it("Should allow bidding on an auction", async function () {
      const pokemonId = 1;
      const auctionDuration = 24 * 60 * 60;
      await pokemonContract.mintPokemon(
        "AuctionPoke",
        "AuctionType",
        ethers.parseEther("1")
      );
      await tradingContract
        .connect(owner)
        .listPokemon(
          pokemonId,
          ethers.parseEther("0.5"),
          true,
          auctionDuration
        );

      const bidAmount = ethers.parseEther("0.8");
      await expect(
        tradingContract.connect(addr1).placeBid(pokemonId, { value: bidAmount })
      )
        .to.emit(tradingContract, "BidPlaced")
        .withArgs(pokemonId, bidAmount, addr1.address);

      const listing = await tradingContract.listings(pokemonId);
      expect(listing.highestBid).to.equal(bidAmount);
      expect(listing.highestBidder).to.equal(addr1.address);
    });

    it("Should fail to place a bid lower than the current highest bid", async function () {
      const pokemonId = 1;
      await pokemonContract.mintPokemon(
        "AuctionPoke",
        "AuctionType",
        ethers.parseEther("1")
      );
      await tradingContract
        .connect(owner)
        .listPokemon(pokemonId, ethers.parseEther("0.5"), true, 24 * 60 * 60);
      await tradingContract
        .connect(addr1)
        .placeBid(pokemonId, { value: ethers.parseEther("0.8") });

      await expect(
        tradingContract
          .connect(addr2)
          .placeBid(pokemonId, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("Bid must be higher than the current highest bid");
    });

    it("Should finalize the auction and transfer Pokémon to the highest bidder", async function () {
      const pokemonId = 1;
      const auctionDuration = 24 * 60 * 60;
      await pokemonContract.mintPokemon(
        "AuctionPoke",
        "AuctionType",
        ethers.parseEther("1")
      );
      await tradingContract
        .connect(owner)
        .listPokemon(
          pokemonId,
          ethers.parseEther("0.5"),
          true,
          auctionDuration
        );

      const bidAmount = ethers.parseEther("0.8");
      await tradingContract
        .connect(addr1)
        .placeBid(pokemonId, { value: bidAmount });

      await ethers.provider.send("evm_increaseTime", [auctionDuration]);
      await ethers.provider.send("evm_mine", []);

      await expect(tradingContract.connect(owner).finalizeAuction(pokemonId))
        .to.emit(tradingContract, "PokemonSold")
        .withArgs(pokemonId, bidAmount, addr1.address);
    });
  });
});
