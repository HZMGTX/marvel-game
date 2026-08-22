/* == play/tick.js ==
   one frame: your input, everyone else, missions, spawns
   Part of Multiverse Vessel. Loaded in order from index.html. */

function update(dt){
  const dts = dt/1000;
  G.t += dt;
  const p = G.player;

  /* a mind that waits for a fight needs to know when one starts and ends */
  const fighting = inCombat();
  if(fighting && !G.wasFighting) mindsOnFightStart(p);
  else if(!fighting && G.wasFighting && p) p.usedAssist = false;
  G.wasFighting = fighting;

  if(p && !p.dead && !G.paused){
    const mv = readMove();
    /* movement is relative to where the camera is looking */
    const cy = Math.cos(G.camYaw), sy = Math.sin(G.camYaw);
    p.mx = mv.y*sy + mv.x*cy;
    p.mz = mv.y*cy - mv.x*sy;
    p.yaw += angDelta(p.yaw, G.camYaw) * Math.min(1, dts*14);
    p.wantUp = !!input.jump; p.wantDown = !!input.down2;
    if(p.canFly && input.fly && !p.fly){
      p.fly = true; p.vy = 6.5; p.lift = 1;
      if(p.grounded){ shock(p.x, p.y+0.18, p.z, 3.0, p.pal.c3, 340); G.shake += 0.30; SFX.slam(p.x, p.z, 3); }
      feed(p.b.name+" leaves the ground","good");
    }
    else if(!input.fly && p.fly){ p.fly = false; p.dive = 0; p.lift = 0; p.diveArmed = false; }
    if(!p.fly && p.grounded && pressed("jump")){ p.vy = JUMP; p.grounded = false; }
    p.blocking = !!input.block && !hasFx(p,"stun") && p.nrg > 0 && !p.rollT;
    if(p.blocking && !p.wasBlocking) p.blockStart = now();
    p.wasBlocking = p.blocking;
    if(!p.canFly && pressed("dodge")) startRoll(p, mv);
    if(!p.blocking) for(const slot of ["light","power","util","ult"]) if(pressed(slot)) useAbility(p, slot);
    if(input.surgeGo && G.surge>=100){
      G.surge = 0; setFx(p,"surge", 5000 + vesselLevel("surge")*1000);
      ["burn","bleed","weaken","mark","stun"].forEach(k=>p.fx[k]=0);
      p.nrg = p.maxNrg; shock(p.x,p.y+0.4,p.z,4,GOLD3,700); G.shake += .7;
      SFX.surge();
      feed("BURN THROUGH — the vessel stops being careful","big");
    }
    input.surgeGo = false;
    clearTaps();                       /* anything not read this frame is stale */
  }

  if(G.lockTarget && (G.lockTarget.dead || !p || distXZ(G.lockTarget,p) > 45)) G.lockTarget = null;
  if(G.lockTarget && p && !p.dead){
    const want = Math.atan2(G.lockTarget.x-p.x, G.lockTarget.z-p.z);
    G.camYaw += angDelta(G.camYaw, want) * Math.min(1, dts*7);
  }
  for(const e of G.ents){
    if(e.dead) continue;
    if(e.team==="foe"){
      enemyThink(e, dt);
      eliteThink(e, dt);
      if(e.boss) bossKitTick(e, dt);
      /* something is coming for you — that counts as being in a fight */
      if(p && !p.dead && e.engaged && distXZ(e,p) < 25) G.lastCombat = G.t;
    }
    else if(e.team==="civ"){ civThink(e, dt); }
    else if(G.paused){ e.mx = e.mz = 0; }
    stepEnt(e, dts);
  }
  /* keep bodies from standing inside each other */
  for(let i=0;i<G.ents.length;i++){
    const a = G.ents[i]; if(a.dead) continue;
    for(let j=i+1;j<G.ents.length;j++){
      const b = G.ents[j]; if(b.dead) continue;
      if(Math.abs(a.y-b.y) > (a.height+b.height)*.4) continue;
      const dx=b.x-a.x, dz=b.z-a.z, d=Math.hypot(dx,dz), min=a.rad+b.rad;
      if(d>0.0001 && d<min){ const k=(min-d)/d*.5; a.x-=dx*k; a.z-=dz*k; b.x+=dx*k; b.z+=dz*k; }
    }
  }

  /* projectiles */
  for(let i=G.projs.length-1;i>=0;i--){
    const pr = G.projs[i]; pr.t += dt;
    if(pr.home){
      const t = nearestFoe(pr.owner, 40);
      if(t){
        const a = Math.atan2(t.x-pr.x, t.z-pr.z);
        const sp = Math.hypot(pr.vx,pr.vz);
        pr.vx += (Math.sin(a)*sp - pr.vx)*Math.min(1, dts*pr.home*3);
        pr.vz += (Math.cos(a)*sp - pr.vz)*Math.min(1, dts*pr.home*3);
        pr.vy += (((t.y+t.height*.6) - pr.y)*2 - pr.vy)*Math.min(1, dts*pr.home*2);
      }
    }
    pr.x += pr.vx*dts; pr.y += pr.vy*dts; pr.z += pr.vz*dts;
    let gone = pr.t > pr.life || Math.abs(pr.x)>WORLD/2 || Math.abs(pr.z)>WORLD/2 || pr.y < 0;
    if(!gone) for(const b of G.world.boxes){
      if(pr.y < b.h && Math.abs(pr.x-b.x)<b.w/2 && Math.abs(pr.z-b.z)<b.d/2){
        gone = true; spark(pr.x,pr.y,pr.z,6,pr.c); break; }
    }
    if(!gone) for(const t of G.ents){
      if(t.dead||t.team===pr.team||pr.hit.has(t)) continue;
      if(Math.hypot(t.x-pr.x, (t.y+t.height*.55)-pr.y, t.z-pr.z) < t.rad+pr.r+0.4){
        pr.hit.add(t); dealDamage(pr.owner,t,pr.mul,pr.opts);
        if(!pr.pierce) gone = true;
        break;
      }
    }
    if(gone) G.projs.splice(i,1);
  }
  /* orbiting blades */
  for(let i=G.orbits.length-1;i>=0;i--){
    const ob = G.orbits[i]; ob.t += dt; ob.ang += dts*4.2;
    if(ob.t>ob.life || ob.owner.dead){ G.orbits.splice(i,1); continue; }
    ob.px = ob.owner.x + Math.sin(ob.ang)*ob.rad;
    ob.py = ob.owner.y + ob.owner.height*0.6;
    ob.pz = ob.owner.z + Math.cos(ob.ang)*ob.rad;
    for(const t of G.ents){
      if(t.dead||t.team===ob.owner.team) continue;
      /* keyed per body, not per character — two of the same enemy used to
         share one cooldown, so only one of them could ever be cut */
      if((ob.cool[t.uid]||0) > now()) continue;
      if(Math.hypot(t.x-ob.px, (t.y+t.height*.5)-ob.py, t.z-ob.pz) < t.rad+1.0){
        ob.cool[t.uid] = now()+420; dealDamage(ob.owner,t,ob.mul,{});
      }
    }
  }
  /* particles and short-lived things */
  for(let i=G.parts.length-1;i>=0;i--){
    const q=G.parts[i]; q.t+=dt;
    q.x+=q.vx*dts; q.y+=q.vy*dts; q.z+=q.vz*dts; q.vy-=22*dts;
    if(q.t>q.life) G.parts.splice(i,1);
  }
  for(let i=G.pops.length-1;i>=0;i--){ const q=G.pops[i]; q.t+=dt; q.y+=1.6*dts; if(q.t>q.life) G.pops.splice(i,1); }
  const age = arr => { for(let i=arr.length-1;i>=0;i--){ arr[i].t+=dt; if(arr[i].t>arr[i].life) arr.splice(i,1); } };
  age(G.beams); age(G.rings); age(G.arcs);

  /* gear lying in the street */
  for(let i=G.drops.length-1;i>=0;i--){
    const d = G.drops[i]; d.t += dt;
    if(p && Math.hypot(p.x-d.x, p.z-d.z) < 1.8 && Math.abs(p.y-d.y) < 3){
      const g = GEAR_BY_ID[d.gid];
      if(!S.gearOwned.includes(g.id)) S.gearOwned.push(g.id);
      feed("PICKED UP "+g.name.toUpperCase()+" — only works for "+g.owner,"big");
      shock(d.x,d.y+0.4,d.z,2,GOLD3,500);
      G.drops.splice(i,1); save();
    }
  }

  /* keep the streets busy */
  const foes = G.ents.filter(e=>!e.dead && e.team==="foe" && !e.missionTag).length;
  G.spawnT -= dt;
  const cap = 5 + Math.min(3, (sectorIndex(G.sector)/8)|0);
  if(foes < cap && G.spawnT<=0 && !G.paused){ spawnWanderer(); G.spawnT = 2400; }

  /* keep people on the pavement: they wander off, they get caught in things,
     and an empty city is worse than no city */
  G.civT = (G.civT||0) - dt;
  const civs = G.ents.filter(e=>!e.dead && e.team==="civ" && e.ambient);
  for(const c of civs) if(p && distXZ(c,p) > 220){ c.dead = true; c.deadT = now()-2000; }
  if(civs.length < 6 && G.civT <= 0 && !G.paused){ spawnAmbientCivs(1); G.civT = 5000; }
  if(!G.bossEnt && !sectorCleared(G.sector) && bossReady(G.sector) && !G.paused
     && !G.ents.some(e=>e.boss && !e.dead)) spawnBoss();

  for(let i=G.ents.length-1;i>=0;i--){
    const e = G.ents[i];
    if(e.dead && now()-e.deadT > 1000 && e!==G.player) G.ents.splice(i,1);
  }
  updateCars(dt); updateRain(dt); stepSky(dt); hintTick();
  updateMission(dt);
  if(G.combo && now()>G.comboT) G.combo = 0;
  G.shake *= Math.pow(0.0018, dts);
}
/* a roll: 340 ms of committed movement with a window you cannot be hit in */
const ROLL_CD = 720;
function startRoll(e, mv){
  if(e.rollT || (e.rollCd||0) > now() || hasFx(e,"stun") || !e.grounded) return;
  const cy = Math.cos(G.camYaw), sy = Math.sin(G.camYaw);
  let dx, dz;
  if(mv && (mv.x || mv.y)){ dx = mv.y*sy + mv.x*cy; dz = mv.y*cy - mv.x*sy; }
  else { dx = -Math.sin(e.yaw); dz = -Math.cos(e.yaw); }
  e.rollYaw = Math.atan2(dx, dz);
  e.rollT = now() + 340; e.rollCd = now() + ROLL_CD;
  e.rollSpeed = 12.5;
  e.blocking = false;
  setFx(e, "iframe", 300 + (e.team==="you" ? vesselLevel("iframe")*70 : 0));
  spark(e.x, e.y+0.4, e.z, 6, GUARD3);
}
function toggleLock(){
  if(G.lockTarget){ G.lockTarget = null; feed("Lock released",""); return; }
  const t = G.player ? nearestFoe(G.player, 45) : null;
  if(t){ G.lockTarget = t; feed("Locked on "+t.b.name, "good"); }
}
function angDelta(a,b){ let d=(b-a)%6.283; if(d>3.1416) d-=6.283; if(d<-3.1416) d+=6.283; return d; }
