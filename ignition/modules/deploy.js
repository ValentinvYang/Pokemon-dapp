const hre = require("hardhat");

async function main() {
  // Deploy the contract
  const PokemonTrading = await hre.ethers.getContractFactory("PokemonTrading");
  const pokemonTrading = await PokemonTrading.deploy("PokemonTrading", "PKM");
  await pokemonTrading.waitForDeployment();

  console.log("PokemonTrading deployed to:", await pokemonTrading.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
