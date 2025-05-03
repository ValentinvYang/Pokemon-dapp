import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { readFile, writeFile } from "fs/promises";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

//Setup ES module __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

//Load ABIs
const pokemonArtifact = JSON.parse(
  await readFile(
    new URL(
      "../../artifacts/contracts/PokemonContract.sol/PokemonContract.json",
      import.meta.url
    )
  )
);
const tradingArtifact = JSON.parse(
  await readFile(
    new URL(
      "../../artifacts/contracts/TradingContract.sol/TradingContract.json",
      import.meta.url
    )
  )
);

//Connect to Hardhat local node
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const signer = await provider.getSigner();

console.log("Deploying with:", await signer.getAddress());

//Deploy PokemonContract
const PokemonFactory = new ethers.ContractFactory(
  pokemonArtifact.abi,
  pokemonArtifact.bytecode,
  signer
);

const pokemon = await PokemonFactory.deploy("PokemonContract", "PKM");
await pokemon.waitForDeployment();
console.log("PokemonContract deployed to:", pokemon.target);

const TradingFactory = new ethers.ContractFactory(
  tradingArtifact.abi,
  tradingArtifact.bytecode,
  signer
);

const trading = await TradingFactory.deploy(pokemon.target);
await trading.waitForDeployment();
console.log("TradingContract deployed to:", trading.target);

//Write ABI + address to frontend file
const contractsExport = {
  PokemonContract: {
    address: pokemon.target,
    abi: pokemonArtifact.abi,
  },
  TradingContract: {
    address: trading.target,
    abi: tradingArtifact.abi,
  },
};

const outputPath = path.resolve(
  __dirname,
  "../../frontend/src/contracts/contracts.json"
);

const newContent = JSON.stringify(contractsExport, null, 2);

let shouldWrite = true;
if (existsSync(outputPath)) {
  const existing = readFileSync(outputPath, "utf-8");
  if (existing === newContent) {
    shouldWrite = false;
  }
}

if (shouldWrite) {
  await writeFile(outputPath, newContent);
  console.log(`✅ Wrote ABI + addresses to ${outputPath}`);
} else {
  console.log("ℹ️ contracts.json unchanged — skipping write");
}
