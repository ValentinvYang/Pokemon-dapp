import { useState, useEffect } from "react";
import { ethers } from "ethers";

function ConnectWallet() {
  const [account, setAccount] = useState(null);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        console.log(network.chainId.toString());
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
      } catch (error) {
        console.error("Error connecting wallt:", error);
      }
    } else {
      alert("Please install MetaMask");
    }
  };

  return (
    <>
      {account ? (
        <p>Connected: {account}</p>
      ) : (
        <button onClick={connectWallet}>Connect to Wallet</button>
      )}
    </>
  );
}

export default ConnectWallet;
