import axios from "axios";
import { ethers } from "ethers";
import { readFile } from "fs/promises";

// Read the compiled contract ABIs
const pokemonArtifact = JSON.parse(
  await readFile(
    new URL(
      "../artifacts/contracts/PokemonContract.sol/PokemonContract.json",
      import.meta.url
    )
  )
);

const POKEMON_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const tradingArtifact = JSON.parse(
  await readFile(
    new URL(
      "../artifacts/contracts/TradingContract.sol/TradingContract.json",
      import.meta.url
    )
  )
);

const TRADING_CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

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
    pokemonArtifact.abi,
    signer
  );

  const tradingContract = new ethers.Contract(
    TRADING_CONTRACT_ADDRESS,
    tradingArtifact.abi,
    signer
  );

  for (let i = 1; i <= 50; i++) {
    const data = await fetchPokemon(i);

    // Download image
    const imageRes = await axios.get(data.imageUrl, {
      responseType: "arraybuffer",
    });
    const imageBytes = new Uint8Array(imageRes.data);

    // Upload image to Helia
    const imageCid = await uploadToHelia(imageBytes);
    const imageIpfs = `ipfs://${imageCid}`;

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

    //Create a non-auction listing for users to buy the minted Pokemon:
    await pokemonContract
      .connect(signer)
      .approve(tradingContract.target, i - 1);
    const createListing = await tradingContract
      .connect(signer)
      .listPokemon(i - 1, ethers.parseEther("1"), false, 0);
    await createListing.wait();

    console.log(`Listed Pokemon with ID ${i - 1}`);
  }
};

main().catch((err) => {
  console.error("❌ Upload failed:", err.message);
});
