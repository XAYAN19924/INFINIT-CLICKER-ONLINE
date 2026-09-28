const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const players = new Map();
const eventClients = new Set();

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sanitizeName(name) {
  return String(name || "Player").replace(/[<>"'`]/g, "").trim().replace(/\s+/g, " ").slice(0, 24) || "Player";
}

function sanitizeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function upsertPlayer(payload) {
  const id = String(payload.id || "").slice(0, 100);
  if (!id) return null;
  const player = {
    id,
    name: sanitizeName(payload.name),
    score: sanitizeNumber(payload.score),
    multiplier: Math.max(1, sanitizeNumber(payload.multiplier) || 1),
    lastSeen: Date.now()
  };
  players.set(id, player);
  return player;
}

function publicSnapshot() {
  return {
    type: "players",
    players: [...players.values()].map(({ id, name, score, multiplier }) => ({ id, name, score, multiplier }))
  };
}

function sendPlayers(res) {
  res.write(`event: players\\ndata: ${JSON.stringify(publicSnapshot())}\\n\\n`);
}

function broadcast() {
  for (const client of eventClients) {
    try { sendPlayers(client); } catch { eventClients.delete(client); }
  }
}

function readBody(req, callback) {
  let body = "";
  let size = 0;
  req.on("data", chunk => {
    size += chunk.length;
    if (size <= 32 * 1024) body += chunk;
  });
  req.on("end", () => {
    if (size > 32 * 1024) return callback(null);
    try { callback(JSON.parse(body || "{}")); } catch { callback(null); }
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (req.method === "GET" && pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({ ok: true, players: players.size }));
  }

  if (req.method === "GET" && pathname === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    });
    res.write(": connected\\n\\n");
    sendPlayers(res);
    eventClients.add(res);
    req.on("close", () => eventClients.delete(res));
    return;
  }

  if (req.method === "POST" && pathname === "/player") {
    return readBody(req, payload => {
      if (!payload) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
      const player = upsertPlayer(payload);
      if (!player) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ error: "Missing player id" }));
      }
      broadcast();
      res.writeHead(204);
      res.end();
    });
  }

  if (req.method !== "GET") {
    res.writeHead(405, { "Allow": "GET, POST" });
    return res.end("Method Not Allowed");
  }

  const requested = pathname === "/" ? "/index.html" : pathname;
  const safePath = path.normalize(requested).replace(/^([/\\])+/, "");
  const full = path.join(ROOT, safePath);
  if (!full.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(full, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not found");
    }
    res.writeHead(200, {
      "Content-Type": mime[path.extname(full)] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    res.end(data);
  });
});

setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  let changed = false;
  for (const [id, player] of players) {
    if (player.lastSeen < cutoff) {
      players.delete(id);
      changed = true;
    }
  }
  if (changed) broadcast();
}, 60 * 1000);

server.listen(PORT, () => {
  console.log(`The Unit web game running on http://localhost:${PORT}`);
});
