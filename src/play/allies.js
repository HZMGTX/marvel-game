/* == play/allies.js ==
   echoes: the bodies you have worn, called back to fight beside you
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* ==========================================================================
   ECHOES
   The spark cannot be in two bodies at once — that rule does not bend. But
   it has been in a great many, and it remembers every one. An echo is that
   memory stood up in the street: thinner than the real thing, on a clock,
   and gone the moment it takes enough. Two of them are held at a time, and
   which two is a choice you make out of a fight, like every other choice.

   They matter because the roster matters. An echo is as strong as the bond
   you built wearing that body — its level, its mastery, its bound weapon —
   so the six hundred names in the codex stop being a wardrobe and start
   being a bench.
   ========================================================================== */
const ECHO_SLOTS = 2;
const ECHO_LIFE  = 42000;   /* how long one stands before it thins out */
const ECHO_CD    = 52000;   /* from the moment it goes, not the moment it came */
const ECHO_DMG   = 0.62;    /* a memory hits softer than a body */
const ECHO_HP    = 0.58;
const ECHO_FOLLOW = 6.5;    /* how close it keeps when there is nothing to hit */
const ECHO_LEASH  = 34;     /* it will not chase something halfway across a sector */

function echoLife(){ return ECHO_LIFE + vesselLevel("echo")*7000; }
function echoCooldown(){ return Math.round(ECHO_CD * (1 - vesselLevel("echo")*0.15)); }
function echoPick(i){ const id = (S.echoes||[])[i]; return (id && BY_ID[id] && S.unlocked.includes(id)) ? id : null; }
function echoOut(i){
  for(const e of G.ents) if(!e.dead && e.team==="ally" && e.echoSlot===i) return e;
  return null;
}

/* what the button under your portrait should say, and how full its clock is */
function echoStatus(i){
  const id = echoPick(i);
  if(!id) return {ready:false, label:"ECHO", cool:0, empty:true};
  const live = echoOut(i);
  if(live) return {ready:false, cool:0,
                   label: Math.max(0, Math.ceil((live.echoUntil - now())/1000))+"s"};
  const left = (G.echoCd[i]||0) - now();
  if(left > 0) return {ready:false, cool: Math.min(1, left/echoCooldown()),
                       label: Math.ceil(left/1000)+"s"};
  return {ready:true, label:"CALL", cool:0};
}

/* ------------------------------------------------------------ calling one */
function callEcho(i){
  if(!G.world || G.paused || G.ended) return false;
  const p = G.player;
  if(!p || p.dead) return false;
  const id = echoPick(i);
  if(!id){ feed("Nothing held in that slot — pick one from the bodies you have beaten",""); return false; }
  if(echoOut(i)) return false;
  if((G.echoCd[i]||0) > now()){
    feed(BY_ID[id].name+" has not settled yet","");
    return false;
  }
  const a = p.yaw + (i ? 1.1 : -1.1);
  const e = makeEnt(id, p.x + Math.sin(a)*2.4, p.z + Math.cos(a)*2.4, "ally",
                    {level: level(id), echo:true});
  e.y = p.y; e.grounded = p.grounded;
  e.maxHp = Math.max(40, Math.round(e.maxHp * (ECHO_HP + masteryTier(id)*0.06)));
  e.hp = e.maxHp;
  e.echoSlot = i;
  e.echoUntil = now() + echoLife();
  e.yaw = p.yaw;
  setFx(e, "iframe", 700);
  G.ents.push(e);
  shock(e.x, e.y+0.7, e.z, 3.4, e.pal.c3, 560);
  burst(e.x, e.y+0.9, e.z, 22, e.pal.c3);
  SFX.become();
  feed(e.b.name+" comes back for a while","big");
  return true;
}

/* the clock, and what running out of it looks like */
function echoTick(){
  for(const e of G.ents){
    if(e.dead || e.team!=="ally") continue;
    if(now() < e.echoUntil) continue;
    e.dead = true; e.deadT = now();
    burst(e.x, e.y+e.height*0.5, e.z, 18, e.pal.c3);
    G.echoCd[e.echoSlot] = now() + echoCooldown();
    feed(e.b.name+" thins out and is gone","");
  }
}
function onAllyDown(e){
  G.echoCd[e.echoSlot||0] = now() + echoCooldown();
  feed(e.b.name+" is torn out of the air","");
}

/* which two you hold. Same rule as every other choice: not mid-fight. */
function setEcho(i, id){
  if(inCombat()){
    feed("You cannot reach back for anyone mid-fight — break away first","");
    return false;
  }
  if(id && !S.unlocked.includes(id)) return false;
  S.echoes = S.echoes || [];
  for(let k=0;k<ECHO_SLOTS;k++) if(k!==i && S.echoes[k]===id) S.echoes[k] = null;
  S.echoes[i] = id || null;
  save();
  buildHostHud();
  feed(id ? BY_ID[id].name+" is held as an echo" : "That echo is let go","good");
  return true;
}

/* ------------------------------------------------------------------ their AI */
function allyTarget(e){
  const p = G.player;
  if(G.lockTarget && !G.lockTarget.dead && distXZ(G.lockTarget, e) < 46) return G.lockTarget;
  let best = null, bd = 42;
  for(const t of G.ents){
    if(t.dead || t.team!=="foe") continue;
    if(p && distXZ(t, p) > ECHO_LEASH) continue;   /* stay in your fight, not its own */
    const d = distXZ(t, e);
    /* whatever is already hitting you is worth more than whatever is nearest */
    const w = d - (t.tgt === p ? 7 : 0) - (t.boss ? 4 : 0);
    if(w < bd){ bd = w; best = t; }
  }
  return best;
}
function allyThink(e, dt){
  const p = G.player;
  const t = allyTarget(e);
  if(hasFx(e,"stun")){ e.mx = e.mz = 0; return; }
  if(!t){
    e.engaged = false;
    if(!p || p.dead){ e.mx = e.mz = 0; return; }
    const d = distXZ(e, p);
    if(d > ECHO_FOLLOW){ e.mx = (p.x-e.x)/d; e.mz = (p.z-e.z)/d; e.yaw = Math.atan2(p.x-e.x, p.z-e.z); }
    else { e.mx = e.mz = 0; e.yaw += angDelta(e.yaw, p.yaw)*0.1; }
    if(e.canFly) e.fly = p.fly && p.y > e.y + 2;
    else if(d > 22 && p.y < 2){ e.x = p.x - Math.sin(p.yaw)*2.6; e.z = p.z - Math.cos(p.yaw)*2.6; }
    return;
  }
  e.engaged = true;
  const dx = t.x-e.x, dz = t.z-e.z, d = Math.hypot(dx,dz) || 1e-4;
  e.yaw = Math.atan2(dx, dz);
  const want = e.act.ranged ? 12 : reachOf(e.act.light)*0.80 + e.rad + t.rad;
  const band = e.act.ranged ? 3.4 : 0.7;
  if(d > want+band){ e.mx = dx/d; e.mz = dz/d; }
  else if(d < want-band){ e.mx = -dx/d; e.mz = -dz/d; }
  else { const s = Math.sin(now()/820 + e.uid*0.7); e.mx = -dz/d*s*0.7; e.mz = dx/d*s*0.7; }
  if(e.canFly && t.y > e.y + 3) e.fly = true;
  else if(e.fly && Math.abs(t.y-e.y) < 1.4 && (!p || !p.fly)) e.fly = false;
  groundAnswersAir(e, t, d);
  if(now() < e.atkT) return;
  const inRange = e.act.ranged ? d < 30 : d < reachOf(e.act.light) + e.rad + t.rad + 0.7;
  if(!inRange) return;
  /* an echo does not telegraph — it is your hand, not theirs — but it does
     hold its heavier moves back so it is not just a second light attack */
  for(const slot of ["ult","power","light"]){
    if(!ready(e, slot)) continue;
    if(slot!=="light" && Math.random() > 0.72) continue;
    useAbility(e, slot);
    e.atkT = now() + 420 + Math.random()*280;
    return;
  }
  if(ready(e,"util") && e.hp < e.maxHp*0.55 && Math.random()<0.4){ useAbility(e,"util"); e.atkT = now()+600; }
}

/* ---------------------------------------------------- who a foe comes for */
/* You are the fight. An echo only pulls something off you by getting between
   you and it and staying there — close, and clearly closer than you are. */
const TAUNT_R = 7.0, TAUNT_EDGE = 4.0, RETARGET_MS = 900;
function foeTarget(e){
  const p = (G.player && !G.player.dead) ? G.player : null;
  if(e.tgt && !e.tgt.dead && now() < (e.tgtT||0)) return e.tgt;
  e.tgtT = now() + RETARGET_MS + Math.random()*700;
  let best = p, bd = p ? distXZ(e, p) : 1e9;
  for(const a of G.ents){
    if(a.dead || a.team!=="ally") continue;
    const d = distXZ(e, a);
    if(d < TAUNT_R && d < bd - TAUNT_EDGE){ best = a; bd = d; }
  }
  e.tgt = best;
  return best;
}
