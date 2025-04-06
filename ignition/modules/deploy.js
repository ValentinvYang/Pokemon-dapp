const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("PokemonContractModule", (m) => {
  // Deploy the PokemonContract
  const pokemonContract = m.contract("PokemonContract", [
    "PokemonContract",
    "PKM",
  ]);

  return { pokemonContract };
});
