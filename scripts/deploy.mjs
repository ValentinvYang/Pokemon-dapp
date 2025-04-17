import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { readFile } from "fs/promises";
const pokemonArtifact = JSON.parse(
  await readFile(
    new URL(
      "../artifacts/contracts/PokemonContract.sol/PokemonContract.json",
      import.meta.url
    )
  )
);
const tradingArtifact = JSON.parse(
  await readFile(
    new URL(
      "../artifacts/contracts/TradingContract.sol/TradingContract.json",
      import.meta.url
    )
  )
);
dotenv.config();

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const signer = await provider.getSigner();

console.log("Deploying with:", await signer.getAddress());

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
