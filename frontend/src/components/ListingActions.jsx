import React, { useContext } from "react";
import { ethers } from "ethers";
import { useState, useEffect } from "react";
import { ContractContext } from "../contexts/AppContracts";
import { keccak256, solidityPacked, toUtf8Bytes } from "ethers";

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

      if (bidInWei < listing.price) {
        alert(
          `❌ Your bid must be at least ${ethers.formatEther(
            listing.price
          )} ETH`
        );
        return;
      }

      const packed = solidityPacked(["uint256", "string"], [bidInWei, salt]);
      const commitHash = keccak256(packed);

      const tx = await tradingContract.commitBid(
        listing.pokemonId,
        commitHash,
        {
          value: bidInWei,
        }
      );
      await tx.wait();

      alert(
        `✅ Bid committed with salt: ${salt} and bid: ${bidAmount}. Make sure to remember your salt and bid!`
      );
      onClose?.(); //Close Modal
      onListed?.(); //Refresh MyPokemon/Marketplace/Gallery
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
      alert("❌ Reveal failed.");
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
          <p className="mb-2 text-black-600 font-semibold">{timeLeft}</p>
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
    return null; // Owner can't do anything else after auction ended
  }

  // 2. NON-OWNER FIXED PRICE BUY
  if (!isOwner && !isAuction) {
    return (
      <button
        onClick={handleBuy}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg w-full"
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
            ✅ You have already committed a bid.
          </p>
          <p className="mb-2 text-black-600 font-semibold">{timeLeft}</p>
        </>
      );
    }

    return (
      <div className="space-y-3 w-full">
        <p className="text-red-600 text-sm font-medium">
          ⚠️ Remember your bid amount and salt — you must reveal them later or
          lose your deposit!
        </p>
        <input
          type="text"
          placeholder={`Your bid (min ${ethers.formatEther(
            `${listing.price}`
          )} ETH)`}
          className="w-full p-2 border border-gray-300 rounded"
          value={bidAmount}
          onChange={(e) => setBidAmount(e.target.value)}
        />
        <input
          type="text"
          placeholder="Your Secret Salt"
          className="w-full p-2 border border-gray-300 rounded"
          value={salt}
          onChange={(e) => setSalt(e.target.value)}
        />
        <button
          onClick={() => handleBid()}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg w-full"
        >
          {loading ? "Submitting..." : "Commit Bid"}
        </button>
        <p className="mb-2 text-black-600 font-semibold">{timeLeft}</p>
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
      <button
        onClick={() => handleFinalize()}
        className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg w-full md:w-1/2"
      >
        {loading ? "Loading..." : "Finalize auction"}
      </button>
    );
  }
}

//Helper function to calculate remaining time:
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
