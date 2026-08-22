/* == ui/tabs-kit.js ==
   gear, minds, and the map of the thirty sectors
   Part of Multiverse Vessel. Loaded in order from index.html. */

function gearTab(){
  const id = S.host;
  const host = id?BY_ID[id]:null;
  const locked = inCombat();
  const owned = S.gearOwned.map(g=>GEAR_BY_ID[g]).filter(Boolean);
  const row = g=>{
    const pot = host?gearPotency(g,id):0;
    const ok = host && canEquip(g,id) && !locked;
    const on = host && S.loadout[id]===g.id;
    const glv = gearLevel(g.id), gc = gearCost(g.id);
    const canUp = glv < GEAR_MAX && S.essence >= gc && !locked;
    const kills = (S.gearKills||{})[g.id]||0;
    return `<div class="cardb ${ok||on?"":"locked"}" style="flex-direction:column;align-items:stretch;gap:6px;cursor:default">
      <span class="row" style="gap:8px;flex-wrap:nowrap">
        <canvas width="76" height="76" data-glyph="${esc(g.initials)}" data-col="${g.hue}"></canvas>
        <span style="min-width:0;flex:1"><span class="n">${esc(g.name)}</span><br>
        <span class="s">${host&&canEquip(g,id)?(pot===1?"BOUND · FULL":"ECHO · "+Math.round(pot*100)+"%"):"needs "+esc(g.owner)}</span>
        <br><span class="s" style="text-transform:none;letter-spacing:0">${esc(g.move)}</span></span>
      </span>
      <span class="s" style="color:var(--gold)">RANK ${glv}/${GEAR_MAX}${S.attuned.includes(g.id)?" · ATTUNED":` · ${Math.min(kills,attuneNeeded(g.id))}/${attuneNeeded(g.id)} to attune`}</span>
      <span class="row">
        ${ok?`<button class="btn btn--sm ${on?"":"btn--go"}" data-gear="${g.id}">${on?"Carrying":"Carry"}</button>`:""}
        ${glv<GEAR_MAX?`<button class="btn btn--sm" ${canUp?`data-geargrade="${g.id}"`:"disabled"}>Work it · ${gc}</button>`:`<span class="s" style="color:var(--good)">fully worked</span>`}
      </span>
    </div>`;
  };
  const usable = owned.filter(g=>host&&canEquip(g,id));
  const inert  = owned.filter(g=>!host||!canEquip(g,id));
  return `<div class="panel">
    <div class="eyebrow">The rule</div>
    <p class="note" style="margin-top:6px">A suit belongs to a person. To wear it properly you have to <b>be</b> that person.
      Anything else you are carrying sits inert in your hands. Ten kills with a piece while you are its rightful
      owner and it <b>attunes</b> — after that any body can echo it at 55%, which is never the same thing.</p>
    ${locked?`<p class="note" style="color:var(--flare);margin-top:10px"><b>Not mid-fight.</b> You cannot change what you are holding while something is trying to kill you.</p>`:""}
    <div class="row" style="margin-top:10px">
      <span class="eyebrow" style="align-self:center">${host?esc(host.name):"no body"}</span>
      ${host&&!locked?`<button class="btn btn--sm btn--ghost" data-gear="">Carry nothing</button>`:""}
    </div>
  </div>
  ${!host?`<p class="note" style="margin-top:12px">Take a body first.</p>`:""}
  ${usable.length?`<div class="panel" style="margin-top:12px"><div class="eyebrow">Will work in these hands</div>
    <div class="grid grid--wide" style="margin-top:10px">${usable.map(row).join("")}</div></div>`:""}
  ${inert.length?`<div class="panel" style="margin-top:12px"><div class="eyebrow">Held, but inert</div>
    <div class="grid grid--wide" style="margin-top:10px">${inert.map(row).join("")}</div></div>`:""}
  ${!owned.length?`<p class="note" style="margin-top:12px">No gear recovered yet. Beat somebody who owns some — it falls where they do.</p>`:""}`;
}

function mindsTab(){
  const owned = S.aiOwned.map(a=>AI_BY_ID[a]).filter(Boolean);
  const cur = S.installedAi?AI_BY_ID[S.installedAi]:null;
  const host = S.host?BY_ID[S.host]:null;
  const locked = inCombat();
  return `<div class="panel">
    <div class="eyebrow">Installed</div>
    <p class="note" style="margin-top:6px">${cur?`<b>${esc(cur.name)}</b> — ${esc(AI_FX[cur.fx].desc)}`:"Nothing riding along. An artificial mind installs into the vessel, not the body, so it follows you through every swap — but most of them refuse to run on flesh."}</p>
    ${locked?`<p class="note" style="color:var(--flare);margin-top:8px">Not mid-fight.</p>`:""}
    ${cur&&!locked?`<button class="btn btn--sm btn--ghost" style="margin-top:10px" data-ai="">Uninstall</button>`:""}
  </div>
  <div class="panel" style="margin-top:12px">
    <div class="eyebrow">${owned.length} of ${AI_LIST.length} reached — one comes free with every sector you clear</div>
    <div class="grid grid--wide" style="margin-top:10px">
      ${owned.map(a=>{
        const fits = host && aiAllowed(a,host,gearFor(host.id));
        return `<button class="cardb ${locked?"locked":""}" ${locked?"disabled":`data-ai="${a.id}"`} aria-pressed="${cur&&cur.id===a.id}">
          <canvas width="76" height="76" data-glyph="${esc(a.initials)}" data-col="#0E7C78"></canvas>
          <span style="min-width:0"><span class="n">${esc(a.name)}</span><br>
          <span class="s">${esc(AI_FX[a.fx].label)}${host?(fits?" · runs on "+esc(host.name):" · will not run on "+esc(host.name)):""}</span>
          <br><span class="s" style="text-transform:none;letter-spacing:0">${esc(AI_FX[a.fx].desc)}</span></span>
        </button>`;}).join("")}
    </div>
    ${!owned.length?`<p class="note">Clear a sector — kill eight of its locals to draw the boss out, then put the boss down.</p>`:""}
  </div>`;
}

const TERRAIN = {
  blocks:  "city blocks and straight streets",
  spires:  "crowded towers, uneven and steep",
  slabs:   "low wide halls with open ground between",
  scatter: "open ground, a few masses on it"
};
function sectorsTab(){
  return `<div class="panel"><div class="eyebrow">Thirty places</div>
    <p class="note" style="margin-top:6px">Clear one and the next opens. Everything you beat anywhere stays yours.</p></div>
    <div class="grid grid--wide" style="margin-top:12px">
    ${SECTORS.map((s,i)=>{
      const open = sectorUnlocked(s.id), done = sectorCleared(s.id);
      const boss = sectorBoss(s.id);
      return `<button class="cardb ${open?"":"locked"}" ${open?`data-sector="${s.id}"`:"disabled"}
        style="flex-direction:column;align-items:flex-start;gap:4px" aria-pressed="${G.sector===s.id}">
        <span class="s">Sector ${String(i+1).padStart(2,"0")}${done?" · CLEAR":open?"":" · SEALED"}</span>
        <span class="n" style="font-size:13px">${esc(s.name)}</span>
        <span class="s" style="text-transform:none;letter-spacing:0;color:var(--muted)">${esc(s.blurb)}</span>
        <span class="s">${sectorBeings(s.id).length} beings · boss: ${esc(boss.name)}</span>
        <span class="s" style="color:var(--muted)">${esc(TERRAIN[(THEMES[SECTOR_THEME[s.id]]||{}).form || "blocks"])}</span>
        <span class="s">${killsIn(s.id)}/${KILLS_TO_BOSS} beaten here</span>
      </button>`;}).join("")}</div>`;
}
