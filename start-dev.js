import { spawn } from "child_process";
import { setTimeout as wait } from "timers/promises";
import net from "net";

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: "inherit",
      shell: true,
      ...options,
    });

    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

// Utility: Wait until a port is open
async function waitForPort(port, host = "127.0.0.1", timeout = 10000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const socket = net.createConnection(port, host);
      socket.on("connect", () => {
        socket.end();
        resolve();
      });
      socket.on("error", () => {
        if (Date.now() - start > timeout) {
          reject(new Error(`Timeout waiting for ${host}:${port}`));
        } else {
          setTimeout(check, 500);
        }
      });
    };
    check();
  });
}

async function main() {
  console.log("🔧 Starting Hardhat local node...");
  const hardhatNode = spawn("npx", ["hardhat", "node"], {
    stdio: "inherit",
    shell: true,
    cwd: "./backend",
  });

  console.log("⏳ Waiting for Hardhat node to open port 8545...");
  await waitForPort(8545);
  console.log("✅ Hardhat node is ready!");

  console.log("🛰️ Starting Helia server...");
  const helia = spawn("node", ["backend/scripts/helia-server.js"], {
    stdio: "inherit",
    shell: true,
  });

  console.log("🚀 Deploying contracts...");
  await run(
    "npx",
    ["hardhat", "run", "scripts/deploy.mjs", "--network", "localhost"],
    { cwd: "./backend" }
  );

  console.log("📤 Uploading Pokémon...");
  await run("node", ["backend/scripts/uploadPokemon.js"]);

  console.log("🌐 Launching frontend...");
  await run("npm", ["run", "dev"], { cwd: "./frontend" });

  // Ctrl + C in the Terminal to execute this
  process.on("SIGINT", () => {
    hardhatNode.kill(); //Terminate Hardhat node
    helia.kill(); //Terminate Helia local node
    process.exit(); //Exit
  });
}

main().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
