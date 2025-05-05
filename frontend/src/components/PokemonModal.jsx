import React, { useContext } from "react";
import { ContractContext } from "../contexts/AppContracts";
import { ethers } from "ethers";
import OwnerListingForm from "./OwnerListingForm";
import ListingActions from "./ListingActions";

// UTILS
const toTitleCase = (str) =>
  str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

// COLORS FOR EACH POKEMON TYPE
const typeColors = {
  normal: "#A8A77A",
  fire: "#EE8130",
  water: "#6390F0",
  electric: "#F7D02C",
  grass: "#7AC74C",
  ice: "#96D9D6",
  fighting: "#C22E28",
  poison: "#A33EA1",
  ground: "#E2BF65",
  flying: "#A98FF3",
  psychic: "#F95587",
  bug: "#A6B91A",
  rock: "#B6A136",
  ghost: "#735797",
  dragon: "#6F35FC",
  dark: "#705746",
  steel: "#B7B7CE",
  fairy: "#D685AD",
};

// MAX STATS FOR A POKEMON
const maxStats = {
  hp: 255,
  attack: 190,
  defense: 250,
  "special-attack": 194,
  "special-defense": 250,
  speed: 180,
};

// ATTRIBUTES DISPLAYED IN POKEMON MODAL
function PokemonAttributes({ attributes }) {
  const primaryType = attributes
    .find((a) => a.trait_type === "Type")
    ?.value?.toLowerCase();
  const color = typeColors[primaryType] || "#ccc";

  return (
    <ul className="text-sm space-y-4">
      {attributes
        .filter((attr) => attr.trait_type !== "Type")
        .map((attr, i) => {
          const max = maxStats[attr.trait_type.toLowerCase()] || 100;
          const percentage = Math.min((attr.value / max) * 100, 100);

          return (
            <li key={i}>
              <div className="flex justify-between">
                <strong>{toTitleCase(attr.trait_type)}</strong>
                <span>{attr.value}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: color,
                  }}
                ></div>
              </div>
            </li>
          );
        })}
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
      <div className="bg-white rounded-2xl p-6 w-full max-w-6xl h-screen md:h-[90vh] overflow-y-auto shadow-xl relative flex flex-col">
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Modal Content */}
        <div className="flex flex-col gap-6 flex-grow justify-between">
          <h2 className="text-3xl font-bold text-center mt-4">
            {metadata.name.charAt(0).toUpperCase() + metadata.name.slice(1)}
          </h2>

          <div className="flex flex-col md:flex-row gap-6 flex-grow min-h-0">
            {/* Image */}
            <div className="w-full md:w-[65%] flex justify-center items-center flex-grow">
              <img
                src={metadata.image}
                alt={metadata.name}
                className="w-full max-h-[400px] object-contain rounded-lg"
              />
            </div>

            {/* Attributes */}
            <div className="w-full lg:mr-16 md:mr-8 md:w-[35%] mt-4 md:mt-8 flex flex-col md:justify-center flex-grow">
              <h3 className="text-xl font-semibold mb-2">Battle Stats</h3>
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
