//CANNOT USE THIS IF package.json uses type: module (CommonJS and ESM conflict)
//Instead use scripts/deploy.mjs file and run node scripts/deploy.mjs in the Terminal

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("PokemonContractModule", (m) => {
  // Deploy the PokemonContract
  const pokemonContract = m.contract("PokemonContract", [
    "PokemonContract",
    "PKM",
  ]);
  const tradingContract = m.contract("TradingContract", [pokemonContract]);

  return { pokemonContract, tradingContract };
});
