/* == play/enemy.js ==
   enemy minds and whose turn it is to come at you
   Part of Multiverse Vessel. Loaded in order from index.html. */

const MAX_ATTACKERS = 3;
function attackerCount(){ let n=0; for(const e of G.ents) if(!e.dead && e.team==="foe" && e.engaged) n++; return n; }
function enemyThink(e, dt){
  const p = foeTarget(e);
  if(!p || p.dead){                       /* nobody to come for — walk it off */
    e.engaged = false;
    e.aiT -= dt;
    if(e.aiT <= 0){ e.aiT = 1600 + Math.random()*2600; e.wander = Math.random()*6.283; }
    e.mx = Math.sin(e.wander||0)*0.35; e.mz = Math.cos(e.wander||0)*0.35;
    return;
  }
  const dx = p.x-e.x, dz = p.z-e.z, d = Math.hypot(dx,dz);
  e.yaw = Math.atan2(dx, dz);
  const aggro = e.boss ? 80 : 38;
  if(d > aggro){
    e.aiT -= dt;
    if(e.aiT<=0){ e.aiT = 1400+Math.random()*2400; e.wander = Math.random()*6.283; }
    e.mx = Math.sin(e.wander||0)*.4; e.mz = Math.cos(e.wander||0)*.4;
    e.engaged = false; return;
  }
  const want = e.act.ranged ? 11 : reachOf(e.act.light)*0.82 + e.rad + p.rad;
  const band = e.act.ranged ? 3.2 : 0.7;
  if(d > want+band){ e.mx = dx/d; e.mz = dz/d; }
  else if(d < want-band){ e.mx = -dx/d; e.mz = -dz/d; }
  else { const s = Math.sin(now()/900 + e.size*7); e.mx = -dz/d*s*.7; e.mz = dx/d*s*.7; }
  if(p.y > e.y + 3 && e.canFly) e.fly = true;
  else if(e.fly && Math.abs(p.y-e.y) < 1.4) e.fly = false;
  groundAnswersAir(e, p, d);
  if(hasFx(e,"stun")){ e.mx=e.mz=0; return; }
  if(!e.engaged){
    if(e.boss || attackerCount() < MAX_ATTACKERS){ e.engaged = true; e.engagedT = now()+2600+Math.random()*1800; }
    else { const s = Math.sin(now()/700 + e.size*5); e.mx = -dz/d*s; e.mz = dx/d*s; return; }
  } else if(now() > e.engagedT && !e.boss){ e.engaged = false; e.atkT = now()+900; return; }
  if(now() < e.atkT) return;
  const inRange = e.act.ranged ? d < 30 : d < reachOf(e.act.light) + e.rad + p.rad + 0.7;
  if(!inRange) return;
  const skill = e.boss ? .9 : .5;
  for(const slot of ["ult","power","light"]){
    if(!ready(e,slot)) continue;
    if(slot!=="light" && Math.random() > skill) continue;
    if(slot === "light"){ useAbility(e, slot); }
    else {
      /* wind up first, so it can be blocked, parried or rolled */
      e.tell = {slot, at: now() + (e.boss ? 520 : 440)};
      SFX.tell(e.x, e.z);
      e.mx = e.mz = 0;
    }
    e.atkT = now() + (e.boss?260:460) + Math.random()*320;
    return;
  }
  if(ready(e,"util") && e.hp < e.maxHp*.5 && Math.random()<.35){ useAbility(e,"util"); e.atkT = now()+700; }
}

/* ----------------------------------------------------------------- update */
