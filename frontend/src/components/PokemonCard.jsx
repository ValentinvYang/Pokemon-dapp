import { useEffect, useState } from "react";
import { useContracts } from "../contexts/AppContracts";

export default function PokemonCard({ pokemonId }) {
  const { pokemonContract } = useContracts();
  const [metadata, setMetadata] = useState(null);

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
    <div className="pokemon-card bg-white rounded-lg shadow-md p-4 text-center">
      <h3 className="text-lg font-bold mb-2">{metadata.name}</h3>
      <img
        src={metadata.image}
        alt={metadata.name}
        className="w-full h-auto rounded"
      />
      <ul className="mt-4 text-sm text-left">
        {metadata.attributes.map((attr, i) => (
          <li key={i}>
            <strong>{attr.trait_type}</strong>: {attr.value}
          </li>
        ))}
      </ul>
    </div>
  );
}
