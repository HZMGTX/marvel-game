/* == rules/state.js ==
   the save file and the state of a run
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* ------------------------------------------------------------------ save */
const SAVE_KEY = "multiverse-vessel/v2";
const clone = o => JSON.parse(JSON.stringify(o));
const DEFAULT_STATE = {
  started:false, unlocked:[], gearOwned:[], attuned:[], aiOwned:[], installedAi:null,
  host:null, loadout:{}, levels:{}, xp:{}, essence:0,
  missionsDone:0, missionRound:0, missionSeen:{}, story:{},
  abil:{}, vessel:{}, gearLv:{}, mastery:{}, hints:{},
  defeated:{}, cleared:{}, kills:{}, sector:"hk", wins:0, gearKills:{}, tutorial:0,
  worn:0, spent:0, letGo:0, heldOn:0
};
let S = clone(DEFAULT_STATE);
function save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }catch(e){} }
function load(){
  try{
    const raw = localStorage.getItem(SAVE_KEY); if(!raw) return false;
    S = Object.assign(clone(DEFAULT_STATE), JSON.parse(raw));
    S.unlocked = S.unlocked.filter(id=>BY_ID[id]);
    /* a save from the three-slot build keeps whoever was in the first slot */
    if(!S.host && Array.isArray(S.squad)) S.host = S.squad.find(x=>x && S.unlocked.includes(x)) || null;
    if(S.host && !S.unlocked.includes(S.host)) S.host = null;
    delete S.squad;
    return true;
  }catch(e){ return false; }
}
const level = id => S.levels[id] || 1;
const xpNeeded = lv => 90 + (lv-1)*70;

function gearFor(hostId){ const g = S.loadout[hostId]; return g ? GEAR_BY_ID[g] : null; }
function gearPotency(gear, hostId){
  if(!gear) return 0;
  if(gear.ownerId === hostId) return 1;
  if(S.attuned.includes(gear.id)) return .55;
  return 0;
}
function canEquip(gear, hostId){
  return S.gearOwned.includes(gear.id) && (gear.ownerId===hostId || S.attuned.includes(gear.id));
}
function aiAllowed(ai, being, gear){
  if(!ai) return false;
  if(ai.req==="any") return true;
  if(ai.req==="synth") return being.arch==="SYNTH"||being.tags.includes("ai")||being.tags.includes("vehicle")||being.tags.includes("object");
  if(ai.req==="tech")  return being.arch==="TECH"||being.arch==="SYNTH"||being.tags.includes("tech")||(gear&&(gear.kind==="armor"||gear.kind==="gear"));
  if(ai.req==="psi")   return being.arch==="PSI"||being.arch==="MYSTIC"||being.arch==="ENTITY";
  return false;
}

/* --------------------------------------------------------------- sectors */
function sectorBeings(id){ return BEINGS.filter(b=>b.sector===id); }
function sectorIndex(id){ return SECTORS.findIndex(s=>s.id===id); }
function sectorBoss(id){
  const pool = sectorBeings(id);
  return pool.slice().sort((a,b)=> b.tier-a.tier || a.name.localeCompare(b.name))[0];
}
const KILLS_TO_BOSS = 8;
function killsIn(id){ return S.kills[id]||0; }
function bossReady(id){ return killsIn(id) >= KILLS_TO_BOSS; }
function sectorCleared(id){ return !!S.cleared[id]; }
function sectorUnlocked(id){
  const i = sectorIndex(id);
  if(i<=0) return true;
  return sectorCleared(SECTORS[i-1].id);
}

/* ----------------------------------------------------------------- units */
function unitStats(b, o){
  o = o||{};
  const lv = o.level||1;
  const scale = (o.scale||1) * (1 + (lv-1)*0.055);
  const gear = o.gear||null, pot = o.pot||0;
  const gmul = gear ? 1 + gearLevel(gear.id)*0.10 : 1;
  const mast = 1 + masteryTier(b.id)*0.04;
  const ai = (o.ai && aiAllowed(o.ai, b, pot>0?gear:null)) ? o.ai : null;
  const st = {
    p: (b.st.p*scale + (pot?gear.mods.p*pot*gmul:0) + (ai?ai.mods.p:0)) * mast,
    d: (b.st.d*scale + (pot?gear.mods.d*pot*gmul:0) + (ai?ai.mods.d:0)) * mast,
    s: (b.st.s*scale + (pot?gear.mods.s*pot*gmul:0) + (ai?ai.mods.s:0)) * mast,
    n: (b.st.n*scale + (pot?gear.mods.n*pot*gmul:0) + (ai?ai.mods.n:0)) * mast
  };
  for(const k in st) st[k] = Math.max(1, Math.round(st[k]));
  const maxHp = Math.round(130 + b.tier*42 + st.d*1.2 + (pot?gear.mods.d*pot*2.2:0) + (ai?ai.mods.d*1.6:0));
  return {st, maxHp, gear:pot>0?gear:null, pot, ai};
}

