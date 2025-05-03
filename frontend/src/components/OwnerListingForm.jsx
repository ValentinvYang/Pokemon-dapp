import { useState, useContext } from "react";
import { ContractContext } from "../contexts/AppContracts";
import { ethers } from "ethers";

function OwnerListingForm({ pokemonId, onClose, onListed }) {
  const { pokemonContract, tradingContract } = useContext(ContractContext);
  const [showFormFixed, setShowFormFixed] = useState(false);
  const [showFormAuction, setShowFormAuction] = useState(false);
  const [hideFixedButton, setHideFixedButton] = useState(false);
  const [hideAuctionButton, setHideAuctionButton] = useState(false);
  const [price, setPrice] = useState("");
  const [auctionDuration, setAuctionDuration] = useState("");
  const [loading, setLoading] = useState(false);

  const handleListing = async (isAuction) => {
    try {
      if (price === "" || isNaN(price) || Number(price) <= 0) {
        alert("Please enter a valid price in ETH.");
        return;
      }

      if (isAuction && Number(auctionDuration) < 100) {
        alert("Auction duration has to be larger than 100");
        return;
      }

      setLoading(true);

      const priceInWei = ethers.parseEther(price);

      // Step 1: Approve trading contract to transfer the token
      const approveTx = await pokemonContract.approve(
        tradingContract.target,
        pokemonId
      );
      await approveTx.wait();

      // Step 2: Call listPokemon (fixed price, not auction)
      const tx = await tradingContract.listPokemon(
        pokemonId,
        priceInWei,
        isAuction,
        isAuction ? Number(auctionDuration) : 0,
        {
          value: isAuction ? ethers.parseEther("0.01") : 0n, //Finalizer fee
        }
      );
      await tx.wait();

      onClose?.(); //Close PokemonModal after successful transaction
      onListed?.(); //Force Refresh page
      alert("✅ Pokémon listed successfully!");
    } catch (err) {
      console.error("Listing failed:", err);
      alert("❌ Listing failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 w-full md:w-2/3 mx-auto">
      {!hideFixedButton &&
        (!showFormFixed ? (
          <button
            onClick={() => {
              setShowFormFixed(true);
              setHideAuctionButton(true);
            }}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg w-full"
          >
            Create Fixed Price Listing
          </button>
        ) : (
          <>
            <input
              type="number"
              placeholder="Enter price in ETH"
              className="w-full p-2 border border-gray-300 rounded"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <button
              onClick={() => handleListing(false)}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg w-full disabled:opacity-50"
            >
              {loading ? "Listing..." : "Confirm Listing"}
            </button>
          </>
        ))}

      {!hideAuctionButton &&
        (!showFormAuction ? (
          <button
            onClick={() => {
              setShowFormAuction(true);
              setHideFixedButton(true);
            }}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg w-full"
          >
            Create Auction Listing
          </button>
        ) : (
          <>
            <input
              type="number"
              placeholder="Enter starting price in ETH"
              className="w-full p-2 border border-gray-300 rounded"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <input
              type="number"
              placeholder="Enter auction duration (seconds >= 100)"
              className="w-full p-2 border border-gray-300 rounded"
              value={auctionDuration}
              onChange={(e) => setAuctionDuration(e.target.value)}
            />
            <button
              onClick={() => handleListing(true)}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg w-full disabled:opacity-50"
            >
              {loading ? "Listing..." : "Confirm Listing"}
            </button>
          </>
        ))}
    </div>
  );
}

export default OwnerListingForm;
