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

  const { pokemonContract, tradingContract, signer } =
    useContext(ContractContext);
  const [loading, setLoading] = useState(false);
  const isAuction = listing.isAuction;

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
          <button
            onClick={() => handleDelist()}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg w-full md:w-1/2"
          >
            Delist Pokémon
          </button>
        );
      }

      // Non-owner view
      if (!isOwner || ended) {
        return (
          <>
            {ended ? (
              <button
                onClick={() => alert("Finalize auction")}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg w-full md:w-1/2"
              >
                Finalize Auction
              </button>
            ) : (
              <>
                <p className="mb-2 text-gray-700">
                  Highest bid: {ethers.formatEther(listing.highestBid || 0)} ETH
                </p>
                <button
                  onClick={() => alert("Bid action")}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg w-full md:w-1/2"
                >
                  Place Bid higher than{" "}
                  {ethers.formatEther(
                    listing.highestBid > listing.price
                      ? listing.highestBid
                      : listing.price
                  )}{" "}
                  ETH
                </button>
              </>
            )}

            <p className="mb-2 text-black-600 font-semibold">
              Auction ends in: {timeLeft}
            </p>
          </>
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
