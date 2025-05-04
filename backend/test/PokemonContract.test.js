import axios from "axios";
import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("PokemonContract", function () {
  let pokemonContract, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    //Deploy PokemonContract
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
      const metadata = {
        name: "Bulbasaur",
        attributes: [
          { trait_type: "hp", value: 45 },
          { trait_type: "attack", value: 49 },
          { trait_type: "defense", value: 49 },
          { trait_type: "special-attack", value: 65 },
          { trait_type: "special-defense", value: 65 },
          { trait_type: "speed", value: 45 },
        ],
      };

      const res = await axios.post("http://localhost:8080/add", metadata, {
        headers: { "Content-Type": "application/json" },
      });

      const cid = res.data.cid;
      await pokemonContract.connect(owner).mintPokemon(cid);

      const tokenURI = await pokemonContract.getTokenURI(0);
      expect(tokenURI).to.equal(`ipfs://${cid}`);

      const fetched = await axios.get(
        `http://localhost:8080/?cid=${cid}&json=true`
      );

      expect(fetched.data.name.toLowerCase()).to.equal("bulbasaur");
    });

    it("Should fail when non-owner tries to mint", async function () {
      const cid = "bafkreigojbdlo4nh7binmp6532nvrcge3jh7q242gzzy3otc6n4zspgspe"; // charmander

      await expect(pokemonContract.connect(addr1).mintPokemon(cid)).to.be
        .reverted;
    });
  });
});
