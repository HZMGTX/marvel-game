/* == fight/abilities.js ==
   what each of the four slots actually does
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* -------------------------------------------------------------- abilities */
function abilityOf(e, slot){
  const a = e.act[slot];
  const kit = ARCH[e.b.arch].kit;
  const name = slot==="light"?kit[0].n : slot==="power"?kit[1].n : slot==="util"?kit[2].n : (e.b.sig||kit[3].n);
  return {a, name};
}
function ready(e, slot){
  const {a} = abilityOf(e, slot);
  return (e.cds[slot]||0) <= now() && e.nrg >= (a.cost||0) && !hasFx(e,"stun") && !e.dead;
}
function fwd(e){ return {x:Math.sin(e.yaw), z:Math.cos(e.yaw)}; }

const COMBO_WINDOW = 760;
const COMBO_MUL  = [1.00, 1.12, 1.62];
const COMBO_KNOCK= [1.00, 1.20, 2.60];
function useAbility(e, slot){
  let {a} = abilityOf(e, slot);
  if(!ready(e, slot)) return false;
  e.cds[slot] = now() + a.cd / (e.enrage || 1);
  e.nrg -= (a.cost||0);
  e.swingT = now();
  const f = fwd(e);
  const o = {knock:a.knock, bleed:a.bleed, burn:a.burn, weaken:a.weaken, mark:a.mark,
             stun:a.stun, drain:a.drain, pierce:a.pierce};
  /* three light strikes run together; the third one lands properly */
  const arank = (e.team==="you") ? abilLevel(e.id, slot) : 0;
  if(arank) e.cds[slot] = now() + a.cd * (1 - arank*0.06);
  let mul = a.mul * (1 + arank*0.09), step = 0;
  if(slot === "light"){
    step = (now() - (e.comboT||0) < COMBO_WINDOW) ? ((e.comboStep||0)+1) % 3 : 0;
    e.comboStep = step; e.comboT = now();
    mul = mul * COMBO_MUL[step];
    if(o.knock) o.knock *= COMBO_KNOCK[step];
    if(step === 2){ o.knock = (o.knock||120)*1.2; o.launch = true; e.cds.light = now() + a.cd*1.6; }
  }
  a = Object.assign({}, a, {mul});

  switch(a.kind){
    case "swipe": {
      const reach = reachOf(a) + e.rad;
      coneHit(e, reach, a.arc, mul, o);
      splashCars(e, e.x + f.x*reach*0.7, e.z + f.z*reach*0.7, reach*0.6);
      G.arcs.push({e, r:reach, t:0, life:180, c:e.pal.c3, yaw:e.yaw});
      SFX.swing(e);
      break;
    }
    case "shot":   shoot(e, e.yaw, aimPitchFor(e), a, o); SFX.shot(e); break;
    case "spread":
      const pit = aimPitchFor(e);
      for(let i=0;i<a.count;i++) shoot(e, e.yaw + (i-(a.count-1)/2)*(a.arc/Math.max(1,a.count-1)), pit, a, o);
      SFX.shot(e);
      break;
    case "beam": {
      const len = a.len*U_LEN, wid = a.wid*U_WID;
      G.beams.push({x:e.x, y:e.y+e.height*0.62, z:e.z, yaw:e.yaw, len, wid, c:e.pal.c3, t:0, life:210});
      rayHit(e, len, wid, mul, o);
      for(let s2=0;s2<4;s2++) splashCars(e, e.x+f.x*len*(s2+1)/4, e.z+f.z*len*(s2+1)/4, wid);
      SFX.beam(e);
      G.shake += .22;
      break;
    }
    case "slam": {
      const R = a.radius*U_RADIUS;
      shock(e.x, e.y+0.3, e.z, R, e.pal.c3, 420);
      sphereHit(e, e.x, e.y, e.z, R, mul, o);
      splashCars(e, e.x, e.z, R);
      SFX.slam(e.x, e.z, R);
      burst(e.x, e.y+0.6, e.z, 22, e.pal.c3);
      G.shake += Math.min(.85, R/16);
      break;
    }
    case "dash": {
      e.dashT = now()+260; e.dashHit = new Set(); e.dashMul = a.mul; e.dashOpts = o;
      e.dashSpeed = (a.dist*U_DIST)/0.26; e.dashYaw = e.yaw;
      setFx(e,"iframe",230);
      break;
    }
    case "blitz":  e.blitz  = {left:a.hits, mul:a.mul, opts:o, next:now()}; break;
    case "frenzy": e.frenzy = {left:a.hits, mul:a.mul, R:a.radius*U_RADIUS, opts:o, next:now()}; break;
    case "orbit":
      /* these sweep the ground you are standing on, not a circle five metres
         out — at the old radius they orbited past everything you could fight */
      for(let i=0;i<a.count;i++)
        G.orbits.push({owner:e, ang:i*(6.283/a.count), rad:Math.max(1.5, a.radius*U_RADIUS*0.55),
                       mul:a.mul, t:0, life:a.dur, cool:{}});
      break;
    case "buff": {
      if(a.cleanse) ["burn","bleed","weaken","mark","stun"].forEach(k=>e.fx[k]=0);
      if(a.nrg) e.nrg = Math.min(e.maxNrg, e.nrg+a.nrg);
      if(a.random){ const ks=["charge","fortify","regen","haste","shield"];
        setFx(e, ks[Math.floor(Math.random()*ks.length)], 5000); }
      if(a.self) for(const k in a.self) setFx(e,k,a.self[k]);
      shock(e.x, e.y+0.2, e.z, 1.8, e.pal.c3, 420);
      break;
    }
    case "heal": {
      if(a.cleanse) ["burn","bleed","weaken","mark","stun"].forEach(k=>e.fx[k]=0);
      const h = Math.round(e.maxHp*a.heal);
      e.hp = Math.min(e.maxHp, e.hp+h);
      G.pops.push({x:e.x,y:e.y+e.height*1.05,z:e.z,txt:"+"+h,t:0,life:900,col:"#5FE39A",size:18});
      if(a.self) for(const k in a.self) setFx(e,k,a.self[k]);
      shock(e.x, e.y+0.2, e.z, 1.8, [.37,.89,.60], 420);
      break;
    }
  }
  return true;
}

function shoot(e, yaw, pitch, a, o){
  const wob = a.wobble ? (Math.random()-.5)*a.wobble : 0;
  const y = yaw + wob;
  const sp = a.speed*U_SPEED;
  G.projs.push({
    owner:e, team:e.team,
    x:e.x + Math.sin(y)*(e.rad+0.5), y:e.y + e.height*0.62, z:e.z + Math.cos(y)*(e.rad+0.5),
    /* the horizontal part has to shrink as the shot tips up, or a steep aim
       comes out at half the angle you asked for and sails past underneath */
    vx:Math.sin(y)*Math.cos(pitch)*sp, vy:Math.sin(pitch)*sp, vz:Math.cos(y)*Math.cos(pitch)*sp,
    r:Math.max(0.14, a.r*0.036), life:a.life||900, t:0, mul:a.mul, c:e.pal.c3,
    pierce:a.pierce, home:a.home||0, hit:new Set(), opts:o
  });
}
function coneHit(e, reach, arc, mul, o){
  const f = fwd(e);
  for(const t of G.ents){
    if(!canHit(e,t)) continue;
    const dx=t.x-e.x, dz=t.z-e.z, d=Math.hypot(dx,dz);
    if(d > reach + t.rad) continue;
    if(Math.abs(t.y - e.y) > vReach(e)) continue;
    if(d>0.01 && (dx/d*f.x + dz/d*f.z) < Math.cos(arc/2)) continue;
    dealDamage(e,t,mul,o);
  }
}
function sphereHit(e, x,y,z, R, mul, o){
  for(const t of G.ents){
    if(!canHit(e,t)) continue;
    if(Math.hypot(t.x-x, (t.y+t.height*.5)-(y+0.9), t.z-z) > R + t.rad) continue;
    dealDamage(e,t,mul,o);
  }
}
function rayHit(e, len, wid, mul, o){
  const f = fwd(e);
  for(const t of G.ents){
    if(!canHit(e,t)) continue;
    const dx=t.x-e.x, dz=t.z-e.z;
    const along = dx*f.x + dz*f.z;
    if(along < 0 || along > len) continue;
    const perp = Math.abs(dx*f.z - dz*f.x);
    if(perp > wid/2 + t.rad) continue;
    if(Math.abs(t.y - e.y) > 2.6 + (e.grounded ? 0 : 1.4)) continue;
    dealDamage(e,t,mul,o);
  }
}
function nearestFoe(e, maxd){
  let best=null, bd=maxd||1e9;
  for(const t of G.ents){
    if(!canHit(e,t)) continue;
    const d = distXZ(t,e);
    if(d<bd){ bd=d; best=t; }
  }
  return best;
}
