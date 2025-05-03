import { useEffect, useState } from "react";
import { useContracts } from "../contexts/AppContracts";
import PokemonCard from "./PokemonCard.jsx";

export default function Gallery() {
  const { pokemonContract } = useContracts();
  const [pokemonIds, setPokemonIds] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    const fetchAllPokemon = async () => {
      if (!pokemonContract) return;

      try {
        const total = await pokemonContract.getNextTokenId();
        const ids = Array.from({ length: Number(total) }, (_, i) => i);
        setPokemonIds(ids);
      } catch (err) {
        console.error("Failed to fetch token IDs:", err);
      }
    };

    fetchAllPokemon();
  }, [pokemonContract, refreshKey]);

  return (
    <div className="pt-20 grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {pokemonIds.map((id) => (
        <PokemonCard key={id} pokemonId={id} onListed={handleRefresh} />
      ))}
    </div>
  );
}
