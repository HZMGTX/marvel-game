/* == ui/tabs-you.js ==
   choosing a body and spending what you have earned
   Part of Multiverse Vessel. Loaded in order from index.html. */

function bodyTab(){
  const locked = !canBecome();
  const mode = bx.mode || "become";
  const slot = mode.startsWith("echo") ? +mode.slice(4) : -1;
  const cur = S.host ? BY_ID[S.host] : null;
  const q = bx.q.trim().toLowerCase();
  let list = S.unlocked.map(id=>BY_ID[id]).filter(Boolean).filter(b=>
    (!q || b.name.toLowerCase().includes(q) || b.tags.join(" ").includes(q) || ARCH[b.arch].name.toLowerCase().includes(q))
    && (bx.tag==="all" || b.tags.includes(bx.tag))
    && (bx.sector==="all" || b.sector===bx.sector));
  list.sort((a,b)=> bx.sort==="tier" ? (b.tier-a.tier || a.name.localeCompare(b.name)) : a.name.localeCompare(b.name));
  const shown = list.slice(0, bx.cap);

  const card = b=>{
    const u = unitStats(b, {level:level(b.id), gear:gearFor(b.id),
                            pot:gearPotency(gearFor(b.id), b.id), player:true});
    const g = GEAR_BY_OWNER[b.id]||[];
    const on = slot>=0 ? b.id===echoPick(slot) : b.id===S.host;
    const pick = slot>=0 ? `data-echo="${slot}:${b.id}"` : `data-become="${b.id}"`;
    return `<button class="cardb" ${pick} aria-pressed="${on}"
      style="flex-direction:column;align-items:stretch;gap:6px${locked&&!on?";opacity:.55":""}">
      <span class="row" style="gap:8px;flex-wrap:nowrap">
        <canvas width="76" height="76" data-being="${b.id}"></canvas>
        <span style="min-width:0;flex:1">
          <span class="n">${esc(b.name)}</span><br>
          <span class="s">LV ${level(b.id)} · T${b.tier} ${esc(ARCH[b.arch].name)}${canFly(b)?" · FLIES":""}</span>
          ${g.length?`<br><span class="s" style="color:var(--gold)">${g.map(x=>esc(x.name)).join(", ")}</span>`:""}
        </span>
      </span>
      <span class="stats">
        <span class="stat"><b>${u.st.p}</b><i>Pwr</i></span>
        <span class="stat"><b>${u.st.d}</b><i>Dur</i></span>
        <span class="stat"><b>${u.st.s}</b><i>Spd</i></span>
        <span class="stat"><b>${u.maxHp}</b><i>Hp</i></span>
      </span>
      ${on?`<span class="s" style="color:var(--good)">${slot>=0?"Held as echo "+(slot+1):"You are wearing this one"}</span>`:""}
    </button>`;
  };

  return `<div class="panel">
    <div class="row" style="justify-content:space-between;align-items:flex-start">
      <div style="min-width:0">
        <div class="eyebrow">Currently wearing</div>
        <h2 class="t" style="margin-top:4px">${cur?esc(cur.name):"Nobody"}</h2>
        <p class="note" style="margin-top:6px">${cur?`LV ${level(cur.id)} · ${esc(ARCH[cur.arch].name)} · ${esc(TIER_NAME[cur.tier])}${gearFor(cur.id)?" · "+esc(gearFor(cur.id).name):""}`:""}</p>
      </div>
      ${cur?`<canvas width="120" height="120" data-being="${cur.id}" style="width:60px;height:60px;border:2px solid var(--line)"></canvas>`:""}
    </div>
    <div class="divider" style="margin:12px 0"></div>
    <div class="row" style="gap:6px;margin-bottom:10px">
      ${[["become","Wear it"],["echo0","Echo I"],["echo1","Echo II"]].map(([m,lbl])=>{
        const held = m!=="become" ? echoPick(+m.slice(4)) : null;
        return `<button class="btn btn--sm ${mode===m?"btn--go":"btn--ghost"}" data-bxmode="${m}">${lbl}${held?" · "+esc(BY_ID[held].name):""}</button>`;
      }).join("")}
      ${slot>=0 && echoPick(slot) ? `<button class="btn btn--sm btn--ghost" data-echo="${slot}:">Let it go</button>` : ""}
    </div>
    ${locked
      ? `<p class="note" style="color:var(--flare)"><b>You cannot let go of a body mid-fight.</b>
          Break away — get clear of anything hunting you and stop trading blows — and the choice opens back up
          after ${combatLeft()} more second${combatLeft()===1?"":"s"}.</p>`
      : slot>=0
      ? `<p class="note">An echo is a body you have worn, stood back up beside you for ${Math.round(echoLife()/1000)} seconds.
          It fights with everything that body has — its level, its mastery, its bound weapon — at a little over half strength,
          and it can pull something off you by getting in the way. Call it with <b>${slot+1}</b>, or the face under your portrait.</p>`
      : `<p class="note">Out of a fight you can be anyone you have beaten. Health comes back full when you change,
          and whatever is bound to that body comes with it.</p>`}
  </div>

  <div class="panel" style="margin-top:12px">
    <div class="row">
      <input type="search" id="bxq" placeholder="Search ${S.unlocked.length} bodies" value="${esc(bx.q)}" style="flex:1 1 180px">
      <select id="bxtag"><option value="all">every tag</option>${ALL_TAGS.map(t=>`<option value="${t}" ${bx.tag===t?"selected":""}>${t}</option>`).join("")}</select>
      <select id="bxsec"><option value="all">every sector</option>${SECTORS.map(x=>`<option value="${x.id}" ${bx.sector===x.id?"selected":""}>${esc(x.name)}</option>`).join("")}</select>
      <select id="bxsort"><option value="tier" ${bx.sort==="tier"?"selected":""}>strongest first</option><option value="name" ${bx.sort==="name"?"selected":""}>A to Z</option></select>
      <span class="mono" style="font-size:11px;color:var(--muted)">${list.length}</span>
    </div>
  </div>
  <div class="grid grid--wide" style="margin-top:12px">${shown.map(card).join("") || `<p class="note">Nothing matches that.</p>`}</div>
  ${list.length>shown.length?`<div class="row" style="justify-content:center;margin-top:14px">
    <button class="btn btn--sm" data-act="more-bodies">Show the other ${list.length-shown.length}</button></div>`:""}`;
}

function powerTab(){
  const hid = S.host, host = hid?BY_ID[hid]:null;
  const locked = inCombat();
  const bar = (n,max)=>`<span class="mono" style="color:var(--gold)">${"■".repeat(n)}${"□".repeat(max-n)}</span>`;
  const abil = host ? ABIL_SLOTS.map((slot,i)=>{
    const lv = abilLevel(hid, slot), cost = abilCost(hid, slot);
    const nm = i===3 ? (host.sig || ARCH[host.arch].kit[3].n) : ARCH[host.arch].kit[i].n;
    const can = lv<ABIL_MAX && S.essence>=cost && !locked;
    return `<div class="cardb" style="flex-direction:column;align-items:stretch;gap:6px;cursor:default">
      <span class="row" style="justify-content:space-between">
        <span class="n">${esc(nm)}</span>${bar(lv,ABIL_MAX)}
      </span>
      <span class="s" style="text-transform:none;letter-spacing:0;color:var(--muted)">
        ${lv ? `Now +${lv*9}% damage and ${lv*6}% faster to come back.`
             : "Nothing has been done to this one yet."}
        ${lv < ABIL_MAX ? "A rank adds 9% damage and takes 6% off the wait." : ""}</span>
      ${lv<ABIL_MAX
        ? `<button class="btn btn--sm ${can?"btn--go":""}" ${can?`data-abil="${slot}"`:"disabled"}>${cost} essence</button>`
        : `<span class="s" style="color:var(--good)">as sharp as it goes</span>`}
    </div>`;
  }).join("") : "";
  const mt = host ? masteryTier(hid) : 0, mn = host ? masteryNext(hid) : null;
  return `<div class="panel">
    <div class="row" style="justify-content:space-between">
      <div><div class="eyebrow">Essence</div>
        <h2 class="t" style="margin-top:4px">${S.essence}</h2></div>
      ${locked?`<span class="note" style="color:var(--flare)">Not mid-fight</span>`:""}
    </div>
  </div>
  <div class="panel" style="margin-top:12px">
    <div class="eyebrow">The vessel — carries across every body</div>
    <div class="grid grid--wide" style="margin-top:10px">
      ${Object.keys(VESSEL_UP).map(k=>{
        const lv = vesselLevel(k), cost = vesselCost(k), can = lv<VESSEL_MAX && S.essence>=cost;
        return `<div class="cardb" style="flex-direction:column;align-items:stretch;gap:6px;cursor:default">
          <span class="row" style="justify-content:space-between">
            <span class="n">${esc(VESSEL_UP[k].name)}</span>${bar(lv,VESSEL_MAX)}
          </span>
          <span class="s" style="text-transform:none;letter-spacing:0;color:var(--muted)">${esc(VESSEL_UP[k].line)}</span>
          ${lv<VESSEL_MAX
            ? `<button class="btn btn--sm ${can?"btn--go":""}" ${can?`data-vessel="${k}"`:"disabled"}>${cost} essence</button>`
            : `<span class="s" style="color:var(--good)">at its limit</span>`}
        </div>`;}).join("")}
    </div>
  </div>
  ${host?`<div class="panel" style="margin-top:12px">
    <div class="row" style="justify-content:space-between">
      <div class="eyebrow">${esc(host.name)} — what this body can be taught</div>
      <span class="s">MASTERY ${mt}/3 · ${masteryOf(hid)} beaten${mn?` · ${mn-masteryOf(hid)} to the next`:""}</span>
    </div>
    <p class="note" style="margin-top:6px">Mastery comes from use, not essence: every kill while wearing them counts, and each tier is +4% to everything they are.</p>
    <div class="grid grid--wide" style="margin-top:10px">${abil}</div>
  </div>`:`<p class="note" style="margin-top:12px">Take a body to work on what it can do.</p>`}`;
}

function workTab(){
  const M = G.mission;
  const offers = missionOffers(G.sector);
  const sec = SECTORS[sectorIndex(G.sector)];
  return `<div class="panel">
    <div class="eyebrow">Work in ${esc(sec.name)}</div>
    ${M && !M.done
      ? `<h2 class="t" style="margin-top:6px">${esc(missionTitle(M.def))}</h2>
         <p class="note" style="margin-top:8px">${esc(missionLine(M.def))}</p>
         <div class="row" style="margin-top:12px">
           <button class="btn btn--go" data-act="close">Get on with it</button>
           <button class="btn btn--sm btn--ghost" data-act="abandon">Abandon</button>
         </div>`
      : `<h2 class="t" style="margin-top:6px">Three things need doing</h2>
         <p class="note" style="margin-top:8px">Take one and a marker goes up in the world. Finishing three brings new work in.</p>`}
    <div class="divider" style="margin:12px 0"></div>
    <p class="note"><span class="mono">${S.missionsDone||0}</span> finished so far.</p>
  </div>
  ${M && !M.done ? "" : `<div class="grid grid--wide" style="margin-top:12px">
    ${offers.map(m=>{
      const t = BY_ID[m.targetId];
      return `<button class="cardb" data-mission="${esc(m.id)}"
        style="flex-direction:column;align-items:flex-start;gap:6px">
        <span class="s" style="color:var(--gold)">${esc(MISSION_DEFS[m.kind].name)}</span>
        <span class="n" style="font-size:13px">${esc(missionTitle(m))}</span>
        <span class="s" style="text-transform:none;letter-spacing:0;color:var(--muted)">${esc(missionLine(m))}</span>
        <span class="s">${missionReward(m)} essence · T${m.tier}${t?" · "+esc(t.name):""}</span>
      </button>`;}).join("")}
  </div>`}`;
}
