/* == play/bosskits.js ==
   the one thing each of the thirty does that nobody else does
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* Every boss already gets worse twice on the way down. That is the same fight
   thirty times. Each of them now has one signature beat as well — announced,
   telegraphed, and answerable — so Doom is not Dormammu with a different
   palette. Six behaviours, assigned by who is actually standing there. */

const BOSS_KIT = {
  hk:"quake",   qns:"hunger", man:"summon",  raft:"quake",  wch:"hunger",
  kra:"summon", wak:"quake",  lat:"bulwark", sav:"quake",   kun:"hunger",
  att:"bulwark",sanc:"bulwark",dark:"vanish",limbo:"vanish",asg:"sweep",
  musp:"quake", hel:"hunger", quant:"vanish",nz:"summon",   sak:"hunger",
  know:"vanish",xan:"sweep",  hala:"sweep",  tarnax:"summon",titan:"hunger",
  oly:"sweep",  bw:"bulwark", tva:"vanish",  bleed:"hunger",above:"sweep"
};

const KIT_NAME = {
  vanish:"steps out of the room", summon:"is not here alone",
  sweep:"lines something up",     quake:"puts it through the floor",
  bulwark:"closes",               hunger:"pulls"
};

const KIT_CD = {vanish:7000, summon:9000, sweep:8000, quake:6500, bulwark:11000, hunger:5200};
const MAX_ADDS = 4;

function bossAdds(e){
  let n = 0;
  for(const t of G.ents) if(!t.dead && t.missionTag === "add") n++;
  return n;
}

/* the signature beat, once its cooldown is up and you are close enough to care */
function bossKitTick(e, dt){
  if(!e.boss || e.dead || hasFx(e, "stun")) return;
  const p = G.player;
  if(!p || p.dead) return;
  const kit = BOSS_KIT[G.sector];
  if(!kit) return;
  const d = distXZ(e, p);

  /* a telegraphed one that is already in the air */
  if(e.kitAt){
    if(now() < e.kitAt){ e.mx = e.mz = 0; return; }
    const which = e.kitWhich; e.kitAt = 0; e.kitWhich = null;
    if(which === "sweep"){
      const f = fwd(e);
      for(const t of G.ents){
        if(!canHit(e, t)) continue;
        const dx = t.x-e.x, dz = t.z-e.z, dd = Math.hypot(dx, dz);
        if(dd > 34 || dd < 0.4) continue;
        if((dx/dd)*f.x + (dz/dd)*f.z < Math.cos(0.55)) continue;
        dealDamage(e, t, 1.9, {knock:9, burn:true});
      }
      for(let i=0;i<16;i++){
        const r = 2 + i*2;
        G.beams.push({x:e.x, y:e.y + e.height*0.6, z:e.z, yaw:e.yaw, len:34, wid:2.2,
                      c:e.pal.c3, t:0, life:260});
        break;
      }
      G.shake += 0.8; SFX.beam(e);
    }
    else if(which === "quake"){
      const R = 13;
      for(const t of G.ents){
        if(!canHit(e, t) || distXZ(t, e) > R) continue;
        if(!t.grounded) continue;                    /* the answer is to not be on it */
        dealDamage(e, t, 1.7, {knock:11, stun:520});
      }
      shock(e.x, e.y + 0.2, e.z, R, e.pal.c3, 700);
      burst(e.x, e.y + 0.3, e.z, 30, e.pal.c3);
      splashCars(e, e.x, e.z, R*0.8);
      G.shake += 1.0; G.freeze = Math.max(G.freeze, 70);
      SFX.slam(e.x, e.z, R);
    }
    return;
  }

  if(now() < (e.kitT || 0) || d > 40) return;
  e.kitT = now() + KIT_CD[kit] / (e.enrage || 1);

  if(kit === "vanish"){
    const a = p.yaw + Math.PI;                        /* behind whoever you are */
    burst(e.x, e.y + e.height*0.5, e.z, 18, e.pal.c3);
    e.x = p.x + Math.sin(a)*2.2; e.z = p.z + Math.cos(a)*2.2; e.y = p.y;
    e.yaw = Math.atan2(p.x-e.x, p.z-e.z);
    setFx(e, "iframe", 260);
    burst(e.x, e.y + e.height*0.5, e.z, 18, e.pal.c3);
    e.atkT = now() + 220;
    SFX.veil(e.x, e.z);
    feed(e.b.name + " " + KIT_NAME.vanish, "bad");
  }
  else if(kit === "summon"){
    if(bossAdds(e) >= MAX_ADDS){ e.kitT = now() + 2500; return; }
    const pool = sectorBeings(G.sector).filter(b => b.id !== e.b.id);
    for(let i=0;i<2 && pool.length;i++){
      const b = pool[Math.floor(pool.length*0.45) + i % Math.max(1, pool.length)];
      const s = pickSpawn(e, 5, 14);
      const add = makeEnt((b||pool[0]).id, s.x, s.z, "foe", {scale:1.02});
      add.missionTag = "add";
      G.ents.push(add);
      shock(add.x, add.y + 0.2, add.z, 2.4, e.pal.c3, 420);
    }
    SFX.call(e.x, e.z);
    feed(e.b.name + " " + KIT_NAME.summon, "bad");
  }
  else if(kit === "sweep"){
    e.kitWhich = "sweep"; e.kitAt = now() + 900;
    e.yaw = Math.atan2(p.x-e.x, p.z-e.z);
    SFX.tell(e.x, e.z);
    feed(e.b.name + " " + KIT_NAME.sweep, "bad");
  }
  else if(kit === "quake"){
    e.kitWhich = "quake"; e.kitAt = now() + 800;
    SFX.tell(e.x, e.z);
    feed(e.b.name + " " + KIT_NAME.quake, "bad");
  }
  else if(kit === "bulwark"){
    setFx(e, "shield", 5000);
    setFx(e, "fortify", 5000);
    shock(e.x, e.y + 0.5, e.z, 3.4, GREEN3, 620);
    SFX.ward(e.x, e.z);
    feed(e.b.name + " " + KIT_NAME.bulwark + " — hit it hard enough and it opens", "bad");
  }
  else if(kit === "hunger"){
    const a = Math.atan2(e.x-p.x, e.z-p.z);
    const k = Math.min(1, 12/Math.max(2, d));
    p.vx += Math.sin(a)*11*k; p.vz += Math.cos(a)*11*k;
    if(!p.grounded) p.vy -= 3;
    G.arcs.push({e, r:e.rad + 3.2, t:0, life:280, c:e.pal.c3, yaw:a});
    shock(e.x, e.y + 0.4, e.z, 5.5, e.pal.c3, 420);
    SFX.veil(e.x, e.z);
    feed(e.b.name + " " + KIT_NAME.hunger, "bad");
  }
}
