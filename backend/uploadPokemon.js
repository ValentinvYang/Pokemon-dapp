import axios from "axios";
import { ethers } from "ethers";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync, writeFileSync } from "fs";

// Resolve __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load contract metadata from generated file
const contracts = JSON.parse(
  await readFile(
    path.resolve(__dirname, "../frontend/src/contracts/contracts.json")
  )
);

const pokemonAbi = contracts.PokemonContract.abi;
const tradingAbi = contracts.TradingContract.abi;
const POKEMON_CONTRACT_ADDRESS = contracts.PokemonContract.address;
const TRADING_CONTRACT_ADDRESS = contracts.TradingContract.address;

// Fetch Pokemon data from PokéAPI
const fetchPokemon = async (id) => {
  const res = await axios.get(`https://pokeapi.co/api/v2/pokemon/${id}`);
  return {
    name: res.data.name,
    imageUrl: res.data.sprites.front_default,
    types: res.data.types.map((t) => t.type.name),
    stats: res.data.stats.map((s) => ({
      name: s.stat.name,
      base_stat: s.base_stat,
    })),
  };
};

// Upload raw data to local Helia server
const uploadToHelia = async (
  data,
  contentType = "application/octet-stream"
) => {
  const res = await axios.post("http://localhost:8080/add", data, {
    headers: {
      "Content-Type": contentType,
    },
  });
  return res.data.cid;
};

const main = async () => {
  // Connect to local Hardhat node
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const signer = await provider.getSigner();

  const pokemonContract = new ethers.Contract(
    POKEMON_CONTRACT_ADDRESS,
    pokemonAbi,
    signer
  );

  const tradingContract = new ethers.Contract(
    TRADING_CONTRACT_ADDRESS,
    tradingAbi,
    signer
  );

  const cidMap = {};

  for (let i = 1; i <= 10; i++) {
    const data = await fetchPokemon(i);

    //Upload image from the cloned https://github.com/HybridShivam/Pokemon repo (Pokemon folder)
    const paddedId = String(i).padStart(3, "0");
    const localImagePath = path.resolve(
      __dirname,
      "../Pokemon/assets/images",
      `${paddedId}.png`
    );
    const imageBytes = new Uint8Array(readFileSync(localImagePath));

    // Upload image to Helia
    const imageCid = await uploadToHelia(imageBytes);
    const imageIpfs = `ipfs://${imageCid}`;

    cidMap[paddedId] = imageCid;

    // Prepare metadata
    const metadata = {
      name: data.name,
      image: imageIpfs,
      attributes: [
        ...data.types.map((type) => ({ trait_type: "Type", value: type })),
        ...data.stats.map((s) => ({
          trait_type: s.name,
          value: s.base_stat,
        })),
      ],
    };

    // Upload metadata to Helia
    const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
    const metadataCid = await uploadToHelia(metadataBytes, "application/json");

    // Mint to the smart contract
    const tx = await pokemonContract.connect(signer).mintPokemon(metadataCid);
    await tx.wait();

    console.log(`✅ Minted ${data.name} with CID: ${metadataCid}`);

    /*
    //Create a non-auction listing for users to buy the minted Pokemon:
    await pokemonContract
      .connect(signer)
      .approve(tradingContract.target, i - 1);
    const createListing = await tradingContract
      .connect(signer)
      .listPokemon(i - 1, ethers.parseEther("1"), false, 0);
    await createListing.wait();

    console.log(`Listed Pokemon with ID ${i - 1} from ${signer.address}`);
    */
  }

  //For debugging and verifying uploads
  writeFileSync(
    path.resolve(__dirname, "./gen1-image-cid-map.json"),
    JSON.stringify(cidMap, null, 2)
  );
};

main().catch((err) => {
  console.error("❌ Upload failed:", err.message);
});
