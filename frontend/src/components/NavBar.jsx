// src/components/NavBar.jsx
import { useEffect, useState } from "react";

export default function NavBar({ isConnected }) {
  const [address, setAddress] = useState(null);

  useEffect(() => {
    const fetchAddress = async () => {
      if (window.ethereum && isConnected) {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        setAddress(accounts[0]);
      }
    };
    fetchAddress();
  }, [isConnected]);

  const handleConnect = async () => {
    if (window.ethereum) {
      await window.ethereum.request({ method: "eth_requestAccounts" });
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 py-4 bg-white shadow-md">
      {/* Logo */}
      <div
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="text-2xl font-bold text-blue-600 cursor-pointer"
      >
        🧬 Vyang Trading
      </div>

      {/* Nav Links */}
      <div className="flex items-center space-x-6 text-gray-700 font-medium">
        <a href="#" className="hover:text-blue-600 transition">
          Home
        </a>
        <a href="#my-pokemon" className="hover:text-blue-600 transition">
          My Pokémon
        </a>
        <a href="#trade" className="hover:text-blue-600 transition">
          Trade
        </a>
        <a href="#activity" className="hover:text-blue-600 transition">
          Activity
        </a>

        {/* Wallet Status / Button */}
        {isConnected ? (
          <span className="text-sm text-green-600 font-mono truncate max-w-[150px]">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        ) : (
          <button
            onClick={handleConnect}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  );
}
