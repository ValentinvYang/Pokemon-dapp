import axios from "axios";
import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("PokemonContract", function () {
  let pokemonContract;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const factory = await ethers.getContractFactory("PokemonContract");
    pokemonContract = await factory.deploy("PokemonContract", "PKM");
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
    it("Should mint a new Pokémon and match metadata stats from Helia", async function () {
      const cid = "bafkreifqtj2xr2gzi6fpv5oyyzclckkkzwqmejd3dpidyusjhsph2x3h7u"; // bulbasaur
      const expectedName = "bulbasaur";

      await pokemonContract.connect(owner).mintPokemon(cid);

      const tokenId = 0;
      const tokenURI = await pokemonContract.getTokenURI(tokenId);
      expect(tokenURI).to.equal(`ipfs://${cid}`);

      // ✅ Fetch metadata from local Helia node
      const metadataUrl = `http://localhost:8080/?cid=${cid}&json=true`;
      const res = await axios.get(metadataUrl);
      const metadata = res.data;

      expect(metadata.name.toLowerCase()).to.equal(expectedName);

      // Test if the base stats exist
      const requiredStats = [
        "hp",
        "attack",
        "defense",
        "special-attack",
        "special-defense",
        "speed",
      ];

      for (const stat of requiredStats) {
        const attr = metadata.attributes.find((a) => a.trait_type === stat);
        expect(attr, `Missing base stat: ${stat}`).to.exist;
        expect(attr.value, `Invalid value for ${stat}`).to.be.a("number");
        expect(attr.value).to.be.greaterThan(0);
      }
    });

    it("Should fail when non-owner tries to mint", async function () {
      const cid = "bafkreigojbdlo4nh7binmp6532nvrcge3jh7q242gzzy3otc6n4zspgspe"; // charmander

      await expect(pokemonContract.connect(addr1).mintPokemon(cid)).to.be
        .reverted;
    });
  });
});
