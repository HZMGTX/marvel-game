/* == render/frame.js ==
   viewport, camera and the world queued for a frame
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* ------------------------------------------------------------------ scene */
const UI = document.getElementById("ui");
const UX = UI.getContext("2d");
let VW=0, VH=0, DPR=1;
const PROJ = new Float32Array(16), VIEW = new Float32Array(16), VP = new Float32Array(16);
const LVIEW = new Float32Array(16), LPROJ = new Float32Array(16), LVP = new Float32Array(16);
const EYE = [0,0,0];

function resize(){
  DPR = Math.min(quality==="low" ? 1.25 : 2, window.devicePixelRatio||1);
  VW = window.innerWidth; VH = window.innerHeight;
  CV.width = Math.floor(VW*DPR); CV.height = Math.floor(VH*DPR);
  CV.style.width = VW+"px"; CV.style.height = VH+"px";
  UI.width = CV.width; UI.height = CV.height;
  UI.style.width = VW+"px"; UI.style.height = VH+"px";
  buildTargets();
  G.camDist = VW < 760 ? 7.4 : 6.4;
}
addEventListener("resize", resize);
addEventListener("orientationchange", ()=>setTimeout(resize,150));

function project(x,y,z){
  const w = VP[3]*x + VP[7]*y + VP[11]*z + VP[15];
  if(w <= 0.02) return null;
  const cx = VP[0]*x + VP[4]*y + VP[8]*z + VP[12];
  const cy = VP[1]*x + VP[5]*y + VP[9]*z + VP[13];
  return {x:(cx/w*0.5+0.5)*VW, y:(1-(cy/w*0.5+0.5))*VH, w};
}

const SUN = [0.42, 0.80, 0.28];
(function(){ const l = Math.hypot(...SUN); SUN[0]/=l; SUN[1]/=l; SUN[2]/=l; })();

function buildFrame(){
  const w = G.world, th = w.th;
  /* ground */
  draw(MESH_BOX, 0, -0.5, 0, 0,0,0, WORLD, 1, WORLD, w.ground, {kind:1, rough:0.9, shadow:false});
  /* city */
  const cx = EYE[0], cz = EYE[2];
  for(const b of w.boxes){
    const d = Math.hypot(b.x-cx, b.z-cz);
    if(d > 260) continue;
    if(b.base){
      const h2 = b.h - b.base;
      draw(MESH_BOX, b.x, b.base + h2/2, b.z, 0,0,0, b.w, h2, b.d, b.col,
           {kind:2, rough:0.8, metal:0.05, accent:w.accent, shadow:d < 90});
      if(d < 120) for(let i=0;i<4;i++){          /* the pillars holding it up */
        const px = b.x + (i%2 ? 1 : -1)*(b.w/2 - 1.4);
        const pz = b.z + ((i>>1)%2 ? 1 : -1)*(b.d/2 - 1.4);
        draw(MESH_TUBE, px, b.base/2, pz, 0,0,0, 1.5, b.base, 1.5, b.col,
             {rough:0.75, metal:0.05, shadow:d < 90});
      }
    } else {
      draw(MESH_BOX, b.x, b.h/2, b.z, 0,0,0, b.w, b.h, b.d, b.col,
           {kind:2, rough:0.8, metal:0.05, accent:w.accent, shadow:d < 90});
    }
  }
  for(const p of w.props) drawProp(p, Math.hypot(p.x-cx, p.z-cz));

  /* people */
  for(const e of G.ents){
    if(e.dead && now()-e.deadT > 1100) continue;
    const d = Math.hypot(e.x-cx, e.z-cz);
    if(d > 110) continue;
    if(e.dead){
      const k = 1 - (now()-e.deadT)/1100;
      e.yaw += 0.0; drawChar(e, d + (1-k)*60);
    }
    else if(d > 52 && e !== G.player && !e.boss) drawCharFar(e);
    else drawChar(e, d);
  }

  /* gear on the ground */
  for(const dp of G.drops){
    const bobY = 0.55 + Math.sin(G.t*0.003 + dp.x)*0.12;
    draw(MESH_BOX, dp.x, dp.y+bobY, dp.z, G.t*0.0016, 0.5, 0.3, 0.34,0.34,0.34,
         GOLD3, {rough:0.2, metal:0.9, emis:0.5});
    draw(MESH_TUBE, dp.x, dp.y+0.02, dp.z, 0,0,0, 1.6, 0.02, 1.6, GOLD3,
         {kind:3, alpha:0.30, emis:0.6});
  }

  buildMarker();
  buildCity();
  buildEffects();
}

/* a column of light over whatever the mission wants from you */
function buildMarker(){
  const M = G.mission;
  if(!M || M.done) return;
  const mk = M.marker;
  if(!mk) return;
  const x = mk.x, z = mk.z;
  const pulse = 0.6 + Math.sin(G.t*0.004)*0.2;
  draw(MESH_TUBE, x, 14, z, 0,0,0, 2.2, 28, 2.2, GOLD3, {kind:3, alpha:0.11*pulse, emis:0.5});
  const R = (M.def.kind === "hold") ? 9 : 1.9;
  for(let i=0;i<18;i++){
    const a = i/18*6.283 + G.t*0.0008;
    draw(MESH_BOX, x+Math.sin(a)*R, 0.25, z+Math.cos(a)*R, a,0,0,
         0.22, 0.5, 0.22, GOLD3, {kind:3, emis:0.9, alpha:0.55*pulse});
  }
}
const GOLD3 = srgb("#F7BC46");

function drawProp(p, d){
  if(d > 120) return;
  const s = p.s, c = p.col;
  if(p.fallen){
    draw(MESH_TUBE, p.x + Math.sin(p.fallDir)*2.2, 0.28, p.z + Math.cos(p.fallDir)*2.2,
         p.fallDir, Math.PI/2, 0, 0.30*s, 5.2*s, 0.30*s, METAL3, {rough:0.8, metal:0.5});
    return;
  }
  const MET = {rough:0.45, metal:0.6};
  if(p.k==="tree"){
    draw(MESH_TAPER, p.x, 1.6*s, p.z, 0,0,0, 0.32*s, 3.2*s, 0.32*s, BARK3, {rough:0.95});
    draw(MESH_SPH, p.x, 4.2*s, p.z, p.x, 0,0, 3.2*s, 2.8*s, 3.2*s, LEAF3, {rough:0.9});
  } else if(p.k==="rock"){
    draw(MESH_SPH, p.x, 0.9*s, p.z, p.x, 0.3, 0.2, 2.6*s, 1.8*s, 2.4*s, ROCK3, {rough:0.95});
  } else if(p.k==="spire"){
    draw(MESH_TAPER2, p.x, 3.0*s, p.z, p.z,0,0, 1.1*s, 6.0*s, 1.1*s, ROCK3, {rough:0.8});
    draw(MESH_SPH, p.x, 6.3*s, p.z, 0,0,0, 0.5*s,0.7*s,0.5*s, c, {kind:3, emis:0.9, alpha:0.9});
  } else if(p.k==="column"){
    draw(MESH_TUBE, p.x, 3.4*s, p.z, 0,0,0, 1.2*s, 6.8*s, 1.2*s, STONE3, {rough:0.75});
    draw(MESH_BOX, p.x, 7.0*s, p.z, 0,0,0, 1.8*s, 0.4*s, 1.8*s, STONE3, {rough:0.7});
  } else if(p.k==="shard"){
    draw(MESH_TAPER2, p.x, 2.4*s, p.z, p.x,0.1,0.1, 0.9*s, 5.0*s, 0.9*s, c, {rough:0.12, metal:0.3, emis:0.25, alpha:0.85});
  } else {                                            /* street light */
    draw(MESH_TUBE, p.x, 2.6*s, p.z, 0,0,0, 0.16*s, 5.2*s, 0.16*s, METAL3, MET);
    draw(MESH_BOX, p.x, 5.25*s, p.z, 0,0,0, 0.7*s, 0.16*s, 0.35*s, c, {kind:3, emis:1.1, alpha:0.95});
  }
}
const BARK3=srgb("#3A2A1A"), LEAF3=srgb("#2E4A1E"), ROCK3=srgb("#3A3648"),
      STONE3=srgb("#7A6A48"), METAL3=srgb("#4A4A52");
