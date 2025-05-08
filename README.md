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

## 📦 Environment

- Node.js v22
- npm v10
- Hardhat v2
- Ethers.js v6
- OpenZeppelin Contracts v5
- Vite v6
- Tailwind CSS v3
- Helia v5

---

## 📦 Installing Dependencies

### ✅ If You Unzipped the Project:

After extracting the ZIP file, run the following from the root of the project to install required dependencies:

```bash
npm install
cd frontend && npm install
```

---

### 🛠️ If You Cloned the GitHub Repository:

1. **Install dependencies (root, frontend, backend):**

```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

2. **Check Node.js version compatibility:**

Ensure you're using Node.js v22 and npm v10 or higher for proper compatibility

3. **Start the app (use full local setup):**

```bash
npm run dev
```

This launches the Hardhat node, Helia dev server, deploys contracts, uploads Pokemon metadata, and starts the frontend.

---

## 📁 Project Structure

- [`backend/`](backend/) – Smart contracts and blockchain config

  - [`contracts/`](backend/contracts/) – Solidity smart contracts
  - [`scripts/`](backend/scripts/) – Deployment, upload, and helper scripts
  - [`test/`](backend/test/) – Smart contract unit tests
  - [`hardhat.config.js`](backend/hardhat.config.js) – Hardhat project config

- [`deployments/`](deployments/) – Shared JSON for contract addresses and ABIs

  - [`contracts.json`](deployments/contracts.json) – ABI and deployed addresses

- [`frontend/`](frontend/) – Vite + React frontend

  - [`public/`](frontend/public/) – Static assets
  - [`src/`](frontend/src/) – Source code (components, views, hooks, etc.)
  - [`index.html`](frontend/index.html) – App entry HTML
  - [`vite.config.js`](frontend/vite.config.js) – Vite configuration
  - [`tailwind.config.js`](frontend/tailwind.config.js) – Tailwind CSS config

- [`PokeImages/`](PokeImages/) – Static Pokemon images (001–386) used by the app
- [`start-dev.js`](start-dev.js) – Launches Hardhat node, Helia server, deploy script, and frontend
- [`README.md`](README.md) – This file
- [`package.json`](package.json) – Shared dependencies and scripts
- [`.gitignore`](.gitignore) – Git ignore rules

---

## 📜 Smart Contract Interface

### Pokemon Contract: [`PokemonContract.sol`](backend/contracts/PokemonContract.sol)

| Function        | Description                      |
| --------------- | -------------------------------- |
| `mintPokemon()` | Mint a Pokemon with metadata CID |

### Trading Contract: [`TradingContract.sol`](backend/contracts/TradingContract.sol)

| Function            | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `listPokemon()`     | List a Pokemon for fixed price or auction                |
| `buyPokemon()`      | Purchase a fixed-price Pokemon                           |
| `commitBid()`       | Commit a bid for an auction                              |
| `revealBid()`       | Reveal your bid and salt                                 |
| `finalizeAuction()` | Finalize auction and transfer Pokemon to winner          |
| `removeListing()`   | Seller can delist their Pokemon (only if no bids)        |
| `withdrawRefund()`  | Claim your refunds after losing auction or failed reveal |

---

## ⚙ Configuration

The following settings are defined in [`backend/scripts/utils/config.js`]:

- `HELIA_DEV_BASE_URL`: Base URL of the development Helia server (default: `http://localhost:8080`)
- `HELIA_TEST_BASE_URL`: Base URL of the testing Helia server (default: `http://localhost:3001`)
- `POKEMON_AMOUNT`: Number of Pokemon NFTs to mint on deployment (default: `50`)

---

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

## 📸 Pokemon Images

This project uses static Pokemon images (001–386) from [HybridShivam/Pokemon](https://github.com/HybridShivam/Pokemon).

✅ All images used are pre-downloaded and bundled inside the project.

⚠️ The app currently supports images of the first 386 Pokemon.

To update or extend this, replace/add images under `PokeImages` and update `POKEMON_AMOUNT` in `backend/scripts/utils/config.js`.

---

## License

This project is submitted as part of a course assignment and is not intended for production use.

---

## 🙏 Acknowledgements

- Parts of this project were improved, scaffolded, and debugged using [ChatGPT](https://openai.com/chatgpt)
- Pokemon sprites from [HybridShivam/Pokemon](https://github.com/HybridShivam/Pokemon)
- Solidity libraries by [OpenZeppelin](https://openzeppelin.com)
- IPFS powered by [Helia](https://helia.io)
