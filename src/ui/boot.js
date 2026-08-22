/* == ui/boot.js ==
   starting, saving, and the frame timer
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* ------------------------------------------------------------------- boot */
function buildHost(){
  const w = G.world;
  G.ents = G.ents.filter(e=>e.team!=="you");
  G.player = (S.host && BY_ID[S.host]) ? makeEnt(S.host, w.cx, w.cz, "you", {}) : null;
  if(G.player) G.ents.push(G.player);
  buildHostHud();
}
function enterSector(id){
  G.sector = id; S.sector = id;
  G.world = buildWorld(id);
  G.ents = []; G.projs = []; G.parts = []; G.pops = []; G.beams = [];
  G.rings = []; G.arcs = []; G.orbits = []; G.drops = [];
  G.bossEnt = null; G.surge = 0; G.combo = 0; G.ended = false; G.spawnT = 900;
  G.mission = null; G.lockTarget = null; G.freeze = 0; G.lastCombat = -1e9;
  G.cars = []; G.rain = [];
  buildHost();
  G.camYaw = 0; G.camPitch = 0.26;
  rollWeather();
  spawnTraffic(Math.round(WORLD/34));
  spawnAmbientCivs(6);
  for(let i=0;i<5;i++) spawnWanderer();
  if(bossReady(id) && !sectorCleared(id)) spawnBoss();
  save();
  feed(SECTORS[sectorIndex(id)].name.toUpperCase(),"big");
}
function reviveHost(){
  buildHost();
  if(G.player){
    G.player.hp = G.player.maxHp*0.5;
    setFx(G.player,"iframe",2000);
  }
  S.essence = Math.max(0, Math.round(S.essence*0.85));
  G.ended = false; G.surge = 0; G.lastCombat = -1e9;
  save();
}
/* rebuild the live body after a gear or mind change, keeping health and place */
function syncHostLive(){
  if(!G.world || !G.player) return;
  const old = G.player;
  const frac = old.hp/old.maxHp;
  const px = old.x, py = old.y, pz = old.z, yaw = old.yaw, fly = old.fly;
  buildHost();
  if(G.player){
    G.player.x = px; G.player.y = py; G.player.z = pz; G.player.yaw = yaw;
    G.player.fly = fly && G.player.canFly;
    G.player.hp = Math.max(1, Math.round(G.player.maxHp*frac));
  }
}

function frame(ts){
  requestAnimationFrame(frame);
  let dt = Math.min(50, ts - (G.last||ts));
  G.last = ts;
  if(!G.world) return;
  /* hit-stop: a heavy landing freezes the world for a breath */
  if(G.freeze > 0){ G.freeze -= dt; dt *= 0.08; }
  if(!G.paused) update(dt);
  renderScene();
  updateHud();
  audioTick();
}

function boot(){
  try{ const q = localStorage.getItem(SAVE_KEY+"/q"); if(q && QUALITY[q]) quality = q; }
  catch(e){}
  if(!localStorage.getItem(SAVE_KEY+"/q") && (matchMedia("(pointer: coarse)").matches || innerWidth < 760)) quality = "medium";
  resize();
  load();
  if(!S.started) openScreen("title");
  else {
    if(!S.host) S.host = S.unlocked[0] || "daredevil";
    enterSector(S.sector||"hk");
    openScreen("title");
  }
}
boot();
requestAnimationFrame(frame);
