import { useEffect, useState } from "react";
import { ethers } from "ethers";
import PokemonCard from "./PokemonCard";
import { useContracts } from "../hooks/useContracts";

function Marketplace() {
  const [listing, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const { tradingContract } = useContracts();

  useEffect(() => {
    const fetchListings = async () => {
      try {
        if (!tradingContract) return;

        const contract = await tradingContract;

        const results = [];

        //TODO:
        // 1. Add that upon deployment we mint 100 Pokemon
        // 2. Change SC so that we can access all active listings
        // 2.1 -> Newly copy contract ABI since you changed contract
        // 3. Loop over the active listings here and display them using PokemonCard component
      } catch (err) {}
    };
  });
}
export default MarketPlace;
