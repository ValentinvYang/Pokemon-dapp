import { useEffect, useState } from "react";
import NavBar from "./components/NavBar";
import ConnectWallet from "./components/ConnectWallet";
import MarketPlace from "./components/MarketPlace";

//Contracts:
import { ContractContext } from "./contexts/AppContracts";
import { BrowserProvider, Contract } from "ethers";
import pokemonAbi from "./contracts/PokemonContractABI.json";
import tradingAbi from "./contracts/TradingContractABI.json";

const POKEMON_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const TRADING_CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [contracts, setContracts] = useState(null);
  const [error, setError] = useState(null);

  //Create contract instances that are passed to children as context
  const createContracts = async () => {
    try {
      setError(null); // clear previous errors

      if (!window.ethereum) {
        throw new Error("MetaMask is not installed.");
      }

      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      const pokemonContract = new Contract(
        POKEMON_CONTRACT_ADDRESS,
        pokemonAbi.abi,
        signer
      );
      const tradingContract = new Contract(
        TRADING_CONTRACT_ADDRESS,
        tradingAbi.abi,
        signer
      );

      setContracts({
        signer,
        provider,
        address,
        pokemonContract,
        tradingContract,
      });

      setIsConnected(true);
    } catch (err) {
      console.error("Wallet connection failed:", err);
      setError(
        err.message || "Something went wrong while connecting the wallet."
      );
      setIsConnected(false);
    }
  };

  //Check if user is already connected on load
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (accounts.length > 0) {
          await createContracts();
        }
      }
    };

    checkConnection();

    // Watch for account changes
    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        createContracts();
      } else {
        setIsConnected(false);
        setContracts(null);
      }
    };

    window.ethereum?.on("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, []);

  if (!isConnected || !contracts) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <ConnectWallet onConnect={createContracts} />
        {error && (
          <p className="text-red-500 mt-4 px-4 text-center max-w-md">
            {" "}
            {error}{" "}
          </p>
        )}
      </div>
    );
  }

  return (
    <ContractContext.Provider value={contracts}>
      <NavBar isConnected={isConnected} />
      <MarketPlace />
    </ContractContext.Provider>
  );
}

export default App;
