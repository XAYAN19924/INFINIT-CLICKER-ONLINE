const STORAGE = {
  playerId: "theUnitPlayerId",
  playerName: "theUnitPlayerName",
  score: "theUnitScore",
  upgradeLevel: "theUnitUpgradeLevel",
  autoLevel: "theUnitAutoLevel",
  autoPowerLevel: "theUnitAutoPowerLevel",
  critLevel: "theUnitCritLevel",
  critPowerLevel: "theUnitCritPowerLevel",
  comboLevel: "theUnitComboLevel",
  rebirths: "theUnitRebirths",
  ultraRebirths: "theUnitUltraRebirths",
  prestige: "theUnitPrestige",
  titleIndex: "theUnitTitleIndex",
  musicVolume: "theUnitMusicVolume",
  musicMuted: "theUnitMusicMuted",
  autoTitles: "theUnitAutoTitles",
  autoBuy: "theUnitAutoBuy",
  autoRebirth: "theUnitAutoRebirth",
  autoUltra: "theUnitAutoUltra"
};

const state = {
  playerId: localStorage.getItem(STORAGE.playerId) || crypto.randomUUID(),
  playerName: localStorage.getItem(STORAGE.playerName) || "",
  score: Number(localStorage.getItem(STORAGE.score) || 0),
  lifetimeClicks: Number(localStorage.getItem("theUnitLifetimeClicks") || 0),
  upgradeLevel: Number(localStorage.getItem(STORAGE.upgradeLevel) || 0),
  autoLevel: Number(localStorage.getItem(STORAGE.autoLevel) || 0),
  autoPowerLevel: Number(localStorage.getItem(STORAGE.autoPowerLevel) || 0),
  critLevel: Number(localStorage.getItem(STORAGE.critLevel) || 0),
  critPowerLevel: Number(localStorage.getItem(STORAGE.critPowerLevel) || 0),
  comboLevel: Number(localStorage.getItem(STORAGE.comboLevel) || 0),
  rebirths: Number(localStorage.getItem(STORAGE.rebirths) || 0),
  ultraRebirths: Number(localStorage.getItem(STORAGE.ultraRebirths) || 0),
  prestige: Number(localStorage.getItem(STORAGE.prestige) || 0),
  titleIndex: Number(localStorage.getItem(STORAGE.titleIndex) || 0),
  players: [],
  lastClicks: [],
  activeTab: "upgrades",
  combo: 0,
  comboUntil: 0,
  musicVolume: Number(localStorage.getItem(STORAGE.musicVolume) ?? 55),
  musicMuted: localStorage.getItem(STORAGE.musicMuted) === "true",
  autoTitles: localStorage.getItem(STORAGE.autoTitles) !== "false",
  autoBuy: localStorage.getItem(STORAGE.autoBuy) === "true",
  autoRebirth: localStorage.getItem(STORAGE.autoRebirth) === "true",
  autoUltra: localStorage.getItem(STORAGE.autoUltra) === "true"
};
localStorage.setItem(STORAGE.playerId, state.playerId);

const $ = id => document.getElementById(id);
const scoreEl = $("score"), leaderboardEl = $("leaderboard"), sessionEl = $("sessionCount");
const cpsEl = $("cps"), autoCpsEl = $("autoCps"), autoCpsMain = $("autoCpsMain");
const syncEl = $("syncStatus"), nameModal = $("nameModal"), nameInput = $("nameInput");
const nameSave = $("nameSave"), currentNameEl = $("currentName"), clickButton = $("clickButton");
const settingsModal = $("settingsModal"), musicButton = $("musicButton"), musicIcon = $("musicIcon");
const musicVolume = $("musicVolume"), volumeValue = $("volumeValue"), settingsMute = $("settingsMute");

let eventSource = null, reconnectTimer = null, serverConnected = false;
const API_BASE = String(window.THE_UNIT_API_URL || "").replace(/\/$/, "");
const audio = new Audio("assets/night-shade.mp3");
audio.loop = true;
audio.preload = "auto";

const titles = [
  ["Rookie",0,"classic"],["First Tap",10,"green"],["Warm Up",50,"blue"],["Button Rookie",100,"purple"],
  ["Tiny Clicker",250,"cyan"],["Getting Started",500,"green"],["Click Apprentice",1000,"blue"],
  ["Clicker",2500,"purple"],["Fast Fingers",5000,"pink"],["Tap Specialist",10000,"gold"],
  ["Hundred Club",25000,"cyan"],["Click Smith",50000,"orange"],["Click Knight",100000,"purple"],
  ["Click Samurai",250000,"blue"],["Click Master",500000,"green"],["Millionaire",1000000,"gold"],
  ["Millionaire+",2500000,"pink"],["Millionaire Prime",5000000,"cyan"],["Click Legend",10000000,"purple"],
  ["Click Titan",25000000,"orange"],["Click Overlord",50000000,"red"],["Century Million",100000000,"rainbow"],
  ["Tap God",250000000,"gold"],["Tap Deity",500000000,"rainbow"],["Billionaire",1000000000,"gold"],
  ["Billionaire Prime",2500000000,"purple"],["Billionaire Elite",5000000000,"cyan"],["Billion Click Club",10000000000,"rainbow"],
  ["Click Emperor",25000000000,"red"],["Click Monarch",50000000000,"gold"],["Trillionaire",1000000000000,"rainbow"],
  ["Trillionaire Prime",2500000000000,"purple"],["Trillionaire Elite",5000000000000,"cyan"],["Trillion Click Club",10000000000000,"rainbow"],
  ["Click Emperor II",25000000000000,"red"],["Click Monarch II",50000000000000,"gold"],["Quadrillionaire",1000000000000000,"rainbow"],
  ["Quantum Tapper",2500000000000000,"cyan"],["Quantum Clicker",5000000000000000,"purple"],["Quantum Lord",10000000000000000,"rainbow"],
  ["Reality Breaker",25000000000000000,"red"],["Cosmic Clicker",50000000000000000,"gold"],["Cosmic Emperor",100000000000000000,"rainbow"],
  ["Star Crusher",250000000000000000,"pink"],["Galaxy Farmer",500000000000000000,"cyan"],["Galaxy Lord",1000000000000000000,"rainbow"],
  ["Universe Clicker",2500000000000000000,"purple"],["Universe King",5000000000000000000,"gold"],["Multiverse",10000000000000000000,"rainbow"],
  ["Multiverse Prime",25000000000000000000,"cyan"],["Dimension Breaker",50000000000000000000,"red"],["Dimensional Lord",100000000000000000000,"rainbow"],
  ["Void Walker",250000000000000000000,"purple"],["Void Lord",500000000000000000000,"gold"],["Void Emperor",1000000000000000000000,"rainbow"],
  ["Eternal Clicker",2500000000000000000000,"cyan"],["Eternal One",5000000000000000000000,"rainbow"],["Infinity Initiate",10000000000000000000000,"purple"],
  ["Infinity Master",25000000000000000000000,"gold"],["Infinity Lord",50000000000000000000000,"rainbow"],["Infinity God",100000000000000000000000,"rainbow"],
  ["Beyond Infinity",250000000000000000000000,"red"],["Impossible",500000000000000000000000,"purple"],["Unstoppable",1000000000000000000000000,"gold"],
  ["The Chosen Clicker",2500000000000000000000000,"rainbow"],["The One",5000000000000000000000000,"rainbow"],["The Unit",10000000000000000000000000,"rainbow"],
  ["Singularity",25000000000000000000000000,"blackgold"],["Event Horizon",50000000000000000000000000,"rainbow"],["Reality Architect",100000000000000000000000000,"rainbow"],
  ["Universe Architect",250000000000000000000000000,"purple"],["Cosmic Architect",500000000000000000000000000,"gold"],["Time Breaker",1000000000000000000000000000,"rainbow"],
  ["Time Lord",2500000000000000000000000000,"cyan"],["Chrono King",5000000000000000000000000000,"rainbow"],["Infinite Mind",10000000000000000000000000000,"purple"],
  ["Infinite Hand",25000000000000000000000000000,"gold"],["Infinite Throne",50000000000000000000000000000,"rainbow"],["Absolute Clicker",100000000000000000000000000000,"red"],
  ["Absolute One",250000000000000000000000000000,"rainbow"],["Omniversal",500000000000000000000000000000,"purple"],["Omniversal Prime",1000000000000000000000000000000,"rainbow"],
  ["Beyond",2500000000000000000000000000000,"cyan"],["Beyond Prime",5000000000000000000000000000000,"gold"],["Beyond All",10000000000000000000000000000000,"rainbow"],
  ["Mythic Clicker",25000000000000000000000000000000,"pink"],["Mythic Lord",50000000000000000000000000000000,"rainbow"],["Mythic God",100000000000000000000000000000000,"rainbow"],
  ["Celestial",250000000000000000000000000000000,"cyan"],["Celestial Lord",500000000000000000000000000000000,"gold"],["Celestial God",1000000000000000000000000000000000,"rainbow"],
  ["Transcendent",2500000000000000000000000000000000,"purple"],["Transcendent One",5000000000000000000000000000000000,"rainbow"],["Final Clicker",10000000000000000000000000000000000,"blackgold"],
  ["Endless",25000000000000000000000000000000000,"rainbow"],["The Endless One",50000000000000000000000000000000000,"rainbow"],["Absolute Infinity",100000000000000000000000000000000000,"rainbow"],
  ["INFINITE",250000000000000000000000000000000000,"rainbow"],["THE ABSOLUTE",500000000000000000000000000000000000,"blackgold"],["CLICKING LEGEND",1000000000000000000000000000000000000,"rainbow"]
];
// Endgame titles 34-100.
const extraTitles = [
  ["Nebula Clicker","2.5e37","cyan"],["Nebula Lord","5e37","purple"],["Nebula Emperor","1e38","rainbow"],
  ["Starlight","2.5e38","gold"],["Starlight Lord","5e38","cyan"],["Starlight Emperor","1e39","rainbow"],
  ["Solar Clicker","2.5e39","orange"],["Solar Lord","5e39","gold"],["Solar Emperor","1e40","rainbow"],
  ["Lunar Clicker","2.5e40","cyan"],["Lunar Lord","5e40","purple"],["Lunar Emperor","1e41","rainbow"],
  ["Astral Clicker","2.5e41","pink"],["Astral Lord","5e41","cyan"],["Astral Emperor","1e42","rainbow"],
  ["Arcane Tapper","2.5e42","purple"],["Arcane Lord","5e42","gold"],["Arcane Emperor","1e43","rainbow"],
  ["Mythos","2.5e43","red"],["Mythos Lord","5e43","purple"],["Mythos Emperor","1e44","rainbow"],
  ["Eternal Flame","2.5e44","orange"],["Eternal Flame Lord","5e44","gold"],["Eternal Flame God","1e45","rainbow"],
  ["Digital Deity","2.5e45","cyan"],["Digital Deity Prime","5e45","purple"],["Digital Deity Absolute","1e46","rainbow"],
  ["Code Breaker","2.5e46","green"],["Code Lord","5e46","cyan"],["Code God","1e47","rainbow"],
  ["Pixel Monarch","2.5e47","pink"],["Pixel Emperor","5e47","gold"],["Pixel Overlord","1e48","rainbow"],
  ["Nightmare Clicker","2.5e48","red"],["Nightmare Lord","5e48","purple"],["Nightmare God","1e49","rainbow"],
  ["Dream Clicker","2.5e49","cyan"],["Dream Lord","5e49","gold"],["Dream God","1e50","rainbow"],
  ["Chaos Clicker","2.5e50","red"],["Chaos Lord","5e50","purple"],["Chaos God","1e51","rainbow"],
  ["Order Clicker","2.5e51","green"],["Order Lord","5e51","cyan"],["Order God","1e52","rainbow"],
  ["Alpha Clicker","2.5e52","blue"],["Alpha Lord","5e52","gold"],["Alpha God","1e53","rainbow"],
  ["Omega Clicker","2.5e53","red"],["Omega Lord","5e53","purple"],["Omega God","1e54","rainbow"],
  ["Genesis Clicker","2.5e54","green"],["Genesis Lord","5e54","gold"],["Genesis God","1e55","rainbow"],
  ["Apocalypse Clicker","2.5e55","red"],["Apocalypse Lord","5e55","purple"],["Apocalypse God","1e56","rainbow"],
  ["Reality King","2.5e56","cyan"],["Reality God","5e56","gold"],["Reality Absolute","1e57","rainbow"],
  ["Infinite Architect","2.5e57","purple"],["Infinite Creator","5e57","gold"],["Infinite Absolute","1e58","rainbow"],
  ["Clicking Beyond","2.5e59","cyan"],["Clicking Forever","5e59","gold"],["The Last Click","1e60","rainbow"],
  ["THE END?","2.5e60","blackgold"]
];
extraTitles.forEach(([name, threshold, color]) => titles.push([name, Number(threshold), color]));

const titleFont = ["Orbitron","Audiowide","Rajdhani","Exo 2","Space Grotesk","system-ui"];
const titleData = i => titles[Math.min(Math.max(0,i),titles.length-1)];
const fmt = n => {
  n = Number(n || 0);
  if (!Number.isFinite(n)) return "∞";
  const abs = Math.abs(n);
  const units = [["T",1e12],["B",1e9],["M",1e6],["K",1e3]];
  for (const [u,v] of units) if (abs >= v) {
    const x = n / v;
    const digits = Math.abs(x) >= 100 ? 0 : Math.abs(x) >= 10 ? 1 : 2;
    return `${x.toFixed(digits).replace(/\.?0+$/,"")}${u}`;
  }
  return Math.floor(n).toLocaleString("en-US");
};
const apiUrl = path => API_BASE ? `${API_BASE}${path}` : path;

function save() {
  const values = {
    [STORAGE.playerId]: state.playerId,[STORAGE.playerName]: state.playerName,[STORAGE.score]: state.score,
    [STORAGE.upgradeLevel]: state.upgradeLevel,[STORAGE.autoLevel]: state.autoLevel,
    [STORAGE.autoPowerLevel]: state.autoPowerLevel,[STORAGE.critLevel]: state.critLevel,
    [STORAGE.critPowerLevel]: state.critPowerLevel,[STORAGE.comboLevel]: state.comboLevel,
    [STORAGE.rebirths]: state.rebirths,[STORAGE.ultraRebirths]: state.ultraRebirths,
    [STORAGE.prestige]: state.prestige,[STORAGE.titleIndex]: state.titleIndex,
    [STORAGE.musicVolume]: state.musicVolume,[STORAGE.musicMuted]: state.musicMuted,[STORAGE.autoTitles]: state.autoTitles,
    [STORAGE.autoBuy]: state.autoBuy,[STORAGE.autoRebirth]: state.autoRebirth,[STORAGE.autoUltra]: state.autoUltra,
    theUnitLifetimeClicks: state.lifetimeClicks
  };
  Object.entries(values).forEach(([k,v]) => localStorage.setItem(k,v));
}
function upgradeEffect(){return 1 + state.upgradeLevel * (1 + state.rebirths*.15);}
function rebirthMultiplier(){return 1 + state.rebirths*.25;}
function ultraMultiplier(){return 1 + state.ultraRebirths*1.5;}
function prestigeMultiplier(){return 1 + state.prestige*5;}
function comboMultiplier(){return 1 + Math.min(state.comboLevel*.02,1) * (state.combo>0 ? Math.min(state.combo/20,10) : 0);}
function totalMultiplier(){return Math.max(1,upgradeEffect()*rebirthMultiplier()*ultraMultiplier()*prestigeMultiplier());}
function clickPowerBase(){return totalMultiplier();}
function autoCps(){return state.autoLevel * (1 + state.autoPowerLevel*.25) * totalMultiplier();}
function upgradeCost(l=state.upgradeLevel){return Math.floor(25*Math.pow(1.115,l)+l*7);}
function autoCost(l=state.autoLevel){return Math.floor(100*Math.pow(1.19,l));}
function autoPowerCost(l=state.autoPowerLevel){return Math.floor(750*Math.pow(1.24,l));}
function critCost(l=state.critLevel){return Math.floor(2500*Math.pow(1.32,l));}
function critPowerCost(l=state.critPowerLevel){return Math.floor(12000*Math.pow(1.38,l));}
function comboCost(l=state.comboLevel){return Math.floor(5000*Math.pow(1.34,l));}
function bulkUpgradeCost(amount=10){let t=0;for(let i=0;i<amount;i++)t+=upgradeCost(state.upgradeLevel+i);return Math.floor(t);}
function rebirthCost(){return Math.floor(10000*Math.pow(2.35,state.rebirths));}
const AUTO_BUY_UNLOCK = 1e9;
const AUTO_REBIRTH_UNLOCK = 1e11;
const AUTO_ULTRA_UNLOCK = 1e13;
function autoBuyUnlocked(){return state.lifetimeClicks>=AUTO_BUY_UNLOCK;}
function autoRebirthUnlocked(){return state.lifetimeClicks>=AUTO_REBIRTH_UNLOCK;}
function autoUltraUnlocked(){return state.lifetimeClicks>=AUTO_ULTRA_UNLOCK;}
function resetRunUpgrades(){
  state.upgradeLevel=0;
  state.autoLevel=0;
  state.autoPowerLevel=0;
  state.critLevel=0;
  state.critPowerLevel=0;
  state.comboLevel=0;
  state.combo=0;
  state.comboUntil=0;
}
function tryAutoBuy(){
  if(!state.autoBuy || !autoBuyUnlocked()) return false;
  let bought=false;
  // Buy affordable upgrades repeatedly, prioritizing basic click power,
  // then auto power, critical upgrades and combo.
  for(let pass=0;pass<8;pass++){
    let choices=[
      ["upgrade",upgradeCost(),()=>{state.score-=upgradeCost();state.upgradeLevel++;}],
      ["auto",autoCost(),()=>{state.score-=autoCost();state.autoLevel++;}],
      ["autopower",autoPowerCost(),()=>{state.score-=autoPowerCost();state.autoPowerLevel++;}],
      ["crit",critCost(),()=>{state.score-=critCost();state.critLevel++;}],
      ["critpower",critPowerCost(),()=>{state.score-=critPowerCost();state.critPowerLevel++;}],
      ["combo",comboCost(),()=>{state.score-=comboCost();state.comboLevel++;}]
    ].filter(x=>state.score>=x[1]);
    if(!choices.length) break;
    choices.sort((a,b)=>a[1]-b[1]);
    choices[0][2]();
    bought=true;
  }
  return bought;
}
function tryAutomation(){
  let changed=false;
  if(state.autoBuy && autoBuyUnlocked()) changed=tryAutoBuy()||changed;
  if(state.autoUltra && autoUltraUnlocked() && state.rebirths>=10){
    state.ultraRebirths++;
    state.rebirths=0;
    state.score=0;
    resetRunUpgrades();
    changed=true;
  } else if(state.autoRebirth && autoRebirthUnlocked() && state.score>=rebirthCost()){
    state.rebirths++;
    state.score=0;
    resetRunUpgrades();
    changed=true;
  }
  return changed;
}
function titleUnlocked(i){return state.lifetimeClicks >= Number(titles[i][1]);}
function bestTitleIndex(){let best=0;for(let i=0;i<titles.length;i++)if(titleUnlocked(i))best=i;return best;}
function nextTitleIndex(){for(let i=0;i<titles.length;i++)if(!titleUnlocked(i))return i;return -1;}
function titleProgress(){const next=nextTitleIndex();if(next===-1)return {done:true,index:-1,from:Number(titles[titles.length-1][1]),to:Number(titles[titles.length-1][1]),progress:1,remaining:0};const prev=Math.max(0,next-1);const from=Number(titles[prev][1]);const to=Number(titles[next][1]);const progress=to<=from?1:Math.max(0,Math.min(1,(state.lifetimeClicks-from)/(to-from)));return {done:false,index:next,from,to,progress,remaining:Math.max(0,to-state.lifetimeClicks)};}
function currentTitle(){return titleData(state.titleIndex);}
function titleClass(i){return `title-${titleData(i)[2]}`;}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function renderTabs(){
  $("multiplier").textContent="x"+totalMultiplier().toFixed(2).replace(/\.00$/,"");
  $("clickPower").textContent=fmt(clickPowerBase());
  $("rebirthCount").textContent=fmt(state.rebirths);$("ultraCount").textContent=fmt(state.ultraRebirths);$("prestigeCount").textContent=fmt(state.prestige);
  autoCpsEl.textContent=fmt(autoCps());autoCpsMain.textContent=fmt(autoCps());
  const uc=upgradeCost(), bc=bulkUpgradeCost(10), ac=autoCost(), apc=autoPowerCost(), cc=critCost(), cpc=critPowerCost(), coc=comboCost();
  $("upgradesTab").innerHTML=`
    <div class="progress-note"><span>Click power</span><strong>${fmt(clickPowerBase())} / click</strong></div>
    <div class="upgrade-grid">
      ${card("Click Power","Each level makes every manual click stronger.",uc,`Lv. ${state.upgradeLevel}`,"upgrade")}
      ${card("Power Pack ×10","Buy ten Click Power levels at once.",bc,"+10","upgrade10")}
      ${card("Critical Click","Chance for a click to hit for extra power.",cc,`${state.critLevel*2}% chance`,"crit")}
      ${card("Critical Force","Increase the multiplier of critical clicks.",cpc,`×${(2+state.critPowerLevel*.5).toFixed(1)}`,"critpower")}
      ${card("Combo Engine","Higher combo makes your manual clicks stronger.",coc,`Lv. ${state.comboLevel}`,"combo")}
    </div>`;
  $("autoTab").innerHTML=`
    <div class="auto-hero"><div><b>Automatic clicking</b><span>${fmt(autoCps())} clicks / sec</span></div><div class="auto-orb">◉</div></div>
    <div class="upgrade-grid">
      ${card("Auto Clicker","Adds one automatic click every second, boosted by Auto Power.",ac,`Lv. ${state.autoLevel}`,"auto")}
      ${card("Auto Power","Makes every automatic click stronger.",apc,`Lv. ${state.autoPowerLevel}`,"autopower")}
    </div>
    <div class="automation-note">Automation runs in the background while this page is open. Your progress is saved locally.</div>`;
  const unlockedCount=titles.filter((_,i)=>titleUnlocked(i)).length;
  const tp=titleProgress();
  const nextLabel=tp.done?"ALL TITLES COLLECTED":`${escapeHtml(titles[tp.index][0])} • ${fmt(tp.to)} clicks`;
  const progressPct=Math.round(tp.progress*100);
  $("titlesTab").innerHTML=`
    <div class="title-summary"><div><strong>${unlockedCount}/100</strong><span>titles unlocked</span></div><button type="button" class="auto-title-toggle ${state.autoTitles?"on":""}" data-action="autoTitles">${state.autoTitles?"✓ AUTO COLLECT: ON":"AUTO COLLECT: OFF"}</button></div>
    <div class="title-next"><div class="title-next-head"><span>${tp.done?"Collection complete":"NEXT TITLE"}</span><b>${nextLabel}</b></div><div class="title-progress"><i style="width:${progressPct}%"></i></div><div class="title-progress-meta"><span>${tp.done?"You unlocked every title.":`${fmt(state.lifetimeClicks)} / ${fmt(tp.to)} lifetime clicks`}</span><strong>${tp.done?"100%":`${progressPct}%`}</strong></div></div>
    <div class="title-grid">${titles.map((t,i)=>`
      <button type="button" class="title-card ${titleClass(i)} ${titleUnlocked(i)?"unlocked":"locked"} ${i===state.titleIndex?"selected":""}" data-action="title" data-title="${i}" ${titleUnlocked(i)?"":"disabled"}>
        <span class="title-name">${escapeHtml(t[0])}</span>
        <small>${titleUnlocked(i)?`✓ UNLOCKED • ${fmt(t[1])} clicks`:`🔒 Unlock at ${fmt(t[1])} clicks`}</small>
      </button>`).join("")}</div>`;
  $("rebirthTab").innerHTML=`<div class="reset-card"><h3>Rebirth</h3><p>Reset clicks and upgrades. Gain +25% permanent multiplier and make future upgrades stronger.</p><button type="button" data-action="rebirth" ${state.score<rebirthCost()?"disabled":""}>REBIRTH • +25% MULTIPLIER</button><div class="reset-info">Requirement: ${fmt(rebirthCost())} clicks • Current bonus: x${rebirthMultiplier().toFixed(2)}</div></div>`;
  const ur=state.rebirths>=10;
  $("ultrarebirthTab").innerHTML=`<div class="reset-card"><h3>Ultra Rebirth</h3><p>Reset clicks, upgrades and Rebirths. Gain a permanent +1.5x layer multiplier.</p><button type="button" data-action="ultra" ${!ur?"disabled":""}>ULTRA REBIRTH • +1.5x LAYER</button><div class="reset-info">Progress: ${state.rebirths} / 10 Rebirths</div></div>`;
  const ab=autoBuyUnlocked(), ar=autoRebirthUnlocked(), au=autoUltraUnlocked();
  const pctBuy=Math.min(100,Math.round(state.lifetimeClicks/AUTO_BUY_UNLOCK*100));
  const pctRebirth=Math.min(100,Math.round(state.lifetimeClicks/AUTO_REBIRTH_UNLOCK*100));
  const pctUltra=Math.min(100,Math.round(state.lifetimeClicks/AUTO_ULTRA_UNLOCK*100));
  $("automationTab").innerHTML=`
    <div class="auto-hero automation-header"><div><b>Automation Center</b><span>Unlock powerful automation by reaching lifetime click milestones.</span></div><div class="auto-orb">⚙</div></div>
    <div class="automation-grid">
      ${automationCard("AUTO BUY UPGRADES","Automatically buys affordable upgrades after every earnings tick.",AUTO_BUY_UNLOCK,ab,state.autoBuy,"autoBuy",pctBuy)}
      ${automationCard("AUTO REBIRTH","Automatically Rebirths when you can afford the next Rebirth.",AUTO_REBIRTH_UNLOCK,ar,state.autoRebirth,"autoRebirth",pctRebirth)}
      ${automationCard("AUTO ULTRA REBIRTH","Automatically Ultra Rebirths after reaching 10 Rebirths.",AUTO_ULTRA_UNLOCK,au,state.autoUltra,"autoUltra",pctUltra)}
    </div>
    <div class="automation-note">Automation unlocks are permanent. Rebirth and Ultra Rebirth reset all upgrade levels, but these automation unlocks stay unlocked.</div>`;
  const pr=state.ultraRebirths>=5;
  $("prestigeTab").innerHTML=`<div class="reset-card"><h3>Prestige</h3><p>Reset everything below Prestige. Gain a permanent +5x prestige multiplier.</p><button type="button" data-action="prestige" ${!pr?"disabled":""}>PRESTIGE • +5x MULTIPLIER</button><div class="reset-info">Progress: ${state.ultraRebirths} / 5 Ultra Rebirths</div></div>`;
}
function automationCard(name,desc,threshold,unlocked,enabled,action,pct){
  const status=unlocked ? (enabled?"✓ ENABLED":"READY TO ENABLE") : `LOCKED • ${fmt(threshold)} LIFETIME CLICKS`;
  return `<div class="automation-card ${unlocked?"unlocked":"locked"}">
    <div class="automation-card-top"><div><div class="upgrade-title">${name}</div><div class="upgrade-desc">${desc}</div></div><span class="automation-status">${status}</span></div>
    <div class="automation-progress"><i style="width:${pct}%"></i></div>
    <div class="automation-meta"><span>${unlocked?"Unlocked":"Unlock at "+fmt(threshold)+" lifetime clicks"}</span><strong>${unlocked?"100%":pct+"%"}</strong></div>
    <button class="automation-toggle" type="button" data-action="${action}" ${unlocked?"":"disabled"}>${enabled?"TURN OFF":"TURN ON"}</button>
  </div>`;
}
function card(name,desc,cost,owned,action){
  return `<button class="upgrade" type="button" data-action="${action}" ${state.score<cost?"disabled":""}><div class="upgrade-title">${name}</div><div class="upgrade-desc">${desc}</div><div class="upgrade-meta"><span class="cost">${fmt(cost)} clicks</span><span class="owned">${owned}</span></div></button>`;
}
function render(){
  scoreEl.textContent=fmt(state.score);currentNameEl.textContent=state.playerName||"Unnamed Player";renderTabs();updateCps();
  const sorted=[...state.players].sort((a,b)=>b.score-a.score);
  leaderboardEl.innerHTML=sorted.length?sorted.map((p,i)=>{
    const ti=Math.min(Number(p.titleIndex||0),titles.length-1), title=titleData(ti);
    return `<li class="rank"><div class="rank-left"><span class="rank-num">#${i+1}</span><div class="rank-person"><span class="rank-name ${p.id===state.playerId?"you":""}">${escapeHtml(p.name)}${p.id===state.playerId?" <small>(YOU)</small>":""}</span><span class="leader-title ${titleClass(ti)}">${escapeHtml(title[0])}</span></div></div><div class="rank-score"><strong>${fmt(p.score)}</strong><small>x${Number(p.multiplier||1).toFixed(2)}</small></div></li>`;
  }).join(""):`<li class="empty">No players online.</li>`;
  sessionEl.textContent=state.players.length;renderTitleBadge();save();
}
function renderTitleBadge(){const t=currentTitle();$("titleBadge").textContent=t[0];$("titleBadge").className=`title-badge ${titleClass(state.titleIndex)}`;}
function updateCps(){const now=Date.now();state.lastClicks=state.lastClicks.filter(t=>now-t<1000);cpsEl.textContent=state.lastClicks.length.toFixed(1);}
function updateOwnPlayer(){const me=state.players.find(p=>p.id===state.playerId);if(me){me.name=state.playerName;me.score=state.score;me.multiplier=totalMultiplier();me.titleIndex=state.titleIndex;}}
function sendScore(){
  updateOwnPlayer();
  if(state.playerName)fetch(apiUrl("/player"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:state.playerId,name:state.playerName,score:state.score,multiplier:totalMultiplier(),titleIndex:state.titleIndex})}).catch(()=>{serverConnected=false;syncEl.textContent="OFFLINE";syncEl.className="sync offline";});
  render();
}
function doClick(source="manual"){
  let power=clickPowerBase();
  if(source==="manual"){
    const now=Date.now();
    if(now<state.comboUntil)state.combo++;else state.combo=1;
    state.comboUntil=now+1800;
    power*=1+Math.min(state.combo*state.comboLevel*.02,2);
    if(state.critLevel>0 && Math.random()<state.critLevel*.02)power*=2+state.critPowerLevel*.5;
    state.lastClicks.push(now);if(state.lastClicks.length>100)state.lastClicks.shift();
    state.lifetimeClicks++;
    clickButton.classList.remove("click-flash");void clickButton.offsetWidth;clickButton.classList.add("click-flash");
    scoreEl.classList.remove("score-flash");void scoreEl.offsetWidth;scoreEl.classList.add("score-flash");
  }
  state.score+=power;
  if(source==="manual")checkTitleUnlock();
}
function checkTitleUnlock(){
  const best=bestTitleIndex();
  if(state.autoTitles && best>state.titleIndex)state.titleIndex=best;
}
clickButton.addEventListener("click",()=>{doClick();sendScore();});
document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{state.activeTab=btn.dataset.tab;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===btn));document.querySelectorAll(".tab-content").forEach(x=>x.classList.toggle("active",x.id===state.activeTab+"Tab"));}));
$("tabPanel").addEventListener("click",e=>{
  const b=e.target.closest("[data-action]");if(!b)return;const a=b.dataset.action;
  if(a==="title"){const i=Number(b.dataset.title);if(titleUnlocked(i))state.titleIndex=i;else return;}
  else if(a==="autoTitles"){state.autoTitles=!state.autoTitles;if(state.autoTitles)state.titleIndex=bestTitleIndex();}
  else if(a==="upgrade"&&state.score>=upgradeCost()){state.score-=upgradeCost();state.upgradeLevel++;}
  else if(a==="upgrade10"&&state.score>=bulkUpgradeCost(10)){const c=bulkUpgradeCost(10);state.score-=c;state.upgradeLevel+=10;}
  else if(a==="auto"&&state.score>=autoCost()){state.score-=autoCost();state.autoLevel++;}
  else if(a==="autopower"&&state.score>=autoPowerCost()){state.score-=autoPowerCost();state.autoPowerLevel++;}
  else if(a==="crit"&&state.score>=critCost()){state.score-=critCost();state.critLevel++;}
  else if(a==="critpower"&&state.score>=critPowerCost()){state.score-=critPowerCost();state.critPowerLevel++;}
  else if(a==="combo"&&state.score>=comboCost()){state.score-=comboCost();state.comboLevel++;}
  else if(a==="autoBuy"&&autoBuyUnlocked()){state.autoBuy=!state.autoBuy;}
  else if(a==="autoRebirth"&&autoRebirthUnlocked()){state.autoRebirth=!state.autoRebirth;}
  else if(a==="autoUltra"&&autoUltraUnlocked()){state.autoUltra=!state.autoUltra;}
  else if(a==="rebirth"&&state.score>=rebirthCost()){state.rebirths++;state.score=0;resetRunUpgrades();}
  else if(a==="ultra"&&state.rebirths>=10){state.ultraRebirths++;state.rebirths=0;state.score=0;resetRunUpgrades();}
  else if(a==="prestige"&&state.ultraRebirths>=5){state.prestige++;state.ultraRebirths=0;state.rebirths=0;state.score=0;resetRunUpgrades();}
  else return;
  sendScore();
});
function connect(){
  clearTimeout(reconnectTimer);if(eventSource)eventSource.close();
  try{eventSource=new EventSource(apiUrl("/events"));}catch{scheduleReconnect();return;}
  eventSource.addEventListener("open",()=>{serverConnected=true;syncEl.textContent="LIVE";syncEl.className="sync live";if(state.playerName)sendScore();});
  eventSource.addEventListener("players",e=>{try{const m=JSON.parse(e.data);state.players=(m.players||[]).map(p=>({id:String(p.id),name:String(p.name||"Player"),score:Number(p.score||0),multiplier:Number(p.multiplier||1),titleIndex:Number(p.titleIndex||0)}));updateOwnPlayer();render();}catch{}});
  eventSource.addEventListener("error",()=>{serverConnected=false;syncEl.textContent="RECONNECTING";syncEl.className="sync offline";eventSource.close();scheduleReconnect();});
}
function scheduleReconnect(){clearTimeout(reconnectTimer);reconnectTimer=setTimeout(connect,2000);}
function openNameModal(){nameModal.classList.add("show");nameInput.value=state.playerName;setTimeout(()=>nameInput.focus(),50);}
function saveName(){const name=nameInput.value.trim().replace(/\s+/g," ").slice(0,24);if(!name){nameInput.classList.add("invalid");return;}nameInput.classList.remove("invalid");state.playerName=name;save();nameModal.classList.remove("show");sendScore();}
nameSave.addEventListener("click",saveName);nameInput.addEventListener("keydown",e=>{if(e.key==="Enter")saveName();});
$("changeName").addEventListener("click",openNameModal);

function applyMusic(){
  audio.volume=Math.max(0,Math.min(1,state.musicVolume/100));
  musicVolume.value=state.musicVolume;volumeValue.textContent=`${state.musicVolume}%`;
  const muted=state.musicMuted;
  audio.muted=muted;musicIcon.textContent=muted?"♫̸":"♫";
  musicButton.classList.toggle("muted",muted);
  settingsMute.textContent=muted?"♫ Music: OFF":"♫ Music: ON";
}
function tryStartMusic(){if(!state.musicMuted)audio.play().catch(()=>{});}
musicButton.addEventListener("click",()=>{state.musicMuted=!state.musicMuted;applyMusic();save();tryStartMusic();});
settingsMute.addEventListener("click",()=>{state.musicMuted=!state.musicMuted;applyMusic();save();tryStartMusic();});
musicVolume.addEventListener("input",()=>{state.musicVolume=Number(musicVolume.value);if(state.musicVolume>0&&state.musicMuted)state.musicMuted=false;applyMusic();save();tryStartMusic();});
$("settingsButton").addEventListener("click",()=>{settingsModal.classList.add("show");applyMusic();});
$("settingsClose").addEventListener("click",()=>settingsModal.classList.remove("show"));
settingsModal.addEventListener("click",e=>{if(e.target===settingsModal)settingsModal.classList.remove("show");});
nameModal.addEventListener("click",e=>{if(e.target===nameModal&&state.playerName)nameModal.classList.remove("show");});
["click","keydown","pointerdown"].forEach(evt=>window.addEventListener(evt,tryStartMusic,{once:true,passive:true}));

setInterval(()=>{if(state.comboUntil&&Date.now()>state.comboUntil)state.combo=0;updateCps();},100);
setInterval(()=>{
  const gain=autoCps()/10;
  if(gain>0){ state.score+=gain; state.lifetimeClicks+=gain; checkTitleUnlock(); }
  const changed=tryAutomation();
  if(gain>0||changed) render();
},100);
setInterval(()=>{if(state.playerName)sendScore();},2000);

applyMusic();render();if(!state.playerName)openNameModal();connect();
