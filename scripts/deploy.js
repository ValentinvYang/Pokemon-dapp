const hre = require("hardhat");

async function main() {
  // Deploy the contract
  const PokemonContract = await hre.ethers.getContractFactory(
    "PokemonContract"
  );
  const pokemonContract = await PokemonContract.deploy(
    "PokemonContract",
    "PKM"
  );
  await pokemonContract.waitForDeployment();

  console.log(
    "PokemonContract deployed to:",
    await pokemonContract.getAddress()
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
