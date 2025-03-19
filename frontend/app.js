let provider;
let signer;
let userAddress;
let contract;

// Replace this with your contract's ABI and address
const contractAddress = "YOUR_CONTRACT_ADDRESS";
const contractABI = [
  // ABI of the contract you want to interact with
  {
    constant: true,
    inputs: [],
    name: "getOwner",
    outputs: [
      {
        name: "",
        type: "address",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  // Add other contract functions here as needed
];

async function connectMetaMask() {
  if (typeof window.ethereum !== "undefined") {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();

    try {
      // Request user accounts
      await window.ethereum.request({ method: "eth_requestAccounts" });
      userAddress = await signer.getAddress();
      console.log("Connected account:", userAddress);
      document.getElementById("account").innerText =
        "Connected: " + userAddress;

      // Create contract instance
      contract = new ethers.Contract(contractAddress, contractABI, signer);

      // Now you can interact with the contract
      // For example: call a function to get the contract owner
      const owner = await contract.getOwner();
      console.log("Contract owner:", owner);
    } catch (err) {
      console.error("Error connecting to MetaMask:", err);
    }
  } else {
    alert("MetaMask is not installed");
  }
}

// Connect to MetaMask when the button is clicked
document
  .getElementById("connectButton")
  .addEventListener("click", connectMetaMask);
