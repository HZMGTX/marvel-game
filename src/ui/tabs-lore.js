/* == ui/tabs-lore.js ==
   the codex, the three rules, and the screens between runs
   Part of Multiverse Vessel. Loaded in order from index.html. */

const ALL_TAGS = (()=>{const s=new Set(); BEINGS.forEach(b=>b.tags.forEach(t=>s.add(t))); return [...s].sort();})();
function codexTab(){
  const q = cx.q.trim().toLowerCase();
  let items, cells;
  if(cx.cat==="beings"){
    items = BEINGS.filter(b=>(!q||b.name.toLowerCase().includes(q)||b.tags.join(" ").includes(q)||ARCH[b.arch].name.toLowerCase().includes(q))
      && (cx.tag==="all"||b.tags.includes(cx.tag)) && (cx.sector==="all"||b.sector===cx.sector))
      .sort((a,b)=>b.tier-a.tier||a.name.localeCompare(b.name));
    cells = items.slice(0,cx.cap).map(b=>{
      const g = GEAR_BY_OWNER[b.id]||[];
      return `<button class="cardb ${S.unlocked.includes(b.id)?"":"locked"}" data-become="${b.id}" ${S.unlocked.includes(b.id)?"":"disabled"}>
        <canvas width="76" height="76" data-being="${b.id}"></canvas>
        <span style="min-width:0"><span class="n">${esc(b.name)}</span><br>
        <span class="s">T${b.tier} ${esc(ARCH[b.arch].name)} · ${esc(SECTORS[sectorIndex(b.sector)].name)}</span>
        ${g.length?`<br><span class="s" style="color:var(--gold)">${g.map(x=>esc(x.name)).join(", ")}</span>`:""}</span></button>`;}).join("");
  } else if(cx.cat==="gear"){
    items = GEAR_LIST.filter(g=>!q||g.name.toLowerCase().includes(q)||g.owner.toLowerCase().includes(q));
    cells = items.slice(0,cx.cap).map(g=>`<div class="cardb ${S.gearOwned.includes(g.id)?"":"locked"}">
      <canvas width="76" height="76" data-glyph="${esc(g.initials)}" data-col="${g.hue}"></canvas>
      <span style="min-width:0"><span class="n">${esc(g.name)}</span><br>
      <span class="s">${esc(g.owner)}${S.gearOwned.includes(g.id)?" · HELD":""}${S.attuned.includes(g.id)?" · ATTUNED":""}</span>
      <br><span class="s" style="text-transform:none;letter-spacing:0">${esc(g.note)}</span></span></div>`).join("");
  } else if(cx.cat==="minds"){
    items = AI_LIST.filter(a=>!q||a.name.toLowerCase().includes(q));
    cells = items.map(a=>`<div class="cardb ${S.aiOwned.includes(a.id)?"":"locked"}">
      <canvas width="76" height="76" data-glyph="${esc(a.initials)}" data-col="#0E7C78"></canvas>
      <span style="min-width:0"><span class="n">${esc(a.name)}</span><br>
      <span class="s">${esc(AI_FX[a.fx].label)}</span>
      <br><span class="s" style="text-transform:none;letter-spacing:0">${esc(a.note)}</span></span></div>`).join("");
  } else {
    items = SECTORS.filter(s=>!q||s.name.toLowerCase().includes(q));
    cells = items.map(s=>`<div class="cardb"><canvas width="76" height="76" data-glyph="${esc(s.name.slice(0,2).toUpperCase())}" data-col="#2C2270"></canvas>
      <span style="min-width:0"><span class="n">${esc(s.name)}</span><br><span class="s">${sectorBeings(s.id).length} beings</span>
      <br><span class="s" style="text-transform:none;letter-spacing:0">${esc(s.blurb)}</span></span></div>`).join("");
  }
  return `<div class="panel">
    <div class="row">
      <div class="tabs" style="flex:1 1 260px">${["beings","gear","minds","sectors"].map(c=>
        `<button data-cat="${c}" aria-current="${cx.cat===c}">${c}</button>`).join("")}</div>
      <input type="search" id="cxq" placeholder="Search" value="${esc(cx.q)}" style="flex:1 1 160px">
      ${cx.cat==="beings"?`<select id="cxtag"><option value="all">every tag</option>${ALL_TAGS.map(t=>`<option value="${t}" ${cx.tag===t?"selected":""}>${t}</option>`).join("")}</select>
      <select id="cxsec"><option value="all">every sector</option>${SECTORS.map(s=>`<option value="${s.id}" ${cx.sector===s.id?"selected":""}>${esc(s.name)}</option>`).join("")}</select>`:""}
      <span class="mono" style="font-size:11px;color:var(--muted)">${items.length}</span>
    </div>
    <p class="note" style="margin-top:8px">${BEINGS.length} beings · ${GEAR_LIST.length} pieces of gear · ${AI_LIST.length} artificial minds · ${SECTORS.length} sectors. Dimmed means you have not reached it.</p>
  </div>
  <div class="grid grid--wide" style="margin-top:12px">${cells||`<p class="note">Nothing matches that.</p>`}</div>
  ${items.length>cx.cap?`<div class="row" style="justify-content:center;margin-top:14px"><button class="btn btn--sm" data-act="more">Show more</button></div>`:""}`;
}

function rulesTab(){
  return `<div class="panel">${controlsHtml()}</div>
  <div class="panel" style="margin-top:12px">
    <div class="eyebrow">The systems</div>
    <div class="stack" style="margin-top:10px;max-width:66ch">
      <p class="note"><b>Beat somebody, become somebody.</b> Every being you put down joins the list of things you can wear — ${BEINGS.length} of them, from a Hell's Kitchen enforcer to the One Above All.</p>
      <p class="note"><b>Gear belongs to a person.</b> Armour, hammers, symbiotes, cloaks: each is bound to its owner. Become the owner, then equip it. Ten kills as the rightful owner attunes it to the vessel, and after that anyone can echo it at 55%.</p>
      <p class="note"><b>Artificial minds install into you, not the body.</b> Thirty of them. J.A.R.V.I.S. rides in anything with circuitry, Ultron refuses flesh, Cerebro only amplifies a mind that was already reaching.</p>
      <p class="note"><b>Eight locals draws the boss out.</b> Put the boss down and the sector is clear, the next one opens, and a mind comes free.</p>
      <p class="note"><b>Essence and levels.</b> Every kill feeds every host you are carrying. Levels are permanent.</p>
      <p class="note"><b>Two of them come back.</b> The spark cannot wear two bodies at once — that rule never bends — but it remembers every one it has worn, and an echo is that memory stood up in the street. Levelling a body, mastering it, binding its weapon: all of it comes back with the echo. Six hundred names stop being a wardrobe and start being a bench.</p>
    </div>
    <div class="divider" style="margin:14px 0"></div>
    <div class="eyebrow">Sound</div>
    <p class="note" style="margin:6px 0 10px">Every noise in here is synthesised as it plays — there are no audio files.</p>
    <button class="btn btn--sm ${SND.on?"btn--go":""}" data-act="sound">${SND.on?"On":"Off"}</button>
    <div class="divider" style="margin:14px 0"></div>
    <div class="eyebrow">Picture quality</div>
    <p class="note" style="margin:6px 0 10px">Drop this if the frame rate is uneven. Low turns off shadows and bloom.</p>
    <div class="row">
      ${["high","medium","low"].map(q=>`<button class="btn btn--sm ${quality===q?"btn--go":""}" data-quality="${q}">${q}</button>`).join("")}
    </div>
    <div class="divider" style="margin:14px 0"></div>
    <div class="row" style="margin-top:4px">
      <button class="btn btn--sm" data-act="export">Copy save code</button>
      <button class="btn btn--sm" data-act="import">Paste save code</button>
      <button class="btn btn--sm btn--ghost" data-act="wipe">Erase everything</button>
    </div>
  </div>`;
}

function clearedHtml(){
  const i = sectorIndex(G.sector), nxt = SECTORS[i+1];
  return `<div class="stack" style="max-width:640px;margin:6vh auto 0">
    <div class="eyebrow">Sector clear</div>
    <h2 class="t">${esc(SECTORS[i].name)} is yours</h2>
    ${STORY[G.sector]?`<p class="note" style="font-style:italic;color:var(--ink);margin:10px 0;max-width:56ch">${esc(STORY[G.sector])}</p>`:""}
    <p class="note">${S.unlocked.length} hosts reached · ${S.gearOwned.length} pieces of gear · ${S.aiOwned.length} minds · ${S.essence} essence.</p>
    <div class="row">
      ${nxt?`<button class="btn btn--go" data-sector="${nxt.id}">Move on to ${esc(nxt.name)}</button>`:`<p class="note">There is nothing above this one.</p>`}
      <button class="btn" data-act="close">Stay here</button>
      <button class="btn btn--sm btn--ghost" data-tab="body">Take a different body</button>
    </div>
  </div>`;
}
/* The argument at the top. Everything below Above All Others has been about
   what you can do; this is the only screen that asks whether you should. */
function endingHtml(){
  const t = vesselTally();
  return `<div class="stack" style="max-width:660px;margin:5vh auto 0">
    <div class="eyebrow">Above All Others</div>
    <h2 class="t">Nothing is holding you up</h2>
    <p class="note" style="font-style:italic;color:var(--ink);max-width:58ch">
      ${esc(STORY.above)}</p>
    <p class="note" style="max-width:58ch">You have worn ${t.worn} ${t.worn===1?"body":"bodies"} and
      worn ${t.spent} of them out. ${t.hosts} people are yours to become, across ${t.sectors}
      ${t.sectors===1?"sector":"sectors"}. Not one of them was asked.</p>
    <p class="note" style="max-width:58ch">You could stop. The spark would go out and the last
      person you were would wake up on the floor of a place with no floor, and be themselves
      again, and that would be the end of it. Or you could hold on. There is always another
      one, and none of them can tell.</p>
    <div class="row">
      <button class="btn btn--go" data-act="hold-on">Hold on</button>
      <button class="btn" data-act="let-go">Let go</button>
    </div>
    <p class="note" style="opacity:.6;max-width:58ch">Holding on keeps everything you have and
      puts the thirty back the way you found them. Letting go ends this one.</p>
  </div>`;
}

/* what letting go looks like */
function letGoHtml(){
  const t = vesselTally();
  return `<div class="stack" style="max-width:620px;margin:8vh auto 0">
    <div class="eyebrow">The spark goes out</div>
    <h2 class="t">You let go</h2>
    <p class="note" style="max-width:58ch">${t.worn} ${t.worn===1?"body":"bodies"} worn,
      ${t.spent} worn out, ${t.hosts} people reached, ${t.sectors}
      ${t.sectors===1?"sector":"sectors"} behind you — and then nothing, which is the point.</p>
    <p class="note" style="max-width:58ch">Somewhere below, somebody who has been missing an
      afternoon sits up and cannot say where they have been.</p>
    <div class="row">
      <button class="btn btn--go" data-act="begin-again">Begin again</button>
      <button class="btn" data-act="close">Stay a moment</button>
    </div>
  </div>`;
}

function downHtml(){
  return `<div class="stack" style="max-width:600px;margin:8vh auto 0">
    <div class="eyebrow">Every host you brought has fallen</div>
    <h2 class="t">You do not die. You lose the grip.</h2>
    <p class="note">The spark comes loose and drifts back to the middle of the sector. The body you were wearing gets up at
      half strength, and it costs you a little of what you have gathered. The fight is over, so you may take a
      different one instead.</p>
    <div class="row">
      <button class="btn btn--go" data-act="revive">Take hold again</button>
      <button class="btn" data-tab="body">Take a different body</button>
    </div>
  </div>`;
}
