/* == world/weather.js ==
   the day turning over, and rain
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* ------------------------------------------------------------- sky and rain */
const DAY_LEN = 480000;                    /* eight minutes for a full turn */
function applyDayNight(){
  const w = G.world; if(!w || !w.base) return;
  const t = (G.timeOfDay = ((G.timeOfDay||0.28) + (G.paused?0:0)) );
  const ang = t * 6.28318;
  SUN[0] = Math.cos(ang)*0.55; SUN[1] = Math.sin(ang); SUN[2] = 0.34;
  const l = Math.hypot(SUN[0],SUN[1],SUN[2]) || 1;
  SUN[0]/=l; SUN[1]/=l; SUN[2]/=l;
  const up = Math.max(0, SUN[1]);                       /* how high the sun is */
  const night = 1 - Math.min(1, up*3.2);
  const warm = Math.max(0, 1 - Math.abs(up-0.13)*5);    /* low sun, warm light */
  const b = w.base;
  for(let i=0;i<3;i++){
    const dayC = b.sun[i] * (0.25 + up*0.95);
    const warmTint = [1.28, 0.86, 0.55][i];
    const nightC = [0.16, 0.20, 0.38][i];
    w.sunCol[i] = dayC*(1-warm) + b.sun[i]*warmTint*0.9*warm;
    w.sunCol[i] = w.sunCol[i]*(1-night) + nightC*night;
    w.skyAmb[i] = b.skyAmb[i]*(0.30 + up*0.85)*(1-night) + [0.06,0.08,0.16][i]*night;
    w.grdAmb[i] = b.grdAmb[i]*(0.35 + up*0.75)*(1-night) + [0.03,0.03,0.05][i]*night;
    w.sky[i]    = b.sky[i]*(0.22 + up*1.0)*(1-night)   + [0.02,0.03,0.08][i]*night;
    w.skyTop[i] = b.skyTop[i]*(0.22 + up*1.0)*(1-night)+ [0.01,0.01,0.04][i]*night;
    w.fog[i]    = b.fog[i]*(0.28 + up*0.9)*(1-night)   + [0.03,0.04,0.09][i]*night;
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
