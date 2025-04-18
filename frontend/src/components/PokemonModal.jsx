import React from "react";

export default function PokemonModal({ isOpen, onClose, metadata }) {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center px-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-xl relative">
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Modal Content */}
        <div className="flex flex-col gap-6">
          <h2 className="text-3xl font-bold text-center">{metadata.name}</h2>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Image */}
            <div className="w-full md:w-[65%]">
              <img
                src={metadata.image}
                alt={metadata.name}
                className="w-full h-auto object-contain rounded-lg"
              />
            </div>

            {/* Attributes */}
            <div className="w-full md:w-[35%]">
              <h3 className="text-xl font-semibold mb-2">Attributes</h3>
              <ul className="text-sm space-y-2">
                {metadata.attributes.map((attr, i) => (
                  <li key={i}>
                    <strong>{attr.trait_type}</strong>: {attr.value}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Buy Button */}
          <div className="mt-6 text-center">
            <button
              onClick={() => alert("Buy action")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg w-full md:w-1/2"
            >
              Buy Pokémon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
