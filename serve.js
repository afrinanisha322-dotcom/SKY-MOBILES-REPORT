const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PORT = Number(process.env.PORT) || 5173;
const HOST = "0.0.0.0";
const BASE = "/sky-mobiles";
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".ico": "image/x-icon",
};

function getLanAddresses() {
  const ips = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

function normalizePath(urlPath) {
  if (urlPath === "/" || urlPath === "") {
    return { redirect: `${BASE}/` };
  }
  if (urlPath === BASE || urlPath === `${BASE}/`) {
    return { file: "/index.html" };
  }
  if (urlPath.startsWith(`${BASE}/`)) {
    return { file: urlPath.slice(BASE.length) || "/index.html" };
  }
  if (urlPath === "/index.html" || urlPath.startsWith("/")) {
    const file = urlPath === "/" ? "/index.html" : urlPath;
    return { file };
  }
  return { redirect: `${BASE}/` };
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  const resolved = normalizePath(urlPath);

  if (resolved.redirect) {
    res.writeHead(302, { Location: resolved.redirect });
    res.end();
    return;
  }

  const filePath = path.join(ROOT, resolved.file);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, HOST, () => {
  const lan = getLanAddresses();
  console.log("");
  console.log("  SKY MOBILES — server running");
  console.log("  ─────────────────────────────────");
  console.log(`  App URL (use this):  http://localhost:${PORT}${BASE}/`);
  console.log("");
  lan.forEach((ip) => {
    console.log(`  On your Wi‑Fi/LAN:   http://${ip}:${PORT}${BASE}/`);
  });
  console.log("");
  console.log("  Login: admin@skymobiles.in / sky2026");
  console.log("  Stop server: Ctrl+C in this terminal");
  console.log("");
});
