import { useState } from "react";
import { BrowserProvider } from "ethers";

export default function ConnectWallet({ onConnect }) {
  const [error, setError] = useState(null);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError("MetaMask is not installed.");
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      onConnect(); // Notify parent to update UI
    } catch (err) {
      setError("Connection failed. Make sure MetaMask is unlocked.");
    }
  };

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={connectWallet}
        className="bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600"
      >
        Connect Wallet
      </button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}
