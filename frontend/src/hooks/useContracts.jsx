import { useMemo } from "react";
import { ethers } from "ethers";
import pokemonContractAbi from "../contracts/PokemonContractABI.json";
import tradingContractAbi from "../contracts/TradingContractABI.json";

const POKEMON_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const TRADING_CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

function useContracts() {
  return useMemo(() => {
    if (!window.ethereum) return {};

    const provider = new ethers.BrowserProvider(window.ethereum);
    // Return signerPromise, let component control when to call it
    const getContracts = async () => {
      // 🔐 Will only prompt MetaMask when actually called
      const signer = await provider.getSigner();

      const pokemonContract = new ethers.Contract(
        POKEMON_CONTRACT_ADDRESS,
        pokemonContractAbi.abi,
        signer
      );

      const tradingContract = new ethers.Contract(
        TRADING_CONTRACT_ADDRESS,
        tradingContractAbi.abi,
        signer
      );

      return { pokemonContract, tradingContract };
    };

    return { provider, getContracts };
  }, []);
}
export default useContracts;
