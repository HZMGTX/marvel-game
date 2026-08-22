/* == ui/controls.js ==
   keyboard, mouse, thumbstick, buttons
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* ------------------------------------------------------------------ input */
const input = {up:0,down:0,left:0,right:0,light:0,power:0,util:0,ult:0,fly:0,jump:0,down2:0,
               block:0,dodge:0,surgeGo:false};
/* A press is a level *and* an edge. On a phone a quick tap can go down and up
   between two frames, and reading only the level drops it on the floor — so
   every press also sets a latch that the next frame consumes. */
const tapped = {};
function pressed(key){
  if(input[key]) return true;
  if(tapped[key]){ tapped[key] = false; return true; }
  return false;
}
function clearTaps(){ for(const k in tapped) tapped[k] = false; }
const KEYMAP = {
  KeyW:"up", ArrowUp:"up", KeyS:"down", ArrowDown:"down", KeyA:"left", ArrowLeft:"left",
  KeyD:"right", ArrowRight:"right", KeyZ:"light", KeyJ:"light", KeyX:"power", KeyK:"power",
  KeyC:"util", KeyL:"util", KeyV:"ult", Space:"jump", KeyF:"block",
  ControlLeft:"down2"
};
addEventListener("keydown", ev=>{
  if(ev.repeat) return;
  if(KEYMAP[ev.code]){ input[KEYMAP[ev.code]] = 1; tapped[KEYMAP[ev.code]] = true; ev.preventDefault(); }
  if(ev.code==="ShiftLeft" || ev.code==="ShiftRight"){
    input.fly = 1; input.dodge = 1; tapped.dodge = true; ev.preventDefault(); }
  if(ev.code==="KeyQ") input.surgeGo = true;
  if(ev.code==="KeyT"){ toggleLock(); }
  if(ev.code==="KeyB" || ev.code==="Tab"){ ev.preventDefault(); openBodyPicker(); }
  if(ev.code==="Escape"||ev.code==="KeyP"){
    if(document.pointerLockElement) document.exitPointerLock();
    SCREENS.firstChild ? closeScreen() : openScreen("pause");
  }
});
addEventListener("keyup", ev=>{
  if(KEYMAP[ev.code]) input[KEYMAP[ev.code]] = 0;
  if(ev.code==="ShiftLeft" || ev.code==="ShiftRight"){ input.fly = 0; input.dodge = 0; }
});
addEventListener("contextmenu", ev=>{ if(!SCREENS.firstChild) ev.preventDefault(); });
addEventListener("blur", ()=>{ for(const k in input) if(k!=="surgeGo") input[k]=0; });

const stick = {on:false, id:-1, cx:0, cy:0, dx:0, dy:0};
const look  = {on:false, id:-1, x:0, y:0};
function readMove(){
  if(stick.on) return {x:stick.dx, y:-stick.dy};
  let x = (input.right?1:0)-(input.left?1:0), y = (input.up?1:0)-(input.down?1:0);
  const m = Math.hypot(x,y); if(m>1){ x/=m; y/=m; }
  return {x,y};
}

const STICK = document.getElementById("stick"), NUB = document.getElementById("nub");
function showStick(x,y){
  STICK.style.left = (x-66)+"px"; STICK.style.top = (y-66)+"px"; STICK.style.opacity = "1";
}
function hideStick(){ STICK.style.opacity = "0"; NUB.style.transform = "translate(0,0)"; }
hideStick();

/* the canvas is the only thing under the HUD, so it owns look and move */
UI.addEventListener("pointerdown", ev=>{
  audioInit();
  touchMode(ev.pointerType!=="mouse");
  if(SCREENS.firstChild) return;
  if(ev.pointerType==="mouse" && ev.button===2){ input.block = 1; ev.preventDefault(); return; }
  if(ev.pointerType!=="mouse" && ev.clientX < VW*0.5 && !stick.on){
    stick.on = true; stick.id = ev.pointerId; stick.cx = ev.clientX; stick.cy = ev.clientY;
    showStick(ev.clientX, ev.clientY);
    UI.setPointerCapture(ev.pointerId);
  } else if(!look.on){
    look.on = true; look.id = ev.pointerId; look.x = ev.clientX; look.y = ev.clientY;
    UI.setPointerCapture(ev.pointerId);
    if(ev.pointerType==="mouse" && CV.requestPointerLock && !document.pointerLockElement) CV.requestPointerLock();
  }
  ev.preventDefault();
});
UI.addEventListener("pointermove", ev=>{
  if(stick.on && ev.pointerId===stick.id){
    let dx = ev.clientX-stick.cx, dy = ev.clientY-stick.cy;
    const max = 58, d = Math.hypot(dx,dy);
    if(d>max){ dx = dx/d*max; dy = dy/d*max; }
    NUB.style.transform = `translate(${dx}px,${dy}px)`;
    const mag = Math.min(1, d/max);
    if(mag < .16){ stick.dx = stick.dy = 0; }
    else { const n = d||1; stick.dx = dx/n*mag; stick.dy = dy/n*mag; }
  } else if(look.on && ev.pointerId===look.id && !document.pointerLockElement){
    G.camYaw   -= (ev.clientX-look.x)*0.006;
    G.camPitch = clamp(G.camPitch + (ev.clientY-look.y)*0.005, -0.45, 1.15);
    look.x = ev.clientX; look.y = ev.clientY;
  }
});
const endPtr = ev=>{
  if(ev.button===2) input.block = 0;
  if(stick.on && ev.pointerId===stick.id){ stick.on=false; stick.dx=stick.dy=0; hideStick(); }
  if(look.on && ev.pointerId===look.id) look.on = false;
};
UI.addEventListener("pointerup", endPtr);
UI.addEventListener("pointercancel", endPtr);
addEventListener("mousemove", ev=>{
  if(document.pointerLockElement===CV){
    G.camYaw -= ev.movementX*0.0025;
    G.camPitch = clamp(G.camPitch + ev.movementY*0.002, -0.45, 1.15);
  }
});
addEventListener("wheel", ev=>{ G.camDist = clamp(G.camDist + ev.deltaY*0.006, 2.6, 16); }, {passive:true});
const clamp = (v,a,b)=> v<a?a : v>b?b : v;

/* action buttons */
document.querySelectorAll("#pad .abtn").forEach(btn=>{
  const slot = btn.dataset.ab;
  btn.addEventListener("pointerdown", ev=>{ touchMode(true); input[slot]=1; tapped[slot]=true;
    btn.dataset.down="1";
    btn.setPointerCapture(ev.pointerId); ev.preventDefault(); ev.stopPropagation(); });
  const up = ()=>{ input[slot]=0; btn.dataset.down="0"; };
  btn.addEventListener("pointerup",up); btn.addEventListener("pointercancel",up); btn.addEventListener("pointerleave",up);
});
function holdBtn(id, key){
  const b = document.getElementById(id);
  b.addEventListener("pointerdown", ev=>{ touchMode(true); input[key]=1; tapped[key]=true;
    b.dataset.on="1";
    b.setPointerCapture(ev.pointerId); ev.preventDefault(); ev.stopPropagation(); });
  const up = ()=>{ input[key]=0; b.dataset.on="0"; };
  b.addEventListener("pointerup",up); b.addEventListener("pointercancel",up);
}
holdBtn("btn-jump","jump");
holdBtn("btn-block","block");
const DODGEB = document.getElementById("btn-dodge");
DODGEB.addEventListener("pointerdown", ev=>{ touchMode(true); input.dodge = 1; tapped.dodge = true;
  setTimeout(()=>{ input.dodge = 0; }, 90); ev.preventDefault(); ev.stopPropagation(); });
document.getElementById("btn-lock").addEventListener("pointerdown", ev=>{
  touchMode(true); toggleLock(); ev.preventDefault(); ev.stopPropagation(); });
const FLYB = document.getElementById("btn-fly");
FLYB.addEventListener("pointerdown", ev=>{ touchMode(true); input.fly = input.fly?0:1;
  FLYB.dataset.on = input.fly?"1":"0"; ev.preventDefault(); ev.stopPropagation(); });
document.getElementById("btn-surge").addEventListener("pointerdown", ev=>{
  touchMode(true); input.surgeGo = true; ev.preventDefault(); ev.stopPropagation(); });
document.getElementById("btn-menu").addEventListener("click", ev=>{ ev.stopPropagation(); openScreen("pause"); });

let touched = false;
function touchMode(on){ if(on && !touched){ touched = true; document.body.dataset.touch = "1"; } }
if(matchMedia("(pointer: coarse)").matches){ touched = true; document.body.dataset.touch = "1"; }
