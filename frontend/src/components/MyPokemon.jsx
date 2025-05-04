import { useEffect, useState } from "react";
import PokemonCard from "./PokemonCard.jsx";
import { useContracts } from "../contexts/AppContracts";

export default function MyPokemon({ setView }) {
  const { pokemonContract, address, tradingContract } = useContracts();
  const [myPokemonIds, setMyPokemonIds] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const hasPokemon = myPokemonIds.length > 0;

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    const fetchMyPokemons = async () => {
      if (!pokemonContract || !address) return;

      try {
        const totalMinted = await pokemonContract.getNextTokenId();
        const ownedIds = [];

        for (let i = 0; i < totalMinted; i++) {
          try {
            const owner = await pokemonContract.getTokenOwner(i);
            if (owner.toLowerCase() === address.toLowerCase()) {
              ownedIds.push(i);
            }
          } catch (err) {
            // Token might not exist or is invalid — skip
            continue;
          }
        }

        setMyPokemonIds(ownedIds);
      } catch (err) {
        console.error("Error fetching owned Pokémon:", err);
        setMyPokemonIds([]);
      }
    };

    fetchMyPokemons();
  }, [pokemonContract, address, refreshKey]);

  return hasPokemon ? (
    <div className="pt-20 grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {myPokemonIds.map((id) => (
        <PokemonCard key={id} pokemonId={id} onListed={handleRefresh} />
      ))}
    </div>
  ) : (
    <div className="pt-24 flex flex-col items-center justify-center text-center space-y-6">
      <img
        src="/646-White.png"
        alt="No Pokémon owned"
        className="w-64 h-auto opacity-80"
      />
      <h2 className="text-xl font-semibold text-gray-800">
        You don't own any Pokemon yet.
      </h2>
      <p className="text-gray-600 text-sm font-semibold">
        Once you mint or buy a Pokemon, it will appear here.
      </p>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setView("marketplace");
        }}
        className="text-blue-600 hover:text-blue-800 font-medium transition"
      >
        Go to Marketplace
      </a>
    </div>
  );
}
