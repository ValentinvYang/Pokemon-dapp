# Decentralized Pokemon Trading App

A fully local DApp that lets users trade Pokemon using smart contracts, IPFS storage (Helia), and a custom frontend. Built for a course project using Solidity, Hardhat, Ethers v6, and Helia.

---

## 🚀 Tech Stack

- **Smart Contracts:** Solidity + OpenZeppelin 5.3.0
- **Blockchain Runtime:** Hardhat (local node)
- **IPFS Storage:** Helia (runs as a local server)
- **Frontend:** Vite + React.js
- **JS Libraries:** Ethers v6, IPFS HTTP Client

---

## 📦 Project Structure

pokemon-dapp/
├── backend/ # Contains smart contract code and blockchain configs
│ ├── contracts/ # Solidity smart contracts
│ ├── scripts/ # Deployment and interaction scripts
│ ├── test/ # Smart contract tests
│ └── hardhat.config.js # Hardhat configuration file
├── deployments/ # Shared directory for deployed contracts
│ └── contracts.json # Generated JSON containing deployed contract addresses and ABIs
├── frontend/ # Frontend client built with Vite and React
│ ├── public/ # Static assets
│ ├── src/ # Source code for the React app
│ ├── index.html # Main HTML file
│ ├── vite.config.js # Vite configuration
│ └── tailwind.config.js # Tailwind CSS configuration
├── README.md # Project overview and instructions
├── package.json # Project dependencies and scripts
├── .gitignore # Git ignore rules
├── start-dev.js # Utility script to start the local development environment

---

## ⚙ Configuration

The following settings are defined in [`backend/scripts/utils/config.js`]:

- `HELIA_DEV_BASE_URL`: Base URL of the development Helia server (default: `http://localhost:8080`)
- `HELIA_TEST_BASE_URL`: Base URL of the testing Helia server (default: `http://localhost:3001`)
- `POKEMON_AMOUNT`: Number of Pokemon NFTs to mint on deployment (default: `50`)

### 🔌 Helia Server Ports

To run a local Helia node for development or testing, use one of the options below:

#### 🚧 Development Mode (Port 8080)

##### 🔁 Option 1: From the project root (preferred):

```bash
npm run dev:helia
```

##### 🔁 Option 2: Manual steps, from the project root:

```bash
node backend/scripts/dev/helia-dev-server.js
```

#### 🚧 Testing Mode (Port 3001)

##### 🔁 Option 1: From the project root (preferred):

```bash
npm run test:helia
```

##### 🔁 Option 2: Manual steps, from the project root:

```bash
node backend/scripts/test/helia-test-server.js
```

---

## 🌐 Running the Website

To run the full dApp locally — including the Helia node, Hardhat node, contract deployment, and frontend UI — use one of the options below:

### 🚀 Full Local Setup

#### 🔁 Option 1: From the project root (preferred):

```bash
npm run dev
```

This script start the local Hardhat node, Helia dev node, deploys contracts, uploads Pokemon to Helia, and launches the frontend.

Now open http://localhost:5173/ in your browser to use the app.

#### 🔁 Option 2: Manual steps, from the project root:

##### 🧱 Step 1: Start the Hardhat node

```bash
cd backend
npx hardhat node
```

##### 🌐 Step 2: Start the Helia dev server

Open new Terminal, from the project root:

```bash
npm run dev:helia
```

##### 📦 Step 3: Deploy contracts & upload Pokemon

Open new Terminal, from the project root:

```bash
cd backend
npx hardhat run scripts/deploy.mjs --network localhost
node hardhat run scripts/exportLimits.js --network localhost
node scripts/uploadPokemon.js
```

⏳ Uploading Pokémon may take a few minutes depending on how many you're minting.

##### 🖥️ Step 4: Start the frontend

Open a new terminal, from the project root:

```bash
cd frontend
npm run dev
```

Now open http://localhost:5173/ in your browser to use the app.

---

## 🧪 Smart Contract Testing

To run the smart contract tests, follow these steps:

### 🔁 Option 1: From the project root (preferred):

```bash
npm run test:helia
```

Wait for "Helia node running on port 3001" log. After that, open a new Terminal:

```bash
npm run test
```

### 🔁 Option 2: Manual steps, from the project root:

```bash
node backend/scripts/test/helia-test-server.js
```

Wait for "Helia node running on port 3001" log. After that, open a new Terminal:

```bash
cd backend
npx hardhat test
```

---

## 📸 Pokémon Images

Pokémon images are pulled from (https://github.com/HybridShivam/Pokemon).

If you're using a submodule:

```bash
git submodule update --init
```
