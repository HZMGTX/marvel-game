/* == play/missions.js ==
   the five kinds of job and the people you are protecting
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* ==========================================================================
   MISSIONS
   Free roam needs a reason to walk somewhere. Every sector generates work
   out of its own roster, so a mission in Hell's Kitchen reads like Hell's
   Kitchen and a mission on Titan reads like Titan.
   ========================================================================== */
const MISSION_DEFS = {
  hunt: {
    name: "Bring down",
    line: t => `${t} is somewhere in this sector. Find them and put them down.`,
    reward: 1.6
  },
  hold: {
    name: "Hold the line",
    line: () => `Stand your ground inside the marker for thirty seconds. They will keep coming.`,
    reward: 1.4
  },
  rescue: {
    name: "Get them clear",
    line: n => `${n} people are pinned down out there. Reach each of them and they will run.`,
    reward: 1.3
  },
  recover: {
    name: "Recover",
    line: t => `${t} is lying in the open with something standing over it. Take it back.`,
    reward: 1.5
  },
  chase: {
    name: "Run them down",
    line: t => `${t} is running. Catch them before they are gone.`,
    reward: 1.4
  }
};

const CIVILIAN_NAMES = ["Bystander","Paramedic","Night Nurse","Beat Cop","Shop Owner",
  "Kid on a Bike","Cab Driver","Reporter","Fire Marshal","Dock Worker"];

/* three offers per sector, stable until you clear them */
function missionOffers(sectorId){
  const rng = mulberry(hash(sectorId + "/m" + (S.missionRound||0)));
  const pool = sectorBeings(sectorId).slice().sort((a,b)=>a.tier-b.tier);
  const boss = sectorBoss(sectorId);
  const cands = pool.filter(b=>b.id!==boss.id);
  const gearHere = cands.flatMap(b=>(GEAR_BY_OWNER[b.id]||[]).map(g=>({g, b})));
  const kinds = ["hunt","hold","rescue","chase"];
  if(gearHere.length) kinds.push("recover");
  const out = [];
  for(let i=0;i<3;i++){
    const kind = kinds[Math.floor(rng()*kinds.length)];
    const target = cands[Math.floor(rng()*cands.length)] || boss;
    const pick = gearHere.length ? gearHere[Math.floor(rng()*gearHere.length)] : null;
    out.push({
      id: sectorId+"/"+(S.missionRound||0)+"/"+i,
      kind, sector: sectorId,
      targetId: target.id,
      gearId: kind==="recover" && pick ? pick.g.id : null,
      gearOwner: kind==="recover" && pick ? pick.b.id : null,
      count: 3,
      tier: target.tier
    });
  }
  return out;
}
function missionTitle(m){
  const d = MISSION_DEFS[m.kind];
  if(m.kind==="hunt")    return d.name+" "+BY_ID[m.targetId].name;
  if(m.kind==="recover") return d.name+" the "+GEAR_BY_ID[m.gearId].name;
  if(m.kind==="chase")   return d.name+" "+BY_ID[m.targetId].name;
  return d.name;
}
function missionLine(m){
  const d = MISSION_DEFS[m.kind];
  if(m.kind==="hunt")    return d.line(BY_ID[m.targetId].name);
  if(m.kind==="recover") return d.line(GEAR_BY_ID[m.gearId].name);
  if(m.kind==="chase")   return d.line(BY_ID[m.targetId].name);
  if(m.kind==="rescue")  return d.line(m.count);
  return d.line();
}

function startMission(m){
  if(!G.world || G.mission) return;
  const p = G.player;
  const spot = pickSpawn(p, 34, 90);
  G.mission = {def:m, t:0, done:false, failed:false, marker:{x:spot.x, z:spot.z},
               held:0, freed:0, ents:[]};
  const M = G.mission;

  if(m.kind === "hunt"){
    const e = makeEnt(m.targetId, spot.x, spot.z, "foe", {scale:1.12, mission:true});
    e.missionTag = "hunt"; e.maxHp = Math.round(e.maxHp*1.35); e.hp = e.maxHp;
    G.ents.push(e); M.ents.push(e); M.marker = e;
  }
  else if(m.kind === "chase"){
    const e = makeEnt(m.targetId, spot.x, spot.z, "foe", {scale:0.95});
    e.missionTag = "runner"; e.runner = true;
    e.act = Object.assign({}, e.act, {spd: e.act.spd*1.35});
    G.ents.push(e); M.ents.push(e); M.marker = e;
    M.limit = 45000;
  }
  else if(m.kind === "recover"){
    G.drops.push({x:spot.x, y:0, z:spot.z, gid:m.gearId, t:0});
    for(let i=0;i<2;i++){
      const g = makeEnt(m.gearOwner, spot.x + (i?4:-4), spot.z + 3, "foe", {scale:1.05});
      G.ents.push(g); M.ents.push(g);
    }
  }
  else if(m.kind === "hold"){
    M.limit = null; M.need = 30000;
  }
  else if(m.kind === "rescue"){
    const civPool = BEINGS.filter(b=>b.tags.includes("civilian"));
    for(let i=0;i<m.count;i++){
      const s2 = pickSpawn(p, 26, 100);
      const cb = civPool[(hash(m.id+"c"+i)>>>5) % civPool.length] || BY_ID["turk-barrett"];
      const c = makeEnt(cb.id, s2.x, s2.z, "civ", {scale:0.7});
      c.civ = true; c.civName = CIVILIAN_NAMES[(hash(m.id+i)>>>3) % CIVILIAN_NAMES.length];
      c.maxHp = 120; c.hp = 120; c.size = 0.92; c.height = 1.8*0.92; c.rad = 0.34;
      G.ents.push(c); M.ents.push(c);
    }
    M.limit = 90000;
  }
  feed(missionTitle(m).toUpperCase(), "big");
  feed(missionLine(m), "");
  save();
}

function abandonMission(){
  if(!G.mission) return;
  G.mission.ents.forEach(e=>{ if(!e.dead && e.team!=="you") e.dead = true, e.deadT = now(); });
  G.mission = null;
  feed("Mission abandoned", "");
}

function updateMission(dt){
  const M = G.mission;
  if(!M || M.done) return;
  const p = G.player;
  M.t += dt;
  const m = M.def;

  if(M.limit && M.t > M.limit){ failMission("Out of time"); return; }

  if(m.kind === "hunt"){
    const e = M.ents[0];
    if(e && e.dead) return completeMission();
  }
  else if(m.kind === "chase"){
    const e = M.ents[0];
    if(!e || e.dead) return completeMission();
    if(p && distXZ(e,p) < 3.2) return completeMission();
    /* it runs from you, and it is quick */
    if(p){
      const a = Math.atan2(e.x-p.x, e.z-p.z);
      e.mx = Math.sin(a); e.mz = Math.cos(a);
      e.yaw = a; e.engaged = false; e.atkT = now()+9999; e.tell = null;
    }
  }
  else if(m.kind === "recover"){
    if(!G.drops.some(d=>d.gid === m.gearId)) return completeMission();
  }
  else if(m.kind === "hold"){
    if(p && Math.hypot(p.x-M.marker.x, p.z-M.marker.z) < 9){
      M.held += dt;
      if(M.spawnT === undefined) M.spawnT = 0;
      M.spawnT -= dt;
      if(M.spawnT <= 0){ spawnWanderer(); M.spawnT = 3200; }
      if(M.held >= M.need) return completeMission();
    }
  }
  else if(m.kind === "rescue"){
    for(const c of M.ents){
      if(c.freed || c.dead) continue;
      if(p && distXZ(c,p) < 2.6){
        c.freed = true; M.freed++;
        G.pops.push({x:c.x, y:c.y+2, z:c.z, txt:"CLEAR", t:0, life:900, col:"#5FE39A", size:16});
        feed((c.civName||"They")+" runs for it — "+M.freed+" of "+m.count, "good");
      }
    }
    if(M.freed >= m.count) return completeMission();
    if(M.ents.every(c=>c.dead && !c.freed)) return failMission("They did not make it");
  }
}

function completeMission(){
  const M = G.mission; if(!M || M.done) return;
  M.done = true;
  const m = M.def;
  const gain = Math.round((60 + m.tier*22) * MISSION_DEFS[m.kind].reward);
  S.essence += gain;
  S.missionsDone = (S.missionsDone||0) + 1;
  S.missionSeen = (S.missionSeen||{}); S.missionSeen[m.id] = true;
  const p = G.player;
  if(p){
    S.xp[p.id] = (S.xp[p.id]||0) + Math.round(gain*0.6);
    while(S.xp[p.id] >= xpNeeded(level(p.id))){
      S.xp[p.id] -= xpNeeded(level(p.id)); S.levels[p.id] = level(p.id)+1;
      feed(p.b.name+" reaches level "+S.levels[p.id],"good");
    }
    shock(p.x, p.y+0.4, p.z, 4, GOLD3, 700);
  }
  SFX.reward();
  feed("MISSION COMPLETE — +"+gain+" essence", "big");
  if(S.missionsDone % 3 === 0){ S.missionRound = (S.missionRound||0)+1; feed("New work has come up", ""); }
  G.mission = null;
  save();
}
function failMission(why){
  const M = G.mission; if(!M) return;
  M.ents.forEach(e=>{ if(!e.dead && e.team!=="you"){ e.dead = true; e.deadT = now(); } });
  G.mission = null;
  feed("MISSION FAILED — "+why, "");
}

/* civilians: they do not fight, they get away from whatever is loudest */
function civThink(e, dt){
  const threat = nearestThreat(e, 40);
  if(e.freed || threat){
    const from = threat || G.player;
    if(from){
      const a = Math.atan2(e.x-from.x, e.z-from.z);
      e.mx = Math.sin(a); e.mz = Math.cos(a);
      e.yaw = a;
    }
  } else {
    e.aiT -= dt;
    if(e.aiT<=0){ e.aiT = 1800+Math.random()*2600; e.wander = Math.random()*6.283; }
    e.mx = Math.sin(e.wander||0)*.3; e.mz = Math.cos(e.wander||0)*.3;
    e.yaw = e.wander||0;
  }
}
function nearestThreat(e, maxd){
  let best=null, bd=maxd||1e9;
  for(const o of G.ents){
    if(o.dead || o.team!=="foe") continue;
    const d = distXZ(o,e);
    if(d<bd){ bd=d; best=o; }
  }
  return best;
}
