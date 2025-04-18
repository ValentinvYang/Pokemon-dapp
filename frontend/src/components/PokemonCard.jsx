import { useEffect, useState } from "react";
import { useContracts } from "../contexts/AppContracts";
import PokemonModal from "./PokemonModal";

export default function PokemonCard({ pokemonId }) {
  const { pokemonContract } = useContracts();
  const [metadata, setMetadata] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        if (!pokemonContract || pokemonId === undefined) return;

        const tokenUri = await pokemonContract.getTokenURI(pokemonId);
        const cid = tokenUri.replace("ipfs://", "");

        const metadataUrl = `http://localhost:8080/?cid=${cid}&json=true`;
        const res = await fetch(metadataUrl);
        const data = await res.json();

        const imageCid = data.image.replace("ipfs://", "");
        const imageUrl = `http://localhost:8080/?cid=${imageCid}`;

        setMetadata({ ...data, image: imageUrl });
      } catch (err) {
        console.error("Error loading metadata:", err);
        setMetadata(null);
      }
    };

    fetchMetadata();
  }, [pokemonContract, pokemonId]);

  if (!metadata) return <div>Loading Pokemon</div>;

  return (
    <>
      <div
        className="pokemon-card bg-white rounded-lg shadow-md p-4 text-center cursor-pointer"
        onClick={() => setIsOpen(true)}
      >
        <h3 className="text-lg font-bold mb-2">{metadata.name}</h3>
        <img
          src={metadata.image}
          alt={metadata.name}
          className="w-full h-auto rounded"
        />
      </div>

      <PokemonModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        metadata={metadata}
      />
    </>
  );
}
