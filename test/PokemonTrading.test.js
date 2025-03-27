const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PokemonTrading", function () {
  let PokemonTrading;
  let pokemonTrading;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy contract
    PokemonTrading = await ethers.getContractFactory("PokemonTrading");
    pokemonTrading = await PokemonTrading.deploy("PokemonTrading", "PKM");
    await pokemonTrading.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await pokemonTrading.owner()).to.equal(owner.address);
    });

    it("Should set the correct name and symbol", async function () {
      expect(await pokemonTrading.name()).to.equal("PokemonTrading");
      expect(await pokemonTrading.symbol()).to.equal("PKM");
    });
  });

  describe("Minting", function () {
    it("Should mint a new Pokemon", async function () {
      const uri = "ipfs://QmTest";
      const name = "Charizard";
      const pokemonType = 0; // Fire
      const level = 50;

      //Only owner can mint... In the generated test-case they try to mint from addr1.address
      await pokemonTrading.mint(owner.address, uri, name, pokemonType, level);

      const tokenId = 0;
      expect(await pokemonTrading.ownerOf(tokenId)).to.equal(owner.address);

      const stats = await pokemonTrading.getTokenStats(tokenId);
      expect(stats.name).to.equal(name);
      expect(stats.pokemonType).to.equal(pokemonType);
      expect(stats.level).to.equal(level);
    });

    it("Should fail when non-owner tries to mint", async function () {
      const uri = "ipfs://QmTest";
      const name = "Charizard";
      const pokemonType = 0;
      const level = 50;

      await expect(
        pokemonTrading
          .connect(addr1)
          .mint(addr1.address, uri, name, pokemonType, level)
      ).to.be.reverted;
    });
  });

  describe("Token Stats", function () {
    it("Should get correct token stats", async function () {
      const uri = "ipfs://QmTest";
      const name = "Charizard";
      const pokemonType = 0;
      const level = 50;

      await pokemonTrading.mint(owner.address, uri, name, pokemonType, level);

      const stats = await pokemonTrading.getTokenStats(0);
      expect(stats.name).to.equal(name);
      expect(stats.pokemonType).to.equal(pokemonType);
      expect(stats.level).to.equal(level);
    });
  });
});
