const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";
const ROOT = __dirname;

// The leaderboard is intentionally in memory for this small game.
// Restarting the server clears the online list.
const players = new Map();
const eventClients = new Set();

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg"
};

function corsHeaders(req) {
  // No cookies/auth are used, so wildcard CORS is safe for this simple API.
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Cache-Control",
    "Vary": "Origin"
  };
}

function writeHead(res, status, headers = {}) {
  res.writeHead(status, {
    ...corsHeaders(),
    ...headers
  });
}

function sanitizeName(name) {
  return String(name || "Player")
    .replace(/[<>"'`]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 24) || "Player";
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
    titleIndex: Math.max(0, Math.floor(sanitizeNumber(payload.titleIndex))),
    prestige: Math.max(0, Math.floor(sanitizeNumber(payload.prestige))),
    timePlayed: sanitizeNumber(payload.timePlayed),
    lastSeen: Date.now()
  };

  players.set(id, player);
  return player;
}

function publicSnapshot() {
  return {
    type: "players",
    players: [...players.values()]
      .map(({ id, name, score, multiplier, titleIndex, prestige, timePlayed }) => ({
        id, name, score, multiplier, titleIndex, prestige, timePlayed
      }))
  };
}

function sendPlayers(res) {
  res.write(`event: players\ndata: ${JSON.stringify(publicSnapshot())}\n\n`);
}

function broadcast() {
  for (const client of eventClients) {
    try {
      sendPlayers(client);
    } catch {
      eventClients.delete(client);
    }
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
    try {
      callback(JSON.parse(body || "{}"));
    } catch {
      callback(null);
    }
  });

  req.on("error", () => callback(null));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (req.method === "OPTIONS") {
    writeHead(res, 204);
    return res.end();
  }

  if (req.method === "GET" && pathname === "/health") {
    writeHead(res, 200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    });
    return res.end(JSON.stringify({
      ok: true,
      players: players.size,
      time: new Date().toISOString()
    }));
  }

  if (req.method === "GET" && pathname === "/events") {
    writeHead(res, 200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    });

    // SSE needs an initial comment and periodic heartbeats so hosting
    // proxies do not close an apparently idle connection.
    res.write(": connected\n\n");
    sendPlayers(res);
    eventClients.add(res);

    const heartbeat = setInterval(() => {
      try {
        res.write(`: ping ${Date.now()}\n\n`);
      } catch {
        clearInterval(heartbeat);
        eventClients.delete(res);
      }
    }, 20000);

    req.on("close", () => {
      clearInterval(heartbeat);
      eventClients.delete(res);
    });

    return;
  }

  if (req.method === "POST" && pathname === "/player") {
    return readBody(req, payload => {
      if (!payload) {
        writeHead(res, 400, {
          "Content-Type": "application/json; charset=utf-8"
        });
        return res.end(JSON.stringify({ error: "Invalid JSON" }));
      }

      const player = upsertPlayer(payload);

      if (!player) {
        writeHead(res, 400, {
          "Content-Type": "application/json; charset=utf-8"
        });
        return res.end(JSON.stringify({ error: "Missing player id" }));
      }

      broadcast();
      writeHead(res, 204, { "Cache-Control": "no-store" });
      return res.end();
    });
  }

  if (req.method !== "GET") {
    writeHead(res, 405, { "Allow": "GET, POST, OPTIONS" });
    return res.end("Method Not Allowed");
  }

  // Static frontend files (useful when deploying the whole repo to Render).
  const requested = pathname === "/" ? "/index.html" : pathname;
  const safePath = path.normalize(requested).replace(/^([/\\])+/, "");
  const full = path.join(ROOT, safePath);

  if (!full.startsWith(ROOT + path.sep) && full !== ROOT) {
    writeHead(res, 403);
    return res.end("Forbidden");
  }

  fs.readFile(full, (err, data) => {
    if (err) {
      writeHead(res, 404, {
        "Content-Type": "text/plain; charset=utf-8"
      });
      return res.end("Not found");
    }

    writeHead(res, 200, {
      "Content-Type": mime[path.extname(full)] || "application/octet-stream",
      "Cache-Control": pathname === "/index.html" ? "no-cache" : "public, max-age=300"
    });

    res.end(data);
  });
});

// Remove players that have not sent an update recently.
// The client sends a heartbeat every 1.5 seconds while the page is open.
setInterval(() => {
  const cutoff = Date.now() - 15 * 1000;
  let changed = false;

  for (const [id, player] of players) {
    if (player.lastSeen < cutoff) {
      players.delete(id);
      changed = true;
    }
  }

  if (changed) broadcast();
}, 5000);

server.listen(PORT, HOST, () => {
  console.log(`The Unit web game running on http://localhost:${PORT}`);
});
