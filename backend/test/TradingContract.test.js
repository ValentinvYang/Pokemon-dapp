import axios from "axios";
import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

//A RUNNING HELIA LOCAL NODE IS REQUIRED FOR TESTING
import { HELIA_TEST_BASE_URL } from "../scripts/utils/config.js";

describe("TradingContract", function () {
  let pokemonContract;
  let tradingContract;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let bulbasaurCid;
  let charmanderCid;
  const FINALIZER_FEE = ethers.parseEther("0.0015");
  const revealWindow = 120;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

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

    const res1 = await axios.post(`${HELIA_TEST_BASE_URL}/add`, bulbasaurMeta, {
      headers: { "Content-Type": "application/json" },
    });
    const res2 = await axios.post(
      `${HELIA_TEST_BASE_URL}/add`,
      charmanderMeta,
      {
        headers: { "Content-Type": "application/json" },
      }
    );

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
        .listPokemon(bulbasaurId, ethers.parseEther("1"), false, 0, 0);

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
        .listPokemon(
          bulbasaurId,
          ethers.parseEther("1"),
          true,
          3600,
          revealWindow,
          {
            value: FINALIZER_FEE,
          }
        );

      const listing = await tradingContract.listings(bulbasaurId);
      expect(listing.price).to.equal(ethers.parseEther("1"));
      expect(listing.seller).to.equal(owner.address);
      expect(listing.isAuction).to.equal(true);
      const block = await ethers.provider.getBlock("latest");
      expect(listing.auctionEndTime).to.be.greaterThan(block.timestamp);
    });

    it("Should fail to list a Pokémon if not owned by sender", async function () {
      //addr1 tries to list the Pokemon minted by the owner
      await expect(
        tradingContract
          .connect(addr1)
          .listPokemon(
            bulbasaurId,
            ethers.parseEther("1"),
            false,
            0,
            revealWindow
          )
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
        .listPokemon(bulbasaurId, ethers.parseEther("1"), false, 0, 0);
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
    let bulbasaurId, charmanderId;

    beforeEach(async function () {
      // Mint and list a fixed-price Pokemon before each test
      bulbasaurId = await pokemonContract.getNextTokenId();
      await pokemonContract.connect(owner).mintPokemon(bulbasaurCid);
      await pokemonContract
        .connect(owner)
        .approve(tradingContract.target, bulbasaurId);
      await tradingContract
        .connect(owner)
        .listPokemon(bulbasaurId, ethers.parseEther("1"), false, 0, 0);

      //Mint and list an auction Pokemon before each test
      charmanderId = await pokemonContract.getNextTokenId();
      await pokemonContract.connect(owner).mintPokemon(charmanderCid);
      await pokemonContract
        .connect(owner)
        .approve(tradingContract.target, charmanderId);
      await tradingContract
        .connect(owner)
        .listPokemon(charmanderId, ethers.parseEther("1"), true, 120, 120, {
          value: FINALIZER_FEE,
        });
    });

    it("Should allow seller to remove fixed price listing as well as auction listing", async function () {
      // owner removes fixed price listing
      await expect(tradingContract.connect(owner).removeListing(bulbasaurId))
        .to.emit(tradingContract, "ListingRemoved")
        .withArgs(bulbasaurId);

      // listing should not exist anymore
      await expect(
        tradingContract.connect(addr2).buyPokemon(bulbasaurId)
      ).to.be.revertedWith("Listing does not exist");

      // owner should own Pokemon again
      const ownerOfBulbasaur = await pokemonContract.ownerOf(bulbasaurId);
      await expect(ownerOfBulbasaur).to.equal(owner.address);

      // owner removes auction listing (assuming auction ongoing and no bid placed!)
      await expect(tradingContract.connect(owner).removeListing(charmanderId))
        .to.emit(tradingContract, "ListingRemoved")
        .withArgs(charmanderId);

      // listing should not exist anymore
      const bidAmount = ethers.parseEther("1");
      const salt = "secret123";
      const commitHash = ethers.keccak256(
        ethers.solidityPacked(["uint256", "string"], [bidAmount, salt])
      );
      await expect(
        tradingContract.connect(addr2).commitBid(charmanderId, commitHash, {
          value: bidAmount,
        })
      ).to.be.revertedWith("Listing does not exist");

      //owner should own Pokemon again
      const ownerOfCharmander = await pokemonContract.ownerOf(bulbasaurId);
      await expect(ownerOfCharmander).to.equal(owner.address);
    });

    it("Should not allow seller to remove an auction listing after a bid has been placed", async function () {
      // addr1 places a bid (commit phase)
      const bidAmount = ethers.parseEther("1");
      const salt = "secret123";
      const commitHash = ethers.keccak256(
        ethers.solidityPacked(["uint256", "string"], [bidAmount, salt])
      );

      await tradingContract.connect(addr1).commitBid(charmanderId, commitHash, {
        value: bidAmount,
      });

      // Attempt by seller to remove listing should now fail
      await expect(
        tradingContract.connect(owner).removeListing(charmanderId)
      ).to.be.revertedWith("Cannot remove listing after a bid has been placed");
    });
  });

  describe("Auction Functionality", function () {
    const bulbasaurId = 0;
    const auctionDuration = 3600; //Set auctionDuration default to 1h
    const startingPrice = 1;

    const firstBidAmount = ethers.parseEther(startingPrice.toString());
    const salt = "mySalt";
    const commitHash = ethers.keccak256(
      ethers.solidityPacked(["uint256", "string"], [firstBidAmount, salt])
    );

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
          revealWindow,
          { value: FINALIZER_FEE }
        );
    });

    it("Should allow commiting a bidding on Pokemon that is listed for auction", async function () {
      //addr1 commits a bid on the listed Pokemon (listed in the beforeEach)
      await expect(
        tradingContract
          .connect(addr1)
          .commitBid(bulbasaurId, commitHash, { value: firstBidAmount })
      )
        .to.emit(tradingContract, "BidCommitted")
        .withArgs(bulbasaurId, addr1.address);

      //Verify commitment is stored (if accessible)
      const commitment = await tradingContract.getCommitment(
        bulbasaurId,
        addr1.address
      );

      expect(commitment.commitHash).to.equal(commitHash);
      expect(commitment.revealed).to.equal(false);
    });

    it("Should prevent bidding on own listing", async function () {
      //addr1 bids on the listed Pokemon (listed in the beforeEach)
      await expect(
        tradingContract
          .connect(owner)
          .commitBid(bulbasaurId, commitHash, { value: firstBidAmount })
      ).to.be.revertedWith("Seller cannot bid on their own listing");
    });

    it("Should allow auction to be finalized if expired, pay finalizer the reward, send Pokemon to highest bidder", async function () {
      //addr1 commits a bid on the listed auction
      await expect(
        tradingContract.connect(addr1).commitBid(bulbasaurId, commitHash, {
          value: firstBidAmount,
        })
      )
        .to.emit(tradingContract, "BidCommitted")
        .withArgs(bulbasaurId, addr1.address);

      //Increase time to simulate auction expiration
      await ethers.provider.send("evm_increaseTime", [
        auctionDuration + revealWindow,
      ]);
      await ethers.provider.send("evm_mine", []);

      //addr1 reveals their bid
      await expect(
        tradingContract
          .connect(addr1)
          .revealBid(bulbasaurId, firstBidAmount, salt)
      )
        .to.emit(tradingContract, "BidRevealed")
        .withArgs(bulbasaurId, addr1.address, firstBidAmount);

      //addr2 finalizes auction
      await expect(tradingContract.connect(addr2).finalizeAuction(bulbasaurId))
        .to.emit(tradingContract, "PokemonSold")
        .withArgs(bulbasaurId, firstBidAmount, addr1.address)
        .to.emit(tradingContract, "RewardPaid")
        .withArgs(addr2.address, FINALIZER_FEE);

      // Check if addr2 has a pending refund of FINALIZER_FEE
      const refund = await tradingContract.pendingRefunds(addr2.address);
      expect(refund).to.equal(FINALIZER_FEE);

      //Verify ownership
      const newOwner = await pokemonContract.ownerOf(bulbasaurId);
      expect(newOwner).to.equal(addr1.address);
    });

    it("Should prevent finalizing if reveal window is still open", async function () {
      //Increase time to end of auction but still reveal window open
      await ethers.provider.send("evm_increaseTime", [auctionDuration]);
      await ethers.provider.send("evm_mine", []);

      //Try finalizing
      await expect(
        tradingContract.connect(owner).finalizeAuction(bulbasaurId)
      ).to.be.revertedWith("Cannot finalize yet - waiting for reveal window");
    });

    it("Should fail to place a bid lower than the starting price", async function () {
      //Bid lower than starting price should be reverted
      await expect(
        tradingContract.connect(addr1).commitBid(bulbasaurId, commitHash, {
          value: ethers.parseEther((startingPrice - 0.1).toString()),
        })
      ).to.be.revertedWith("Bid must be at least minimum price");
    });

    it("Should send listed Pokemon back to seller if no one placed a bid and auction is finalized", async function () {
      //Increase time to simulate auction expiration
      await ethers.provider.send("evm_increaseTime", [
        auctionDuration + revealWindow,
      ]);
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

    it("Should store pending refund for all previous bidders after auction is finalized", async function () {
      const secondBidAmount = ethers.parseEther(
        (startingPrice + 0.2).toString()
      );
      const salt1 = "salt1";
      const salt2 = "salt2";

      const commitHash1 = ethers.keccak256(
        ethers.solidityPacked(["uint256", "string"], [firstBidAmount, salt1])
      );
      const commitHash2 = ethers.keccak256(
        ethers.solidityPacked(["uint256", "string"], [secondBidAmount, salt2])
      );

      // addr1 places a bid
      await tradingContract.connect(addr1).commitBid(bulbasaurId, commitHash1, {
        value: firstBidAmount,
      });

      // addr2 places a higher bid
      await tradingContract.connect(addr2).commitBid(bulbasaurId, commitHash2, {
        value: secondBidAmount,
      });

      // Fast-forward time to after auction ends
      await ethers.provider.send("evm_increaseTime", [
        auctionDuration + revealWindow,
      ]);
      await ethers.provider.send("evm_mine", []);

      // Reveal both bids
      await tradingContract
        .connect(addr1)
        .revealBid(bulbasaurId, firstBidAmount, salt1);
      await tradingContract
        .connect(addr2)
        .revealBid(bulbasaurId, secondBidAmount, salt2);

      // Finalize auction
      await tradingContract.connect(addr3).finalizeAuction(bulbasaurId);

      // addr1 should have a pending refund equal to their bid
      const refund = await tradingContract.pendingRefunds(addr1.address);
      expect(refund).to.equal(firstBidAmount);
    });

    it("Should allow user to withdraw refunds", async function () {
      //SETUP: addr1 gets outbid by addr2 in the auction and then withdraws refunds
      const secondBidAmount = ethers.parseEther(
        (startingPrice + 0.2).toString()
      );
      const salt1 = "salt1";
      const salt2 = "salt2";

      const commitHash1 = ethers.keccak256(
        ethers.solidityPacked(["uint256", "string"], [firstBidAmount, salt1])
      );
      const commitHash2 = ethers.keccak256(
        ethers.solidityPacked(["uint256", "string"], [secondBidAmount, salt2])
      );

      // addr1 places a bid
      await tradingContract.connect(addr1).commitBid(bulbasaurId, commitHash1, {
        value: firstBidAmount,
      });

      // addr2 places a higher bid
      await tradingContract.connect(addr2).commitBid(bulbasaurId, commitHash2, {
        value: secondBidAmount,
      });

      // Fast-forward time to after auction ends
      await ethers.provider.send("evm_increaseTime", [
        auctionDuration + revealWindow,
      ]);
      await ethers.provider.send("evm_mine", []);

      // Reveal both bids
      await tradingContract
        .connect(addr1)
        .revealBid(bulbasaurId, firstBidAmount, salt1);
      await tradingContract
        .connect(addr2)
        .revealBid(bulbasaurId, secondBidAmount, salt2);

      // Finalize auction
      await tradingContract.connect(addr3).finalizeAuction(bulbasaurId);

      // Capture addr1's and addr3's balance before withdrawal
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

    it("Should refund users that forget to reveal", async function () {
      //SETUP: addr1 and addr2 commit bids but only addr1 reveals
      const secondBidAmount = ethers.parseEther(
        (startingPrice + 0.2).toString()
      );
      const salt1 = "salt1";
      const salt2 = "salt2";

      const commitHash1 = ethers.keccak256(
        ethers.solidityPacked(["uint256", "string"], [firstBidAmount, salt1])
      );
      const commitHash2 = ethers.keccak256(
        ethers.solidityPacked(["uint256", "string"], [secondBidAmount, salt2])
      );

      // addr1 places a bid
      await tradingContract.connect(addr1).commitBid(bulbasaurId, commitHash1, {
        value: firstBidAmount,
      });

      // addr2 places a higher bid
      await tradingContract.connect(addr2).commitBid(bulbasaurId, commitHash2, {
        value: secondBidAmount,
      });

      // Fast-forward time to after auction ends
      await ethers.provider.send("evm_increaseTime", [
        auctionDuration + revealWindow,
      ]);
      await ethers.provider.send("evm_mine", []);

      // Only addr1 reveals bid
      await tradingContract
        .connect(addr1)
        .revealBid(bulbasaurId, firstBidAmount, salt1);

      // Finalize auction
      await tradingContract.connect(addr3).finalizeAuction(bulbasaurId);

      // Confirm pending refund is now zero
      const refundNoReveal = await tradingContract.pendingRefunds(
        addr2.address
      );
      expect(refundNoReveal).to.equal(secondBidAmount);

      //Confirm addr1 owns the Pokemon
      const newOwner = await pokemonContract
        .connect(owner)
        .ownerOf(bulbasaurId);
      expect(newOwner).to.equal(addr1.address);
    });

    it("should allow multiple bids with same amount and correctly determine winner based on commit time", async function () {
      const signers = await ethers.getSigners();
      //Use 15 different accounts that all bid same amount
      const bidders = signers.slice(6, 20);

      for (let i = 0; i < bidders.length; i++) {
        const bidder = bidders[i];

        // Commit the bid
        await tradingContract
          .connect(bidder)
          .commitBid(bulbasaurId, commitHash, {
            value: firstBidAmount,
          });

        // Slight delay to differentiate commit time
        await ethers.provider.send("evm_increaseTime", [1]);
        await ethers.provider.send("evm_mine", []);
      }

      // Advance time to end the auction
      await ethers.provider.send("evm_increaseTime", [auctionDuration]);
      await ethers.provider.send("evm_mine", []);

      // Everyone reveals the same bid
      for (let i = 0; i < bidders.length; i++) {
        await tradingContract
          .connect(bidders[i])
          .revealBid(bulbasaurId, firstBidAmount, salt);
      }

      // Advance time to end of reveal window
      await ethers.provider.send("evm_increaseTime", [revealWindow]);
      await ethers.provider.send("evm_mine", []);

      // Finalize auction
      await expect(
        tradingContract.connect(owner).finalizeAuction(bulbasaurId)
      ).to.emit(tradingContract, "PokemonSold");

      // Earliest committer wins
      const winner = bidders[0]; // First committed
      const newOwner = await pokemonContract.ownerOf(bulbasaurId);
      expect(newOwner).to.equal(winner.address);

      // Other bidders should get refund
      for (let i = 1; i < bidders.length; i++) {
        const refund = await tradingContract.pendingRefunds(bidders[i].address);
        expect(refund).to.equal(firstBidAmount);
      }

      // Finalizer gets reward
      const reward = await tradingContract.pendingRefunds(owner.address);
      expect(reward).to.equal(FINALIZER_FEE);
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
          .listPokemon(
            0,
            ethers.parseEther(startingPrice.toString()),
            false,
            0,
            0
          )
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
          .listPokemon(0, ethers.parseEther("1"), false, 0, 0)
      ).to.emit(tradingContract, "Listed");
    });
  });
});
