import { useState, useContext } from "react";
import { ContractContext } from "../contexts/AppContracts";
import { ethers } from "ethers";

function OwnerListingForm({ pokemonId, onClose, onListed }) {
  const { pokemonContract, tradingContract } = useContext(ContractContext);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectedType, setSelectedType] = useState(null); // 'fixed' or 'auction'
  const [price, setPrice] = useState("");
  const [auctionDuration, setAuctionDuration] = useState("");
  const [finalizeDelay, setFinalizeDelay] = useState("");
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

      if (isAuction && Number(finalizeDelay) < 120) {
        alert("Finalize delay has to be larger than 100");
        return;
      }

      setLoading(true);

      let priceInWei;
      try {
        priceInWei = ethers.parseEther(price);
      } catch (err) {
        alert("Invalid price input. Please use a valid number");
        return;
      }

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
        isAuction ? Number(finalizeDelay) : 0,
        {
          value: isAuction ? ethers.parseEther("0.0015") : 0n, //FINALIZER_FEE
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
    <div className="space-y-4 w-full md:w-2/3 mx-auto md:mt-4">
      {!showTypeSelector ? (
        <button
          onClick={() => setShowTypeSelector(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg w-full"
        >
          Create Listing
        </button>
      ) : (
        <>
          {!selectedType && (
            <select
              className="w-full p-2 border border-gray-300 rounded"
              onChange={(e) => setSelectedType(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>
                Select Listing Type
              </option>
              <option value="fixed">Fixed Price</option>
              <option value="auction">Auction</option>
            </select>
          )}

          {selectedType === "fixed" && (
            <>
              <input
                type="text"
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
          )}

          {selectedType === "auction" && (
            <>
              <input
                type="text"
                placeholder="Enter minimum bid in ETH"
                className="w-full p-2 border border-gray-300 rounded"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <input
                type="text"
                placeholder="Enter auction duration (≥ 100 seconds)"
                className="w-full p-2 border border-gray-300 rounded"
                value={auctionDuration}
                onChange={(e) => setAuctionDuration(e.target.value)}
              />
              <input
                type="text"
                placeholder="Enter reveal window duration (≥ 120 seconds)"
                className="w-full p-2 border border-gray-300 rounded"
                value={finalizeDelay}
                onChange={(e) => setFinalizeDelay(e.target.value)}
              />
              <button
                onClick={() => handleListing(true)}
                disabled={loading}
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold px-4 py-2 rounded-lg w-full disabled:opacity-50"
              >
                {loading ? "Listing..." : "Confirm Auction"}
              </button>
            </>
          )}
        </>
      )}
    </div>
    /*
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
              type="text"
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
              type="text"
              placeholder="This is the minimum bid in ETH."
              className="w-full p-2 border border-gray-300 rounded"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <input
              type="text"
              placeholder="Enter auction duration (seconds >= 100)"
              className="w-full p-2 border border-gray-300 rounded"
              value={auctionDuration}
              onChange={(e) => setAuctionDuration(e.target.value)}
            />
            <input
              type="text"
              placeholder="Enter reveal window duration (seconds >= 120)"
              className="w-full p-2 border border-gray-300 rounded"
              value={finalizeDelay}
              onChange={(e) => setFinalizeDelay(e.target.value)}
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
    */
  );
}

export default OwnerListingForm;
