import React, { useContext } from "react";
import { ethers } from "ethers";
import { useState } from "react";
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

  if (isOwner) {
    return (
      <button
        onClick={() => alert("Delist action")}
        className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg w-full md:w-1/2"
      >
        Delist Pokémon
      </button>
    );
  } else {
    if (isAuction) {
      return (
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
      );
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
