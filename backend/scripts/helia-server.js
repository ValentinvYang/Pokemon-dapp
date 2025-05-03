import { createHelia } from "helia";
import { unixfs } from "@helia/unixfs";
import { createServer } from "node:http";

const helia = await createHelia();
const fs = unixfs(helia);

const PORT = 8080;

// Basic HTTP server to read files from IPFS using CID
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  //CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Upload endpoint
  if (req.method === "POST" && url.pathname === "/add") {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const data = Buffer.concat(chunks);
      const cid = await fs.addBytes(data);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ cid: cid.toString() }));
    } catch (err) {
      res.writeHead(500);
      res.end(`Error uploading to IPFS: ${err.message}`);
    }
    return;
  }

  // 🔹 Fetch file by CID
  if (req.method === "GET" && url.pathname === "/") {
    const cid = url.searchParams.get("cid");
    if (!cid) {
      res.writeHead(400);
      res.end("Missing ?cid= parameter");
      return;
    }

    try {
      const chunks = [];
      for await (const chunk of fs.cat(cid)) {
        chunks.push(chunk);
      }

      const fileBuffer = Buffer.concat(chunks);

      const isText = url.searchParams.get("json") === "true";

      if (isText) {
        const text = new TextDecoder().decode(fileBuffer);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(text);
      } else {
        res.writeHead(200, {
          "Content-Type": "application/octet-stream",
          "Content-Length": fileBuffer.length,
        });
        res.end(fileBuffer);
      }
    } catch (err) {
      res.writeHead(500);
      res.end(`Error reading from IPFS: ${err.message}`);
    }
    return;
  }

  //Fallback
  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`🚀 Helia dev server running on http://localhost:${PORT}`);
});
