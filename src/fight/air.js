/* == fight/air.js ==
   what happens when the fight leaves the ground
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* Hovering used to win every fight: ranged enemies fired dead flat and melee
   enemies could not reach past two metres of height, so three metres up was a
   place nothing could touch you. The air is a real place to fight now — they
   aim up, they leap, they throw, you can knock them into it, and a dive into
   somebody is worth as much as a dive into the road. */

const AIR_GAP   = 2.6;      /* how far above somebody counts as being up there */
const LEAP_CD   = 2800;
const THROW_CD  = 2000;
const LAUNCH_VY = 8.6;
const DIVE_HIT_R = 2.7;

/* the pitch you need to put something where they actually are */
function aimPitch(from, to){
  if(!to) return 0;
  const d  = Math.hypot(to.x - from.x, to.z - from.z);
  const dy = (to.y + to.height*0.55) - (from.y + from.height*0.62);
  return Math.atan2(dy, Math.max(0.6, d));
}

/* who a shot is meant for: your lock, or whatever is in front of you */
function aimTarget(e){
  if(e.team !== "you") return (G.player && !G.player.dead) ? G.player : null;
  if(G.lockTarget && !G.lockTarget.dead) return G.lockTarget;
  const f = fwd(e);
  let best = null, bd = 36;
  for(const t of G.ents){
    if(t.dead || t.team !== "foe") continue;
    const dx = t.x - e.x, dz = t.z - e.z, d = Math.hypot(dx, dz);
    if(d > bd || d < 0.4) continue;
    if((dx/d)*f.x + (dz/d)*f.z < 0.72) continue;      /* roughly ahead of you */
    best = t; bd = d;
  }
  return best;
}
function aimPitchFor(e){ return aimPitch(e, aimTarget(e)); }

/* a swing reaches higher while its owner is off the ground */
function vReach(e){ return e.grounded ? 2.0 : 3.4; }

/* an enemy with both feet on the road still has two answers to somebody up
   in the air: get up there, or throw something */
function groundAnswersAir(e, p, d){
  if(!p || p.dead || e.canFly || e.fly || hasFx(e, "stun") || e.tell) return;
  const up = p.y - e.y;
  if(up < AIR_GAP || up > 46) return;
  if(now() < (e.airT || 0)) return;

  if(d < 8 && up < 11 && e.grounded){                 /* close enough to jump it */
    e.airT = now() + LEAP_CD;
    e.vy = Math.min(17, Math.sqrt(2*GRAV*(up + 1.4)));
    e.grounded = false;
    const a = Math.atan2(p.x - e.x, p.z - e.z);
    e.vx += Math.sin(a)*Math.min(9, d*1.5);
    e.vz += Math.cos(a)*Math.min(9, d*1.5);
    e.atkT = now() + 240;                             /* swings on the way up */
    spark(e.x, e.y + 0.2, e.z, 7, e.pal.c3);
    SFX.step(e);
    return;
  }
  /* too far or too high to jump — throw something instead */
  e.airT = now() + THROW_CD + Math.random()*900;
  const rock = {speed: 300, life: 1500, r: 9, mul: e.act.light.mul*1.25};
  shoot(e, Math.atan2(p.x - e.x, p.z - e.z), aimPitch(e, p), rock, {knock: 150});
  SFX.shot(e);
}

/* the third strike of a chain puts a grounded body in the air */
function launchInto(def, o){
  if(!o.launch || def.boss || !def.grounded) return;
  def.vy = LAUNCH_VY; def.grounded = false;
  G.pops.push({x:def.x, y:def.y + def.height*1.1, z:def.z, txt:"LAUNCH", t:0,
               life:700, col:"#F7BC46", size:13});
}

/* and coming down on somebody counts for as much as coming down on the road */
function diveStrike(e){
  if(!e.fly || (e.dive||0) < 0.5 || e.vy > -14) return;
  if(!e.diveHit) e.diveHit = new Set();
  for(const t of G.ents){
    if(t.dead || !canHit(e, t) || e.diveHit.has(t)) continue;
    if(Math.hypot(t.x - e.x, (t.y + t.height*0.5) - (e.y + 0.6), t.z - e.z) > DIVE_HIT_R + t.rad) continue;
    e.diveHit.add(t);
    const k = Math.min(1, (-e.vy - 14)/20);
    dealDamage(e, t, 1.1 + k*1.4, {knock: 8 + k*10, stun: k > 0.5 ? 420 : 0});
    shock(t.x, t.y + 0.4, t.z, 3.0 + k*2.4, e.pal.c3, 340);
    G.shake += 0.30 + k*0.4;
    G.freeze = Math.max(G.freeze, 55 + k*45);
    SFX.slam(t.x, t.z, 4);
  }
}
