/* == ui/actions.js ==
   what every button on those screens does
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* ---------------------------------------------------------------- actions */
SCREENS.addEventListener("click", ev=>{
  const t = ev.target.closest("[data-act],[data-tab],[data-become],[data-gear],[data-ai],[data-sector],[data-start],[data-cat],[data-quality],[data-mission],[data-abil],[data-vessel],[data-geargrade]");
  if(!t) return;
  audioInit(); SFX.ui();
  const d = t.dataset;

  if(d.start){
    S.started = true;
    S.unlocked = [d.start,"hand-assassin","turk-barrett"].filter(x=>BY_ID[x]);
    S.host = d.start;
    (GEAR_BY_OWNER[d.start]||[]).forEach(g=>S.gearOwned.push(g.id));
    save();
    endAttract();
    enterSector("hk"); closeScreen();
    feed("You are inside somebody. Try not to enjoy it.","big");
    return;
  }
  if(d.act==="continue"){ endAttract(); enterSector(S.sector||"hk"); closeScreen(); return; }
  if(d.act==="close"){ closeScreen(); return; }
  if(d.act==="abandon"){ abandonMission(); openScreen("pause"); return; }
  if(d.act==="sound"){ audioToggle(); openScreen("pause"); return; }
  if(d.abil){ upgradeAbility(S.host, d.abil); openScreen("pause"); return; }
  if(d.vessel){ upgradeVessel(d.vessel); openScreen("pause"); return; }
  if(d.geargrade){ upgradeGear(d.geargrade); openScreen("pause"); return; }
  if(d.mission){
    const m = missionOffers(G.sector).find(x=>x.id===d.mission);
    if(m){ startMission(m); closeScreen(); }
    return;
  }
  if(d.act==="revive"){ reviveHost(); closeScreen(); return; }
  if(d.act==="hold-on"){
    S.heldOn = (S.heldOn||0) + 1;
    S.cleared = {};                       /* the thirty go back the way you found them */
    save();
    menuTab = "sectors"; openScreen("pause");
    feed("You hold on. None of them can tell.","big");
    return;
  }
  if(d.act==="let-go"){
    S.letGo = (S.letGo||0) + 1; save();
    openScreen("let-go");
    return;
  }
  if(d.act==="begin-again"){
    const kept = {letGo:S.letGo, heldOn:S.heldOn};
    S = Object.assign(clone(DEFAULT_STATE), kept);
    try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
    save();
    G.world = null; SCREENS.innerHTML = ""; boot();
    return;
  }
  if(d.act==="more"){ cx.cap += 200; openScreen("pause"); return; }
  if(d.act==="more-bodies"){ bx.cap += 200; openScreen("pause"); return; }
  if(d.act==="wipe"){
    if(t.dataset.confirm==="1"){
      S = clone(DEFAULT_STATE); try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
      G.world = null; SCREENS.innerHTML=""; boot(); return;
    }
    t.dataset.confirm = "1"; t.textContent = "Really erase everything?"; return;
  }
  if(d.act==="export"){
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
    navigator.clipboard && navigator.clipboard.writeText(code);
    const box = document.createElement("textarea");
    box.value = code; box.readOnly = true;
    box.style.cssText = "width:100%;height:140px;margin-top:10px;background:var(--panel-2);color:var(--ink);border:2px solid var(--line);font-family:var(--f-mono);font-size:10px;padding:8px";
    t.parentNode.parentNode.appendChild(box); box.select();
    return;
  }
  if(d.act==="import"){
    const v = prompt("Paste your save code");
    if(!v) return;
    try{
      S = Object.assign(clone(DEFAULT_STATE), JSON.parse(decodeURIComponent(escape(atob(v.trim())))));
      S.unlocked = S.unlocked.filter(id=>BY_ID[id]); save();
      G.world = null; SCREENS.innerHTML=""; boot();
    }catch(e){ alert("That did not read as a save code."); }
    return;
  }
  if(d.quality){ quality = d.quality; try{ localStorage.setItem(SAVE_KEY+"/q", quality); }catch(e){}
    resize(); if(G.world) setWeather(G.weather); openScreen("pause"); return; }
  if(d.tab){ menuTab = d.tab; openScreen("pause"); return; }
  if(d.cat){ cx.cat = d.cat; cx.cap = 120; openScreen("pause"); return; }
  if(d.become){
    if(becomeHost(d.become)) closeScreen();
    else openScreen("pause");
    return;
  }
  if(d.gear!==undefined){
    if(inCombat()){ openScreen("pause"); return; }
    const id = S.host;
    if(id){ if(d.gear) S.loadout[id] = d.gear; else delete S.loadout[id]; save(); syncHostLive(); }
    openScreen("pause"); return;
  }
  if(d.ai!==undefined){
    if(inCombat()){ openScreen("pause"); return; }
    S.installedAi = d.ai || null; save(); syncHostLive(); openScreen("pause"); return;
  }
  if(d.sector){
    if(!sectorUnlocked(d.sector)) return;
    enterSector(d.sector); closeScreen(); return;
  }
});
function reopenKeeping(id){
  const el0 = document.getElementById(id);
  const sel = el0 ? el0.selectionStart : 0;
  openScreen("pause");
  const n = document.getElementById(id);
  if(n){ n.focus(); if(n.setSelectionRange) n.setSelectionRange(sel,sel); }
}
SCREENS.addEventListener("input", ev=>{
  if(ev.target.id==="cxq"){ cx.q = ev.target.value; cx.cap = 120; reopenKeeping("cxq"); }
  if(ev.target.id==="bxq"){ bx.q = ev.target.value; bx.cap = 150; reopenKeeping("bxq"); }
});
SCREENS.addEventListener("change", ev=>{
  const t = ev.target;
  if(t.id==="cxtag"){ cx.tag = t.value; openScreen("pause"); }
  if(t.id==="cxsec"){ cx.sector = t.value; openScreen("pause"); }
  if(t.id==="bxtag"){ bx.tag = t.value; openScreen("pause"); }
  if(t.id==="bxsec"){ bx.sector = t.value; openScreen("pause"); }
  if(t.id==="bxsort"){ bx.sort = t.value; openScreen("pause"); }
});

