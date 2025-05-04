import React, { useContext } from "react";
import { ethers } from "ethers";
import { useState, useEffect } from "react";
import { ContractContext } from "../contexts/AppContracts";

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
  const [showBidInput, setShowBidInput] = useState(false);

  const isAuction = listing.isAuction;
  const currentHighest = listing.highestBid || listing.price;
  const minIncrement = (BigInt(currentHighest) * 5n) / 100n;
  const minimumRequired = BigInt(currentHighest) + minIncrement;
  const isHighestBidder =
    listing?.highestBidder &&
    signer?.address &&
    signer.address.toLowerCase() === listing.highestBidder.toLowerCase();

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
  const handleBid = async (bidAmount) => {
    try {
      setLoading(true);

      let bidInWei;
      try {
        bidInWei = ethers.parseEther(bidAmount.toString());
      } catch (err) {
        alert("Invalid bid amount. Use a valid number");
        return;
      }

      if (bidInWei < minimumRequired) {
        alert(
          `❌ Your bid must be at least 5% higher than ${ethers.formatEther(
            currentHighest
          )} ETH`
        );
        return;
      }

      const tx = await tradingContract.placeBid(listing.pokemonId, {
        value: bidInWei,
      });
      await tx.wait();

      onClose?.(); //Close Modal
      onListed?.(); //Refresh MyPokemon/Marketplace/Gallery
      alert("✅ Bid placed successfully!");
    } catch (err) {
      console.error("Bid failed:", err);
      alert("❌ Bid failed.");
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

  /////////////////////////////////////////////
  //UI LOGIC

  if (isOwner && !isAuction) {
    return (
      <button
        onClick={() => handleDelist()}
        className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg w-full md:w-1/2"
      >
        Delist Pokémon
      </button>
    );
  } else {
    if (isAuction) {
      const { timeLeft, ended } = useAuctionCountdown(
        Number(listing.auctionEndTime)
      );

      // Owner view — only show Delist if auction hasn't ended
      if (isOwner && !ended) {
        return (
          <>
            <button
              onClick={() => handleDelist()}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg w-full md:w-1/2"
            >
              Delist Pokémon
            </button>
            <p className="mb-2 text-black-600 font-semibold">
              Auction ends in: {timeLeft}
            </p>
          </>
        );
      }

      // Non-owner view
      if (!isOwner || ended) {
        return (
          <div className="flex flex-col items-center space-y-3 w-full">
            {/* Highest bidder info */}
            {isHighestBidder && !ended && (
              <p className="mb-2 text-black-600 font-semibold text-center">
                You placed the last highest bid:{" "}
                {ethers.formatEther(listing.highestBid)} ETH
              </p>
            )}

            {/* Auction action buttons */}
            {ended ? (
              <button
                onClick={() => handleFinalize()}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg w-full md:w-1/2"
              >
                {loading ? "Loading..." : "Finalize auction"}
              </button>
            ) : !isHighestBidder && !showBidInput ? (
              <button
                onClick={() => setShowBidInput(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg w-full md:w-1/2"
              >
                Place Bid
              </button>
            ) : !isHighestBidder && showBidInput ? (
              <div className="space-y-3 w-full md:w-1/2">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={`Place Bid ≥ ${ethers.formatEther(
                    minimumRequired
                  )} ETH`}
                  className="w-full p-2 border border-gray-300 rounded"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                />
                <button
                  onClick={() => handleBid(bidAmount)}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg w-full"
                >
                  {loading ? "Submitting..." : "Confirm Bid"}
                </button>
              </div>
            ) : null}

            <p className="mb-2 text-black-600 font-semibold text-center">
              Auction ends in: {timeLeft}
            </p>
          </div>
        );
      }
    } else {
      return (
        <button
          onClick={() => {
            handleBuy();
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg w-full"
        >
          {loading
            ? "Loading..."
            : `Buy Pokémon for ${ethers.formatEther(listing.price)} ETH`}
        </button>
      );
    }
  }
}

//Helper function to calculate remaining time:
function useAuctionCountdown(auctionEndTime) {
  const [timeLeft, setTimeLeft] = useState("");
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (!auctionEndTime) return;

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const secondsRemaining = auctionEndTime - now;

      if (secondsRemaining <= 0) {
        setTimeLeft("Auction ended");
        setEnded(true);
        return;
      }

      const hours = Math.floor(secondsRemaining / 3600);
      const minutes = Math.floor((secondsRemaining % 3600) / 60);
      const seconds = secondsRemaining % 60;

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [auctionEndTime]);

  return { timeLeft, ended };
}
