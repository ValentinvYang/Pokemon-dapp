let provider;
let signer;
let userAddress;
let contract;

// Replace this with your contract's ABI and address
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

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

//Account #19 key from Hardhat node
let testAddress = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";

try {
  // Request user accounts
  await window.ethereum.request({ method: "eth_requestAccounts" });
  userAddress = await signer.getAddress();
  console.log("Connected account:", userAddress);
  document.getElementById("account").innerText = "Connected: " + userAddress;

  // Create contract instance
  contract = new ethers.Contract(contractAddress, contractABI, signer);

  // Now you can interact with the contract
  // For example: call a function to get the contract owner
  const owner = await contract.getOwner();
  console.log("Contract owner:", owner);
} catch (err) {
  console.error("Error connecting to MetaMask:", err);
}

// Connect to MetaMask when the button is clicked
document
  .getElementById("connectButton")
  .addEventListener("click", connectMetaMask);
