const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = hre;
const { ZeroAddress } = require("ethers");

describe("TradingContract", function () {
  let pokemonContract;
  let tradingContract;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addr4;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();

    pokemonContract = await ethers.deployContract("PokemonContract", [
      "PokemonContract",
      "PKM",
    ]);
    await pokemonContract.waitForDeployment();

    tradingContract = await ethers.deployContract("TradingContract", [
      pokemonContract.target,
    ]);
    await tradingContract.waitForDeployment();

    for (let i = 0; i < 10; i++) {
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
    const FINALIZER_FEE = ethers.parseEther("0.0001");

    it("Should allow to list a Pokémon for auction and then allow bidding on that Pokemon", async function () {
      /*
      Part 1: addr1 buys a Pokemon and then should be able to list it in an auction.
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

      await expect(
        tradingContract
          .connect(addr1)
          .listPokemon(
            pokemonId,
            ethers.parseEther("0.5"),
            true,
            auctionDuration,
            { value: FINALIZER_FEE }
          )
      )
        .to.emit(tradingContract, "Listed")
        .withArgs(pokemonId, ethers.parseEther("0.5"), true);

      let listing = await tradingContract.listings(pokemonId);
      expect(listing.isAuction).to.equal(true);
      expect(listing.highestBid).to.equal(0);
      expect(listing.highestBidder).to.equal(ZeroAddress);

      const block = await ethers.provider.getBlock("latest");
      expect(listing.auctionEndTime).to.be.greaterThan(block.timestamp);

      /*
      Part 2: addr2 bids on the listed Pokemon.
      */
      const bidAmount = ethers.parseEther("0.8"); //Minimum bid is 0.5
      await expect(
        tradingContract.connect(addr2).placeBid(pokemonId, { value: bidAmount })
      )
        .to.emit(tradingContract, "BidPlaced")
        .withArgs(pokemonId, bidAmount, addr2.address);

      listing = await tradingContract.listings(pokemonId);
      expect(listing.highestBid).to.equal(bidAmount);
      expect(listing.highestBidder).to.equal(addr2.address);
    });

    it("Should finalize auction, pay finalizer the reward, send Pokemon to buyer", async function () {
      const pokemonId = 1;
      const auctionDuration = 60 * 60;

      //Step 1: addr1 buys Pokemon with pokemonId
      await expect(
        tradingContract
          .connect(addr1)
          .buyPokemon(pokemonId, { value: ethers.parseEther("1") })
      )
        .to.emit(tradingContract, "PokemonSold")
        .withArgs(pokemonId, ethers.parseEther("1"), addr1.address);

      //Step 2: addr1 approves tradingContract and lists the bought Pokemon for auction
      await pokemonContract
        .connect(addr1)
        .approve(tradingContract.target, pokemonId);

      await tradingContract
        .connect(addr1)
        .listPokemon(
          pokemonId,
          ethers.parseEther("0.5"),
          true,
          auctionDuration,
          { value: FINALIZER_FEE }
        );

      //Validate auction listing
      let listing = await tradingContract.listings(pokemonId);
      expect(listing.isAuction).to.equal(true);
      expect(listing.highestBid).to.equal(0);
      expect(listing.highestBidder).to.equal(ZeroAddress);

      const block = await ethers.provider.getBlock("latest");
      expect(listing.auctionEndTime).to.be.greaterThan(block.timestamp);

      //addr2 places a bid on the listed auction
      await expect(
        tradingContract
          .connect(addr2)
          .placeBid(pokemonId, { value: ethers.parseEther("0.6") })
      )
        .to.emit(tradingContract, "BidPlaced")
        .withArgs(pokemonId, ethers.parseEther("0.6"), addr2.address);

      //Increase time to simulate auction expiration
      await ethers.provider.send("evm_increaseTime", [auctionDuration]);
      await ethers.provider.send("evm_mine", []);

      //Step 3: Let addr2 finalize auction
      await expect(tradingContract.connect(addr2).finalizeAuction(pokemonId))
        .to.emit(tradingContract, "PokemonSold")
        .withArgs(pokemonId, ethers.parseEther("0.6"), addr2.address)
        //Test if finalizer received reward
        .to.emit(tradingContract, "RewardPaid")
        .withArgs(addr2.address, FINALIZER_FEE);

      //Verify ownership
      const newOwner = await pokemonContract.ownerOf(pokemonId);
      expect(newOwner).to.equal(addr2.address);
    });

    it("Should fail to place a bid lower than the current highest bid", async function () {
      const pokemonId = 3;

      //Step 1: addr1 buys the Pokemon
      await tradingContract
        .connect(addr3)
        .buyPokemon(pokemonId, { value: ethers.parseEther("1") });

      //Step 2: addr3 approves and lists the bought Pokemon for auction
      await pokemonContract.connect(addr3).approve(tradingContract, pokemonId);

      await tradingContract
        .connect(addr3)
        .listPokemon(pokemonId, ethers.parseEther("0.5"), true, 24 * 60 * 60, {
          value: FINALIZER_FEE,
        });

      //Step 3: Let users bid on the auction:
      //3.1: Valid bid
      await tradingContract
        .connect(addr1)
        .placeBid(pokemonId, { value: ethers.parseEther("0.8") });

      //3.2 valid bid
      await tradingContract
        .connect(addr2)
        .placeBid(pokemonId, { value: ethers.parseEther("0.8001") });

      //3.3 Invalid bid
      await expect(
        tradingContract
          .connect(addr2)
          .placeBid(pokemonId, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith(
        "Bid must be at least 0.0001 ETH higher than previous bid"
      );

      //3.4 Invalid bid
      await expect(
        tradingContract
          .connect(addr2)
          .placeBid(pokemonId, { value: ethers.parseEther("0.8") })
      ).to.be.revertedWith(
        "Bid must be at least 0.0001 ETH higher than previous bid"
      );

      //3.5 Invalid bid
      await expect(
        tradingContract
          .connect(addr2)
          .placeBid(pokemonId, { value: ethers.parseEther("0.80011") })
      ).to.be.revertedWith(
        "Bid must be at least 0.0001 ETH higher than previous bid"
      );
    });

    it("Should send listed Pokemon back to seller if no one placed a bid and auction is finalized", async function () {
      const pokemonId = 4;
      const auctionDuration = 60 * 60;

      //Step 1: addr1 buys Pokemon with pokemonId
      await expect(
        tradingContract
          .connect(addr1)
          .buyPokemon(pokemonId, { value: ethers.parseEther("1") })
      )
        .to.emit(tradingContract, "PokemonSold")
        .withArgs(pokemonId, ethers.parseEther("1"), addr1.address);

      //Step 2: addr1 approves tradingContract and lists the bought Pokemon for auction
      await pokemonContract
        .connect(addr1)
        .approve(tradingContract.target, pokemonId);

      await tradingContract
        .connect(addr1)
        .listPokemon(
          pokemonId,
          ethers.parseEther("0.5"),
          true,
          auctionDuration,
          { value: FINALIZER_FEE }
        );

      //Validate auction listing
      let listing = await tradingContract.listings(pokemonId);
      expect(listing.isAuction).to.equal(true);
      expect(listing.highestBid).to.equal(0);
      expect(listing.highestBidder).to.equal(ZeroAddress);

      const block = await ethers.provider.getBlock("latest");
      expect(listing.auctionEndTime).to.be.greaterThan(block.timestamp);

      //Increase time to simulate auction expiration
      await ethers.provider.send("evm_increaseTime", [auctionDuration]);
      await ethers.provider.send("evm_mine", []);

      //Step 3: Let addr2 finalize auction
      await expect(tradingContract.connect(addr2).finalizeAuction(pokemonId))
        .to.emit(tradingContract, "PokemonSold")
        .withArgs(pokemonId, 0, addr1.address)
        //Test if finalizer received reward
        .to.emit(tradingContract, "RewardPaid")
        .withArgs(addr2.address, FINALIZER_FEE);

      //Verify ownership
      const newOwner = await pokemonContract.ownerOf(pokemonId);
      expect(newOwner).to.equal(addr1.address);
    });
  });
});
