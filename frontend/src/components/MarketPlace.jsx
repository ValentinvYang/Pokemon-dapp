import { useEffect, useState } from "react";
import PokemonCard from "./PokemonCard.jsx";
import { useContracts } from "../contexts/AppContracts";

export default function MarketPlace() {
  const { tradingContract } = useContracts();
  const [listings, setListings] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

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

  return (
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
  );
}
