/* == world/weather.js ==
   the day turning over, and rain
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* ------------------------------------------------------------- sky and rain */
const DAY_LEN = 480000;                    /* eight minutes for a full turn */
/* A sector's authored palette is its night. Daylight is that same palette
   lifted to a daylight level — the hue is kept, the level is not — so Hell's
   Kitchen at noon is still Hell's Kitchen, and still bright. */
const _lift = [0,0,0];
function liftHue(c, level, out){
  const m = (c[0] + c[1] + c[2])/3 || 1e-4, k = level/m;
  out[0] = c[0]*k; out[1] = c[1]*k; out[2] = c[2]*k;
  return out;
}
const NIGHT_SKY = [0.020,0.030,0.080], NIGHT_TOP = [0.010,0.012,0.042],
      NIGHT_FOG = [0.030,0.040,0.090], NIGHT_AMB = [0.160,0.190,0.320],
      NIGHT_GRD = [0.090,0.080,0.090], NIGHT_SUN = [0.400,0.460,0.700];
/* A city is never actually dark: sodium and shopfronts come up from the street.
   This is the floor under everything, so a shadow at dusk still reads. */
const CITY_GLOW = [0.075,0.062,0.050];

function applyDayNight(){
  const w = G.world; if(!w || !w.base) return;
  const t = (G.timeOfDay = ((G.timeOfDay||0.28) + (G.paused?0:0)) );
  const ang = t * 6.28318;
  const sy = Math.sin(ang);                             /* where the sun really is */
  const up = Math.max(0, sy);                           /* and how high, 0 to 1 */
  /* the light never comes from straight overhead: a noon sun with no direction
     flattens the whole city, so the highest it ever gets is about sixty degrees
     and it keeps travelling sideways all day */
  const dn = Math.max(0, -sy);                          /* how deep the night is */
  const cx = Math.cos(ang)*0.78;
  if(sy > 0){ SUN[0] =  cx; SUN[1] = 0.30 + up*0.38; SUN[2] =  0.50; }
  else      { SUN[0] = -cx; SUN[1] = 0.26 + dn*0.32; SUN[2] = -0.50; }   /* the moon */
  const l = Math.hypot(SUN[0],SUN[1],SUN[2]) || 1;
  SUN[0]/=l; SUN[1]/=l; SUN[2]/=l;
  const night = 1 - Math.min(1, up*3.2);
  const warm = Math.max(0, 1 - Math.abs(up-0.13)*5);    /* low sun, warm light */
  const day = Math.min(1, Math.max(0, (up - 0.10)/0.55));   /* full daylight by mid-morning */
  const dim = 1 - Math.min(1, up*1.8);                      /* how much the city lights itself */
  const b = w.base;
  w.night = night;
  /* a clear day sees a long way; the murk belongs to dusk and to rain */
  w.fogD = w.base.fogD * (1 - 0.55*day) * (G.weather === "rain" ? 1.5 : 1);
  const skyD = liftHue(b.sky,    0.44, [0,0,0]);
  const topD = liftHue(b.skyTop, 0.24, [0,0,0]);
  const fogD = liftHue(b.fog,    0.20, [0,0,0]);
  const ambD = liftHue(b.skyAmb, 0.30, [0,0,0]);
  const grdD = liftHue(b.grdAmb, 0.16, [0,0,0]);
  for(let i=0;i<3;i++){
    const dayC = b.sun[i] * (0.24 + up*1.00);
    const warmTint = [1.28, 0.86, 0.55][i];
    w.sunCol[i] = dayC*(1-warm) + b.sun[i]*warmTint*0.9*warm;
    w.sunCol[i] = w.sunCol[i]*(1-night) + NIGHT_SUN[i]*night;
    const mix = (dusk, noon, nite) => (dusk*(1-day) + noon*day)*(1-night) + nite*night;
    /* the sky goes out on the `night` curve, but the city starts lighting itself
       long before that — otherwise late afternoon is darker than midnight */
    const amb = (dusk, noon, nite) => (dusk*(1-day) + noon*day)*(1-dim) + nite*dim;
    w.skyAmb[i] = amb(b.skyAmb[i]*(0.30 + up*0.55), ambD[i], NIGHT_AMB[i]);
    w.grdAmb[i] = amb(b.grdAmb[i]*(0.35 + up*0.45), grdD[i], NIGHT_GRD[i]) + CITY_GLOW[i]*dim;
    w.sky[i]    = mix(b.sky[i]*(0.22 + up*1.0),     skyD[i], NIGHT_SKY[i]);
    w.skyTop[i] = mix(b.skyTop[i]*(0.22 + up*1.0),  topD[i], NIGHT_TOP[i]);
    w.fog[i]    = mix(b.fog[i]*(0.28 + up*0.9),     fogD[i], NIGHT_FOG[i]);
  }
  if(G.weather === "rain"){
    for(let i=0;i<3;i++){ w.sunCol[i] *= 0.55; w.skyAmb[i] *= 0.85; w.fog[i] *= 1.15; }
  }
}
function stepSky(dt){
  if(G.paused) return;
  G.timeOfDay = ((G.timeOfDay||0.28) + dt/DAY_LEN) % 1;
}
/* setting the weather always rebuilds what it needs, so it can be set from
   anywhere — a quality change, the menu, or the roll on entering a sector */
function setWeather(kind){
  G.weather = kind;
  G.rain = [];
  if(kind === "rain"){
    const n = quality === "low" ? 90 : quality === "medium" ? 180 : 300;
    const p = G.player || {x:0,y:0,z:0};
    for(let i=0;i<n;i++) G.rain.push({
      x: p.x + (Math.random()-0.5)*44,
      z: p.z + (Math.random()-0.5)*44,
      y: p.y + Math.random()*24,
      seed: Math.random()
    });
  }
}
function rollWeather(){ setWeather(Math.random() < 0.28 ? "rain" : "clear"); }
function updateRain(dt){
  if(G.weather !== "rain" || !G.rain.length) return;
  const p = G.player || {x:0,y:0,z:0};
  const dts = dt/1000;
  for(const d of G.rain){
    d.y -= 26*dts;
    if(d.y < p.y - 2 || Math.abs(d.x - p.x) > 26 || Math.abs(d.z - p.z) > 26){
      d.x = p.x + (Math.random()-0.5)*44;
      d.z = p.z + (Math.random()-0.5)*44;
      d.y = p.y + 14 + Math.random()*10;
    }
  }
}

/* ------------------------------------------------------------------- draw */
function buildCity(){
  for(const c of G.cars){
    const dx = c.x - EYE[0], dz = c.z - EYE[2];
    if(Math.hypot(dx,dz) > 130) continue;
    const yaw = c.axis ? (c.back ? Math.PI : 0) : (c.back ? -Math.PI/2 : Math.PI/2);
    if(c.dead){
      const k = Math.min(1, c.t/900);
      draw(MESH_BOX, c.x, 0.6, c.z, yaw + k*0.3, k*0.2, k*0.25, 2.0, 1.0, c.len,
           [0.10,0.09,0.09], {rough:0.95, metal:0.2});
      continue;
    }
    draw(MESH_BOX, c.x, 0.75, c.z, yaw,0,0, 2.0, 0.85, c.len, c.col, {rough:0.22, metal:0.75});
    draw(MESH_BOX, c.x, 1.42, c.z, yaw,0,0, 1.75, 0.62, c.len*0.52, [0.05,0.06,0.09],
         {rough:0.08, metal:0.4});
    const f = c.back ? -1 : 1;
    draw(MESH_BOX, c.x + (c.axis?0:f*c.len*0.48), 0.72, c.z + (c.axis?f*c.len*0.48:0), yaw,0,0,
         1.5, 0.26, 0.14, [1,0.92,0.7], {kind:3, emis:0.9, alpha:0.95});
    for(const side of [-1,1]){
      draw(MESH_TUBE, c.x + (c.axis? side*0.95 : 0), 0.34, c.z + (c.axis? 0 : side*0.95),
           c.axis?0:Math.PI/2, Math.PI/2, 0, 0.66,2.0,0.66, [0.05,0.05,0.06], {rough:0.9});
    }
  }
  if(G.weather === "rain") for(const d of G.rain)
    draw(MESH_BOX, d.x, d.y, d.z, 0,0,0, 0.035, 0.85, 0.035, [0.62,0.72,0.86],
         {kind:3, alpha:0.34, emis:0.1});
}
