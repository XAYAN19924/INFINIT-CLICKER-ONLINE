const STORAGE = {
  playerId: "theUnitPlayerId",
  playerName: "theUnitPlayerName",
  score: "theUnitScore",
  upgradeLevel: "theUnitUpgradeLevel",
  rebirths: "theUnitRebirths",
  ultraRebirths: "theUnitUltraRebirths",
  prestige: "theUnitPrestige"
};

const state = {
  playerId: localStorage.getItem(STORAGE.playerId) || crypto.randomUUID(),
  playerName: localStorage.getItem(STORAGE.playerName) || "",
  score: Number(localStorage.getItem(STORAGE.score) || 0),
  upgradeLevel: Number(localStorage.getItem(STORAGE.upgradeLevel) || 0),
  rebirths: Number(localStorage.getItem(STORAGE.rebirths) || 0),
  ultraRebirths: Number(localStorage.getItem(STORAGE.ultraRebirths) || 0),
  prestige: Number(localStorage.getItem(STORAGE.prestige) || 0),
  players: [],
  lastClicks: [],
  activeTab: "upgrades"
};

localStorage.setItem(STORAGE.playerId, state.playerId);

const $ = id => document.getElementById(id);
const scoreEl = $("score");
const leaderboardEl = $("leaderboard");
const sessionEl = $("sessionCount");
const cpsEl = $("cps");
const syncEl = $("syncStatus");
const nameModal = $("nameModal");
const nameInput = $("nameInput");
const nameSave = $("nameSave");
const currentNameEl = $("currentName");

let eventSource = null;
let serverConnected = false;
let reconnectTimer = null;


const fmt = n => Number(n || 0).toLocaleString("en-US", {
  maximumFractionDigits: 2
});

function save() {
  localStorage.setItem(STORAGE.playerId, state.playerId);
  localStorage.setItem(STORAGE.playerName, state.playerName);
  localStorage.setItem(STORAGE.score, state.score);
  localStorage.setItem(STORAGE.upgradeLevel, state.upgradeLevel);
  localStorage.setItem(STORAGE.rebirths, state.rebirths);
  localStorage.setItem(STORAGE.ultraRebirths, state.ultraRebirths);
  localStorage.setItem(STORAGE.prestige, state.prestige);
}

function upgradeEffect() {
  return 1 + state.upgradeLevel * (1 + state.rebirths * 0.15);
}

function rebirthMultiplier() {
  return 1 + state.rebirths * 0.25;
}

function ultraMultiplier() {
  return 1 + state.ultraRebirths * 1.5;
}

function prestigeMultiplier() {
  return 1 + state.prestige * 5;
}

function totalMultiplier() {
  return Math.max(1, upgradeEffect() * rebirthMultiplier() * ultraMultiplier() * prestigeMultiplier());
}

function upgradeCost(level = state.upgradeLevel) {
  return Math.floor(25 * Math.pow(1.115, level) + level * 7);
}

function bulkUpgradeCost(amount = 10) {
  let total = 0;
  for (let i = 0; i < amount; i++) total += upgradeCost(state.upgradeLevel + i);
  return Math.floor(total);
}

function rebirthCost() {
  return Math.floor(10000 * Math.pow(2.35, state.rebirths));
}

const ultraRequirement = 10;
const prestigeRequirement = 5;

function resetUpgradeLayer() {
  state.score = 0;
  state.upgradeLevel = 0;
}

function resetRebirthLayer() {
  resetUpgradeLayer();
  state.rebirths = 0;
}

function resetUltraLayer() {
  resetRebirthLayer();
  state.ultraRebirths = 0;
}

function renderTabs() {
  $("multiplier").textContent = "x" + totalMultiplier().toFixed(2).replace(/\.00$/, "");
  $("clickPower").textContent = fmt(totalMultiplier());
  $("rebirthCount").textContent = fmt(state.rebirths);
  $("ultraCount").textContent = fmt(state.ultraRebirths);
  $("prestigeCount").textContent = fmt(state.prestige);

  const nextUpgradeCost = upgradeCost();
  const bulkCost = bulkUpgradeCost(10);

  $("upgradesTab").innerHTML = `
    <div class="progress-note">
      <span>Upgrade power</span>
      <strong>+${(1 + state.rebirths * 0.15).toFixed(2)} per level</strong>
    </div>
    <div class="upgrade-grid">
      <button class="upgrade" type="button" data-action="upgrade" ${state.score < nextUpgradeCost ? "disabled" : ""}>
        <div class="upgrade-title">Click Power +1</div>
        <div class="upgrade-desc">Increase click strength. Rebirths make each upgrade stronger.</div>
        <div class="upgrade-meta"><span class="cost">${fmt(nextUpgradeCost)} clicks</span><span class="owned">Lv. ${state.upgradeLevel}</span></div>
      </button>
      <button class="upgrade" type="button" data-action="upgrade10" ${state.score < bulkCost ? "disabled" : ""}>
        <div class="upgrade-title">Power Pack +10</div>
        <div class="upgrade-desc">Buy ten upgrade levels at once for the combined cost.</div>
        <div class="upgrade-meta"><span class="cost">${fmt(bulkCost)} clicks</span><span class="owned">+10</span></div>
      </button>
    </div>`;

  $("rebirthTab").innerHTML = `
    <div class="reset-card">
      <h3>Rebirth</h3>
      <p>Reset clicks and upgrades. Gain +25% permanent multiplier and make future upgrades 15% stronger per Rebirth.</p>
      <button type="button" data-action="rebirth" ${state.score < rebirthCost() ? "disabled" : ""}>REBIRTH • +25% MULTIPLIER</button>
      <div class="reset-info">Requirement: ${fmt(rebirthCost())} clicks • Current bonus: x${rebirthMultiplier().toFixed(2)}</div>
    </div>`;

  const ultraReady = state.rebirths >= ultraRequirement;
  $("ultrarebirthTab").innerHTML = `
    <div class="reset-card">
      <h3>Ultra Rebirth</h3>
      <p>Reset clicks, upgrades and Rebirths. Gain a permanent +1.5x layer multiplier.</p>
      <button type="button" data-action="ultra" ${!ultraReady ? "disabled" : ""}>ULTRA REBIRTH • +1.5x LAYER</button>
      <div class="reset-info">Progress: ${state.rebirths} / ${ultraRequirement} Rebirths</div>
    </div>`;

  const prestigeReady = state.ultraRebirths >= prestigeRequirement;
  $("prestigeTab").innerHTML = `
    <div class="reset-card">
      <h3>Prestige</h3>
      <p>Reset everything below Prestige. Gain a permanent +5x prestige multiplier.</p>
      <button type="button" data-action="prestige" ${!prestigeReady ? "disabled" : ""}>PRESTIGE • +5x MULTIPLIER</button>
      <div class="reset-info">Progress: ${state.ultraRebirths} / ${prestigeRequirement} Ultra Rebirths</div>
    </div>`;
}

function render() {
  scoreEl.textContent = fmt(state.score);
  currentNameEl.textContent = state.playerName || "Unnamed Player";
  renderTabs();
  updateCps();

  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  leaderboardEl.innerHTML = sorted.length
    ? sorted.map((p, i) => `
      <li class="rank">
        <div class="rank-left">
          <span class="rank-num">#${i + 1}</span>
          <span class="rank-name ${p.id === state.playerId ? "you" : ""}">${escapeHtml(p.name)}${p.id === state.playerId ? " <small>(YOU)</small>" : ""}</span>
        </div>
        <div class="rank-score">
          <strong>${fmt(p.score)}</strong>
          <small>x${Number(p.multiplier || 1).toFixed(2)}</small>
        </div>
      </li>`).join("")
    : `<li class="empty">No players online.</li>`;

  sessionEl.textContent = state.players.length;
  save();
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function updateCps() {
  const now = Date.now();
  state.lastClicks = state.lastClicks.filter(t => now - t < 1000);
  cpsEl.textContent = state.lastClicks.length.toFixed(1);
}

function updateOwnPlayer() {
  const me = state.players.find(p => p.id === state.playerId);
  if (me) {
    me.name = state.playerName;
    me.score = state.score;
    me.multiplier = totalMultiplier();
  }
}

function sendScore() {
  updateOwnPlayer();
  if (state.playerName) {
    fetch("/player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: state.playerId,
        name: state.playerName,
        score: state.score,
        multiplier: totalMultiplier()
      })
    }).catch(() => {
      serverConnected = false;
      syncEl.textContent = "OFFLINE";
      syncEl.className = "sync offline";
    });
  }
  render();
}

$("clickButton").addEventListener("click", () => {
  const power = totalMultiplier();
  state.score += power;
  state.lastClicks.push(Date.now());
  if (state.lastClicks.length > 100) state.lastClicks.shift();
  sendScore();
});

document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => {
  state.activeTab = btn.dataset.tab;
  document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x === btn));
  document.querySelectorAll(".tab-content").forEach(x => x.classList.toggle("active", x.id === state.activeTab + "Tab"));
}));

$("tabPanel").addEventListener("click", e => {
  const button = e.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;

  if (action === "upgrade" && state.score >= upgradeCost()) {
    state.score -= upgradeCost();
    state.upgradeLevel++;
  } else if (action === "upgrade10" && state.score >= bulkUpgradeCost(10)) {
    const cost = bulkUpgradeCost(10);
    state.score -= cost;
    state.upgradeLevel += 10;
  } else if (action === "rebirth" && state.score >= rebirthCost()) {
    state.rebirths++;
    resetUpgradeLayer();
  } else if (action === "ultra" && state.rebirths >= ultraRequirement) {
    state.ultraRebirths++;
    resetRebirthLayer();
  } else if (action === "prestige" && state.ultraRebirths >= prestigeRequirement) {
    state.prestige++;
    resetUltraLayer();
  } else {
    return;
  }

  sendScore();
});

function connect() {
  clearTimeout(reconnectTimer);
  if (eventSource) eventSource.close();

  try {
    eventSource = new EventSource("/events");
  } catch {
    scheduleReconnect();
    return;
  }

  eventSource.addEventListener("open", () => {
    serverConnected = true;
    syncEl.textContent = "LIVE";
    syncEl.className = "sync live";
    if (state.playerName) sendScore();
  });

  eventSource.addEventListener("players", event => {
    try {
      const msg = JSON.parse(event.data);
      state.players = (msg.players || []).map(p => ({
        id: String(p.id),
        name: String(p.name || "Player"),
        score: Number(p.score || 0),
        multiplier: Number(p.multiplier || 1)
      }));
      updateOwnPlayer();
      render();
    } catch {}
  });

  eventSource.addEventListener("error", () => {
    serverConnected = false;
    syncEl.textContent = "RECONNECTING";
    syncEl.className = "sync offline";
    eventSource.close();
    scheduleReconnect();
  });
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connect, 2000);
}

function openNameModal() {
  nameModal.classList.add("show");
  nameInput.value = state.playerName;
  setTimeout(() => nameInput.focus(), 50);
}

function saveName() {
  const name = nameInput.value.trim().replace(/\s+/g, " ").slice(0, 24);
  if (!name) {
    nameInput.classList.add("invalid");
    return;
  }
  nameInput.classList.remove("invalid");
  state.playerName = name;
  save();
  nameModal.classList.remove("show");
  sendScore();
}

nameSave.addEventListener("click", saveName);
nameInput.addEventListener("keydown", e => {
  if (e.key === "Enter") saveName();
});
$("changeName").addEventListener("click", openNameModal);

setInterval(updateCps, 100);
setInterval(() => {
  if (state.playerName) sendScore();
}, 1500);

render();
if (!state.playerName) openNameModal();
connect();
