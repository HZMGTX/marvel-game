/* == body/gear.js ==
   hammers, shields, capes, wings — drawn onto the body
   Part of Multiverse Vessel. Loaded in order from index.html. */

function gearShape(g){
  for(const [re, kind] of GEAR_SHAPE) if(re.test(g.name)) return kind;
  if(g.kind === "armor") return "armor";
  if(g.kind === "relic") return "orb";
  if(g.kind === "substance") return "aura";
  return "hands";
}
function drawGear(e, s, wrist, elbow, chest, head, pitch, yb, emis){
  const bank = e.bank || 0;
  const g = e.gear, pal = e.pal;
  const shape = gearShape(g);
  const echo = e.pot < 1;                      /* a borrowed thing is never the real thing */
  const MET = {rough:0.16, metal:0.95, emis: emis + (echo?0.05:0.16)};
  const GLOW = {kind:3, emis:1.0, alpha: echo?0.45:0.85};
  const col = echo ? pal.c2 : GOLD3;
  if(!wrist) wrist = [e.x, e.y+1.1*s, e.z];
  const fwdx = Math.sin(e.yaw), fwdz = Math.cos(e.yaw);

  if(shape === "hammer"){
    const hx = wrist[0], hy = wrist[1], hz = wrist[2];
    bone(hx, hy, hz, hx + fwdx*0.1, hy - 0.42*s, hz + fwdz*0.1, 0.035*s, pal.dark, {rough:0.8}, MESH_TUBE);
    draw(MESH_BOX, hx, hy + 0.16*s, hz, e.yaw, 0, 0, 0.30*s, 0.26*s, 0.44*s, col, MET);
  }
  else if(shape === "sword"){
    bone(wrist[0], wrist[1], wrist[2],
         wrist[0] + fwdx*0.12, wrist[1] + 0.92*s, wrist[2] + fwdz*0.12,
         0.030*s, col, MET, MESH_TAPER2);
    draw(MESH_BOX, wrist[0], wrist[1] + 0.10*s, wrist[2], e.yaw,0,0, 0.28*s, 0.05*s, 0.06*s, pal.dark, MET);
  }
  else if(shape === "gun"){
    draw(MESH_BOX, wrist[0] + fwdx*0.22*s, wrist[1], wrist[2] + fwdz*0.22*s, e.yaw,0,0,
         0.10*s, 0.14*s, 0.52*s, pal.dark, {rough:0.3, metal:0.8});
    draw(MESH_SPH_LO, wrist[0] + fwdx*0.50*s, wrist[1], wrist[2] + fwdz*0.50*s, 0,0,0,
         0.10*s,0.10*s,0.10*s, col, GLOW);
  }
  else if(shape === "shield"){
    draw(MESH_TUBE, wrist[0] + fwdx*0.10*s, wrist[1] + 0.10*s, wrist[2] + fwdz*0.10*s,
         e.yaw, Math.PI/2, 0, 0.66*s, 0.07*s, 0.66*s, col, MET);
  }
  else if(shape === "staff"){
    bone(wrist[0], wrist[1] - 0.55*s, wrist[2], wrist[0], wrist[1] + 1.05*s, wrist[2],
         0.028*s, pal.dark, {rough:0.6, metal:0.5}, MESH_TUBE);
    draw(MESH_SPH_LO, wrist[0], wrist[1] + 1.12*s, wrist[2], 0,0,0, 0.14*s,0.18*s,0.14*s, col, GLOW);
  }
  else if(shape === "board"){
    draw(MESH_TUBE, e.x, e.y + 0.06, e.z, e.yaw, 0, 0, 0.9*s, 0.10*s, 2.1*s, col,
         {rough:0.05, metal:1.0, emis: echo?0.1:0.3});
  }
  else if(shape === "cloak"){
    const flap = 0.20 + (e.moving?0.28:0) + (e.fly?0.5:0);
    for(let i=0;i<3;i++){
      const yTop = 1.40 - i*0.30, w = 0.34 - i*0.02;
      const a = L2W(e, 0, (yTop+yb)*s, (-0.14 - i*0.10)*s, pitch, [0,0,0]);
      draw(MESH_BOX, a[0], a[1] - 0.16*s, a[2], e.yaw, pitch + 0.32 + i*0.16*flap, bank,
           w*2*s, 0.38*s, 0.024*s, col, {rough:0.72, metal:0.1, emis:echo?0:0.06});
    }
  }
  else if(shape === "hands"){
    draw(MESH_SPH_LO, wrist[0], wrist[1], wrist[2], 0,0,0, 0.16*s,0.16*s,0.16*s, col, MET);
    draw(MESH_SPH_LO, wrist[0], wrist[1], wrist[2], 0,0,0, 0.26*s,0.26*s,0.26*s, col, GLOW);
  }
  else if(shape === "head"){
    draw(MESH_SPH, head[0], head[1] + 0.06*s, head[2], e.yaw, pitch, bank,
         0.24*s, 0.20*s, 0.24*s, col, MET);
  }
  else if(shape === "wings"){
    for(const sd of [-1,1]){
      const a = L2W(e, sd*0.16*s, (1.40+yb)*s, -0.10*s, pitch, [0,0,0]);
      const spread = e.fly ? 1.0 : 0.4;
      const bq = L2W(e, sd*(0.34+0.8*spread)*s, (1.40+yb+0.26*spread)*s, (-0.32-0.3*spread)*s, pitch, [0,0,0]);
      bone(a[0],a[1],a[2], bq[0],bq[1],bq[2], 0.085*s, col, MET, MESH_TAPER2);
    }
  }
  else if(shape === "armor"){
    draw(MESH_SPH_LO, chest[0], chest[1] + 0.02*s, chest[2] + Math.sin(e.yaw)*0, 0,0,0,
         0.17*s, 0.17*s, 0.17*s, col, GLOW);       /* the light in the chest */
    for(const sd of [-1,1]){
      const sh = L2W(e, sd*0.21*s, (1.40+yb)*s, 0, pitch, [0,0,0]);
      draw(MESH_SPH_LO, sh[0], sh[1]+0.04*s, sh[2], 0,0,0, 0.24*s,0.16*s,0.24*s, col, MET);
    }
  }
  else if(shape === "orb"){
    const a = G.t*0.003;
    draw(MESH_SPH_LO, e.x + Math.sin(a)*0.55*s, e.y + 1.55*s, e.z + Math.cos(a)*0.55*s,
         0,0,0, 0.15*s,0.15*s,0.15*s, col, GLOW);
  }
  else if(shape === "sheen" || shape === "aura"){
    draw(MESH_SPH, e.x, e.y + 0.90*s, e.z, 0,0,0, 0.48*s, 0.95*s, 0.42*s, col,
         {kind:3, alpha: echo?0.08:0.16, emis:0.5});
  }
}
