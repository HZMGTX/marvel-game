/* == play/elites.js ==
   the ones in the crowd who are not like the others
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* Six roles. A wanderer that draws one keeps its own name, its own stats and
   its own abilities — the role sits on top and changes what it does to you,
   not who it is. Each has one behaviour you can learn and one answer that
   beats it, and each says which it is above its head before it gets to you. */

const ELITE_BASE = 0.14;          /* the chance in the first sector */
const ELITE_RISE = 0.009;         /* and what each sector after it adds */
const ELITE_CAP  = 0.42;

const ELITES = {

  warden: {
    name:"WARDEN", hex:"#5FE39A", ess:1.9, hp:1.55, dmg:0.90, spd:0.86,
    tip:"hardens everything standing near it — break the warden first",
    fits: () => true,
    think(e, p, d){
      if(now() < (e.roleT||0)) return;
      e.roleT = now() + 7000;
      let n = 0;
      for(const t of G.ents){
        if(t.dead || t.team !== "foe" || distXZ(t, e) > 15) continue;
        setFx(t, "fortify", 5000); n++;
      }
      shock(e.x, e.y + 0.3, e.z, 7, ELITE3.warden, 560);
      SFX.ward(e.x, e.z);
      if(n > 1) feed(e.b.name + " hardens everything standing near it", "bad");
    }
  },

  stalker: {
    name:"STALKER", hex:"#B08CFF", ess:1.7, hp:0.78, dmg:1.15, spd:1.22,
    tip:"goes quiet and comes at your back — turn around",
    fits: b => !ACT[b.arch].ranged,
    think(e, p, d){
      if(now() > (e.roleT||0)){
        e.roleT = now() + 8000 + Math.random()*3000;
        e.veil  = now() + 3200;
        spark(e.x, e.y + e.height*0.6, e.z, 9, ELITE3.stalker);
        SFX.veil(e.x, e.z);
      }
      if(now() >= (e.veil||0)) return;
      /* while it cannot be seen properly it is walking round behind you */
      const bx = p.x - Math.sin(p.yaw)*4.6, bz = p.z - Math.cos(p.yaw)*4.6;
      const ax = bx - e.x, az = bz - e.z, m = Math.hypot(ax, az);
      if(m > 1.1){ e.mx = ax/m; e.mz = az/m; }
    }
  },

  breaker: {
    name:"BREAKER", hex:"#FF7A2F", ess:2.1, hp:1.70, dmg:1.00, spd:0.82,
    tip:"winds up something no guard stops — roll it",
    fits: b => !ACT[b.arch].ranged,
    think(e, p, d){
      if(e.breakAt){
        if(now() < e.breakAt){ e.mx = e.mz = 0; return; }
        e.breakAt = 0;
        sphereHit(e, e.x, e.y + 0.4, e.z, 7.5, 1.75, {knock:16, unblockable:true, stun:520});
        shock(e.x, e.y + 0.2, e.z, 7.5, ELITE3.breaker, 540);
        burst(e.x, e.y + 0.3, e.z, 26, ELITE3.breaker);
        G.shake += 0.8; SFX.slam(e.x, e.z, 7.5);
        return;
      }
      if(e.tell || d > 9 || now() < (e.roleT||0)) return;
      e.roleT  = now() + 8500 + Math.random()*3000;
      e.breakAt = now() + 1000;              /* a full second of warning */
      e.mx = e.mz = 0;
      SFX.tell(e.x, e.z);
      feed(e.b.name + " plants its feet", "bad");
    }
  },

  marksman: {
    name:"MARKSMAN", hex:"#7ED6F5", ess:1.7, hp:0.85, dmg:1.20, spd:1.05,
    tip:"will not let you close — take cover, or get there fast",
    fits: b => ACT[b.arch].ranged,
    think(e, p, d){
      if(d > 9 || e.dashT || now() < (e.roleT||0)) return;
      e.roleT = now() + 2800;
      e.dashYaw = Math.atan2(e.x - p.x, e.z - p.z);   /* straight back, fast */
      e.dashT = now() + 260; e.dashSpeed = 17;
      e.dashHit = new Set(); e.dashMul = 0; e.dashOpts = {};
      spark(e.x, e.y + 0.5, e.z, 7, ELITE3.marksman);
    }
  },

  leech: {
    name:"LEECH", hex:"#E14B8A", ess:1.8, hp:1.10, dmg:1.00, spd:1.00,
    tip:"every hit it lands puts itself back together",
    fits: () => true,
    think(){}
  },

  herald: {
    name:"HERALD", hex:"#F7BC46", ess:2.2, hp:1.25, dmg:0.95, spd:1.00,
    tip:"calls the rest in the moment it starts losing",
    fits: () => true,
    think(e, p, d){
      if(!e.called && e.hp < e.maxHp*0.6){
        e.called = true;
        const pool = sectorBeings(G.sector).filter(b => b.id !== sectorBoss(G.sector).id);
        for(let i=0;i<2 && pool.length;i++){
          const b = pool[(Math.random()*pool.length*0.6)|0];
          const a = Math.random()*6.283, r = 5 + Math.random()*3;
          const add = makeEnt(b.id, e.x + Math.sin(a)*r, e.z + Math.cos(a)*r, "foe",
                              {scale: 1 + sectorIndex(G.sector)*0.010});
          add.y = e.y;
          G.ents.push(add);
          shock(add.x, add.y + 0.2, add.z, 2.4, ELITE3.herald, 420);
        }
        SFX.call(e.x, e.z);
        feed(e.b.name + " calls the rest of them in", "bad");
        return;
      }
      if(now() < (e.roleT||0)) return;
      e.roleT = now() + 9000;
      let n = 0;
      for(const t of G.ents){
        if(t.dead || t.team !== "foe" || distXZ(t, e) > 16) continue;
        setFx(t, "haste", 5000); n++;
      }
      if(n > 1) shock(e.x, e.y + 0.3, e.z, 8, ELITE3.herald, 520);
    }
  }

};

const ELITE_IDS = Object.keys(ELITES);
const ELITE3 = {};                                   /* the same colours, linear */
for(const k of ELITE_IDS) ELITE3[k] = srgb(ELITES[k].hex);

/* ---------------------------------------------------------------- rolling */
function eliteChance(){
  return Math.min(ELITE_CAP, ELITE_BASE + Math.max(0, sectorIndex(G.sector))*ELITE_RISE);
}
function maybeElite(e){
  if(!e || e.boss || e.team !== "foe") return e;
  if(Math.random() > eliteChance()) return e;
  const fits = ELITE_IDS.filter(k => ELITES[k].fits(e.b));
  return makeElite(e, fits[(Math.random()*fits.length)|0]);
}
function makeElite(e, role){
  const R = ELITES[role];
  if(!R) return e;
  e.elite = role;
  e.maxHp = Math.round(e.maxHp * R.hp); e.hp = e.maxHp;
  e.st = Object.assign({}, e.st, {p: Math.max(1, Math.round(e.st.p * R.dmg))});
  e.spdMul = R.spd;
  e.size *= role === "breaker" ? 1.10 : role === "stalker" ? 0.94 : 1;
  e.rad = 0.36*e.size;
  e.height = 1.80*e.size*((e.pal.legs||1)*0.55 + 0.45);
  e.roleT = now() + 2200 + Math.random()*2600;
  return e;
}

/* ------------------------------------------------------------------- play */
function eliteThink(e, dt){
  const R = e.elite && ELITES[e.elite];
  if(!R) return;
  const p = G.player;
  if(!p || p.dead || hasFx(e, "stun")) return;
  const d = distXZ(e, p);
  if(d > 46) return;
  if(!G.metElites) G.metElites = {};
  if(!G.metElites[e.elite] && d < 32){
    G.metElites[e.elite] = true;
    feed(R.name + " — " + R.tip, "big");
  }
  R.think(e, p, d);
}

/* what a role does the moment one of its hits lands */
function eliteOnHit(att, def, dmg){
  if(att.elite === "leech" && dmg > 0){
    const back = Math.round(dmg*0.5);
    att.hp = Math.min(att.maxHp, att.hp + back);
    const dx = att.x - def.x, dz = att.z - def.z;
    G.beams.push({x:def.x, y:def.y + def.height*0.55, z:def.z,
                  yaw:Math.atan2(dx, dz), len:Math.hypot(dx, dz), wid:0.11,
                  c:ELITE3.leech, t:0, life:280});
    G.pops.push({x:att.x, y:att.y + att.height*1.2, z:att.z, txt:"+"+back, t:0,
                 life:700, col:ELITES.leech.hex, size:12});
  }
  if(att.elite === "stalker" && now() < (att.veil||0)){
    att.veil = 0;                                   /* the strike gives it away */
    spark(att.x, att.y + att.height*0.6, att.z, 12, ELITE3.stalker);
  }
}

function eliteLabel(e){
  const R = e.elite && ELITES[e.elite];
  return R ? R.name : null;
}
