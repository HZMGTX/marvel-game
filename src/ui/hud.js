/* == ui/hud.js ==
   becoming somebody, and the readouts that follow you
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* -------------------------------------------------------------------- HUD */
const FEED = document.getElementById("feed");
const SCREENS = document.getElementById("screens");
const HUD = document.getElementById("hud");
const el = id => document.getElementById(id);

/* Becoming somebody else. Free whenever you are not in a fight. */
function canBecome(){
  if(!G.world || G.ended) return false;
  return !inCombat();
}
function becomeHost(id){
  if(!BY_ID[id] || !S.unlocked.includes(id)) return false;
  if(id === S.host) return false;
  if(!canBecome()){
    feed("You cannot let go of a body mid-fight — break away first", "");
    return false;
  }
  const old = G.player;
  S.host = id; save();
  if(old){
    shock(old.x, old.y+0.9, old.z, 3.2, GOLD3, 520);
    burst(old.x, old.y+0.9, old.z, 26, old.pal.c3);
  }
  syncHostLive();
  if(!G.player) buildHost();
  if(G.player){
    setFx(G.player, "iframe", 1200);
    G.player.hp = G.player.maxHp;
    shock(G.player.x, G.player.y+0.9, G.player.z, 4.0, G.player.pal.c3, 620);
    SFX.become();
    feed((old ? "You let go of "+old.b.name+" and take " : "You take ") + G.player.b.name, "big");
  }
  buildHostHud();
  return true;
}
function openBodyPicker(){
  menuTab = "body";
  openScreen("pause");
}

function buildHostHud(){
  const host = el("hud-squad"); host.innerHTML = "";
  if(!G.player) return;
  const d = document.createElement("button");
  d.className = "slot slot--become";
  d.innerHTML = `<span class="kbd">B</span><canvas width="68" height="68"></canvas><b>BECOME</b>`;
  drawPortrait(d.querySelector("canvas"), G.player.b);
  d.addEventListener("pointerdown", ev=>{ ev.stopPropagation(); openBodyPicker(); });
  host.appendChild(d);
}

let faceId = null;
function updateHud(){
  const p = G.player; if(!p) return;
  el("self-name").textContent = p.b.name;
  el("self-sub").textContent = `LV ${level(p.id)} · ${ARCH[p.b.arch].name} · T${p.b.tier}`
    + (p.gear ? " · "+(p.pot===1?"BOUND":"ECHO") : "") + (p.canFly?" · FLIES":"");
  el("bar-hp").style.width = Math.max(0,p.hp/p.maxHp*100)+"%";
  el("bar-nrg").style.width = Math.max(0,p.nrg/p.maxNrg*100)+"%";
  el("bar-surge").style.width = G.surge+"%";
  el("tag-sector").textContent = SECTORS[sectorIndex(G.sector)].name;
  el("tag-essence").textContent = "ESSENCE "+S.essence;
  const k = killsIn(G.sector);
  el("tag-foes").textContent = sectorCleared(G.sector) ? "SECTOR CLEAR"
    : G.bossEnt && !G.bossEnt.dead ? "BOSS · "+G.bossEnt.b.name.toUpperCase()
    : `${Math.min(k,KILLS_TO_BOSS)} / ${KILLS_TO_BOSS} TO DRAW THE BOSS`;
  document.querySelectorAll("#pad .abtn").forEach(btn=>{
    const slot = btn.dataset.ab;
    const {a,name} = abilityOf(p, slot);
    const key = {light:"Z",power:"X",util:"C",ult:"V"}[slot];
    const short = name.length>12 ? name.split(" ")[0] : name;
    el("lab-"+slot).innerHTML = short + `<small>${key}${a.cost?" · "+a.cost:""}</small>`;
    const left = Math.max(0, (p.cds[slot]||0) - G.t);
    btn.querySelector(".cool").style.transform = `scaleY(${Math.max(0,Math.min(1,left/a.cd))})`;
    btn.disabled = p.nrg < (a.cost||0);
  });
  FLYB.style.display = p.canFly ? "" : "none";
  FLYB.dataset.on = p.fly ? "1":"0";
  DODGEB.style.display = p.canFly ? "none" : "";
  DODGEB.dataset.on = (p.rollCd||0) > G.t ? "0" : "1";
  el("btn-block").dataset.on = p.blocking ? "1":"0";
  el("btn-lock").dataset.on = G.lockTarget ? "1":"0";
  el("btn-surge").dataset.on = G.surge>=100 ? "1":"0";
  const air = el("tag-air");
  if(p.fly){
    const sp = Math.hypot(p.vx, p.vz, p.vy);
    air.style.display = "";
    air.textContent = `ALT ${Math.round(p.y)}m · ${Math.round(sp*3.6)} km/h`
      + ((p.dive||0) > 0.45 ? " · DIVE" : (p.boost||0) > 0.2 ? " · SWOOP" : "");
  } else air.style.display = "none";
  const lock = el("tag-combat");
  if(inCombat()){ lock.style.display = ""; lock.textContent = "IN COMBAT · "+combatLeft()+"s"; }
  else lock.style.display = "none";
  const become = el("hud-squad").firstChild;
  if(become){
    become.dataset.on = canBecome() ? "1" : "0";
    become.querySelector("b").textContent = canBecome() ? "BECOME" : "LOCKED";
  }
  if(faceId !== p.id){ faceId = p.id; drawPortrait(el("face"), p.b); }
}

/* a small portrait for the menus, from the same palette the body uses */
function drawPortrait(cv, b){
  const g = cv.getContext("2d"), w = cv.width, h = cv.height;
  const pal = palette(b);
  const px = c => `rgb(${Math.round(Math.pow(Math.min(1,c[0]),1/2.2)*255)},${Math.round(Math.pow(Math.min(1,c[1]),1/2.2)*255)},${Math.round(Math.pow(Math.min(1,c[2]),1/2.2)*255)})`;
  const u = w/100;
  g.clearRect(0,0,w,h);
  const bg = g.createLinearGradient(0,0,0,h);
  bg.addColorStop(0, px(pal.dark)); bg.addColorStop(1, "#0A0912");
  g.fillStyle = bg; g.fillRect(0,0,w,h);
  if(pal.cape){ g.fillStyle = px(pal.capeCol);
    g.beginPath(); g.moveTo(12*u,100*u); g.lineTo(24*u,52*u); g.lineTo(76*u,52*u); g.lineTo(88*u,100*u);
    g.closePath(); g.fill(); }
  /* shoulders */
  g.fillStyle = px(pal.c1);
  g.beginPath();
  g.moveTo(18*u,100*u); g.quadraticCurveTo(22*u,62*u, 50*u,60*u);
  g.quadraticCurveTo(78*u,62*u, 82*u,100*u); g.closePath(); g.fill();
  /* chest mark */
  g.fillStyle = px(pal.c3); g.fillRect(43*u, 74*u, 14*u, 12*u);
  /* neck */
  g.fillStyle = px(pal.masked||pal.machine ? pal.c1 : pal.skin);
  g.fillRect(44*u, 52*u, 12*u, 12*u);
  /* head */
  g.beginPath(); g.ellipse(50*u, 38*u, 19*u, 22*u, 0, 0, 6.2832); g.fill();
  if(!pal.masked && !pal.machine){
    g.fillStyle = px(pal.hair);
    g.beginPath(); g.ellipse(50*u, 26*u, 20*u, 13*u, 0, Math.PI, 0); g.fill();
  }
  if(pal.masked || pal.machine){
    g.fillStyle = px(pal.c3); g.fillRect(36*u, 34*u, 28*u, 7*u);
  } else {
    g.fillStyle = "#0B0A14";
    g.beginPath(); g.ellipse(43*u,37*u,3*u,2.4*u,0,0,6.2832); g.fill();
    g.beginPath(); g.ellipse(57*u,37*u,3*u,2.4*u,0,0,6.2832); g.fill();
  }
  if(pal.horns){ g.fillStyle = px(pal.c3);
    g.beginPath(); g.moveTo(34*u,24*u); g.lineTo(27*u,6*u); g.lineTo(42*u,19*u); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(66*u,24*u); g.lineTo(73*u,6*u); g.lineTo(58*u,19*u); g.closePath(); g.fill(); }
  g.strokeStyle = "rgba(0,0,0,.5)"; g.lineWidth = 2; g.strokeRect(1,1,w-2,h-2);
}
