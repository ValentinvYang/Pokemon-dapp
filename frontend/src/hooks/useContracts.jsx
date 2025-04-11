import { useMemo } from "react";
import { ethers } from "ethers";
import pokemonContractAbi from "../contracts/PokemonContractABI.json";
import tradingContractAbi from "../contracts/TradingContractABI.json";

const POKEMON_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const TRADING_CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

export function useContracts() {
  return useMemo(() => {
    if (!window.ethereum) return {};

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signerPromise = provider.getSigner();

    const pokemonContract = signerPromise.then(
      (signer) =>
        new ethers.Contract(
          POKEMON_CONTRACT_ADDRESS,
          pokemonContractAbi.abi,
          signer
        )
    );

    const tradingContract = signerPromise.then(
      (signer) =>
        new ethers.Contract(
          TRADING_CONTRACT_ADDRESS,
          tradingContractAbi.abi,
          signer
        )
    );

    return { provider, signerPromise, pokemonContract, tradingContract };
  }, []);
}
