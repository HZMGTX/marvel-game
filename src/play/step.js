/* == play/step.js ==
   one entity, one step: movement, flight, gravity, status
   Part of Multiverse Vessel. Loaded in order from index.html. */

function stepEnt(e, dts){
  let spd = e.act.spd*MPU * (1 + (e.st.s-30)/300);
  if(e.blocking){ spd *= 0.42; e.nrg = Math.max(0, e.nrg - BLOCK_DRAIN*dts); if(e.nrg<=0) e.blocking = false; }
  if(hasFx(e,"haste")) spd *= 1.35;
  if(hasFx(e,"stun")) spd = 0;
  if(e.fly) spd *= 1.7 + (e.dive||0)*1.05 + (e.boost||0);
  if(e.enrage) spd *= e.enrage;

  if(e.tell){
    if(hasFx(e,"stun")) e.tell = null;                 /* interrupted */
    else if(now() >= e.tell.at){ const sl = e.tell.slot; e.tell = null; useAbility(e, sl); }
    else { e.mx = e.mz = 0; }
  }
  if(e.rollT && now() < e.rollT){
    e.vx = Math.sin(e.rollYaw)*e.rollSpeed;
    e.vz = Math.cos(e.rollYaw)*e.rollSpeed;
  } else if(e.rollT && now() >= e.rollT){ e.rollT = 0; e.vx *= .4; e.vz *= .4; }
  if(e.dashT && now() < e.dashT){
    e.vx = Math.sin(e.dashYaw)*e.dashSpeed;
    e.vz = Math.cos(e.dashYaw)*e.dashSpeed;
    for(const t of G.ents){
      if(t.dead||t.team===e.team||e.dashHit.has(t)) continue;
      if(distXZ(t,e) < e.rad+t.rad+0.7 && Math.abs(t.y-e.y)<2){ e.dashHit.add(t); dealDamage(e,t,e.dashMul,e.dashOpts); }
    }
  } else {
    if(e.dashT && now()>=e.dashT){ e.dashT = 0; e.vx*=.35; e.vz*=.35; }
    const mx = e.mx||0, mz = e.mz||0;
    const m = Math.hypot(mx,mz);
    const tx = m>0.001 ? (mx/Math.max(1,m))*spd : 0;
    const tz = m>0.001 ? (mz/Math.max(1,m))*spd : 0;
    const accel = e.fly ? (m > 0.001 ? 3.1 + (e.dive||0)*2.4 : 0.8)
                        : (e.grounded ? 14 : 6);
    e.vx += (tx-e.vx)*Math.min(1, dts*accel);
    e.vz += (tz-e.vz)*Math.min(1, dts*accel);
  }
  e.moving = Math.hypot(e.vx,e.vz) > 1.2;
  if(e === G.player){
    if(e.moving && e.grounded && !e.fly) SFX.step(e);
    if(e.grounded && e.wasAir) SFX.land(e);
    e.wasAir = !e.grounded;
  }

  /* vertical — a dive buys height for speed, and pulling up spends it forward */
  if(e.fly){
    const up = e.wantUp?1:0, dn = e.wantDown?1:0;
    const down = dn && !up;
    e.dive = down ? Math.min(1, (e.dive||0) + dts*1.9) : Math.max(0, (e.dive||0) - dts*2.6);
    e.lift = up ? Math.min(1, (e.lift||0) + dts*3.2) : Math.max(0, (e.lift||0) - dts*3.2);
    if(down && e.dive > 0.35) e.diveArmed = true;
    else if(e.diveArmed){                               /* pulling out of the dive, once */
      e.diveArmed = false;
      const carry = Math.min(1.9, Math.max(0, -e.vy - 9)/15);
      if(carry > 0.08){
        e.boost = Math.min(2.4, (e.boost||0) + carry);
        if(e === G.player){ G.shake += 0.18*carry; SFX.swoop(e); }
      }
    }
    const want = up ? 9.5 : dn ? -(12 + 26*e.dive) : 0;
    e.vy += (want - e.vy)*Math.min(1, dts*(dn ? 2.6 : up ? 6 : 2.0));
  } else {
    e.vy -= GRAV*dts;
    if(e.dive) e.dive = Math.max(0, e.dive - dts*3);
    if(e.lift) e.lift = Math.max(0, e.lift - dts*3);
  }
  e.boost = Math.max(0, (e.boost||0) - dts*0.75);
  if(e.fly){                                            /* lean into the turn */
    const rt = Math.cos(e.yaw)*e.vx - Math.sin(e.yaw)*e.vz;
    const wantB = Math.max(-0.75, Math.min(0.75, -rt*0.055));
    e.bank = (e.bank||0) + (wantB - (e.bank||0))*Math.min(1, dts*4.5);
  } else if(e.bank) e.bank += (0 - e.bank)*Math.min(1, dts*7);
  e.x += e.vx*dts; e.y += e.vy*dts; e.z += e.vz*dts;
  resolveXZ(e);
  const gy = groundAt(e.x, e.z, e.rad);
  if(e.y <= gy){
    const drop = -e.vy;
    e.y = gy; if(e.vy<0) e.vy = 0;
    if(!e.grounded && drop > 6){ e.landT = now(); e.landK = Math.min(1, (drop - 6)/22); }
    if(!e.grounded && drop > 13) landImpact(e, drop);
    e.grounded = true;
  }
  else e.grounded = false;
  if(e.y > 130) e.y = 130;

  /* status ticks */
  if(hasFx(e,"burn")  && G.t % 420 < dts*1000) e.hp -= e.maxHp*0.012;
  if(hasFx(e,"bleed") && G.t % 420 < dts*1000) e.hp -= e.maxHp*0.011;
  if(hasFx(e,"regen") && G.t % 420 < dts*1000) e.hp = Math.min(e.maxHp, e.hp+e.maxHp*0.014);
  if(e.ai && e.ai.fx==="repair" && G.t % 900 < dts*1000) e.hp = Math.min(e.maxHp, e.hp+e.maxHp*0.012);
  if(e.team==="you" && now()-(e.lastHurt||0) > 4200 && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp*0.05*dts*(1 + vesselLevel("regen")*0.45));
  if(e.boss) bossPhaseCheck(e);
  if(e.hp<=0 && !e.dead){ killEnt(e); return; }

  /* multi-hit specials */
  if(e.blitz && now() >= e.blitz.next){
    const t = nearestFoe(e, 26);
    if(t){
      const a = Math.atan2(t.x-e.x, t.z-e.z);
      e.x = t.x - Math.sin(a)*(e.rad+t.rad); e.z = t.z - Math.cos(a)*(e.rad+t.rad);
      e.y = t.y; e.yaw = a;
      dealDamage(e,t,e.blitz.mul,e.blitz.opts);
      G.arcs.push({e, r:e.rad+2.4, t:0, life:150, c:e.pal.c3, yaw:a});
    }
    if(--e.blitz.left <= 0) e.blitz = null; else e.blitz.next = now()+140;
  }
  if(e.frenzy && now() >= e.frenzy.next){
    sphereHit(e, e.x, e.y, e.z, e.frenzy.R, e.frenzy.mul, e.frenzy.opts);
    shock(e.x, e.y+0.4, e.z, e.frenzy.R, e.pal.c3, 240);
    if(--e.frenzy.left <= 0) e.frenzy = null; else e.frenzy.next = now()+190;
  }

  let regen = 15 + e.maxNrg*0.06;
  if(e.ai && e.ai.fx==="allocate") regen *= 1.3;
  if(e.ai && e.ai.fx==="encourage" && e.hp<e.maxHp*.5) regen += 12;
  e.nrg = Math.min(e.maxNrg, e.nrg + regen*dts);
}
