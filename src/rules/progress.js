/* == rules/progress.js ==
   essence, ability ranks, vessel ranks, gear levels, mastery
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* ==========================================================================
   SPENDING WHAT YOU GATHER
   Essence used to buy one thing. Now it buys four, and using a body a lot
   makes it permanently better at being that body.
   ========================================================================== */
const ABIL_MAX = 3, VESSEL_MAX = 3, GEAR_MAX = 3;
const ABIL_SLOTS = ["light","power","util","ult"];

const VESSEL_UP = {
  surge:  {name:"Deeper spark",   line:"The surge meter fills 18% faster per rank, and burning through lasts a second longer."},
  regen:  {name:"Quicker knit",   line:"Out of combat the body closes up 45% faster per rank."},
  essence:{name:"Finer reading",  line:"Everything you beat gives 14% more essence per rank."},
  iframe: {name:"Looser grip",    line:"Rolls and recoveries give you 70 ms more untouchable per rank."},
  echo:   {name:"Longer memory",  line:"An echo stands 7 seconds longer per rank, and comes back 15% sooner."}
};

const abilLevel  = (hid, slot) => ((S.abil||{})[hid]||{})[slot] || 0;
const vesselLevel = key => (S.vessel||{})[key] || 0;
const gearLevel  = gid => (S.gearLv||{})[gid] || 0;
const masteryOf  = hid => (S.mastery||{})[hid] || 0;
const MASTERY_STEPS = [25, 75, 150];
function masteryTier(hid){
  const k = masteryOf(hid);
  let t = 0;
  for(const s of MASTERY_STEPS) if(k >= s) t++;
  return t;
}
function masteryNext(hid){
  const k = masteryOf(hid);
  for(const s of MASTERY_STEPS) if(k < s) return s;
  return null;
}

function abilCost(hid, slot){
  const b = BY_ID[hid];
  return Math.round((130 + b.tier*22) * (abilLevel(hid,slot)+1));
}
function vesselCost(key){ return Math.round(320 * Math.pow(vesselLevel(key)+1, 1.35)); }
function gearCost(gid){ return Math.round(240 * (gearLevel(gid)+1)); }

function upgradeAbility(hid, slot){
  if(inCombat()) { feed("Not mid-fight",""); return false; }
  if(abilLevel(hid,slot) >= ABIL_MAX) return false;
  const c = abilCost(hid, slot);
  if(S.essence < c) return false;
  S.essence -= c;
  S.abil = S.abil||{}; S.abil[hid] = S.abil[hid]||{};
  S.abil[hid][slot] = abilLevel(hid,slot)+1;
  save(); syncHostLive();
  feed(BY_ID[hid].name+" — "+ARCH[BY_ID[hid].arch].kit[ABIL_SLOTS.indexOf(slot)].n+" sharpened","good");
  return true;
}
function upgradeVessel(key){
  if(vesselLevel(key) >= VESSEL_MAX) return false;
  const c = vesselCost(key);
  if(S.essence < c) return false;
  S.essence -= c;
  S.vessel = S.vessel||{}; S.vessel[key] = vesselLevel(key)+1;
  save();
  feed(VESSEL_UP[key].name+" — rank "+S.vessel[key],"good");
  return true;
}
function upgradeGear(gid){
  if(inCombat()) { feed("Not mid-fight",""); return false; }
  if(gearLevel(gid) >= GEAR_MAX) return false;
  const c = gearCost(gid);
  if(S.essence < c) return false;
  S.essence -= c;
  S.gearLv = S.gearLv||{}; S.gearLv[gid] = gearLevel(gid)+1;
  save(); syncHostLive();
  feed(GEAR_BY_ID[gid].name+" — worked to rank "+S.gearLv[gid],"good");
  return true;
}
/* upgrades bring a piece closer to answering anyone */
function attuneNeeded(gid){ return Math.max(4, 10 - gearLevel(gid)*2); }

function noteKill(hostId){
  S.mastery = S.mastery||{};
  const before = masteryTier(hostId);
  S.mastery[hostId] = masteryOf(hostId) + 1;
  const after = masteryTier(hostId);
  if(after > before){
    feed(BY_ID[hostId].name+" — mastery "+after+", everything they do is sharper","big");
    syncHostLive();
  }
}
