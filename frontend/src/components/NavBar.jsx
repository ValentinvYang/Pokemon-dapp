import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react"; // Hamburger icon for Mobile

export default function NavBar({ isConnected, view, setView }) {
  const [address, setAddress] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const navLinks = [
    { label: "Gallery", key: "gallery" },
    { label: "Marketplace", key: "marketplace" },
    { label: "My Pokemon", key: "mypokemon" },
    { label: "My Refunds", key: "myrefunds" },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white shadow-md px-6 py-4">
      <div className="flex justify-between items-center">
        {/* Logo */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="cursor-pointer flex items-center space-x-2"
        >
          <img
            src="logo.png"
            alt="Vyang Logo"
            className="w-10 h-10 object-contain"
          />
          <span className="text-2xl font-bold text-orange-600">
            Vyang Trading
          </span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-6 text-gray-700 font-medium">
          {navLinks.map((link) => (
            <a
              key={link.key}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setView(link.key);
              }}
              className={`hover:text-orange-600 transition ${
                view === link.key ? "text-orange-600 font-semibold" : ""
              }`}
            >
              {link.label}
            </a>
          ))}

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

        {/* Hamburger (Mobile) */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden focus:outline-none"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="flex flex-col mt-4 space-y-4 md:hidden text-gray-700 font-medium">
          {navLinks.map((link) => (
            <a
              key={link.key}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setView(link.key);
                setMenuOpen(false); // Close menu on click
              }}
              className={`hover:text-orange-600 transition ${
                view === link.key ? "text-orange-600 font-semibold" : ""
              }`}
            >
              {link.label}
            </a>
          ))}

          {isConnected ? (
            <span className="text-sm text-green-600 font-mono truncate">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          ) : (
            <button
              onClick={() => {
                handleConnect();
                setMenuOpen(false);
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Connect Wallet
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
