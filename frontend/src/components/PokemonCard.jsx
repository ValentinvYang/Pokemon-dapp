import { useEffect, useState } from "react";
import useContracts from "../hooks/useContracts";

export default function PokemonCard({ pokemonId }) {
  const { getContracts } = useContracts();
  const [metadata, setMetadata] = useState(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        if (!getContracts) return;

        const { pokemonContract } = await getContracts(); // pokemonContract is a Promise
        const tokenUri = await pokemonContract.getTokenURI(pokemonId);
        const cid = tokenUri.replace("ipfs://", "");

        //Fetch metatdata JSON from local Helia server
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
  }, [getContracts, pokemonId]);

  if (!metadata) return <div>Loading Pokemon</div>;

  return (
    <div className="pokemon-card">
      <h3>{metadata.name}</h3>
      <img src={metadata.image} alt={metadata.name} />
      <ul>
        {metadata.attributes.map((attr, i) => (
          <li key={i}>
            {attr.trait_type}: {attr.value}
          </li>
        ))}
      </ul>
    </div>
  );
}
