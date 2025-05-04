import axios from "axios";
import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;
const { ZeroAddress } = ethers;

describe("TradingContract", function () {
  let pokemonContract;
  let tradingContract;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addr4;
  let bulbasaurCid;
  let charmanderCid;
  const FINALIZER_FEE = ethers.parseEther("0.0015");

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

    //Bulbasaur
    const bulbasaurMeta = {
      name: "Bulbasaur",
      attributes: [
        { trait_type: "hp", value: 45 },
        { trait_type: "attack", value: 49 },
        { trait_type: "defense", value: 49 },
        { trait_type: "special-attack", value: 65 },
        { trait_type: "special-defense", value: 65 },
        { trait_type: "speed", value: 45 },
      ],
    };

    // Charmander
    const charmanderMeta = {
      name: "Charmander",
      attributes: [
        { trait_type: "hp", value: 39 },
        { trait_type: "attack", value: 52 },
        { trait_type: "defense", value: 43 },
        { trait_type: "special-attack", value: 60 },
        { trait_type: "special-defense", value: 50 },
        { trait_type: "speed", value: 65 },
      ],
    };

    const res1 = await axios.post("http://localhost:8080/add", bulbasaurMeta, {
      headers: { "Content-Type": "application/json" },
    });
    const res2 = await axios.post("http://localhost:8080/add", charmanderMeta, {
      headers: { "Content-Type": "application/json" },
    });

    bulbasaurCid = res1.data.cid;
    charmanderCid = res2.data.cid;
  });

  describe("Listing a Pokémon", function () {
    const bulbasaurId = 0;

    //Mint Pokemon before each test:
    beforeEach(async function () {
      await pokemonContract.connect(owner).mintPokemon(bulbasaurCid);
    });

    it("Should allow owner to make fixed price listing", async function () {
      //Approve TradingContract and list the Pokemon
      await pokemonContract
        .connect(owner)
        .approve(tradingContract.target, bulbasaurId);
      await tradingContract
        .connect(owner)
        .listPokemon(bulbasaurId, ethers.parseEther("1"), false, 0);

      const listing = await tradingContract.listings(bulbasaurId);
      expect(listing.price).to.equal(ethers.parseEther("1"));
      expect(listing.seller).to.equal(owner.address);
      expect(listing.isAuction).to.equal(false);
    });

    it("Should allow owner to make an auction listing", async function () {
      //Approve TradingContract and list for auction
      await pokemonContract
        .connect(owner)
        .approve(tradingContract.target, bulbasaurId);
      await tradingContract
        .connect(owner)
        .listPokemon(bulbasaurId, ethers.parseEther("1"), true, 3600, {
          value: FINALIZER_FEE,
        });

      const listing = await tradingContract.listings(bulbasaurId);
      expect(listing.price).to.equal(ethers.parseEther("1"));
      expect(listing.seller).to.equal(owner.address);
      expect(listing.isAuction).to.equal(true);
      expect(listing.highestBidder).to.equal(ZeroAddress);
      const block = await ethers.provider.getBlock("latest");
      expect(listing.auctionEndTime).to.be.greaterThan(block.timestamp);
    });

    it("Should fail to list a Pokémon if not owned by sender", async function () {
      //addr1 tries to list the Pokemon minted by the owner
      await expect(
        tradingContract
          .connect(addr1)
          .listPokemon(bulbasaurId, ethers.parseEther("1"), false, 0)
      ).to.be.reverted;
    });
  });

  describe("Buying a Pokémon", function () {
    const bulbasaurId = 0;

    // Mint and list a fixed-price Pokemon before each test
    beforeEach(async function () {
      await pokemonContract.connect(owner).mintPokemon(bulbasaurCid);
      await pokemonContract
        .connect(owner)
        .approve(tradingContract.target, bulbasaurId);
      await tradingContract
        .connect(owner)
        .listPokemon(bulbasaurId, ethers.parseEther("1"), false, 0);
    });

    it("Should allow buyer to buy a Pokemon at the listed price", async function () {
      const initialBalance = await ethers.provider.getBalance(owner.address);

      await expect(
        tradingContract
          .connect(addr1)
          .buyPokemon(bulbasaurId, { value: ethers.parseEther("1") })
      )
        .to.emit(tradingContract, "PokemonSold")
        .withArgs(bulbasaurId, ethers.parseEther("1"), addr1.address);

      const listing = await tradingContract.listings(bulbasaurId);
      expect(listing.seller).to.equal(ethers.ZeroAddress);

      //Test if owner changed
      expect(await pokemonContract.ownerOf(bulbasaurId)).to.equal(
        addr1.address
      );

      const finalBalance = await ethers.provider.getBalance(owner.address);
      expect(finalBalance - initialBalance).to.be.closeTo(
        ethers.parseEther("1"),
        ethers.parseEther("0.01")
      );
    });

    it("Should fail to buy a Pokémon if price is insufficient", async function () {
      await expect(
        tradingContract
          .connect(addr1)
          .buyPokemon(bulbasaurId, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("Insufficient funds to purchase");
    });

    it("Should not allow seller to buy his own listing", async function () {
      await expect(
        tradingContract
          .connect(owner)
          .buyPokemon(bulbasaurId, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Cannot buy your own listing");
    });
  });

  describe("Removing a listing", function () {
    const bulbasaurId = 0;
    const charmanderId = 1;

    beforeEach(async function () {
      // Mint and list a fixed-price Pokemon before each test
      await pokemonContract.connect(owner).mintPokemon(bulbasaurCid);
      await pokemonContract
        .connect(owner)
        .approve(tradingContract.target, bulbasaurId);
      await tradingContract
        .connect(owner)
        .listPokemon(bulbasaurId, ethers.parseEther("1"), false, 0);

      // Mint and list a auction Pokemon before each test
      await pokemonContract.connect(owner).mintPokemon(charmanderCid);
      await pokemonContract
        .connect(owner)
        .approve(tradingContract.target, charmanderId);
      await tradingContract
        .connect(owner)
        .listPokemon(charmanderId, ethers.parseEther("1"), false, 0);
    });

    it("Should allow seller to remove fixed price listing as well as auction listing", async function () {
      //owner removes fixed price listing
      await expect(tradingContract.connect(owner).removeListing(bulbasaurId))
        .to.emit(tradingContract, "ListingRemoved")
        .withArgs(bulbasaurId);

      //listing should not exist anymore
      await expect(
        tradingContract.connect(addr2).buyPokemon(bulbasaurId)
      ).to.be.revertedWith("Listing does not exist");

      //owner should own Pokemon again
      const ownerOfBulbasaur = await pokemonContract.ownerOf(bulbasaurId);
      await expect(ownerOfBulbasaur).to.equal(owner.address);

      //owner removes auction listing (assuming auction ongoing!)
      await expect(tradingContract.connect(owner).removeListing(charmanderId))
        .to.emit(tradingContract, "ListingRemoved")
        .withArgs(charmanderId);

      //listing should not exist anymore
      await expect(
        tradingContract.connect(addr2).buyPokemon(charmanderId)
      ).to.be.revertedWith("Listing does not exist");

      //owner should own Pokemon again
      const ownerOfCharmander = await pokemonContract.ownerOf(bulbasaurId);
      await expect(ownerOfCharmander).to.equal(owner.address);
    });
  });

  describe("Auction Functionality", function () {
    const bulbasaurId = 0;
    const auctionDuration = 3600; //Set auctionDuration default to 1h
    const startingPrice = 1;

    beforeEach(async function () {
      // Mint and list Pokemon for auction before each test
      await pokemonContract.connect(owner).mintPokemon(bulbasaurCid);
      await pokemonContract
        .connect(owner)
        .approve(tradingContract.target, bulbasaurId);
      await tradingContract
        .connect(owner)
        .listPokemon(
          bulbasaurId,
          ethers.parseEther(startingPrice.toString()),
          true,
          auctionDuration,
          { value: FINALIZER_FEE }
        );
    });

    it("Should allow bidding on Pokemon that is listed for auction", async function () {
      //addr1 bids on the listed Pokemon (listed in the beforeEach)
      const bidAmount = ethers.parseEther((startingPrice + 0.1).toString());
      await expect(
        tradingContract
          .connect(addr1)
          .placeBid(bulbasaurId, { value: bidAmount })
      )
        .to.emit(tradingContract, "BidPlaced")
        .withArgs(bulbasaurId, bidAmount, addr1.address);

      const listing = await tradingContract.listings(bulbasaurId);
      expect(listing.highestBid).to.equal(bidAmount);
      expect(listing.highestBidder).to.equal(addr1.address);
    });

    it("Should prevent bidding on own listing", async function () {
      //addr1 bids on the listed Pokemon (listed in the beforeEach)
      const bidAmount = ethers.parseEther((startingPrice + 0.1).toString());
      await expect(
        tradingContract
          .connect(owner)
          .placeBid(bulbasaurId, { value: bidAmount })
      ).to.be.revertedWith("Seller cannot bid on their own listing");
    });

    it("Should allow auction to be finalized if expired, pay finalizer the reward, send Pokemon to highest bidder", async function () {
      //addr1 places a bid on the listed auction
      const bidAmount = ethers.parseEther((startingPrice + 0.1).toString());
      await expect(
        tradingContract.connect(addr1).placeBid(bulbasaurId, {
          value: bidAmount,
        })
      )
        .to.emit(tradingContract, "BidPlaced")
        .withArgs(bulbasaurId, bidAmount, addr1.address);

      //Increase time to simulate auction expiration
      await ethers.provider.send("evm_increaseTime", [auctionDuration]);
      await ethers.provider.send("evm_mine", []);

      //addr2 finalizes auction
      await expect(tradingContract.connect(addr2).finalizeAuction(bulbasaurId))
        .to.emit(tradingContract, "PokemonSold")
        .withArgs(bulbasaurId, bidAmount, addr1.address)
        .to.emit(tradingContract, "RewardPaid")
        .withArgs(addr2.address, FINALIZER_FEE);

      // Check if addr2 has a pending refund of FINALIZER_FEE
      const refund = await tradingContract.pendingRefunds(addr2.address);
      expect(refund).to.equal(FINALIZER_FEE);

      //Verify ownership
      const newOwner = await pokemonContract.ownerOf(bulbasaurId);
      expect(newOwner).to.equal(addr1.address);
    });

    it("Should fail to place a bid lower than the starting price", async function () {
      //Bid lower than starting price should be reverted
      await expect(
        tradingContract.connect(addr1).placeBid(bulbasaurId, {
          value: ethers.parseEther((startingPrice - 0.1).toString()),
        })
      ).to.be.revertedWith(
        "Bid must be at least 5% higher than previous bid or match starting price"
      );
    });

    it("Should fail to place a bid less than 5% higher than previous bid", async function () {
      //First addr1 makes a valid bid
      await expect(
        tradingContract.connect(addr1).placeBid(bulbasaurId, {
          value: ethers.parseEther(startingPrice.toString()),
        })
      )
        .to.emit(tradingContract, "BidPlaced")
        .withArgs(
          bulbasaurId,
          ethers.parseEther(startingPrice.toString()),
          addr1.address
        );

      //addr2 tries to bid the same amount:
      await expect(
        tradingContract.connect(addr2).placeBid(bulbasaurId, {
          value: ethers.parseEther(startingPrice.toString()),
        })
      ).to.be.revertedWith(
        "Bid must be at least 5% higher than previous bid or match starting price"
      );

      //addr2 tries to bid less than 5% more than previous bid:
      const previousBid = ethers.parseEther(startingPrice.toString());
      const tooLowIncrement = (previousBid * 104n) / 100n; // 4% more, still too low

      await expect(
        tradingContract.connect(addr2).placeBid(bulbasaurId, {
          value: tooLowIncrement,
        })
      ).to.be.revertedWith(
        "Bid must be at least 5% higher than previous bid or match starting price"
      );
    });

    it("Should send listed Pokemon back to seller if no one placed a bid and auction is finalized", async function () {
      //Increase time to simulate auction expiration
      await ethers.provider.send("evm_increaseTime", [auctionDuration]);
      await ethers.provider.send("evm_mine", []);

      //Let owner finalize auction
      await expect(tradingContract.connect(owner).finalizeAuction(bulbasaurId))
        .to.emit(tradingContract, "PokemonSold")
        .withArgs(bulbasaurId, 0, owner.address)
        //Test if finalizer received reward
        .to.emit(tradingContract, "RewardPaid")
        .withArgs(owner.address, FINALIZER_FEE);

      //Verify ownership
      const newOwner = await pokemonContract.ownerOf(bulbasaurId);
      expect(newOwner).to.equal(owner.address);
    });

    it("Should store pending refund for addr1 after being outbid by addr2", async function () {
      // addr1 places a bid
      const firstBidAmount = ethers.parseEther(startingPrice.toString());
      await tradingContract.connect(addr1).placeBid(bulbasaurId, {
        value: firstBidAmount,
      });

      // addr2 places a higher bid
      const secondBidAmount = ethers.parseEther(
        (startingPrice + 0.1).toString()
      );
      await tradingContract.connect(addr2).placeBid(bulbasaurId, {
        value: secondBidAmount,
      });

      // Check if addr1 has a pending refund of amount firstBidAmount
      const refund = await tradingContract.pendingRefunds(addr1.address);
      expect(refund).to.equal(firstBidAmount);
    });

    it("Should allow user to withdraw refunds", async function () {
      // addr1 places a bid
      const firstBidAmount = ethers.parseEther(startingPrice.toString());
      await tradingContract.connect(addr1).placeBid(bulbasaurId, {
        value: firstBidAmount,
      });

      // addr2 places a higher bid
      const secondBidAmount = ethers.parseEther(
        (startingPrice + 0.1).toString()
      );
      await tradingContract.connect(addr2).placeBid(bulbasaurId, {
        value: secondBidAmount,
      });

      // Capture addr1's balance before withdrawal
      const balanceBefore = await ethers.provider.getBalance(addr1.address);

      // Withdraw refund from contract
      const tx = await tradingContract.connect(addr1).withdrawRefund();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      // Confirm pending refund is now zero
      const refundAfter = await tradingContract.pendingRefunds(addr1.address);
      expect(refundAfter).to.equal(0n);

      // Confirm refund was transferred (allowing for gas cost)
      const balanceAfter = await ethers.provider.getBalance(addr1.address);
      expect(balanceAfter).to.be.closeTo(
        balanceBefore + firstBidAmount - gasUsed,
        ethers.parseEther("0.001") // account for gas fluctuations
      );
    });

    it("should allow multiple increasing bids and correctly track refunds", async function () {
      let currentBid = ethers.parseEther(startingPrice.toString());

      const signers = await ethers.getSigners();
      //Use 15 different accounts that all bid almost at the same time
      const bidders = signers.slice(6, 20);

      for (let i = 0; i < bidders.length; i++) {
        const bidder = bidders[i];

        // Calculate 5% increment
        const bidIncrement = (currentBid * 5n) / 100n;
        currentBid = currentBid + bidIncrement;

        // Place the bid
        await tradingContract.connect(bidder).placeBid(bulbasaurId, {
          value: currentBid,
        });

        // Check highest bidder and bid
        const listing = await tradingContract.listings(bulbasaurId);
        expect(listing.highestBidder).to.equal(bidder.address);
        expect(listing.highestBid).to.equal(currentBid);

        // Check if previous bidder has refund
        if (i > 0) {
          const previousBidder = bidders[i - 1];
          const refund = await tradingContract.pendingRefunds(
            previousBidder.address
          );
          expect(refund).to.equal(currentBid - bidIncrement); // last bid amount
        }
      }

      // Final check: highest bid belongs to the last bidder
      const finalListing = await tradingContract.listings(bulbasaurId);
      expect(finalListing.highestBidder).to.equal(
        bidders[bidders.length - 1].address
      );
    });
  });

  describe("Pausable Functionality", function () {
    const bulbasaurId = 0;
    const startingPrice = 1;

    beforeEach(async function () {
      // Mint Pokemon
      await pokemonContract.connect(owner).mintPokemon(bulbasaurCid);
      await pokemonContract
        .connect(owner)
        .approve(tradingContract.target, bulbasaurId);
    });

    it("Should prevent listing when contract is paused", async function () {
      await tradingContract.connect(owner).pause();

      //Try listing a Pokemon when tradingContract is paused
      await expect(
        tradingContract
          .connect(owner)
          .listPokemon(0, ethers.parseEther(startingPrice.toString()), false, 0)
      ).to.be.reverted;

      //View function should still return listings (not reverted)
      const listings = await tradingContract.getAllListingsWithDetails();
      expect(Array.isArray(listings)).to.be.true;
    });

    it("Should allow listing when contract is unpaused", async function () {
      await tradingContract.connect(owner).pause();
      await tradingContract.connect(owner).unpause();

      await expect(
        tradingContract
          .connect(owner)
          .listPokemon(0, ethers.parseEther("1"), false, 0)
      ).to.emit(tradingContract, "Listed");
    });
  });
});
