import { useState, useContext } from "react";
import { ContractContext } from "../contexts/AppContracts";
import { ethers } from "ethers";
import listingLimits from "../config/listingLimits.json";
import { InfoTooltip } from "./InfoToolTip";

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

      if (
        Number(price) < listingLimits.MIN_PRICE_ETH ||
        Number(price) > listingLimits.MAX_PRICE_ETH
      ) {
        alert(
          `Price must be between ${listingLimits.MIN_PRICE_ETH} and ${listingLimits.MAX_PRICE_ETH} ETH.`
        );
        return;
      }

      if (
        isAuction &&
        (Number(auctionDuration) < listingLimits.MIN_AUCTION_DURATION ||
          Number(auctionDuration) > listingLimits.MAX_AUCTION_DURATION)
      ) {
        alert(
          `Auction duration must be between ${listingLimits.MIN_AUCTION_DURATION} and ${listingLimits.MAX_AUCTION_DURATION} seconds.`
        );
        return;
      }

      if (
        isAuction &&
        (Number(finalizeDelay) < listingLimits.MIN_FINALIZE_DELAY ||
          Number(finalizeDelay) > listingLimits.MAX_FINALIZE_DELAY)
      ) {
        alert(
          `Finalize delay must be between ${listingLimits.MIN_FINALIZE_DELAY} and ${listingLimits.MAX_FINALIZE_DELAY} seconds.`
        );
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
      alert("✅ Pokemon listed successfully!");
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
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Enter price in ETH"
                  className="w-full p-2 pr-8 border border-gray-300 rounded"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <InfoTooltip
                    message={`Price must be between ${listingLimits.MIN_PRICE_ETH} and ${listingLimits.MAX_PRICE_ETH} ETH.`}
                  />
                </div>
              </div>
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
              {/* Minimum Bid Input */}
              <div className="relative w-full mb-2">
                <input
                  type="text"
                  placeholder="Enter minimum bid in ETH"
                  className="w-full p-2 pr-8 border border-gray-300 rounded"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <InfoTooltip
                    message={`Minimum bid must be between ${listingLimits.MIN_PRICE_ETH} and ${listingLimits.MAX_PRICE_ETH} ETH.`}
                  />
                </div>
              </div>

              {/* Auction Duration Input */}
              <div className="relative w-full mb-2">
                <input
                  type="text"
                  placeholder="Enter auction duration (seconds)"
                  className="w-full p-2 pr-8 border border-gray-300 rounded"
                  value={auctionDuration}
                  onChange={(e) => setAuctionDuration(e.target.value)}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <InfoTooltip
                    message={`Duration must be between ${listingLimits.MIN_AUCTION_DURATION} and ${listingLimits.MAX_AUCTION_DURATION} seconds.`}
                  />
                </div>
              </div>

              {/* Finalize Delay Input */}
              <div className="relative w-full mb-2">
                <input
                  type="text"
                  placeholder="Enter reveal window (seconds)"
                  className="w-full p-2 pr-8 border border-gray-300 rounded"
                  value={finalizeDelay}
                  onChange={(e) => setFinalizeDelay(e.target.value)}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <InfoTooltip
                    message={`Reveal window must be between ${listingLimits.MIN_FINALIZE_DELAY} and ${listingLimits.MAX_FINALIZE_DELAY} seconds.`}
                  />
                </div>
              </div>

              {/* Finalizer Fee Notice */}
              <div className="text-sm text-yellow-700 bg-yellow-100 border-l-4 border-yellow-400 p-3 rounded mb-2">
                <strong>⚠️ Note:</strong> Starting an auction requires a{" "}
                <span className="font-semibold">
                  {listingLimits.FINALIZER_FEE_ETH} ETH
                </span>{" "}
                finalizer fee, which is paid to the third party that finalizes
                the auction.
              </div>

              {/* Confirm Button */}
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
  );
}

export default OwnerListingForm;
