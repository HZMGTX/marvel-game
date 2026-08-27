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
    /* Every roof was a flat lid, which is why a skyline of these read as a
       shelf of boxes. A parapet, a tank and a stair head cost four calls on
       the near ones and give the roofline something to be. */
    if(d < 96 && b.h > 8){
      const rk = hash(String(Math.round(b.x*7) ^ Math.round(b.z*13)));
      const par = 0.75 + (rk % 5)*0.14;
      draw(MESH_BOX, b.x, b.h + par/2, b.z, 0,0,0, b.w, par, b.d, b.col,
           {kind:2, rough:0.84, accent:w.accent, shadow:d < 80});
      if(d < 62){
        draw(MESH_BOX, b.x, b.h + par*0.55, b.z, 0,0,0, b.w - 1.6, par*0.9, b.d - 1.6, w.ground,
             {kind:0, rough:0.92, shadow:false});
        const ox2 = ((rk>>>3) % 100)/100 - 0.5, oz2 = ((rk>>>9) % 100)/100 - 0.5;
        draw(MESH_TUBE, b.x + ox2*b.w*0.42, b.h + 1.5, b.z + oz2*b.d*0.42, 0,0,0,
             2.4, 3.0, 2.4, METAL3, {rough:0.62, metal:0.5, shadow:false});
        draw(MESH_BOX, b.x - ox2*b.w*0.34, b.h + 1.3, b.z - oz2*b.d*0.34, rk*0.001, 0, 0,
             3.2, 2.6, 3.0, b.col, {kind:2, rough:0.86, accent:w.accent, shadow:false});
      }
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

const SMALL_PROP = {bollard:1, hydrant:1, bin:1, sign:1, box:1, bench:1};
function drawProp(p, d){
  if(d > 120) return;
  if(d > 44 && SMALL_PROP[p.k]) return;      /* four pixels is not worth a call */
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
  } else if(p.k==="bollard"){
    draw(MESH_TUBE, p.x, 0.46*s, p.z, 0,0,0, 0.17*s, 0.92*s, 0.17*s, IRON3, {rough:0.55, metal:0.5});
    draw(MESH_SPH, p.x, 0.94*s, p.z, 0,0,0, 0.17*s, 0.13*s, 0.17*s, IRON3, {rough:0.5, metal:0.5});
  } else if(p.k==="hydrant"){
    draw(MESH_TUBE, p.x, 0.34*s, p.z, 0,0,0, 0.20*s, 0.68*s, 0.20*s, HYD3, {rough:0.6, metal:0.3});
    draw(MESH_SPH, p.x, 0.70*s, p.z, 0,0,0, 0.22*s, 0.18*s, 0.22*s, HYD3, {rough:0.6, metal:0.3});
    for(const sd of [-1,1])
      draw(MESH_TUBE, p.x + sd*0.16*s, 0.44*s, p.z, 0, 0, 1.5708, 0.08*s, 0.14*s, 0.08*s, HYD3,
           {rough:0.6, metal:0.3});
  } else if(p.k==="bin"){
    draw(MESH_TAPER, p.x, 0.44*s, p.z, p.r||0, 0, 0, 0.52*s, 0.88*s, 0.52*s, IRON3, {rough:0.72, metal:0.25});
    draw(MESH_TUBE, p.x, 0.90*s, p.z, 0,0,0, 0.56*s, 0.06*s, 0.56*s, IRON3, {rough:0.6, metal:0.4});
  } else if(p.k==="lights"){
    draw(MESH_TUBE, p.x, 1.55*s, p.z, 0,0,0, 0.11*s, 3.1*s, 0.11*s, IRON3, MET);
    draw(MESH_BOX, p.x, 3.35*s, p.z, p.r||0, 0, 0, 0.26*s, 0.76*s, 0.22*s, IRON3, {rough:0.6, metal:0.4});
    const on = ((G.t*0.00013 + p.x*0.07) % 1);
    const lamp = on < 0.45 ? 0 : on < 0.55 ? 1 : 2;      /* red, amber, green */
    for(let i=0;i<3;i++)
      draw(MESH_SPH, p.x, (3.58 - i*0.23)*s, p.z + 0.12*s, 0,0,0, 0.13*s,0.13*s,0.06*s,
           [SIG_R,SIG_A,SIG_G][i], {kind:3, emis: i===lamp ? 1.4 : 0.06, alpha:0.95});
  } else if(p.k==="bench"){
    for(const sd of [-1,1])
      draw(MESH_BOX, p.x + Math.cos(p.r||0)*sd*0.75*s, 0.22*s, p.z + Math.sin(p.r||0)*sd*0.75*s,
           p.r||0, 0, 0, 0.12*s, 0.44*s, 0.44*s, IRON3, {rough:0.6, metal:0.4});
    draw(MESH_BOX, p.x, 0.46*s, p.z, p.r||0, 0, 0, 1.75*s, 0.08*s, 0.46*s, WOOD3, {rough:0.88});
    draw(MESH_BOX, p.x - Math.sin(p.r||0)*0.20*s, 0.72*s, p.z - Math.cos(p.r||0)*0.20*s,
         p.r||0, 0.22, 0, 1.75*s, 0.40*s, 0.07*s, WOOD3, {rough:0.88});
  } else if(p.k==="planter"){
    draw(MESH_TAPER, p.x, 0.24*s, p.z, p.r||0, 0, 0, 0.74*s, 0.48*s, 0.74*s, STONE3, {rough:0.92});
    if(d < 64) draw(MESH_TAPER, p.x, 1.10*s, p.z, 0,0,0, 0.085*s, 1.42*s, 0.085*s, BARK3, {rough:0.95});
    draw(MESH_SPH, p.x, 1.92*s, p.z, p.r||0, 0, 0, 0.62*s, 0.52*s, 0.62*s, LEAF3, {rough:0.92});
  } else if(p.k==="sign"){
    draw(MESH_TUBE, p.x, 1.2*s, p.z, 0,0,0, 0.07*s, 2.4*s, 0.07*s, IRON3, MET);
    draw(MESH_BOX, p.x, 2.35*s, p.z, p.r||0, 0, 0, 0.62*s, 0.30*s, 0.04*s, c, {rough:0.4, metal:0.3});
  } else if(p.k==="box"){                               /* a utility cabinet */
    draw(MESH_BOX, p.x, 0.52*s, p.z, p.r||0, 0, 0, 0.78*s, 1.04*s, 0.46*s, IRON3, {rough:0.68, metal:0.35});
    draw(MESH_BOX, p.x, 1.07*s, p.z, p.r||0, 0, 0, 0.84*s, 0.07*s, 0.52*s, IRON3, {rough:0.6, metal:0.4});
  } else {                                              /* street light */
    if(d < 46)
      draw(MESH_TUBE, p.x, 0.10*s, p.z, 0,0,0, 0.34*s, 0.20*s, 0.34*s, IRON3, {rough:0.7, metal:0.3});
    draw(MESH_TUBE, p.x, 2.9*s, p.z, 0,0,0, 0.15*s, 5.6*s, 0.15*s, IRON3, MET);
    /* the arm reaches out over the road, the way one actually does */
    const a = p.r || 0, ax = Math.sin(a)*0.85*s, az = Math.cos(a)*0.85*s;
    if(d < 72)
      draw(MESH_TUBE, p.x + ax*0.5, 5.66*s, p.z + az*0.5, a, 1.5708, 0, 0.10*s, 1.7*s, 0.10*s, IRON3, MET);
    draw(MESH_BOX, p.x + ax, 5.52*s, p.z + az, a, 0.16, 0, 0.30*s, 0.13*s, 0.72*s, IRON3, MET);
    const night = (G.world && G.world.night !== undefined) ? G.world.night : 1;
    if(night > 0.12){
      draw(MESH_BOX, p.x + ax, 5.43*s, p.z + az, a, 0.16, 0, 0.24*s, 0.05*s, 0.60*s, LAMP3,
           {kind:3, emis: 0.5 + night*1.1, alpha: 0.35 + night*0.6});
      /* A lamp that glows and lights nothing is the loudest thing wrong with a
         street after dark. This is the pool it should be throwing. */
      const gx = p.x + ax, gz = p.z + az, gy = groundAt(gx, gz, 0);
      draw(MESH_SPH, gx, gy + 0.03, gz, 0,0,0,
           7.4*s, 0.02, 7.4*s, LAMP3, {kind:6, emis:0.35, alpha:0.15*night, shadow:false});
      if(d < 44)
        draw(MESH_SPH, gx, gy + 0.05, gz, 0,0,0,
             3.4*s, 0.02, 3.4*s, LAMP3, {kind:6, emis:0.55, alpha:0.13*night, shadow:false});
    }
  }
}
const BARK3=srgb("#3A2E22"), LEAF3=srgb("#3B4A2C"), ROCK3=srgb("#3A3648"),
      STONE3=srgb("#7A6A48"), METAL3=srgb("#4A4A52");
const LAMP3=srgb("#FFD49A");
const IRON3=srgb("#2E3038"), HYD3=srgb("#8A2A22"), WOOD3=srgb("#4A3826"),
      SIG_R=srgb("#E8342A"), SIG_A=srgb("#E8A430"), SIG_G=srgb("#2FBF63");
