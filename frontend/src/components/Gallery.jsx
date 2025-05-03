import { useEffect, useState } from "react";
import { useContracts } from "../contexts/AppContracts";
import PokemonCard from "./PokemonCard.jsx";

export default function Gallery() {
  const { pokemonContract } = useContracts();
  const [pokemonIds, setPokemonIds] = useState([]);

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
  }, [pokemonContract]);

  return (
    <div className="pt-20 grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {pokemonIds.map((id) => (
        <PokemonCard key={id} pokemonId={id} />
      ))}
    </div>
  );
}
