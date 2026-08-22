/* == play/state.js ==
   the run: spawning, deaths, the combat lock, boss turns, landings
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* ------------------------------------------------------------ game state */
const G = {
  world:null, sector:"hk", ents:[], projs:[], parts:[], pops:[], beams:[], rings:[], arcs:[],
  orbits:[], drops:[], player:null, mission:null, cars:[], rain:[], weather:"clear", timeOfDay:0.28,
  civT:0,
  camYaw:0, camPitch:0.26, camDist:6.4, shake:0,
  t:0, last:0, surge:0, combo:0, comboT:0, spawnT:0, bossEnt:null, lastCombat:-1e9,
  freeze:0, lockTarget:null,
  paused:true, ended:false
};
const GRAV = 26, JUMP = 10.2;

/* --------------------------------------------------------------- spawning */
function pickSpawn(from, minD, maxD){
  const sp = G.world.spawns;
  let fb = sp[0] || {x:0,z:0};
  for(let i=0;i<80;i++){
    const p = sp[(Math.random()*sp.length)|0];
    if(!from) return p;
    const d = Math.hypot(p.x-from.x, p.z-from.z);
    if(d > (minD||14) && d < (maxD||60)) return p;
    if(d > (minD||14)) fb = p;
  }
  return fb;
}
function spawnWanderer(){
  const boss = sectorBoss(G.sector);
  const pool = sectorBeings(G.sector).filter(b=>b.id!==boss.id).sort((a,b)=>a.tier-b.tier);
  if(!pool.length) return;
  const roll = Math.random();
  const i = roll<.6 ? (Math.random()*pool.length*.5)|0
          : roll<.9 ? (pool.length*.5 + Math.random()*pool.length*.35)|0
                    : (pool.length*.85 + Math.random()*pool.length*.15)|0;
  const b = pool[Math.min(pool.length-1, i)];
  const p = pickSpawn(G.player, 16, 62);
  G.ents.push(maybeElite(makeEnt(b.id, p.x, p.z, "foe", {scale: 1 + sectorIndex(G.sector)*0.010})));
}
function spawnBoss(){
  const b = sectorBoss(G.sector);
  const p = pickSpawn(G.player, 18, 34);
  /* A named boss is the sector's antagonist, not necessarily its strongest
     resident — Kingpin runs Hell's Kitchen without out-tiering Man-Thing. Where
     that gap exists, the body is scaled up to meet it. */
  const top = sectorBeings(G.sector).reduce((m, x)=> Math.max(m, x.tier), 0);
  const gap = Math.max(0, top - b.tier);
  const e = makeEnt(b.id, p.x, p.z, "foe",
                    {scale:(1.16 + sectorIndex(G.sector)*0.012) * (1 + gap*0.075), boss:true});
  e.maxHp = Math.round(e.maxHp*2.2); e.hp = e.maxHp;
  e.phase = 0; e.enrage = 1;
  G.ents.push(e); G.bossEnt = e;
  feed(bossMeetLine(b), "big");
  G.shake += 1;
}

/* ------------------------------------------------------------ progression */
function onFoeDown(e){
  const b = e.b;
  if(!S.unlocked.includes(b.id)){ S.unlocked.push(b.id); feed("NEW HOST — "+b.name,"big"); }
  S.defeated[b.id] = true;
  const eliteMul = e.elite && ELITES[e.elite] ? ELITES[e.elite].ess : 1;
  const gained = Math.round((b.tier*9 + 12 + (e.boss?60:0)) * eliteMul
                            * (1 + vesselLevel("essence")*0.14));
  S.essence += gained;
  if(G.player) noteKill(G.player.id);
  S.kills[G.sector] = killsIn(G.sector) + 1;
  (GEAR_BY_OWNER[b.id]||[]).forEach(g=>{
    if(!S.gearOwned.includes(g.id)) G.drops.push({x:e.x, y:e.y, z:e.z, gid:g.id, t:0});
  });
  const u = G.player;
  if(u && !u.dead){
    S.xp[u.id] = (S.xp[u.id]||0) + Math.round(gained*0.55);
    while(S.xp[u.id] >= xpNeeded(level(u.id))){
      S.xp[u.id] -= xpNeeded(level(u.id)); S.levels[u.id] = level(u.id)+1;
      feed(u.b.name+" reaches level "+S.levels[u.id],"good");
      u.maxHp = Math.round(u.maxHp*1.05); u.hp = Math.min(u.maxHp, u.hp+u.maxHp*.10);
    }
    if(u.gear && u.pot===1){
      S.gearKills[u.gear.id] = (S.gearKills[u.gear.id]||0)+1;
      if(S.gearKills[u.gear.id]>=attuneNeeded(u.gear.id) && !S.attuned.includes(u.gear.id)){
        S.attuned.push(u.gear.id); feed(u.gear.name+" is attuned — any host can echo it now","big");
      }
    }
  }
  if(e.boss){
    S.cleared[G.sector] = true; S.wins++;
    const ai = AI_LIST[sectorIndex(G.sector) % AI_LIST.length];
    if(ai && !S.aiOwned.includes(ai.id)){ S.aiOwned.push(ai.id); feed(ai.name+" is yours to install","big"); }
    G.bossEnt = null;
    if(STORY[G.sector]) S.story[G.sector] = true;
    const last = SECTORS[SECTORS.length-1].id;
    setTimeout(()=>openScreen(G.sector === last ? "ending" : "cleared"), 1500);
  }
  save();
}
/* No reserves. If the body falls, the spark is driven out of the fight. */
function onHostDown(){
  if(mindCatchesFall(G.player)) return;     /* not this time */
  S.spent = (S.spent || 0) + 1;             /* a body you wore out */
  G.ended = true;
  setTimeout(()=>openScreen("down"), 800);
}

/* You are in combat if you have traded damage recently, or something living
   is bearing down on you. While that holds you cannot let go of the body. */
const COMBAT_HOLD = 6000;
function inCombat(){ return (G.t - G.lastCombat) < COMBAT_HOLD; }
function combatLeft(){ return Math.max(0, Math.ceil((COMBAT_HOLD - (G.t - G.lastCombat))/1000)); }

/* ------------------------------------------------------------------ enemy */
/* A boss does not just have more health — it gets worse twice on the way
   down, and both times it clears the floor first. */
const BOSS_PHASES = [0.62, 0.30];
const BOSS_LINES = [
  n => n + " stops holding back.",
  n => n + " has decided this ends now."
];
function bossPhaseCheck(e){
  if(!e.boss || e.dead) return;
  const frac = e.hp / e.maxHp;
  const want = BOSS_PHASES.filter(t => frac <= t).length;
  if(want <= (e.phase||0)) return;
  e.phase = want;
  e.enrage = 1 + want*0.24;
  e.fx = {};
  setFx(e, "iframe", 1100);
  /* the room gets cleared */
  const R = 9 + want*3;
  for(const t of G.ents){
    if(t.dead || t.team === "foe" || distXZ(t,e) > R) continue;
    const a = Math.atan2(t.x-e.x, t.z-e.z);
    t.vx += Math.sin(a)*16; t.vz += Math.cos(a)*16; t.vy += 5;
    if(t.team === "you") dealDamage(e, t, 0.55, {unblockable:false});
  }
  shock(e.x, e.y+0.4, e.z, R, e.pal.c3, 900);
  burst(e.x, e.y+1, e.z, 40, e.pal.c3);
  G.shake += 1.2; G.freeze = Math.max(G.freeze, 130);
  SFX.slam(e.x, e.z, R); SFX.tell(e.x, e.z);
  feed(BOSS_LINES[want-1](e.b.name.toUpperCase()), "big");
  /* and it does not come alone */
  const pool = sectorBeings(G.sector).filter(b=>b.id!==e.b.id).sort((a,b)=>a.tier-b.tier);
  for(let i=0;i<2 && pool.length;i++){
    const b = pool[Math.min(pool.length-1, Math.floor(pool.length*0.55))];
    const s = pickSpawn(e, 6, 16);
    const add = makeEnt(b.id, s.x, s.z, "foe", {scale:1.05});
    add.missionTag = "add";
    G.ents.push(add);
  }
}

/* A landing you can feel. The harder you come down, the wider it lands —
   the same for anyone who falls that far, not just for you. */
function landImpact(e, drop){
  const k = Math.min(1, (drop - 13)/26);
  const R = 2.8 + k*7.4;
  const col = e.pal ? e.pal.c3 : GOLD3;
  shock(e.x, e.y + 0.22, e.z, R, col, 300 + k*280);
  burst(e.x, e.y + 0.30, e.z, 10 + Math.round(k*22), col);
  SFX.slam(e.x, e.z, R);
  const p = G.player;
  if(e === p || (p && distXZ(e, p) < 40)) G.shake += 0.22 + k*0.85;
  if(k > 0.06){
    sphereHit(e, e.x, e.y + 0.5, e.z, R, 0.45 + k*1.55, {knock: 3 + k*10, stun: k > 0.55 ? 600 : 0});
    if(e.team === "you") splashCars(e, e.x, e.z, R*0.8);
    G.freeze = Math.max(G.freeze, 40 + k*50);
    if(e === p) G.pops.push({x:e.x, y:e.y+e.height*1.1, z:e.z, txt:"IMPACT", t:0, life:800,
                             col:"#F7BC46", size:14 + Math.round(k*10)});
  }
}
