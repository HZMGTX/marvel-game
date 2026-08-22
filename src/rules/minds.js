/* == rules/minds.js ==
   what an installed mind actually does while you are playing
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* A mind rides in the vessel, not the body, so it follows you through every
   change. All twelve of them do something you can see. The passive ones sit on
   the HUD chip; the ones that fire at a moment say so, once, when they fire. */

function mindOf(e){ return (e && e.ai) ? e.ai : null; }
function mindFx(e, k){ const a = mindOf(e); return !!a && a.fx === k; }

/* a short line under the HUD chip when a mind steps in */
function mindFired(label, ms){
  G.mindFire = {txt: label, until: G.t + (ms || 1500)};
}

/* the start of a fight, which is when a few of them wake up */
function mindsOnFightStart(p){
  if(!p || !p.ai) return;
  G.struck = false;                       /* the first blow is still to come */
  G.fightStart = G.t;                     /* adaptive learning starts here */
  if(p.ai.fx === "plating"){
    setFx(p, "shield", 7000);
    shock(p.x, p.y + 0.5, p.z, 2.4, GREEN3, 460);
    mindFired("DROP PLATING");
  }
}

/* how much a mind takes off an incoming hit that it cannot stop outright */
function mindMitigation(def){
  if(!mindFx(def, "adapt")) return 1;
  const secs = Math.max(0, (G.t - (G.fightStart || G.t))/1000);
  return 1 - Math.min(0.28, secs*0.02);   /* 2% a second, to a quarter off */
}

/* the ones that answer a specific hit — returns true if the hit never lands */
function mindStopsHit(def, o){
  if(mindFx(def, "phase") && Math.random() < 0.25){
    mindFired("DENSITY CONTROL");
    setFx(def, "iframe", 220);
    for(let i=0;i<6;i++) spark(def.x, def.y + def.height*0.5, def.z, 2, GUARD3);
    return true;
  }
  if(mindFx(def, "foresee") && Math.random() < 0.15){
    mindFired("PRECOGNITION");
    G.pops.push({x:def.x, y:def.y + def.height*1.1, z:def.z, txt:"SEEN COMING", t:0,
                 life:800, col:"#8FE8FF", size:13});
    return true;
  }
  return false;
}

/* and the one that keeps you on your feet when the host is spent */
function mindCatchesFall(p){
  if(!p || !mindFx(p, "backup") || G.usedBackup) return false;
  G.usedBackup = true;
  p.dead = false;
  p.hp = Math.round(p.maxHp*0.30);
  p.fx = {};
  setFx(p, "iframe", 1600);
  shock(p.x, p.y + 0.8, p.z, 4.2, GOLD3, 700);
  burst(p.x, p.y + 0.8, p.z, 24, GOLD3);
  SFX.become();
  mindFired("BACKUP CONSCIOUSNESS", 2400);
  feed(p.ai.name + " writes you back into the body", "big");
  return true;
}

/* The chip says what the mind is doing for you, not what it is called — the
   name is on the pause screen, and there is only so much room beside a map. */
function mindChip(p){
  const a = mindOf(p);
  if(!a) return null;
  if(G.mindFire && G.t < G.mindFire.until) return G.mindFire.txt;
  return AI_FX[a.fx] ? AI_FX[a.fx].label.toUpperCase() : "IDLE";
}
