import { useEffect, useState } from "react";

export default function NavBar({ isConnected, view, setView }) {
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
        className="cursor-pointer flex items-center space-x-2"
      >
        <img
          src="logo.png"
          alt="Vyang Trading Logo"
          className="w-10 h-10 object-contain"
        />
        <span className="text-2xl font-bold text-orange-600">
          Vyang Trading
        </span>
      </div>

      {/* Nav Links */}
      <div className="flex items-center space-x-6 text-gray-700 font-medium">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView("gallery");
          }}
          className={`hover:text-orange-600 transition ${
            view === "gallery" ? "text-orange-600 font-semibold" : ""
          }`}
        >
          Gallery
        </a>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView("marketplace");
          }}
          className={`hover:text-orange-600 transition ${
            view === "marketplace" ? "text-orange-600 font-semibold" : ""
          }`}
        >
          Marketplace
        </a>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView("mypokemon");
          }}
          className={`hover:text-orange-600 transition ${
            view === "mypokemon" ? "text-orange-600 font-semibold" : ""
          }`}
        >
          My Pokemon
        </a>

        {/* Additional Links Placeholder*/}
        <a href="#activity" className="hover:text-orange-600 transition">
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
