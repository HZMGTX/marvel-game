/* == ui/screens.js ==
   the screen frame: cards, portraits, opening and closing
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* ---------------------------------------------------------------- screens */
const esc = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let menuTab = "body";
let bx = {q:"", tag:"all", sector:"all", sort:"tier", cap:150, mode:"become"};
let cx = {q:"", cat:"beings", tag:"all", sector:"all", cap:120};

function portraitTags(html){ return html; }
function paintPortraits(root){
  root.querySelectorAll("canvas[data-being]").forEach(c=>{
    const b = BY_ID[c.dataset.being]; if(b) drawPortrait(c, b);
  });
  root.querySelectorAll("canvas[data-glyph]").forEach(c=>{
    const g = c.getContext("2d"), w=c.width, h=c.height, col=c.dataset.col||"#4B4278";
    g.clearRect(0,0,w,h); g.fillStyle = col; g.fillRect(0,0,w,h);
    g.fillStyle = "rgba(0,0,0,.35)";
    for(let i=0;i<w;i+=6) for(let j=0;j<h;j+=6) g.fillRect(i,j,2,2);
    g.fillStyle = "#0B0A14"; g.font = `700 ${Math.round(w*0.42)}px Bungee, sans-serif`;
    g.textAlign="center"; g.textBaseline="middle";
    g.fillText(c.dataset.glyph, w/2, h/2+1);
  });
}
function beingCard(b, extra){
  const owned = S.unlocked.includes(b.id);
  return `<button class="cardb ${owned?"":"locked"}" data-become="${b.id}" ${owned?"":"disabled"}>
    <canvas width="76" height="76" data-being="${b.id}"></canvas>
    <span style="min-width:0">
      <span class="n">${esc(b.name)}</span><br>
      <span class="s">T${b.tier} ${esc(ARCH[b.arch].name)}${owned?" · LV "+level(b.id):""}${canFly(b)?" · FLIES":""}</span>
      <br><span class="s" style="color:${TRAITS[traitOf(b)].hex}">${esc(traitName(b))}</span>
      ${extra||""}
    </span></button>`;
}

function openScreen(name, opts){
  G.paused = true;
  const see = (name === "title" && G.attract) ? " screen--see" : "";
  SCREENS.innerHTML = `<div class="screen${see}"><div class="wrap">${screenHtml(name,opts)}</div></div>`;
  paintPortraits(SCREENS);
  SCREENS.scrollTop = 0;
  HUD.classList.add("hide");
}
function closeScreen(){
  if(!SCREENS.firstChild) return;
  SCREENS.innerHTML = "";
  if(S.started && G.world){ G.paused = false; G.last = performance.now(); HUD.classList.remove("hide"); }
}

function screenHtml(name, opts){
  if(name==="title") return titleHtml();
  if(name==="pause") return pauseHtml();
  if(name==="cleared") return clearedHtml();
  if(name==="ending")  return endingHtml();
  if(name==="let-go")  return letGoHtml();
  if(name==="down") return downHtml();
  return "";
}
