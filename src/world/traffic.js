/* == world/traffic.js ==
   cars on the roads and people on the pavement
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* ==========================================================================
   A CITY THAT IS DOING SOMETHING WHEN YOU ARE NOT
   Traffic on the roads, people on the pavement, weather overhead, and a sun
   that actually goes round.
   ========================================================================== */

/* ------------------------------------------------------------------ cars */
const CAR_COLS = ["#B4342C","#2C4C8A","#D8D2C4","#2A2A32","#6E7480","#1F6B4C","#C08A2A"];
function laneLines(){                     /* world coords of every street centre-line */
  const out = [];
  for(let k = -Math.floor(WORLD/2/BLOCK); k <= Math.floor(WORLD/2/BLOCK); k++) out.push(k*BLOCK - WORLD/2 + BLOCK/2*0);
  return out;
}
function spawnTraffic(n){
  G.cars = [];
  const lines = [];
  for(let v = -WORLD/2; v <= WORLD/2 + 1; v += BLOCK) lines.push(v);
  for(let i=0;i<n;i++){
    const axis = Math.random() < 0.5 ? 0 : 1;          /* 0 drives along x, 1 along z */
    const line = lines[(Math.random()*lines.length)|0];
    const back = Math.random() < 0.5;
    const lane = (back ? 3.2 : -3.2);
    const along = -WORLD/2 + Math.random()*WORLD;
    G.cars.push({
      axis, back, hp: 120, dead:false, t:0,
      x: axis ? line + lane : along,
      z: axis ? along : line + lane,
      spd: (7 + Math.random()*7) * (back ? -1 : 1),
      col: srgb(CAR_COLS[(Math.random()*CAR_COLS.length)|0]),
      len: 4.1 + Math.random()*1.2
    });
  }
}
function updateCars(dt){
  const dts = dt/1000, p = G.player;
  for(let i=G.cars.length-1;i>=0;i--){
    const c = G.cars[i];
    if(c.dead){ c.t += dt; if(c.t > 6000) G.cars.splice(i,1); continue; }
    let v = c.spd;
    /* they will not run you over — they stop, and then they lean on the horn */
    if(p && !p.fly && Math.abs(p.y) < 2){
      const dx = p.x - c.x, dz = p.z - c.z;
      const ahead = c.axis ? dz*Math.sign(c.spd) : dx*Math.sign(c.spd);
      const side  = c.axis ? Math.abs(dx - 0) : Math.abs(dz - 0);
      if(ahead > 0 && ahead < 9 && Math.hypot(dx,dz) < 10) v = 0;
    }
    if(c.axis) c.z += v*dts; else c.x += v*dts;
    const lim = WORLD/2 + 8;
    if(c.x > lim) c.x = -lim; if(c.x < -lim) c.x = lim;
    if(c.z > lim) c.z = -lim; if(c.z < -lim) c.z = lim;
  }
}
/* anything that lands near a car wrecks it */
function splashCars(att, x, z, r){
  if(att.team !== "you") return;
  for(const c of G.cars){
    if(c.dead) continue;
    if(Math.hypot(c.x-x, c.z-z) > r + 2.4) continue;
    c.hp -= 60;
    spark(c.x, 1.2, c.z, 8, SPARK_A);
    if(c.hp <= 0){
      c.dead = true; c.t = 0;
      burst(c.x, 1.4, c.z, 34, srgb("#FF8A3D"));
      shock(c.x, 0.4, c.z, 4.5, srgb("#FF8A3D"), 620);
      G.shake += 0.55; G.freeze = Math.max(G.freeze, 55);
      SFX.boom(c.x, c.z);
      G.pops.push({x:c.x, y:2.6, z:c.z, txt:"WRECKED", t:0, life:900, col:"#FF8A3D", size:15});
    }
  }
  for(const pr of G.world.props){
    if(pr.fallen) continue;
    if(Math.hypot(pr.x-x, pr.z-z) > r + 2) continue;
    pr.fallen = true; pr.fallDir = Math.random()*6.283;
    spark(pr.x, 2, pr.z, 6, SPARK_B);
  }
}

/* ------------------------------------------------------- people, wandering */
function spawnAmbientCivs(n){
  const pool = BEINGS.filter(b=>b.tags.includes("civilian"));
  for(let i=0;i<n;i++){
    const s = pickSpawn(G.player, 20, 140);
    const cb = pool[(Math.random()*pool.length)|0];
    if(!cb) return;
    const c = makeEnt(cb.id, s.x, s.z, "civ", {});
    c.civ = true; c.ambient = true;
    c.civName = CIVILIAN_NAMES[(Math.random()*CIVILIAN_NAMES.length)|0];
    c.maxHp = 100; c.hp = 100;
    G.ents.push(c);
  }
}
