/* == body/pose.js ==
   the pose: walking, flying, diving, landing, swinging
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* Past about fifty metres a full skeleton is thirty draw calls spent on four
   pixels. This is the same person in five boxes — right colours, right size,
   still walking — and a street full of people costs a fraction of what it did. */
function drawCharFar(e){
  const pal = e.pal, s = e.size;
  const hurt = (G.t - e.hitT) < 140;
  const c1 = hurt ? WHITE3 : pal.c1, c2 = hurt ? WHITE3 : pal.c2;
  const head = hurt ? WHITE3 : (pal.masked || pal.machine ? pal.c1 : pal.skin);
  const M = {rough:pal.rough, metal:pal.metal, emis:pal.glow ? 0.10 : 0};
  e.animT += Math.hypot(e.vx, e.vz)*0.012 + 0.0006;
  const sw = e.moving && !e.fly ? Math.sin(e.animT*2.2)*0.13*s : 0;
  const lean = e.fly ? 0.9 : 0;
  const c = Math.cos(e.yaw), sn = Math.sin(e.yaw);
  const y = e.y;
  draw(MESH_BOX, e.x, y + 1.24*s, e.z, e.yaw, lean, e.bank||0,
       0.40*s*pal.bulk, 0.62*s, 0.235*s*pal.bulk, c1, M);
  draw(MESH_SPH_LO, e.x + sn*lean*0.32*s, y + 1.68*s - lean*0.10*s, e.z + c*lean*0.32*s,
       0,0,0, 0.086*s, 0.113*s, 0.099*s, head, M);
  for(const side of [-1, 1]){
    const ox = side*0.11*s*pal.bulk;
    draw(MESH_BOX, e.x + ox*c, y + 0.46*s + (e.fly ? 0.30*s : 0), e.z - ox*sn,
         e.yaw, lean*0.6, 0, 0.17*s, 0.92*s, 0.19*s, c2, M);
    draw(MESH_BOX, e.x + (ox*2.4)*c + sn*sw*side, y + 1.24*s, e.z - (ox*2.4)*sn + c*sw*side,
         e.yaw, lean, 0, 0.13*s, 0.56*s, 0.15*s, c1, M);
  }
}

function drawChar(e, camDist){
  const s = e.size * 1.0;
  let pal = e.pal;
  const t = G.t;
  const hurt = (t - e.hitT) < 140;
  const far = camDist > 30;
  const speed = Math.hypot(e.vx, e.vz);
  e.animT += speed * 0.012 + 0.0006;
  const ph = e.animT * 2.2;

  const worn = (e.gear && e.pot > 0) ? e.gear : null;
  const plated = worn && (worn.kind === "armor");
  const CLOTH = plated ? {rough:0.24, metal:0.88} : {rough:pal.rough, metal:pal.metal};
  const TRIM  = {rough:pal.armoured?0.24:0.55, metal:pal.armoured?0.9:0.25};
  const SKINM = {rough:0.66, metal:0.02};
  const surge = hasFx(e,"surge");
  const emis  = surge ? 0.5 : (pal.glow ? 0.10 : 0);
  const c1 = hurt ? WHITE3 : pal.c1;
  const c2 = hurt ? WHITE3 : pal.c2;
  const c3 = hurt ? WHITE3 : pal.c3;
  const headCol = hurt ? WHITE3 : (pal.masked||pal.machine ? pal.c1 : pal.skin);
  const veil = (G.t < (e.veil||0)) ? 0.26 : 1;
  const M1 = {rough:CLOTH.rough, metal:CLOTH.metal, emis, alpha:veil};
  const M2 = {rough:TRIM.rough,  metal:TRIM.metal,  emis, alpha:veil};
  const MH = {rough:pal.masked?CLOTH.rough:SKINM.rough, metal:pal.masked?CLOTH.metal:0.02, emis, alpha:veil};

  /* pose ------------------------------------------------------------- */
  const flying = e.fly;
  const bank = e.bank || 0;
  const dive = e.dive || 0, lift = e.lift || 0;
  /* a landing sits in the body for a moment afterwards */
  const landK = flying ? 0 : Math.min(1, Math.max(0, 1 - (t - (e.landT||-1e9))/420)) * (e.landK||0);
  const bodyPitch = flying ? 1.10 + dive*0.44 - lift*0.30
                           : (e.moving ? 0.10 : 0.02) + landK*0.46;
  const bob = (flying ? Math.sin(t*0.0022)*0.05
                      : (e.moving ? Math.abs(Math.sin(ph))*0.035 : Math.sin(t*0.0013)*0.012))
              - landK*0.13;
  const atk = Math.max(0, 1 - (t - e.swingT)/260);
  const lean = Math.sin(ph)*0.05;

  const walk = e.moving && !flying ? 1 : 0;
  let legLA = flying ? -0.28 + dive*0.22 : walk*Math.sin(ph)*0.62;
  let legRA = flying ? -0.16 + dive*0.16 : walk*-Math.sin(ph)*0.62;
  let kneeL = flying ? 0.30*(1-dive*0.7) : Math.max(0, -Math.sin(ph+0.7))*0.95*walk + 0.06;
  let kneeR = flying ? 0.16*(1-dive*0.7) : Math.max(0, Math.sin(ph+0.7))*0.95*walk + 0.06;
  let armLA = flying ? -2.55 - dive*0.30 : (walk*-Math.sin(ph)*0.52 + 0.08);
  let armRA = flying ? -2.35 - dive*0.44 + lift*0.35 : (walk*Math.sin(ph)*0.52 + 0.08);
  let elbL = flying ? 0.10 : 0.24 + walk*Math.abs(Math.sin(ph))*0.24;
  let elbR = flying ? 0.10 : 0.24 + walk*Math.abs(Math.sin(ph))*0.24;
  if(atk > 0){                                   /* a punch you can read */
    const k = Math.sin(atk*Math.PI);
    armRA = -1.55*k - 0.2; elbR = 0.9*(1-k) + 0.08;
    armLA = 0.55*k + 0.1;  elbL = 0.5 + 0.4*k;
  }
  if(landK > 0 && atk <= 0){                     /* one knee, one fist on the road */
    const k = landK, i = 1 - k;
    legLA = 0.78*k + legLA*i; kneeL = 1.34*k + kneeL*i;
    legRA = 0.30*k + legRA*i; kneeR = 0.78*k + kneeR*i;
    armRA = 0.62*k + armRA*i; elbR  = 0.10*k + elbR*i;
    armLA = -0.78*k + armLA*i; elbL = 0.58*k + elbL*i;
  }

  /* the frame ----------------------------------------------------------- */
  const LG = pal.legs || 1, TO = pal.torso || 1, SH = pal.shoulder || 1;
  const hipY = 0.92*LG, chestY = hipY + 0.48*TO;
  const H = {                                     /* joint heights, size 1 */
    ankle:0.09*LG, knee:0.50*LG, hip:hipY, waist:hipY + 0.13*TO,
    chest:chestY, neck:chestY + 0.06, head:chestY + 0.255*(pal.headSz||1)
  };
  if(plated) pal = Object.assign({}, pal, {bulk: pal.bulk*1.10});
  const hipX = 0.088*s*pal.bulk, shX = 0.215*s*pal.bulk*SH;
  const yb = bob*s;
  /* A person is wider than they are deep. Every limb here used to be a
     cylinder of one radius, which is why everybody read as a snowman: a
     chest 31 cm across and 31 cm front-to-back is a barrel, not a ribcage.
     DEEP is how much of the width a body actually carries in profile. */
  const DEEP = 0.66;

  const pelvis = L2W(e, 0, (H.hip+yb)*s, 0, bodyPitch, [0,0,0]);
  const chest  = L2W(e, 0, (H.chest+yb)*s, 0, bodyPitch, [0,0,0]);
  const neck   = L2W(e, 0, (H.neck+yb)*s, 0, bodyPitch, [0,0,0]);
  const headP  = L2W(e, 0, (H.head+yb)*s, 0, bodyPitch, [0,0,0]);

  /* torso: waist to chest, flaring outward, and flat front to back */
  const torsoR = 0.150*s*pal.bulk;
  bone(pelvis[0],pelvis[1],pelvis[2], chest[0],chest[1],chest[2],
       torsoR, c1, {rough:M1.rough, metal:M1.metal, emis}, MESH_FLARE, torsoR*DEEP);
  /* the ribcage, and the pelvis under it — neither of them a ball */
  lump(chest[0],chest[1],chest[2], 0.375*s*pal.bulk*SH, 0.30*s*pal.bulk, 0.235*s*pal.bulk,
       e.yaw, bodyPitch, bank, c1, M1);
  lump(pelvis[0],pelvis[1],pelvis[2], 0.295*s*pal.bulk, 0.215*s*pal.bulk, 0.215*s*pal.bulk,
       e.yaw, bodyPitch, bank, c2, M1);

  if(!far){
    /* belt and chest mark */
    const belt = L2W(e, 0, (H.waist+yb)*s, 0, bodyPitch, [0,0,0]);
    draw(MESH_TUBE, belt[0],belt[1],belt[2], e.yaw, bodyPitch, bank,
         0.315*s*pal.bulk, 0.052*s, 0.232*s*pal.bulk, c3, M2);
    const em = L2W(e, 0, (1.24+yb)*s, 0.112*s, bodyPitch, [0,0,0]);
    draw(MESH_BOX, em[0],em[1],em[2], e.yaw, bodyPitch, bank,
         0.145*s, 0.118*s, 0.026*s, c3, {rough:0.3, metal:0.5, emis:emis+(pal.glow?0.35:0.12)});
  }

  /* legs */
  for(const side of [-1, 1]){
    const ang = side<0 ? legLA : legRA, bend = side<0 ? kneeL : kneeR;
    const hx = side*hipX;
    const hipP = L2W(e, hx, (H.hip+yb)*s, 0, bodyPitch, [0,0,0]);
    const thighLen = (H.hip-H.knee)*s, shinLen = (H.knee-H.ankle)*s;
    const kx = hx, ky = (H.hip+yb)*s - Math.cos(ang)*thighLen, kz = Math.sin(ang)*thighLen;
    const kneeP = L2W(e, kx, ky, kz, bodyPitch, [0,0,0]);
    const a2 = ang - bend;
    const ax2 = kx, ay2 = ky - Math.cos(a2)*shinLen, az2 = kz + Math.sin(a2)*shinLen;
    const ankP = L2W(e, ax2, ay2, az2, bodyPitch, [0,0,0]);
    const LB = s*pal.bulk*(pal.limb||1);
    bone(hipP[0],hipP[1],hipP[2], kneeP[0],kneeP[1],kneeP[2], 0.079*LB, c1, M1, null, 0.073*LB);
    if(!far) lump(kneeP[0],kneeP[1],kneeP[2], 0.118*LB, 0.115*LB, 0.112*LB, e.yaw,0,0, c1, M1);
    bone(kneeP[0],kneeP[1],kneeP[2], ankP[0],ankP[1],ankP[2], 0.056*LB, c2, M2, null, 0.053*LB);
    if(!far){
      const fz = az2 + Math.sin(a2)*0.10*s + 0.055*s;
      const foot = L2W(e, ax2, ay2 - 0.028*s, fz, bodyPitch, [0,0,0]);
      draw(MESH_BOX, foot[0],foot[1],foot[2], e.yaw, 0,0, 0.098*s, 0.062*s, 0.255*s, c2, M2);
      /* an ankle, so the shin does not end in mid-air above the shoe */
      const ank = L2W(e, ax2, ay2, az2, bodyPitch, [0,0,0]);
      lump(ank[0],ank[1],ank[2], 0.078*LB, 0.075*LB, 0.078*LB, e.yaw,0,0, c2, M2);
    }
  }

  /* arms */
  let rWrist = null, rElbow = null;
  for(const side of [-1, 1]){
    const ang = side<0 ? armLA : armRA, bend = side<0 ? elbL : elbR;
    const sx = side*shX;
    const shP = L2W(e, sx, (H.chest+yb)*s, 0, bodyPitch, [0,0,0]);
    const AR = pal.arms || 1;
    const upLen = 0.30*s*AR, foreLen = 0.28*s*AR;
    const ex = sx + side*0.02*s, ey = (H.chest+yb)*s - Math.cos(ang)*upLen, ez = Math.sin(ang)*upLen;
    const elP = L2W(e, ex, ey, ez, bodyPitch, [0,0,0]);
    const a2 = ang + bend;
    const wx = ex, wy = ey - Math.cos(a2)*foreLen, wz = ez + Math.sin(a2)*foreLen;
    const wrP = L2W(e, wx, wy, wz, bodyPitch, [0,0,0]);
    const AB = s*pal.bulk*(pal.limb||1);
    /* a deltoid caps the shoulder — it is not a bearing */
    if(!far) lump(shP[0],shP[1],shP[2], 0.135*s*pal.bulk*SH, 0.125*s*pal.bulk, 0.120*s*pal.bulk,
                  e.yaw, bodyPitch, bank, c1, M1);
    bone(shP[0],shP[1],shP[2], elP[0],elP[1],elP[2], 0.052*AB, c1, M1, null, 0.049*AB);
    if(!far) lump(elP[0],elP[1],elP[2], 0.085*AB, 0.082*AB, 0.082*AB, e.yaw,0,0, c1, M1);
    bone(elP[0],elP[1],elP[2], wrP[0],wrP[1],wrP[2], 0.044*AB, c2, M2, null, 0.041*AB);
    if(!far){
      /* a hand, rather than a ball bearing where a hand should be */
      const hd = [wrP[0] + (wrP[0]-elP[0])*0.30, wrP[1] + (wrP[1]-elP[1])*0.30,
                  wrP[2] + (wrP[2]-elP[2])*0.30];
      lump(hd[0],hd[1],hd[2], 0.075*AB, 0.098*AB, 0.052*AB, e.yaw, bodyPitch, bank, c2, M2);
    }
    if(side > 0){ rWrist = wrP.slice(); rElbow = elP.slice(); }
  }
  /* what they are carrying, and only if it answers to them */
  if(e.gear && e.pot > 0 && !far) drawGear(e, s, rWrist, rElbow, chest, headP, bodyPitch, yb, emis);

  /* neck and head */
  bone(chest[0],chest[1],chest[2], neck[0],neck[1],neck[2], 0.060*s, headCol, MH, MESH_TUBE, 0.054*s);
  const HS = pal.headSz || 1;
  /* the head was 20 cm across. A head is 15. Six hundred people were reading
     as action figures on that number alone. */
  lump(headP[0],headP[1],headP[2], 0.157*s*HS, 0.225*s*HS, 0.190*s*HS,
       e.yaw, bodyPitch, bank, headCol, MH);
  if(!far){                                     /* jaw, so a head is not an egg */
    const jw = L2W(e, 0, (H.head+yb-0.050*HS)*s, 0.024*s, bodyPitch, [0,0,0]);
    lump(jw[0],jw[1],jw[2], 0.138*s*HS, 0.112*s*HS, 0.163*s*HS,
         e.yaw, bodyPitch, bank, headCol, MH);
  }
  if(!far){
    /* a visor, or eyes, or a hood */
    const eye = L2W(e, 0, (H.head+yb+0.008)*s, 0.072*s, bodyPitch, [0,0,0]);
    if(pal.masked || pal.machine)
      draw(MESH_BOX, eye[0],eye[1],eye[2], e.yaw, bodyPitch, bank, 0.126*s, 0.032*s, 0.036*s, c3,
           {rough:0.15, metal:0.6, emis: emis + (pal.machine||pal.glow ? 0.7 : 0.25)});
    else {
      for(const sd of [-1,1]){
        const ep = L2W(e, sd*0.038*s, (H.head+yb+0.010)*s, 0.070*s, bodyPitch, [0,0,0]);
        lump(ep[0],ep[1],ep[2], 0.026*s,0.022*s,0.016*s, 0,0,0, EYE3, {rough:0.1, metal:0});
      }
      const hp = L2W(e, 0, (H.head+yb+0.042)*s, -0.009*s, bodyPitch, [0,0,0]);
      lump(hp[0],hp[1],hp[2], 0.172*s, 0.150*s, 0.196*s, e.yaw, bodyPitch, bank, pal.hair, {rough:0.85, metal:0});
    }
    if(pal.horns) for(const sd of [-1,1]){
      const hb = L2W(e, sd*0.068*s, (H.head+yb+0.092)*s, -0.018*s, bodyPitch, [0,0,0]);
      const ht = L2W(e, sd*0.118*s, (H.head+yb+0.225)*s, -0.072*s, bodyPitch, [0,0,0]);
      bone(hb[0],hb[1],hb[2], ht[0],ht[1],ht[2], 0.030*s, c3, {rough:0.4, metal:0.5}, MESH_TAPER2);
    }
  }

  /* cape */
  if(pal.cape && !far){
    const flap = 0.16 + (e.moving?0.28:0) + (flying?0.50:0) + Math.sin(t*0.004)*0.06;
    for(let i=0;i<3;i++){
      const w = 0.20 - i*0.035;                  /* narrower, and tapering to a point */
      const yTop = H.chest - i*0.28;
      const zOff = -0.145 - i*0.09*flap*2.2;
      const a = L2W(e, 0, (yTop+yb)*s, zOff*s, bodyPitch, [0,0,0]);
      draw(MESH_BOX, a[0], a[1] - 0.15*s, a[2],
           e.yaw, bodyPitch + 0.26 + i*0.15*flap, bank,
           w*2*s*pal.bulk, 0.34*s, 0.020*s, pal.capeCol, {rough:0.88, metal:0.02, emis});
    }
  }
  /* wings, for the ones that have them */
  if(pal.winged && !far){
    const spread = flying ? 1.0 : 0.35;
    for(const sd of [-1,1]){
      const a = L2W(e, sd*0.16*s, (H.chest+yb)*s, -0.10*s, bodyPitch, [0,0,0]);
      const bq = L2W(e, sd*(0.35+0.75*spread)*s, (H.chest+yb+0.30*spread)*s, (-0.35-0.30*spread)*s, bodyPitch, [0,0,0]);
      bone(a[0],a[1],a[2], bq[0],bq[1],bq[2], 0.09*s, pal.light, {rough:0.7, metal:0.1, emis}, MESH_TAPER2);
    }
  }
}
const WHITE3 = [1,1,1], EYE3 = [0.04,0.04,0.06];

/* --------------------------------------------------------------- the gear */
/* A suit you are entitled to should be visible on you. What gets drawn comes
   from the piece's kind and its name, so Mjolnir is a hammer and the Cloak of
   Levitation is a cloak. */
const GEAR_SHAPE = [
  [/mjolnir|stormbreaker|jarnbjorn|universal weapon|crowbar/i, "hammer"],
  [/sword|blade|glaive|soulsword|godslayer|ebony|twilight|dragonfang|katana|knife|hofund|\bsai\b/i, "sword"],
  [/spear|gungnir|trident|staff|wand|sceptre|crowbar|\bclubs?\b|baton|\bstick\b/i, "staff"],
  [/\bgun\b|rifle|arsenal|element gun|blaster|repulsor/i, "gun"],
  [/shield/i, "shield"],
  [/board/i, "board"],
  [/cloak|cape/i, "cloak"],
  [/gauntlet|bands|rings|claws|bite|coils|actuator/i, "hands"],
  [/helmet|visor|glasses|cerebro|interface/i, "head"],
  [/glider|wings|wingsuit|jet/i, "wings"],
  [/symbiote/i, "sheen"]
];
