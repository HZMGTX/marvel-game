/* == render/passes.js ==
   shadow pass, main pass, bright pass, blur, composite
   Part of Multiverse Vessel. Loaded in order from index.html. */

function renderScene(){
  if(!G.world) return;
  drawCalls = 0;
  resetQueue();

  const p = G.player, q = QUALITY[quality];
  const tgt = p || {x:0,y:1,z:0,height:1.8};
  const sh = G.shake*0.16;
  const flyOut = (p && p.fly) ? 1.9 : 0;
  const camD = G.camDist + flyOut;
  const cp = Math.cos(G.camPitch), sp = Math.sin(G.camPitch);
  EYE[0] = tgt.x - Math.sin(G.camYaw)*cp*camD + (Math.random()-.5)*sh;
  EYE[1] = tgt.y + tgt.height*0.72 + sp*camD + (Math.random()-.5)*sh;
  EYE[2] = tgt.z - Math.cos(G.camYaw)*cp*camD;
  const floor = groundAt(EYE[0], EYE[2], 0.6) + 0.9;
  if(EYE[1] < floor) EYE[1] = floor;
  pullCameraIn(tgt);
  const AT = [tgt.x, tgt.y + tgt.height*0.62, tgt.z];
  m4persp(VW<VH ? 1.16 : 0.98, VW/VH, 0.12, 600, PROJ);
  m4look(EYE, AT, UP3, VIEW);
  m4mul(PROJ, VIEW, VP);

  applyDayNight();
  buildFrame();

  /* ---- shadows ---- */
  let shadowOn = 0;
  if(SHADOW){
    const R = q.shadowRange;
    const c = [tgt.x, 0, tgt.z];
    m4ortho(-R, R, -R, R, 1, 320, LPROJ);
    m4look([c[0]+SUN[0]*150, c[1]+SUN[1]*150, c[2]+SUN[2]*150], c, UP3, LVIEW);
    m4mul(LPROJ, LVIEW, LVP);
    gl.bindFramebuffer(gl.FRAMEBUFFER, SHADOW.fb);
    gl.viewport(0,0,SHADOW.w,SHADOW.h);
    gl.clearColor(1,1,1,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(P_DEPTH); boundProg = null;
    gl.uniformMatrix4fv(P_DEPTH.u.uLightVP, false, LVP);
    const casters = Q_OPAQUE.filter(it=>it.shadow);
    replay(casters, P_DEPTH, false);
    gl.enable(gl.CULL_FACE);
    shadowOn = 1;
  }

  /* ---- main ---- */
  const toScreen = !SCENE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, toScreen ? null : SCENE.fb);
  gl.viewport(0,0, toScreen?CV.width:SCENE.w, toScreen?CV.height:SCENE.h);
  const sky = G.world.sky;
  gl.clearColor(sky[0],sky[1],sky[2],1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
  gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
  gl.disable(gl.BLEND);
  gl.useProgram(P_MAIN); boundProg = null;
  const U = P_MAIN.u;
  gl.uniformMatrix4fv(U.uProj, false, PROJ);
  gl.uniformMatrix4fv(U.uView, false, VIEW);
  gl.uniformMatrix4fv(U.uLightVP, false, LVP);
  gl.uniform3fv(U.uCam, EYE);
  gl.uniform3fv(U.uSunDir, SUN);
  gl.uniform3fv(U.uSunCol, G.world.sunCol);
  gl.uniform3fv(U.uSkyCol, G.world.skyAmb);
  gl.uniform3fv(U.uGrdCol, G.world.grdAmb);
  gl.uniform3fv(U.uFogCol, G.world.fog);
  gl.uniform1f(U.uFogD, G.world.fogD);
  gl.uniform1f(U.uTime, G.t*0.001);
  gl.uniform1f(U.uNight, G.world.night === undefined ? 1 : G.world.night);
  gl.uniform1f(U.uTonemap, toScreen ? 1 : 0);
  gl.uniform1f(U.uShadowOn, shadowOn);
  if(SHADOW){
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, SHADOW.tex);
    gl.uniform1i(U.uShadow, 0);
    gl.uniform1f(U.uTexel, 1/SHADOW.w);
  }
  /* sky dome first, from the inside */
  gl.cullFace(gl.FRONT); gl.depthMask(false);
  drawSky();
  gl.depthMask(true); gl.cullFace(gl.BACK);

  replay(Q_OPAQUE, P_MAIN, true);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);
  replay(Q_ALPHA, P_MAIN, true);
  gl.depthMask(true);
  gl.disable(gl.BLEND);

  /* ---- bloom + grade ---- */
  if(SCENE){
    gl.disable(gl.DEPTH_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, BLOOM_A.fb);
    gl.viewport(0,0,BLOOM_A.w,BLOOM_A.h);
    gl.useProgram(P_BRIGHT); boundProg = null;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, SCENE.tex);
    gl.uniform1i(P_BRIGHT.u.uTex, 0); gl.uniform1f(P_BRIGHT.u.uThresh, 1.05);
    fullscreen(P_BRIGHT);

    gl.useProgram(P_BLUR); boundProg = null;
    gl.uniform1i(P_BLUR.u.uTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, BLOOM_B.fb);
    gl.bindTexture(gl.TEXTURE_2D, BLOOM_A.tex);
    gl.uniform2f(P_BLUR.u.uDir, 1.4/BLOOM_A.w, 0);
    fullscreen(P_BLUR);
    gl.bindFramebuffer(gl.FRAMEBUFFER, BLOOM_A.fb);
    gl.bindTexture(gl.TEXTURE_2D, BLOOM_B.tex);
    gl.uniform2f(P_BLUR.u.uDir, 0, 1.4/BLOOM_A.h);
    fullscreen(P_BLUR);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0,0,CV.width,CV.height);
    gl.useProgram(P_POST); boundProg = null;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, SCENE.tex);
    gl.uniform1i(P_POST.u.uTex, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, BLOOM_A.tex);
    gl.uniform1i(P_POST.u.uBloom, 1);
    gl.uniform1f(P_POST.u.uBloomAmt, 0.34);
    gl.uniform1f(P_POST.u.uTime, G.t);
    gl.uniform1f(P_POST.u.uVig, 0.42);
    const hurt = p ? Math.max(0, 1 - (G.t - (p.lastHurt||-1e9))/650) * (1 - p.hp/p.maxHp) : 0;
    gl.uniform1f(P_POST.u.uHurt, Math.min(0.7, hurt));
    fullscreen(P_POST);
    gl.activeTexture(gl.TEXTURE0);
    gl.enable(gl.DEPTH_TEST);
  }
  drawOverlay();
}
const UP3 = [0,1,0];

/* Walk the line from the head out to where the camera wants to be, and stop
   at the first wall. Without this the view ends up inside a building every
   time you back into one. */
function pullCameraIn(tgt){
  const hx = tgt.x, hy = tgt.y + tgt.height*0.62, hz = tgt.z;
  let dx = EYE[0]-hx, dy = EYE[1]-hy, dz = EYE[2]-hz;
  const full = Math.hypot(dx,dy,dz);
  if(full < 0.05) return;
  const steps = 12, pad = 0.45;
  let best = 1;
  for(let i=1;i<=steps;i++){
    const t = i/steps;
    const px = hx+dx*t, py = hy+dy*t, pz = hz+dz*t;
    let blocked = false;
    for(const b of G.world.boxes){
      if(py > b.h + pad) continue;
      if(b.base && py < b.base - pad) continue;
      if(Math.abs(px-b.x) < b.w/2 + pad && Math.abs(pz-b.z) < b.d/2 + pad){ blocked = true; break; }
    }
    if(blocked){ best = Math.max(0.18, (i-1)/steps); break; }
  }
  if(best < 1){
    EYE[0] = hx + dx*best; EYE[1] = hy + dy*best; EYE[2] = hz + dz*best;
  }
}

function drawSky(){
  const it = {mesh:MESH_SPH, m:takeMat(), n:takeNrm(),
    alb:G.world.skyTop, rough:1, metal:0, emis:0, alpha:1, kind:5, accent:BLACK3};
  m4trs(EYE[0],EYE[1],EYE[2], 0,0,0, 900,900,900, it.m);
  m3normal(0,0,0,900,900,900, it.n);
  replay([it], P_MAIN, true);
}

/* ------------------------------------------------------------- 2D overlay */
