import { useEffect, useState } from "react";
import NavBar from "./components/NavBar";
import ConnectWallet from "./components/ConnectWallet";
import MarketPlace from "./components/MarketPlace";

function App() {
  const [isConnected, setIsConnected] = useState(false);

  //Check if user is already connected on load
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (accounts.length > 0) setIsConnected(true);
      }
    };

    checkConnection();

    // Watch for account changes
    const handleAccountsChanged = (accounts) => {
      setIsConnected(accounts.length > 0);
    };

    window.ethereum?.on("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, []);

  return (
    <div className="bg-gray-100 min-h-screen">
      <NavBar
        isConnected={isConnected}
        onConnect={() => setIsConnected(true)}
      />
      <main className="p-6">
        {isConnected ? (
          <MarketPlace />
        ) : (
          <ConnectWallet onConnect={() => setIsConnected(true)} />
        )}
      </main>
    </div>
  );
}

export default App;
