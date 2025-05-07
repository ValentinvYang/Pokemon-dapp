import React, { useContext } from "react";
import { ethers } from "ethers";
import { useState, useEffect } from "react";
import { ContractContext } from "../contexts/AppContracts";
import { keccak256, solidityPacked, toUtf8Bytes } from "ethers";
import { InfoTooltip } from "./InfoToolTip";
import listingLimits from "../config/listingLimits.json";

export default function ListingActions({
  isOwner,
  listing,
  onClose,
  onListed,
}) {
  if (!listing) return null;

  //STATE VARIABLES
  const { tradingContract, signer } = useContext(ContractContext);
  const [loading, setLoading] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [salt, setSalt] = useState("");
  const [hasCommitted, setHasCommitted] = useState("");
  const [revealed, setRevealed] = useState("");

  const isAuction = listing.isAuction;
  const { timeLeft, ended, revealWindowClosed } = useAuctionCountdown(
    Number(listing.auctionEndTime),
    Number(listing.finalizeDelay)
  );

  //Check if user has committed a bid if it is an auction
  useEffect(() => {
    const checkCommitment = async () => {
      if (!tradingContract || !signer || !listing?.isAuction) return;
      try {
        const committed = await tradingContract.hasCommitted(
          listing.pokemonId,
          await signer.getAddress()
        );
        setHasCommitted(committed);
      } catch (err) {
        console.error("Failed to check commitment:", err);
        setHasCommitted(false);
      }
    };

    const checkRevealed = async () => {
      if (!tradingContract || !signer) return;

      const userAddress = await signer.getAddress();

      const wasRevealed = await tradingContract.getRevealed(
        listing.pokemonId,
        userAddress
      );
      setRevealed(wasRevealed);
    };

    checkCommitment();
    checkRevealed();
  }, [tradingContract, signer, listing]);

  /////////////////////////////////////////
  //Handler Functions
  //BUYING FIXED PRICE LISTING
  const handleBuy = async () => {
    try {
      setLoading(true);

      const balance = await signer.provider.getBalance(signer.address);
      const price = listing.price;

      if (balance < price) {
        alert("❌ Insufficient ETH to complete this purchase.");
        return;
      }

      const tx = await tradingContract.buyPokemon(listing.pokemonId, {
        value: price,
      });
      await tx.wait();
      onClose?.(); //Close Modal
      onListed?.(); //Refresh MyPokemon/Marketplace/Gallery
      alert("✅ Purchase successful!");
    } catch (err) {
      console.error("Buy failed:", err);
      alert("❌ Purchase failed.");
    } finally {
      setLoading(false);
    }
  };

  //DELISTING
  const handleDelist = async () => {
    try {
      setLoading(true);

      if (listing.seller != signer.address) {
        alert("❌ You did not create the listing.");
        return;
      }

      const tx = await tradingContract.removeListing(listing.pokemonId);
      await tx.wait();
      onClose?.(); //Close Modal
      onListed?.(); //Refresh MyPokemon/Marketplace/Gallery
      alert("✅ Delisting successful!");
    } catch (err) {
      console.error("Delist failed:", err);
      alert("❌ Delisting failed.");
    } finally {
      setLoading(false);
    }
  };

  //AUCTION BIDDING
  const handleBid = async () => {
    try {
      setLoading(true);

      if (!bidAmount || !salt) {
        alert("You must provide both bid amount and salt.");
        return;
      }

      let bidInWei;
      try {
        bidInWei = ethers.parseEther(bidAmount.toString());
      } catch (err) {
        alert("Invalid bid amount. Use a valid number");
        return;
      }

      //Check min and max bounds
      const minBidWei = listing.price;
      const maxBidWei = ethers.parseEther(listingLimits.MAX_BID_ETH.toString());

      if (bidInWei < minBidWei) {
        alert(
          `❌ Your bid must be at least ${ethers.formatEther(minBidWei)} ETH.`
        );
        return;
      }

      if (bidInWei > maxBidWei) {
        alert(
          `❌ Your bid exceeds the maximum allowed: ${listingLimits.MAX_BID_ETH} ETH.`
        );
        return;
      }

      // Pack and hash bid + salt
      const packed = solidityPacked(["uint256", "string"], [bidInWei, salt]);
      const commitHash = keccak256(packed);

      // Submit bid
      const tx = await tradingContract.commitBid(
        listing.pokemonId,
        commitHash,
        {
          value: bidInWei,
        }
      );
      await tx.wait();

      alert(
        `✅ Your bid has been committed successfully!
      
      📌 Details:
      - Bid Amount: ${bidAmount} ETH
      - Secret Salt: ${salt}
      
      ⚠️ Make sure to save your bid amount and salt securely. 
      You will need them to reveal your bid later and be eligible to win the Pokémon.`
      );

      onClose?.(); //Close Modal
      onListed?.(); //Refresh listings
    } catch (err) {
      console.error("Bid failed:", err);
      alert("❌ Bid commit failed.");
    } finally {
      setLoading(false);
    }
  };

  //FINALIZING AN AUCTION
  const handleFinalize = async () => {
    try {
      setLoading(true);

      const tx = await tradingContract.finalizeAuction(listing.pokemonId);
      await tx.wait();
      onClose?.(); //Close Modal
      onListed?.(); //Refresh MyPokemon/Marketplace/Gallery
      alert("✅ Finalizing successful!");
    } catch (err) {
      console.error("Finalizing failed:", err);
      alert("❌ Finalizing failed.");
    } finally {
      setLoading(false);
    }
  };

  //REVEALING COMMITTED BIDS
  const handleReveal = async () => {
    try {
      setLoading(true);
      if (!bidAmount || !salt) {
        alert("❌ Type in a correct bid and salt!");
        return;
      }

      const bidInWei = ethers.parseEther(bidAmount);
      const tx = await tradingContract.revealBid(
        listing.pokemonId,
        bidInWei,
        salt
      );
      await tx.wait();
      alert("✅ Bid revealed successfully!");
      onListed?.();
      onClose?.(); //Close Modal
    } catch (err) {
      console.error("Reveal failed:", err);

      // Heuristic: if it's a call revert, assume it's likely the hash mismatch
      const reason =
        err?.message?.includes("revert") || err?.code === "CALL_EXCEPTION"
          ? `The reveal likely failed because your bid amount or salt does not match your committed bid.`
          : `An unexpected error occurred.`;

      alert(`❌ Reveal failed. ${reason}`);
    } finally {
      setLoading(false);
    }
  };

  /////////////////////////////////////////////
  //UI LOGIC

  //1. OWNER ACTIONS
  if (isOwner) {
    if (!isAuction || (isAuction && !ended)) {
      return (
        <>
          <button
            onClick={() => handleDelist()}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg w-full md:w-1/2"
          >
            Delist Pokemon
          </button>
          {!isAuction ? (
            <p className="text-sm text-gray-600 font-medium mt-2">
              This is a fixed price listing and will remain active until
              manually delisted.
            </p>
          ) : (
            <p className="mb-2 text-black-600 font-semibold">{timeLeft}</p>
          )}
        </>
      );
    }

    //During reveal window owner can see time
    if (isAuction && !revealWindowClosed) {
      return (
        <p className="mb-2 text-black-600 font-semibold">
          Can finalize when reveal window ends. {timeLeft}
        </p>
      );
    }

    // Also allow owner to finalize after reveal window has closed
    if (isAuction && revealWindowClosed) {
      return (
        <div className="space-y-4 w-full md:w-2/3 mx-auto">
          {/* Info Message */}
          <div className="bg-green-50 border-l-4 border-green-500 text-green-800 p-3 text-sm rounded shadow-sm">
            <strong>🎉 Finalize Reward:</strong> You’ll earn
            <span className="font-bold text-green-700"> 0.0015 ETH</span> for
            finalizing this auction! Be the one to finalize and claim your
            reward in the refunds.
          </div>

          {/* Finalize Button */}
          <button
            onClick={() => handleFinalize()}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg w-full"
          >
            {loading ? "Finalizing..." : "Finalize Auction"}
          </button>
        </div>
      );
    }
    return null; // Owner can't do anything else after auction ended
  }

  // 2. NON-OWNER FIXED PRICE BUY
  if (!isOwner && !isAuction) {
    return (
      <button
        onClick={handleBuy}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg w-full md:w-1/2"
      >
        {loading
          ? "Processing..."
          : `Buy Pokemon for ${ethers.formatEther(listing.price)} ETH`}
      </button>
    );
  }

  // 3. NON-OWNER AUCTION COMMIT
  if (!isOwner && isAuction && !ended) {
    if (hasCommitted) {
      return (
        <>
          <p className="text-gray-700 text-center font-medium">
            ✅ You have already committed a bid. The reveal window opens once
            the auction has ended.
          </p>
          <p className="mb-2 text-black-600 font-semibold">{timeLeft}</p>
          <hr className="my-1 border-gray-300" />
          <div className="flex flex-col">
            <span className="text-gray-600">🕒 Reveal window duration:</span>
            <span className="font-semibold">
              {formatSecondsToHMS(listing.finalizeDelay)}
            </span>
          </div>
        </>
      );
    }

    return (
      <div className="space-y-4 w-full">
        {/* Warning Message */}
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-3 text-sm rounded">
          <strong>⚠️ Reminder:</strong> You must{" "}
          <span className="font-bold">
            remember your bid amount and secret salt
          </span>
          . If you forget to reveal your bid during the reveal window,{" "}
          <span className="font-semibold">you will be refunded</span> — but{" "}
          <span className="text-red-600 font-semibold">
            you will not be eligible to win the Pokemon
          </span>
          .
        </div>

        {/* Bid Input */}
        <div className="relative w-full">
          <input
            type="text"
            placeholder={`Your bid (min ${ethers.formatEther(
              `${listing.price}`
            )} ETH)`}
            className="w-full p-2 pr-8 border border-gray-300 rounded"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <InfoTooltip
              message={`Your bid must be at least ${ethers.formatEther(
                `${listing.price}`
              )} ETH and no more than ${listingLimits.MAX_BID_ETH} ETH.`}
            />
          </div>
        </div>

        {/* Salt Input */}
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Your secret salt"
            className="w-full p-2 pr-8 border border-gray-300 rounded"
            value={salt}
            onChange={(e) => setSalt(e.target.value)}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <InfoTooltip message="The salt is a secret word or number you choose. It helps reveal your bid later — keep it safe!" />
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={() => handleBid()}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg w-full"
        >
          {loading ? "Submitting..." : "Commit Bid"}
        </button>

        {/* Countdown and Reveal Info */}
        <div className="text-sm text-gray-800 font-medium space-y-1 mt-4 leading-relaxed">
          <p> ⏳ {timeLeft}</p>
          <hr className="my-1 border-gray-300" />
          <div className="flex flex-col">
            <span className="text-gray-600">🕒 Reveal window duration:</span>
            <span className="font-semibold">
              {formatSecondsToHMS(listing.finalizeDelay)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 4. REVEAL WINDOW IS OPEN
  if (!isOwner && isAuction && ended && !revealWindowClosed) {
    if (hasCommitted) {
      if (revealed) {
        return (
          <>
            <p className="text-center text-black-600 font-semibold">
              ⏳ Auction has ended and you have revealed your bid.
            </p>
            <p className="mb-2 text-black-600 font-semibold">
              Can finalize in when reveal window ends. {timeLeft}
            </p>
          </>
        );
      } else {
        return (
          <div className="space-y-4 w-full md:w-2/3 mx-auto">
            <p className="text-center text-black-600 font-semibold">
              ⏳ Auction has ended. Reveal your bid to finalize.
            </p>
            <p className="text-center text-black-600 font-semibold">
              {timeLeft}
            </p>

            <input
              type="text"
              placeholder="Enter the amount you bid (ETH)"
              className="w-full p-2 border border-gray-300 rounded"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
            />
            <input
              type="text"
              placeholder="Enter your secret salt"
              className="w-full p-2 border border-gray-300 rounded"
              value={salt}
              onChange={(e) => setSalt(e.target.value)}
            />

            <button
              onClick={() => handleReveal()}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg w-full"
            >
              {loading ? "Revealing..." : "Reveal Bid"}
            </button>
          </div>
        );
      }
    } else {
      return (
        <p className="mb-2 text-black-600 font-semibold">
          Can finalize when reveal window ends. {timeLeft}
        </p>
      );
    }
  }

  // 5. REVEAL WINDOW CLOSED
  if (isAuction && revealWindowClosed) {
    return (
      <div className="space-y-4 w-full md:w-2/3 mx-auto">
        {/* Info Message */}
        <div className="bg-green-50 border-l-4 border-green-500 text-green-800 p-3 text-sm rounded shadow-sm">
          <strong>🎉 Finalize Reward:</strong> You’ll earn
          <span className="font-bold text-green-700">
            {" "}
            {listingLimits.FINALIZER_FEE_ETH} ETH
          </span>{" "}
          for finalizing this auction! Be the one to finalize and claim your
          reward in the refunds.
        </div>

        {/* Finalize Button */}
        <button
          onClick={() => handleFinalize()}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg w-full"
        >
          {loading ? "Finalizing..." : "Finalize Auction"}
        </button>
      </div>
    );
  }
}

//////////////////////////////////////////////
//HELPER FUNCTIONS:

// formatting finalizeDelay
function formatSecondsToHMS(secondsBigInt) {
  const seconds = Number(secondsBigInt); // Convert BigInt to Number

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}min ${s}s`;
}

// calculate remaining time:
function useAuctionCountdown(auctionEndTime, finalizeDelay) {
  const [timeLeft, setTimeLeft] = useState("");
  const [ended, setEnded] = useState(false);
  const [revealWindowClosed, setRevealWindowClosed] = useState(false); // finalization allowed

  useEffect(() => {
    if (!auctionEndTime || !finalizeDelay) return;

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const secondsUntilAuctionEnd = auctionEndTime - now;
      const secondsUntilRevealEnd = auctionEndTime + finalizeDelay - now;

      if (secondsUntilRevealEnd <= 0) {
        setTimeLeft("Reveal period ended");
        setEnded(true);
        setRevealWindowClosed(true);
        return;
      }

      if (secondsUntilAuctionEnd > 0) {
        // Still in bidding phase
        const hours = Math.floor(secondsUntilAuctionEnd / 3600);
        const minutes = Math.floor((secondsUntilAuctionEnd % 3600) / 60);
        const seconds = secondsUntilAuctionEnd % 60;
        setTimeLeft(`Auction ends in: ${hours}h ${minutes}m ${seconds}s`);
        setEnded(false);
        setRevealWindowClosed(false);
      } else {
        // In reveal phase
        const minutes = Math.floor(secondsUntilRevealEnd / 60);
        const seconds = secondsUntilRevealEnd % 60;
        setTimeLeft(`Reveal ends in: ${minutes}m ${seconds}s`);
        setEnded(true);
        setRevealWindowClosed(false);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [auctionEndTime, finalizeDelay]);

  return { timeLeft, ended, revealWindowClosed };
}
