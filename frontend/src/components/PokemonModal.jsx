import React, { useContext } from "react";
import { ContractContext } from "../contexts/AppContracts";
import { ethers } from "ethers";
import OwnerListingForm from "./OwnerListingForm";
import ListingActions from "./ListingActions";

//Backgrounds:
import FireBackground from "../assets/FireBackground.png";
import WaterBackground from "../assets/WaterBackground.png";
import GrassBackground from "../assets/GrassBackground.png";
import ElectricBackground from "../assets/ElectricBackground.png";

function PokemonAttributes({ attributes }) {
  return (
    <ul className="text-sm space-y-2">
      {attributes.map((attr, i) => (
        <li key={i}>
          <strong>{attr.trait_type}</strong>: {attr.value}
        </li>
      ))}
    </ul>
  );
}

export default function PokemonModal({
  isOpen,
  onClose,
  metadata,
  owner,
  listing,
  pokemonId,
  onListed,
}) {
  if (!isOpen) return null;

  const { address: currentUser } = useContext(ContractContext);
  const isOwner = owner?.toLowerCase() === currentUser?.toLowerCase();

  const primaryType = metadata.attributes
    .find((attr) => attr.trait_type === "Type")
    ?.value?.toLowerCase();

  const typeBackground = {
    fire: FireBackground,
    water: WaterBackground,
    grass: GrassBackground,
    electric: ElectricBackground,
  };

  const backgroundImage = typeBackground[primaryType] || null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const renderActionArea = () => {
    if (listing)
      return (
        <ListingActions
          isOwner={isOwner}
          listing={listing}
          onClose={onClose}
          onListed={onListed}
        />
      );
    if (!listing && isOwner)
      return (
        <OwnerListingForm
          pokemonId={pokemonId}
          onClose={onClose}
          onListed={onListed}
        />
      );
    return null;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center px-2 md:px-4"
      onClick={handleBackdropClick}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-4xl h-screen md:h-[90vh] overflow-y-auto shadow-xl relative flex flex-col"
        style={{
          backgroundImage: backgroundImage
            ? `linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3)), url(${backgroundImage})`
            : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundColor: backgroundImage ? "rgba(255,255,255,0.9)" : "white",
        }}
      >
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Modal Content */}
        <div className="flex flex-col gap-6 flex-grow">
          <h2 className="text-3xl font-bold text-center mt-4">
            {metadata.name.charAt(0).toUpperCase() + metadata.name.slice(1)}
          </h2>

          <div className="flex flex-col md:flex-row gap-6 flex-grow">
            {/* Image */}
            <div className="w-full md:w-[65%] flex justify-center items-start">
              <img
                src={metadata.image}
                alt={metadata.name}
                className="w-full max-h-[400px] object-contain rounded-lg"
              />
            </div>

            {/* Attributes */}
            <div className="w-full md:w-[35%]">
              <h3 className="text-xl font-semibold mb-2">Attributes</h3>
              <PokemonAttributes attributes={metadata.attributes} />
            </div>
          </div>

          {/* Action Area */}
          <div className="mt-auto mb-4 text-center space-y-4">
            {renderActionArea()}
          </div>
        </div>
      </div>
    </div>
  );
}
