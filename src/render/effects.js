/* == render/effects.js ==
   everything that is not solid: rings, trails, tells, auras
   Part of Multiverse Vessel. Loaded in order from index.html. */

function buildEffects(){
  for(const pr of G.projs)
    draw(MESH_SPH, pr.x,pr.y,pr.z, 0,0,0, pr.r*2.4,pr.r*2.4,pr.r*2.4, pr.c,
         {kind:3, emis:0.85, alpha:0.92});
  for(const ob of G.orbits) if(ob.px!==undefined)
    draw(MESH_BOX, ob.px,ob.py,ob.pz, ob.ang, 0.4, 0.3, 0.34,0.34,0.34, ob.owner.pal.c3,
         {kind:3, emis:1.0, alpha:0.9});
  for(const b of G.beams){
    const k = 1 - b.t/b.life;
    const mx = b.x + Math.sin(b.yaw)*b.len/2, mz = b.z + Math.cos(b.yaw)*b.len/2;
    draw(MESH_TUBE, mx, b.y, mz, b.yaw, Math.PI/2, 0, b.wid*k, b.len, b.wid*k, b.c,
         {kind:3, emis:1.2, alpha:k*0.85});
    draw(MESH_TUBE, mx, b.y, mz, b.yaw, Math.PI/2, 0, b.wid*k*0.35, b.len, b.wid*k*0.35, WHITE3,
         {kind:3, emis:1.4, alpha:k});
  }
  for(const rg of G.rings){
    const k = rg.t/rg.life, R = rg.r*(0.18+0.82*k);
    draw(MESH_TUBE, rg.x, rg.y+0.06, rg.z, 0,0,0, R*2, 0.10, R*2, rg.c,
         {kind:3, emis:0.9, alpha:(1-k)*0.30});
    for(let i=0;i<10;i++){
      const a = i/10*6.283 + k*0.5;
      draw(MESH_BOX, rg.x+Math.sin(a)*R, rg.y+0.35*(1-k)+0.1, rg.z+Math.cos(a)*R,
           a, 0,0, 0.28, 0.5*(1-k)+0.1, 0.28, rg.c, {kind:3, emis:1.1, alpha:(1-k)*0.9});
    }
  }
  for(const ar of G.arcs){
    const k = 1 - ar.t/ar.life;
    for(let i=0;i<6;i++){
      const a = ar.yaw + (i-2.5)*0.20;
      const rr = ar.r*(0.7+0.3*(1-k));
      draw(MESH_BOX, ar.e.x+Math.sin(a)*rr, ar.e.y+ar.e.height*0.62, ar.e.z+Math.cos(a)*rr,
           a, 0, 0, 0.10, 0.34*k+0.05, 0.30, ar.c, {kind:3, emis:1.2, alpha:k*0.85});
    }
  }
  for(const q of G.parts){
    const k = 1-q.t/q.life;
    const r = q.r*1.15*k;
    draw(MESH_SPH_LO, q.x,q.y,q.z, 0,0,0, r,r,r, q.c, {kind:3, emis:0.30, alpha:k*0.75});
  }
  /* what is about to happen to you, and what you are holding off */
  const eye = G.player || {x:EYE[0], z:EYE[2]};
  for(const e of G.ents){
    if(e.dead) continue;
    /* trimmings are for things you can see: a wind-up or a boss always draws,
       everything else thins out and then stops with distance */
    const far = Math.hypot(e.x - eye.x, e.z - eye.z);
    if(far > 70 && !e.boss && !e.tell) continue;
    const lod = far > 30 ? 1 : 0;
    if(e.tell){
      const k = Math.min(1, 1 - (e.tell.at - now())/500);
      const R = 0.9 + k*1.5;
      for(let i=0;i<12;i++){
        const a = i/12*6.283 + now()*0.004;
        draw(MESH_BOX, e.x+Math.sin(a)*R, e.y+0.12, e.z+Math.cos(a)*R, a,0,0,
             0.14, 0.5, 0.14, TELL3, {kind:3, emis:1.0, alpha:0.35+0.55*k});
      }
    }
    if(e.breakAt){                     /* the wind-up no guard answers */
      const k = Math.min(1, 1 - (e.breakAt - now())/1000);
      const R = 1.2 + k*3.0;
      for(let i=0;i<14;i++){
        const a = i/14*6.283 - now()*0.005;
        draw(MESH_BOX, e.x+Math.sin(a)*R, e.y+0.14, e.z+Math.cos(a)*R, a,0,0,
             0.18, 0.62, 0.18, ELITE3.breaker, {kind:3, emis:1.1, alpha:0.30+0.60*k});
      }
    }
    if(e.elite){                       /* the mark of the role, always on */
      const col = ELITE3[e.elite];
      const veiled = now() < (e.veil||0);
      for(let i=0;i<(lod?1:3);i++){
        const a = now()*0.0026 + i*2.094;
        const rr = (0.70 + Math.sin(now()*0.0034+i)*0.08)*e.size;
        draw(MESH_SPH_LO, e.x+Math.sin(a)*rr, e.y+e.height*0.94, e.z+Math.cos(a)*rr,
             0,0,0, 0.11,0.11,0.11, col, {kind:3, emis:1.1, alpha:veiled?0.45:0.9});
      }
      draw(MESH_TUBE, e.x, groundAt(e.x, e.z, e.rad)+0.05, e.z, 0,0,0,
           1.7*e.size, 0.03, 1.7*e.size, col, {kind:3, emis:0.8, alpha:0.22});
    }
    if(e.blocking){
      const gy = e.yaw;
      draw(MESH_BOX, e.x+Math.sin(gy)*0.55, e.y+1.05*e.size, e.z+Math.cos(gy)*0.55,
           gy, 0, 0, 1.15*e.size, 1.15*e.size, 0.06, GUARD3,
           {kind:3, emis:0.5, alpha:0.28});
    }
    if(hasFx(e,"stun")){
      for(let i=0;i<3;i++){
        const a = now()*0.006 + i*2.09;
        draw(MESH_SPH_LO, e.x+Math.sin(a)*0.34, e.y+e.height*1.06, e.z+Math.cos(a)*0.34,
             0,0,0, 0.10,0.10,0.10, GOLD3, {kind:3, emis:1.0, alpha:0.9});
      }
    }
    if(e.fly && !lod){                 /* the air you are tearing through */
      const sp = Math.hypot(e.vx, e.vz, e.vy);
      if(sp > 14){
        const n3 = Math.min(8, 3 + Math.round((sp - 14)/4));
        const ux = e.vx/sp, uy = e.vy/sp, uz = e.vz/sp;
        for(let i=1;i<=n3;i++){
          const f = i*0.30, r3 = 0.115*e.size*(1 - i/(n3+2));
          draw(MESH_SPH_LO, e.x - ux*f, e.y + e.height*0.5 - uy*f, e.z - uz*f, 0,0,0,
               r3, r3, r3, e.pal.c3, {kind:3, emis:0.9, alpha:0.22*(1 - i/(n3+1))});
        }
      }
    }
    if(!SHADOW){                       /* no shadow map — a blob keeps feet on the floor */
      const gy = groundAt(e.x, e.z, e.rad);
      draw(MESH_SPH_LO, e.x, gy+0.04, e.z, 0,0,0, 1.2*e.size, 0.02, 1.2*e.size, BLACK3,
           {kind:3, alpha:0.34*Math.max(0.15, 1-(e.y-gy)/14), emis:0});
    }
    const surge = hasFx(e,"surge");
    if(e.boss){
      const n2 = (6 + (e.phase||0)*4) >> (lod ? 1 : 0);
      const col = (e.phase||0) >= 2 ? TELL3 : (e.phase ? GOLD3 : e.pal.c3);
      for(let i=0;i<n2;i++){
        const a = G.t*(0.0018 + (e.phase||0)*0.0008) + i*(6.283/n2);
        const rr = (0.85 + Math.sin(G.t*0.003+i)*0.10)*e.size;
        draw(MESH_SPH_LO, e.x+Math.sin(a)*rr, e.y+(0.4+(i%4)*0.45)*e.size, e.z+Math.cos(a)*rr,
             0,0,0, 0.15,0.15,0.15, col, {kind:3, emis:1.1, alpha:0.85});
      }
    }
    if((!e.pal.glow && !surge) || (lod && !surge)) continue;
    const n = surge ? 7 : 4;
    for(let i=0;i<n;i++){
      const a = G.t*0.0022 + i*(6.283/n);
      const rr = (0.62 + Math.sin(G.t*0.003+i)*0.07)*e.size;
      draw(MESH_SPH_LO, e.x+Math.sin(a)*rr, e.y+(0.5+(i%3)*0.5)*e.size, e.z+Math.cos(a)*rr,
           0,0,0, 0.13,0.13,0.13, surge?GOLD3:e.pal.c3, {kind:3, emis:1.1, alpha:surge?0.95:0.7});
    }
    if(hasFx(e,"shield")||hasFx(e,"fortify"))
      draw(MESH_SPH, e.x, e.y+0.95*e.size, e.z, 0,0,0, 1.5*e.size, 2.0*e.size, 1.5*e.size,
           GREEN3, {kind:3, alpha:0.13, emis:0.4});
  }
}
const GREEN3 = srgb("#5FE39A"), TELL3 = srgb("#FF5340");

/* ------------------------------------------------------------------ passes */
