import axios from "axios";
import { createHeliaHTTP } from "@helia/http";
import { unixfs } from "@helia/unixfs";
import { ethers } from "ethers";
import { readFile } from "fs/promises";

const pokemonArtifact = JSON.parse(
  await readFile(
    new URL(
      "../artifacts/contracts/PokemonContract.sol/PokemonContract.json",
      import.meta.url
    )
  )
);
const tradingArtifact = JSON.parse(
  await readFile(
    new URL(
      "../artifacts/contracts/TradingContract.sol/TradingContract.json",
      import.meta.url
    )
  )
);

const POKEMON_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const TRADING_CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

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

const fetchAndUploadPokemon = async () => {
  const helia = await createHeliaHTTP();
  const fs = unixfs(helia);

  //Connect to local Hardhat node (default RPC URL)
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

  //Use first account as signer (default Hardhat account)
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

  for (let i = 1; i <= 3; i++) {
    const data = await fetchPokemon(i);

    // Download image as Buffer
    const imageRes = await axios.get(data.imageUrl, {
      responseType: "arraybuffer",
    });
    const imageBytes = new Uint8Array(imageRes.data);

    // Upload image to IPFS
    const imageCid = await fs.addBytes(imageBytes);
    const imageIpfs = `ipfs://${imageCid.toString()}`;

    // Create metadata JSON
    const metadata = {
      name: data.name,
      image: imageIpfs,
      attributes: [
        ...data.types.map((type) => ({ trait_type: "Type", value: type })),
        ...data.stats.map((s) => ({ trait_type: s.name, value: s.base_stat })),
      ],
    };

    // Upload metadata JSON
    const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
    const metadataCid = await fs.addBytes(metadataBytes);

    const cidString = metadataCid.toString();

    //Owner mints the Pokemon to the Contract
    const tx = await pokemonContract.connect(signer).mintPokemon(cidString);
    await tx.wait();

    console.log(`${data.name} minted with CID: ${cidString}`);
  }
};

fetchAndUploadPokemon().catch(console.error);
