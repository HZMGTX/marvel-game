/* == audio/sound.js ==
   every sound, synthesised at run time — no audio files
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* ==========================================================================
   SOUND
   Synthesised on the fly with the Web Audio API — no audio files, same as
   everything else here. Nothing starts until the first tap, because that is
   the rule browsers hold you to.
   ========================================================================== */
const SND = {
  ctx:null, master:null, bus:{}, ready:false, on:true, vol:0.7,
  noise:null, rainSrc:null, rainGain:null, cityGain:null, windGain:null, windFilt:null, last:{}
};

function audioInit(){
  if(SND.ctx || !SND.on) return;
  try{
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    const ctx = SND.ctx = new AC();
    const master = SND.master = ctx.createGain();
    master.gain.value = SND.vol;
    /* a gentle limiter so a big fight cannot shred anyone's ears */
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 22; comp.ratio.value = 8;
    comp.attack.value = 0.004; comp.release.value = 0.22;
    master.connect(comp); comp.connect(ctx.destination);

    /* one second of noise, reused for everything percussive */
    const len = ctx.sampleRate;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i] = Math.random()*2 - 1;
    SND.noise = buf;

    /* the city, always there under everything */
    const city = ctx.createGain(); city.gain.value = 0; city.connect(master);
    SND.cityGain = city;
    const drone = ctx.createOscillator(); drone.type = "sawtooth"; drone.frequency.value = 47;
    const dlp = ctx.createBiquadFilter(); dlp.type = "lowpass"; dlp.frequency.value = 180;
    const dg = ctx.createGain(); dg.gain.value = 0.16;
    drone.connect(dlp); dlp.connect(dg); dg.connect(city); drone.start();
    const hum = ctx.createBufferSource(); hum.buffer = buf; hum.loop = true;
    const hlp = ctx.createBiquadFilter(); hlp.type = "bandpass"; hlp.frequency.value = 340; hlp.Q.value = 0.6;
    const hg = ctx.createGain(); hg.gain.value = 0.05;
    hum.connect(hlp); hlp.connect(hg); hg.connect(city); hum.start();
    city.gain.setTargetAtTime(0.5, ctx.currentTime, 2.0);

    /* rain, faded in and out with the weather */
    const rg = ctx.createGain(); rg.gain.value = 0; rg.connect(master);
    SND.rainGain = rg;
    const rn = ctx.createBufferSource(); rn.buffer = buf; rn.loop = true;
    const rhp = ctx.createBiquadFilter(); rhp.type = "highpass"; rhp.frequency.value = 900;
    const rlp = ctx.createBiquadFilter(); rlp.type = "lowpass"; rlp.frequency.value = 6200;
    rn.connect(rhp); rhp.connect(rlp); rlp.connect(rg); rn.start();

    /* wind, which is only there when you are moving fast enough to hear it */
    const wg = ctx.createGain(); wg.gain.value = 0; wg.connect(master);
    SND.windGain = wg;
    const wn = ctx.createBufferSource(); wn.buffer = buf; wn.loop = true;
    const wbp = ctx.createBiquadFilter(); wbp.type = "bandpass";
    wbp.frequency.value = 480; wbp.Q.value = 0.75;
    SND.windFilt = wbp;
    wn.connect(wbp); wbp.connect(wg); wn.start();

    SND.ready = true;
  }catch(e){ SND.ready = false; }
}

/* one shot of shaped noise — impacts, whooshes, explosions */
function sfxNoise(o){
  if(!SND.ready || !SND.on) return;
  const ctx = SND.ctx, t = ctx.currentTime;
  const src = ctx.createBufferSource(); src.buffer = SND.noise;
  src.loop = true;
  src.playbackRate.value = o.rate || 1;
  const f = ctx.createBiquadFilter();
  f.type = o.filter || "bandpass";
  f.frequency.setValueAtTime(o.f0 || 900, t);
  if(o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(40,o.f1), t + (o.dur||0.2));
  f.Q.value = o.q || 1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002,(o.gain||0.3)*SND.vol), t + (o.atk||0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t + (o.dur||0.2));
  src.connect(f); f.connect(g); g.connect(SND.master);
  src.start(t); src.stop(t + (o.dur||0.2) + 0.05);
}
/* one shot of tone — zaps, chimes, cues */
function sfxTone(o){
  if(!SND.ready || !SND.on) return;
  const ctx = SND.ctx, t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = o.type || "sine";
  osc.frequency.setValueAtTime(o.f0 || 440, t);
  if(o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20,o.f1), t + (o.dur||0.2));
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002,(o.gain||0.2)*SND.vol), t + (o.atk||0.006));
  g.gain.exponentialRampToValueAtTime(0.0001, t + (o.dur||0.2));
  osc.connect(g); g.connect(SND.master);
  osc.start(t); osc.stop(t + (o.dur||0.2) + 0.05);
}

/* distance falloff, so a fight across the block is not in your ear */
function near(x, z, reach){
  if(!G.player) return 1;
  const d = Math.hypot(x-G.player.x, z-G.player.z);
  return Math.max(0, 1 - d/(reach||44));
}
/* stop the same sound stacking twenty deep in one frame */
function throttle(key, ms){
  const t = performance.now();
  if((SND.last[key]||0) > t) return false;
  SND.last[key] = t + ms;
  return true;
}

const SFX = {
  swing(e){
    if(!throttle("swing", 70)) return;
    sfxNoise({f0:1500, f1:420, dur:0.16, gain:0.12*near(e.x,e.z,30), q:0.8, rate:1.4});
  },
  hit(x, z, heavy, crit){
    if(!throttle("hit", 32)) return;
    const k = near(x, z);
    if(!k) return;
    sfxNoise({f0: crit?1600:900, f1:120, dur: heavy?0.30:0.16, gain:(crit?0.42:heavy?0.34:0.22)*k, q:1.2});
    sfxTone({type:"sine", f0: crit?190:150, f1:48, dur:0.20, gain:0.26*k});
  },
  block(x,z){ sfxNoise({f0:2600,f1:900,dur:0.12,gain:0.20*near(x,z),q:3}); },
  parry(x,z){
    const k = near(x,z);
    sfxTone({type:"triangle", f0:1180, f1:1760, dur:0.30, gain:0.30*k});
    sfxTone({type:"sine", f0:2360, dur:0.22, gain:0.16*k, atk:0.002});
    sfxNoise({f0:5200,f1:2200,dur:0.16,gain:0.16*k,q:2});
  },
  shot(e){
    if(!throttle("shot", 45)) return;
    const k = near(e.x,e.z,50);
    sfxTone({type:"sawtooth", f0:820, f1:180, dur:0.16, gain:0.14*k});
  },
  beam(e){
    const k = near(e.x,e.z,60);
    sfxNoise({f0:400, f1:2600, dur:0.42, gain:0.24*k, q:0.7, filter:"bandpass"});
    sfxTone({type:"sawtooth", f0:120, f1:60, dur:0.40, gain:0.18*k});
  },
  slam(x,z,R){
    const k = near(x,z,70);
    sfxNoise({f0:520, f1:60, dur:0.55, gain:0.42*k, q:0.6});
    sfxTone({type:"sine", f0:96, f1:34, dur:0.60, gain:0.34*k});
  },
  boom(x,z){
    const k = near(x,z,90);
    sfxNoise({f0:900, f1:50, dur:0.85, gain:0.50*k, q:0.5});
    sfxTone({type:"sine", f0:120, f1:28, dur:0.9, gain:0.40*k});
  },
  down(x,z){ const k=near(x,z); sfxTone({type:"triangle",f0:300,f1:70,dur:0.5,gain:0.24*k});
             sfxNoise({f0:700,f1:90,dur:0.4,gain:0.22*k}); },
  step(e){
    if(!throttle("step", 250)) return;
    sfxNoise({f0:260, f1:110, dur:0.09, gain:0.10*near(e.x,e.z,18), q:1.4});
  },
  land(e){ sfxNoise({f0:340,f1:80,dur:0.20,gain:0.24*near(e.x,e.z,30),q:1}); },
  swoop(e){ sfxNoise({f0:300,f1:2100,dur:0.36,gain:0.20*near(e.x,e.z,40),q:1.4}); },
  become(){ sfxTone({type:"triangle",f0:220,f1:880,dur:0.5,gain:0.22});
            sfxNoise({f0:600,f1:4200,dur:0.42,gain:0.16,q:0.8}); },
  surge(){ sfxTone({type:"sawtooth",f0:110,f1:660,dur:0.7,gain:0.30});
           sfxNoise({f0:300,f1:5200,dur:0.7,gain:0.24,q:0.6}); },
  reward(){ [523,659,784].forEach((f,i)=>setTimeout(()=>sfxTone({type:"triangle",f0:f,dur:0.24,gain:0.18}), i*90)); },
  ui(){ sfxTone({type:"square", f0:520, f1:660, dur:0.05, gain:0.07}); },
  tell(x,z){ sfxTone({type:"square", f0:300, f1:420, dur:0.18, gain:0.12*near(x,z,40)}); },
  ward(x,z){ sfxTone({type:"triangle", f0:180, f1:420, dur:0.42, gain:0.15*near(x,z,44)}); },
  veil(x,z){ sfxNoise({f0:1800, f1:280, dur:0.30, gain:0.13*near(x,z,40), q:2.4}); },
  call(x,z){ sfxTone({type:"sawtooth", f0:150, f1:90, dur:0.55, gain:0.20*near(x,z,50)}); }
};

/* keep the beds in step with the world */
function audioTick(){
  if(!SND.ready) return;
  const ctx = SND.ctx;
  if(SND.rainGain) SND.rainGain.gain.setTargetAtTime(G.weather==="rain" ? 0.22 : 0, ctx.currentTime, 0.8);
  if(SND.cityGain) SND.cityGain.gain.setTargetAtTime(G.paused ? 0.12 : 0.5, ctx.currentTime, 0.6);
  if(SND.windGain){
    const p = G.player;
    const sp = (p && !p.dead && !G.paused) ? Math.hypot(p.vx, p.vz, p.vy) : 0;
    const k = Math.max(0, Math.min(1, (sp - 9)/26));
    SND.windGain.gain.setTargetAtTime(k*0.30, ctx.currentTime, 0.25);
    if(SND.windFilt) SND.windFilt.frequency.setTargetAtTime(420 + k*1500, ctx.currentTime, 0.3);
  }
}
function audioToggle(){
  SND.on = !SND.on;
  if(SND.on){ audioInit(); if(SND.master) SND.master.gain.value = SND.vol; }
  else if(SND.master) SND.master.gain.value = 0;
  try{ localStorage.setItem(SAVE_KEY+"/snd", SND.on ? "1":"0"); }catch(e){}
  return SND.on;
}
try{ if(localStorage.getItem(SAVE_KEY+"/snd") === "0") SND.on = false; }catch(e){}
