/* == world/blocks.js ==
   the city plan: blocks, towers, rooftops, collision
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* ------------------------------------------------------------------ world */
/* Colours here are sRGB; buildWorld converts them to linear for the shader. */
const THEMES = {
  city  :{ground:"#3A3744", bld:["#5C5665","#6A6274","#4E4858","#75697F","#565062"],
          accent:"#FFC46B", sky:"#2B3A63", top:"#12203F", fog:"#3A4568", fogD:0.0062,
          sun:[1.15,0.98,0.80], skyAmb:[0.17,0.22,0.34], grdAmb:[0.10,0.09,0.09], prop:"lamp", form:"blocks"},
  tech  :{ground:"#3E5257", bld:["#4E6A72","#5C7C86","#42585F","#6B8F9A"],
          accent:"#7BF0F6", sky:"#2E5560", top:"#123038", fog:"#3E6068", fogD:0.0058,
          sun:[1.35,1.42,1.40], skyAmb:[0.18,0.28,0.32], grdAmb:[0.10,0.13,0.13], prop:"pylon", form:"blocks"},
  wild  :{ground:"#4C5C38", bld:["#5A6B42","#68794E","#4E5C38","#788A5A"],
          accent:"#CFE86B", sky:"#7BA2C8", top:"#3E6E9E", fog:"#8FA8BE", fogD:0.0042,
          sun:[1.70,1.62,1.35], skyAmb:[0.26,0.32,0.38], grdAmb:[0.14,0.16,0.10], prop:"tree", form:"scatter"},
  palace:{ground:"#6E5C3A", bld:["#8A7244","#A08654","#7A6438","#B99C68"],
          accent:"#FFD98A", sky:"#C08A4E", top:"#6E4A28", fog:"#B08A5E", fogD:0.0050,
          sun:[1.85,1.45,0.95], skyAmb:[0.30,0.24,0.18], grdAmb:[0.18,0.14,0.09], prop:"column", form:"slabs"},
  hell  :{ground:"#4A2E2C", bld:["#5E3634","#6E403E","#4A2C2A","#7E4A46"],
          accent:"#FF8A4A", sky:"#5A2018", top:"#280A08", fog:"#5A2A22", fogD:0.0080,
          sun:[1.70,0.90,0.60], skyAmb:[0.26,0.14,0.11], grdAmb:[0.16,0.08,0.06], prop:"spire", form:"spires"},
  space :{ground:"#3A3660", bld:["#464274","#524E86","#3E3A66","#615C9E"],
          accent:"#A8A0FF", sky:"#141230", top:"#05041A", fog:"#1E1B44", fogD:0.0052,
          sun:[1.20,1.15,1.55], skyAmb:[0.16,0.16,0.30], grdAmb:[0.09,0.09,0.16], prop:"rock", form:"scatter"},
  ice   :{ground:"#7A8EA0", bld:["#8CA2B6","#9CB4C8","#7A8EA0","#AEC6DA"],
          accent:"#CFF0FF", sky:"#A8C6DE", top:"#5E8AB4", fog:"#B6CCDE", fogD:0.0060,
          sun:[1.70,1.75,1.85], skyAmb:[0.30,0.34,0.42], grdAmb:[0.20,0.22,0.26], prop:"shard", form:"slabs"},
  lab   :{ground:"#54566A", bld:["#63657C","#71738C","#585A70","#82849E"],
          accent:"#8AF0B8", sky:"#3E4260", top:"#1E2038", fog:"#4A4E6C", fogD:0.0060,
          sun:[1.45,1.45,1.50], skyAmb:[0.22,0.24,0.30], grdAmb:[0.12,0.12,0.14], prop:"pylon", form:"blocks"}
};
const SECTOR_THEME = {
  hk:"city",qns:"city",man:"city",raft:"city",wch:"lab",kra:"wild",wak:"tech",lat:"palace",
  sav:"wild",kun:"palace",att:"palace",sanc:"hell",dark:"hell",limbo:"hell",asg:"palace",
  musp:"hell",hel:"ice",quant:"space",nz:"space",sak:"city",know:"space",xan:"space",
  hala:"tech",tarnax:"tech",titan:"space",oly:"palace",bw:"city",tva:"lab",bleed:"space",above:"space"
};
const WORLD = 608, BLOCK = 76, STREET = 22;

function mulberry(seed){
  let a = seed>>>0;
  return function(){ a += 0x6D2B79F5; let t=a;
    t = Math.imul(t ^ (t>>>15), t|1); t ^= t + Math.imul(t ^ (t>>>7), t|61);
    return ((t ^ (t>>>14))>>>0)/4294967296; };
}

function buildWorld(sectorId){
  const th = THEMES[SECTOR_THEME[sectorId]||"city"];
  const rng = mulberry(hash(sectorId)+11);
  const boxes = [], props = [], spawns = [];
  const bldLin = th.bld.map(srgb);
  const n = Math.floor(WORLD/BLOCK), mid = Math.floor(n/2);
  for(let bx=0;bx<n;bx++) for(let bz=0;bz<n;bz++){
    if(bx===mid && bz===mid) continue;                    /* the plaza */
    const ox = -WORLD/2 + bx*BLOCK + STREET/2;
    const oz = -WORLD/2 + bz*BLOCK + STREET/2;
    const bw = BLOCK-STREET, bd = BLOCK-STREET;
    const form = th.form || "blocks";
    const place = (x,z,w,d,hScale)=>{
      if(w < 4 || d < 4) return;
      let h;
      if(form === "spires")      h = 16 + rng()*rng()*70;
      else if(form === "slabs")  h = 6 + rng()*rng()*16;
      else if(form === "scatter")h = 5 + rng()*rng()*26;
      else                       h = 8 + rng()*rng()*46 + (rng()<0.08 ? 34 : 0);
      h *= (hScale||1);
      const open = form !== "spires" && rng() < 0.16 && w > 14 && d > 14;
      boxes.push({x:x+w/2, z:z+d/2, w, d, h, base: open ? 4.2 : 0,
                  col:bldLin[(rng()*bldLin.length)|0]});
    };
    if(form === "spires"){
      /* thin towers, crowded, of very uneven height */
      const n2 = 3 + Math.floor(rng()*4);
      for(let i=0;i<n2;i++){
        const w = 5 + rng()*9, d = 5 + rng()*9;
        place(ox + rng()*(bw-w), oz + rng()*(bd-d), w, d);
      }
    } else if(form === "scatter"){
      /* open ground with a few irregular masses on it */
      const n2 = 1 + Math.floor(rng()*3);
      for(let i=0;i<n2;i++){
        const w = 8 + rng()*20, d = 8 + rng()*20;
        place(ox + rng()*Math.max(1,bw-w), oz + rng()*Math.max(1,bd-d), w, d);
      }
    } else if(form === "slabs"){
      /* long low halls with wide gaps between them */
      if(rng()<.5){ const s2 = bd*(.30+rng()*.24);
        place(ox, oz, bw, s2); place(ox, oz+s2+9, bw, bd-s2-9);
      } else { const s2 = bw*(.30+rng()*.24);
        place(ox, oz, s2, bd); place(ox+s2+9, oz, bw-s2-9, bd); }
    } else {
      const pieces = 2 + Math.floor(rng()*3);
      if(pieces<=2){
        if(rng()<.5){ const s2 = bw*(.34+rng()*.3);
          place(ox,oz,s2,bd); place(ox+s2+4, oz, bw-s2-4, bd);
        } else { const s2 = bd*(.34+rng()*.3);
          place(ox,oz,bw,s2); place(ox, oz+s2+4, bw, bd-s2-4); }
      } else {
        const hw = bw/2-2.5, hd = bd/2-2.5;
        for(let i=0;i<4;i++){ if(rng()<.14) continue;
          place(ox + (i%2)*(hw+5), oz + ((i>>1)%2)*(hd+5), hw*(0.6+rng()*0.4), hd*(0.6+rng()*0.4)); }
      }
    }
    for(let i=0;i<2;i++) if(rng()<.8)
      props.push({x:ox-STREET*0.42+rng()*3-1.5, z:oz+rng()*bd, k:th.prop, s:0.8+rng()*0.6,
                  col:srgb(th.accent)});
  }
  for(let i=0;i<520;i++){
    const x = -WORLD/2+8 + rng()*(WORLD-16), z = -WORLD/2+8 + rng()*(WORLD-16);
    if(!boxes.some(b=> Math.abs(x-b.x)<b.w/2+2.5 && Math.abs(z-b.z)<b.d/2+2.5)) spawns.push({x,z});
  }
  const w = {
    th, boxes, props, spawns, cx:0, cz:0,
    ground:srgb(th.ground), fog:srgb(th.fog).slice(), sky:srgb(th.sky).slice(),
    skyTop:srgb(th.top).slice(), accent:srgb(th.accent), fogD:th.fogD,
    sunCol:th.sun.slice(), skyAmb:th.skyAmb.slice(), grdAmb:th.grdAmb.slice()
  };
  /* keep the untouched palette so the day/night pass has something to work from */
  w.base = {sun:th.sun.slice(), skyAmb:th.skyAmb.slice(), grdAmb:th.grdAmb.slice(),
            sky:srgb(th.sky), skyTop:srgb(th.top), fog:srgb(th.fog)};
  return w;
}

/* how high the ground is at a point — rooftops count */
function groundAt(x,z,r){
  let top = 0;
  const boxes = G.world.boxes;
  for(let i=0;i<boxes.length;i++){
    const b = boxes[i];
    if(b.base) continue;                    /* open ground floor — nothing to stand on */
    if(b.h > top && Math.abs(x-b.x) < b.w/2 - (r||0)*0.2 && Math.abs(z-b.z) < b.d/2 - (r||0)*0.2) top = b.h;
  }
  return top;
}
/* push a body out of the walls it is standing inside */
function resolveXZ(e){
  const r = e.rad;
  for(const b of G.world.boxes){
    if(e.y >= b.h - 0.25) continue;
    if(b.base && e.y < b.base - 0.4) continue;   /* walk in under the pillars */
    const dx = e.x - b.x, dz = e.z - b.z;
    const px = b.w/2 + r - Math.abs(dx), pz = b.d/2 + r - Math.abs(dz);
    if(px > 0 && pz > 0){
      if(px < pz){ e.x += dx>0 ? px : -px; e.vx = 0; }
      else       { e.z += dz>0 ? pz : -pz; e.vz = 0; }
    }
  }
  const lim = WORLD/2 - 2;
  e.x = Math.max(-lim, Math.min(lim, e.x));
  e.z = Math.max(-lim, Math.min(lim, e.z));
}
