import { useEffect, useState } from "react";
import PokemonCard from "./PokemonCard.jsx";
import { useContracts } from "../contexts/AppContracts";

export default function MarketPlace({ setView }) {
  const { tradingContract } = useContracts();
  const [listings, setListings] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const hasListings = listings.length > 0;

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    const fetchListings = async () => {
      if (!tradingContract) return;

      try {
        const fetchedListings =
          await tradingContract.getAllListingsWithDetails();
        setListings(fetchedListings);
      } catch (err) {
        console.error("Failed to fetch listings", err);
        setListedIds([]);
      }
    };

    fetchListings();
  }, [tradingContract, refreshKey]);

  return hasListings ? (
    <div className="pt-20 grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {listings.map((listing, i) => (
        <PokemonCard
          key={i}
          listing={listing}
          pokemonId={Number(listing.pokemonId)}
          onListed={handleRefresh}
        />
      ))}
    </div>
  ) : (
    <div className="pt-24 flex flex-col items-center justify-center text-center space-y-6">
      <img
        src="/025-Phd.png"
        alt="No Pokémon available"
        className="w-64 h-auto opacity-80"
      />
      <h2 className="text-xl font-semibold text-gray-800">
        ⛔ No Pokemon listed right now.
      </h2>
      <p className="text-gray-600 text-sm font-semibold">
        Come back later or list your own Pokemon to start trading!
      </p>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setView("mypokemon");
        }}
        className="text-blue-600 hover:text-blue-800 font-medium transition"
      >
        See Your Pokemon
      </a>
    </div>
  );
}
