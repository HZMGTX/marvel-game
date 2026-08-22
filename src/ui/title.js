/* == ui/title.js ==
   the title screen, the controls card, the pause menu
   Part of Multiverse Vessel. Loaded in order from index.html. */

const STARTERS = ["daredevil","luke-cage","the-punisher","typhoid-mary"];
function titleHtml(){
  const cont = S.started;
  return `<div class="stack" style="max-width:760px;margin:0 auto;padding-top:6vh">
    <h1 class="wordmark"><span class="lo">Multiverse</span>Vessel</h1>
    <p class="note" style="max-width:56ch">You are a spark with no body of your own. You can hold on to a person, and while you do, everything they can do is something you can do. Walk their city, fly over it, and beat whoever you find &mdash; every one of them becomes somebody you can be.
      <b style="color:var(--ink)">Their gear stays theirs</b> — to use the armour you have to be the man who built it.</p>
    ${cont ? `<div class="row">
        <button class="btn btn--go" data-act="continue">Continue — ${S.unlocked.length} hosts</button>
        <button class="btn btn--sm btn--ghost" data-act="wipe">Start over</button>
      </div>`
    : `<div class="panel">
        <div class="eyebrow">Pick the first body</div>
        <h2 class="t" style="margin:6px 0 10px">Something has to catch you</h2>
        <div class="grid">${STARTERS.map(id=>{
          const b = BY_ID[id];
          return `<button class="cardb" data-start="${id}">
            <canvas width="76" height="76" data-being="${id}"></canvas>
            <span><span class="n">${esc(b.name)}</span><br><span class="s">T${b.tier} ${esc(ARCH[b.arch].name)}</span></span>
          </button>`;}).join("")}</div>
      </div>`}
    <div class="panel">
      <div class="eyebrow">How to play</div>
      ${controlsHtml()}
    </div>
    <p class="foot">An unofficial, fan-made prototype. Not affiliated with, endorsed by, or produced by Marvel or
      The Walt Disney Company. All character names are trademarks of their respective owners, used here as an
      unpaid tribute. Everything is drawn from code — no art or audio is copied. Progress saves to this browser only.</p>
  </div>`;
}

function controlsHtml(){
  return `<div class="grid grid--wide" style="margin-top:8px">
    <div><h3>Move</h3><p class="note"><b>WASD</b> or the arrows, relative to the camera. On a phone, touch anywhere on the left half of the screen — the stick appears under your thumb.</p></div>
    <div><h3>Look</h3><p class="note">Drag anywhere on the right half, or click once on desktop to lock the mouse. Scroll to pull the camera in or out.</p></div>
    <div><h3>Fight</h3><p class="note"><b>Z</b> strike · <b>X</b> power · <b>C</b> ability · <b>V</b> ultimate. Four round buttons on a phone. Three strikes in a row run together and the third one lands properly.</p></div>
    <div><h3>Guard and parry</h3><p class="note">Hold <b>F</b> or the right mouse button (GUARD on a phone) to block what you are facing — most of the damage stops, and it drains energy. A hit that arrives in the first quarter-second of a guard is a <b>parry</b>: it staggers whoever threw it and hands it back.</p></div>
    <div><h3>Roll</h3><p class="note"><b>Shift</b> (ROLL on a phone) if the body you are wearing cannot fly. Three hundred milliseconds of nothing touching you. Enemies wind up before anything heavy — that flare around their feet is your cue.</p></div>
    <div><h3>Lock on</h3><p class="note"><b>T</b> or the LOCK button keeps the camera on the nearest enemy.</p></div>
    <div><h3>Jump and fly</h3><p class="note"><b>Space</b> jumps — you can land on the rooftops. <b>Shift</b> (or the FLY button) leaves the ground entirely, if the body you are wearing can. Hold Space to climb, Ctrl to drop.</p></div>
    <div><h3>Change body</h3><p class="note"><b>1 2 3</b> or tap a portrait. Instant, mid-fight, as often as you like. Health is tracked per body.</p></div>
    <div><h3>Surge</h3><p class="note"><b>Q</b> when the gold bar fills. Clears everything hurting you and hits 60% harder for five seconds.</p></div>
    <div><h3>Menu</h3><p class="note"><b>Esc</b> or the &#9776; button — hosts, gear, minds, sectors and the codex.</p></div>
    <div><h3>Gear on the ground</h3><p class="note">Beat someone carrying something and it drops where they fell. Walk over it to take it.</p></div>
  </div>`;
}

function pauseHtml(){
  const tabs = ["body","work","power","gear","minds","sectors","codex","rules"];
  return `<div class="stack">
    <div class="row" style="justify-content:space-between">
      <h2 class="t">The Vessel</h2>
      <button class="btn btn--go" data-act="close">Back to it</button>
    </div>
    <div class="tabs">${tabs.map(t=>`<button data-tab="${t}" aria-current="${menuTab===t}">${t}</button>`).join("")}</div>
    ${menuTab==="body"?bodyTab():menuTab==="work"?workTab():menuTab==="power"?powerTab():menuTab==="gear"?gearTab():menuTab==="minds"?mindsTab()
      :menuTab==="sectors"?sectorsTab():menuTab==="codex"?codexTab():rulesTab()}
  </div>`;
}
