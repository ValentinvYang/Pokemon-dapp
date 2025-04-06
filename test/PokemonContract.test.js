const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PokemonContract", function () {
  let pokemonContract;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2] = await ethers.getSigners();

    //Deploy contract:
    pokemonContract = await ethers.deployContract("PokemonContract", [
      "PokemonContract",
      "PKM",
    ]);
    await pokemonContract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await pokemonContract.owner()).to.equal(owner.address);
    });

    it("Should set the correct name and symbol", async function () {
      expect(await pokemonContract.name()).to.equal("PokemonContract");
      expect(await pokemonContract.symbol()).to.equal("PKM");
    });
  });

  describe("Minting", function () {
    it("Should mint a new Pokemon", async function () {
      const uri = "ipfs://QmTest";
      const name = "Charizard";
      const pokemonType = "Fire";
      const level = 50;
      const price = 1;

      await pokemonContract
        .connect(owner)
        .mintPokemon(name, pokemonType, price);

      const tokenId = 0;
      expect(await pokemonContract.ownerOf(tokenId)).to.equal(owner.address);

      const stats = await pokemonContract.getPokemon(tokenId);
      expect(stats.name).to.equal(name);
      expect(stats.pokeType).to.equal(pokemonType);
      expect(stats.price).to.equal(price);
    });

    it("Should fail when non-owner tries to mint", async function () {
      const uri = "ipfs://QmTest";
      const name = "Charizard";
      const pokemonType = "Fire";
      const level = 50;
      const price = 1;

      await expect(
        pokemonContract.connect(addr1).mintPokemon(name, pokemonType, price)
      ).to.be.reverted;
    });
  });

  describe("Token Stats", function () {
    it("Should get correct token stats", async function () {
      const uri = "ipfs://QmTest";
      const name = "Charizard";
      const pokemonType = "Fire";
      const level = 50;
      const price = 1;

      await pokemonContract.mintPokemon(name, pokemonType, price);

      const stats = await pokemonContract.getPokemon(0);
      expect(stats.name).to.equal(name);
      expect(stats.pokeType).to.equal(pokemonType);
    });
  });
});
