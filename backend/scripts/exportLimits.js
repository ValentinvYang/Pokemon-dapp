// exportLimits.js - Export smart contract listing limits to the frontend

import fs from "fs/promises";
import { readFileSync, existsSync } from "fs";
import hre from "hardhat";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";

const { ethers } = hre;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to output limits in frontend
const OUTPUT_PATH = path.resolve(
  __dirname,
  "../../frontend/src/config/listingLimits.json"
);

async function main() {
  // Load ABI and address from contracts.json
  const contracts = JSON.parse(
    await readFile(path.resolve(__dirname, "../../deployments/contracts.json"))
  );

  const tradingAbi = contracts.TradingContract.abi;
  const tradingAddress = contracts.TradingContract.address;

  // Validate ABI and address presence
  if (!tradingAbi || !tradingAddress) {
    throw new Error("Missing TradingContract ABI or address in contracts.json");
  }

  const tradingContract = await ethers.getContractAt(
    tradingAbi,
    tradingAddress
  );

  // Fetch and convert contract constants
  const limits = {
    MAX_PRICE_ETH: parseFloat(
      ethers.formatEther(await tradingContract.MAX_PRICE())
    ),
    MIN_PRICE_ETH: parseFloat(
      ethers.formatEther(await tradingContract.MIN_PRICE())
    ),
    MAX_AUCTION_DURATION: Number(await tradingContract.MAX_AUCTION_DURATION()),
    MIN_AUCTION_DURATION: Number(await tradingContract.MIN_AUCTION_DURATION()),
    MAX_FINALIZE_DELAY: Number(await tradingContract.MAX_FINALIZE_DELAY()),
    MIN_FINALIZE_DELAY: Number(await tradingContract.MIN_FINALIZE_DELAY()),
    MAX_BID_ETH: parseFloat(
      ethers.formatEther(await tradingContract.MAX_BID())
    ),
    FINALIZER_FEE_ETH: parseFloat(
      ethers.formatEther(await tradingContract.FINALIZER_FEE())
    ),
  };

  // Write to frontend config if listing limits have changed
  const newContent = JSON.stringify(limits, null, 2);

  let shouldWrite = true;
  if (existsSync(OUTPUT_PATH)) {
    const existing = readFileSync(OUTPUT_PATH, "utf-8");
    if (existing === newContent) {
      shouldWrite = false;
    }
  }

  if (shouldWrite) {
    await fs.writeFile(OUTPUT_PATH, newContent);
    console.log(`✅ Exported listing limits to: ${OUTPUT_PATH}`);
  } else {
    console.log("ℹ️ listingLimits.json unchanged — skipping write");
  }
}

main().catch((error) => {
  console.error("❌ Export failed:", error);
  process.exit(1);
});
