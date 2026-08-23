/* == render/overlay.js ==
   the flat layer on top: numbers, markers, minimap
   Part of Multiverse Vessel. Loaded in order from index.html. */

function drawOverlay(){
  UX.setTransform(DPR,0,0,DPR,0,0);
  UX.clearRect(0,0,VW,VH);
  const p = G.player;

  for(const e of G.ents){
    if(e.dead || e===p) continue;
    const near = p ? distXZ(e,p) : 999;
    if(e.team === "civ"){
      if(near > 55) continue;
      const sc0 = project(e.x, e.y + e.height*1.16, e.z);
      if(!sc0) continue;
      UX.globalAlpha = Math.max(0.3, 1 - near/60);
      UX.font = '700 11px "Chivo Mono",ui-monospace,monospace'; UX.textAlign = "center";
      UX.lineWidth = 3; UX.strokeStyle = "rgba(0,0,0,.85)";
      const lbl = e.freed ? "SAFE" : (e.civName || "Civilian");
      UX.strokeText(lbl, sc0.x, sc0.y); UX.fillStyle = e.freed ? "#5FE39A" : "#8FE8FF";
      UX.fillText(lbl, sc0.x, sc0.y);
      UX.globalAlpha = 1;
      continue;
    }
    if(e.team === "ally"){
      if(near > 70) continue;
      const sc1 = project(e.x, e.y + e.height*1.16, e.z);
      if(!sc1) continue;
      const w1 = 52, left = Math.max(0, Math.ceil((e.echoUntil - now())/1000));
      UX.globalAlpha = Math.max(0.35, 1 - near/74);
      UX.fillStyle = "rgba(0,0,0,.6)"; UX.fillRect(sc1.x-w1/2-1, sc1.y-1, w1+2, 6);
      UX.fillStyle = "#5FE39A";
      UX.fillRect(sc1.x-w1/2, sc1.y, w1*Math.max(0,e.hp/e.maxHp), 4);
      UX.font = '700 10px "Chivo Mono",ui-monospace,monospace'; UX.textAlign = "center";
      UX.lineWidth = 3; UX.strokeStyle = "rgba(0,0,0,.9)";
      const lbl = e.b.name + " \u00b7 " + left + "s";
      UX.strokeText(lbl, sc1.x, sc1.y-6);
      UX.fillStyle = "#5FE39A"; UX.fillText(lbl, sc1.x, sc1.y-6);
      UX.globalAlpha = 1;
      continue;
    }
    if(!e.boss && near > 40) continue;
    const sc = project(e.x, e.y + e.height*1.16, e.z);
    if(!sc || sc.x<-140 || sc.x>VW+140) continue;
    const w = e.boss ? 130 : 58;
    const a = Math.max(0.28, 1 - near/46);
    UX.globalAlpha = a;
    UX.fillStyle = "rgba(0,0,0,.6)"; UX.fillRect(sc.x-w/2-1, sc.y-1, w+2, 7);
    UX.fillStyle = e.boss ? "#F7BC46" : "#FF5340";
    UX.fillRect(sc.x-w/2, sc.y, w*Math.max(0,e.hp/e.maxHp), 5);
    if(e.boss && e.phase){
      UX.fillStyle = "#F7BC46";
      for(let i=0;i<e.phase;i++) UX.fillRect(sc.x + w/2 + 4 + i*7, sc.y, 5, 5);
    }
    if((e.boss || near < 22) && !(e.elite === "stalker" && now() < (e.veil||0))){
      UX.font = (e.boss?'700 15px':'700 11px')+' "Chivo Mono",ui-monospace,monospace';
      UX.textAlign="center"; UX.lineWidth=3.5; UX.strokeStyle="rgba(0,0,0,.9)";
      UX.strokeText(e.b.name, sc.x, sc.y-6);
      UX.fillStyle = e.boss ? "#F7BC46" : "#D6CEEA";
      UX.fillText(e.b.name, sc.x, sc.y-6);
      const role = e.elite && ELITES[e.elite];
      if(role){
        UX.font = '700 9px "Chivo Mono",ui-monospace,monospace';
        UX.lineWidth = 3; UX.strokeText(role.name, sc.x, sc.y-20);
        UX.fillStyle = role.hex; UX.fillText(role.name, sc.x, sc.y-20);
      }
    }
    UX.globalAlpha = 1;
  }
  for(const q of G.pops){
    const sc = project(q.x,q.y,q.z); if(!sc) continue;
    const k = 1-q.t/q.life;
    UX.globalAlpha = Math.min(1,k*1.7);
    UX.font = `700 ${q.size}px "Chivo Mono",ui-monospace,monospace`;
    UX.textAlign="center"; UX.lineWidth=4; UX.strokeStyle="rgba(0,0,0,.85)";
    UX.strokeText(q.txt, sc.x, sc.y); UX.fillStyle=q.col; UX.fillText(q.txt, sc.x, sc.y);
    UX.globalAlpha = 1;
  }
  for(const d of G.drops){
    const sc = project(d.x, d.y+1.6, d.z); if(!sc) continue;
    UX.font='700 10px "Chivo Mono",ui-monospace,monospace'; UX.textAlign="center";
    UX.lineWidth=3; UX.strokeStyle="rgba(0,0,0,.8)";
    const t = "◆ "+GEAR_BY_ID[d.gid].name.toUpperCase();
    UX.strokeText(t, sc.x, sc.y); UX.fillStyle="#F7BC46"; UX.fillText(t, sc.x, sc.y);
  }
  if(p){
    const m = 54;
    for(const e of G.ents){
      if(e.dead || e.team!=="foe") continue;
      const d = distXZ(e,p);
      if(d > 60 && !e.boss) continue;
      const sc = project(e.x, e.y+e.height*0.6, e.z);
      if(sc && sc.x>m && sc.x<VW-m && sc.y>m && sc.y<VH-m) continue;
      let ang;
      if(sc) ang = Math.atan2(sc.y-VH/2, sc.x-VW/2);
      else { const rel = Math.atan2(e.x-p.x, e.z-p.z) - G.camYaw;
             ang = Math.atan2(-Math.cos(rel), Math.sin(rel)); }
      const k = Math.min(Math.abs((VW/2-m)/(Math.cos(ang)||1e-6)), Math.abs((VH/2-m)/(Math.sin(ang)||1e-6)));
      const px = VW/2 + Math.cos(ang)*k, py = VH/2 + Math.sin(ang)*k;
      UX.save(); UX.translate(px,py); UX.rotate(ang);
      UX.globalAlpha = e.boss?1:.65;
      UX.fillStyle = e.boss?"#F7BC46":"#FF5340";
      UX.beginPath(); UX.moveTo(13,0); UX.lineTo(-9,-8); UX.lineTo(-9,8); UX.closePath(); UX.fill();
      UX.restore();
      if(e.boss){
        UX.globalAlpha=1; UX.font='700 11px "Chivo Mono",ui-monospace,monospace'; UX.textAlign="center";
        UX.fillStyle="#F7BC46"; UX.fillText(e.b.name.toUpperCase(), px, py + (py<VH/2?26:-18));
      }
      UX.globalAlpha = 1;
    }
    /* a small mark at the middle of the screen, so aiming reads */
    UX.globalAlpha = 0.45; UX.strokeStyle = "#EDE7DA"; UX.lineWidth = 1.5;
    UX.beginPath();
    UX.moveTo(VW/2-9, VH/2); UX.lineTo(VW/2-3, VH/2);
    UX.moveTo(VW/2+3, VH/2); UX.lineTo(VW/2+9, VH/2);
    UX.moveTo(VW/2, VH/2-9); UX.lineTo(VW/2, VH/2-3);
    UX.moveTo(VW/2, VH/2+3); UX.lineTo(VW/2, VH/2+9);
    UX.stroke(); UX.globalAlpha = 1;
  }
  const M = G.mission;
  if(M && !M.done && p){
    const mk = M.marker;
    const d = mk ? Math.round(Math.hypot(mk.x-p.x, mk.z-p.z)) : 0;
    let sub = "";
    if(M.def.kind==="hold")   sub = Math.max(0, Math.ceil((M.need-M.held)/1000))+"s to hold";
    if(M.def.kind==="rescue") sub = M.freed+" / "+M.def.count+" clear";
    if(M.limit)               sub += (sub?" · ":"")+Math.max(0,Math.ceil((M.limit-M.t)/1000))+"s left";
    UX.textAlign = "center";
    UX.font = '700 13px Bungee, sans-serif';
    UX.lineWidth = 4; UX.strokeStyle = "rgba(0,0,0,.8)";
    UX.strokeText(missionTitle(M.def).toUpperCase(), VW/2, 30);
    UX.fillStyle = "#F7BC46"; UX.fillText(missionTitle(M.def).toUpperCase(), VW/2, 30);
    UX.font = '700 11px "Chivo Mono",ui-monospace,monospace';
    const line = (sub ? sub+" · " : "") + d + " m";
    UX.strokeText(line, VW/2, 48); UX.fillStyle = "#D6CEEA"; UX.fillText(line, VW/2, 48);
    /* an arrow at the edge if the marker is off screen */
    if(mk){
      const sc = project(mk.x, 2, mk.z);
      const m2 = 60;
      if(!sc || sc.x<m2 || sc.x>VW-m2 || sc.y<m2 || sc.y>VH-m2){
        let ang;
        if(sc) ang = Math.atan2(sc.y-VH/2, sc.x-VW/2);
        else { const rel = Math.atan2(mk.x-p.x, mk.z-p.z) - G.camYaw;
               ang = Math.atan2(-Math.cos(rel), Math.sin(rel)); }
        const k = Math.min(Math.abs((VW/2-m2)/(Math.cos(ang)||1e-6)), Math.abs((VH/2-m2)/(Math.sin(ang)||1e-6)));
        const px2 = VW/2 + Math.cos(ang)*k, py2 = VH/2 + Math.sin(ang)*k;
        UX.save(); UX.translate(px2,py2); UX.rotate(ang);
        UX.fillStyle = "#F7BC46";
        UX.beginPath(); UX.moveTo(16,0); UX.lineTo(-10,-9); UX.lineTo(-4,0); UX.lineTo(-10,9);
        UX.closePath(); UX.fill(); UX.restore();
      }
    }
  }
  if(G.combo>2){
    UX.globalAlpha = Math.min(1,(G.comboT-G.t)/700);
    UX.font = '700 32px Bungee, sans-serif'; UX.textAlign="center";
    UX.lineWidth=6; UX.strokeStyle="rgba(0,0,0,.75)";
    UX.strokeText(G.combo+" HIT", VW/2, 112);
    UX.fillStyle="#F7BC46"; UX.fillText(G.combo+" HIT", VW/2, 112);
    UX.globalAlpha = 1;
  }
  drawMini();
}

const MINI = document.getElementById("mini"), MCX = MINI.getContext("2d");
function drawMini(){
  const w = MINI.width, h = MINI.height, S2 = w/WORLD;
  MCX.clearRect(0,0,w,h);
  MCX.fillStyle = "rgba(7,6,14,.74)"; MCX.fillRect(0,0,w,h);
  MCX.fillStyle = "#39336B";
  for(const b of G.world.boxes)
    MCX.fillRect((b.x+WORLD/2-b.w/2)*S2, (b.z+WORLD/2-b.d/2)*S2, Math.max(1,b.w*S2), Math.max(1,b.d*S2));
  for(const d of G.drops){ MCX.fillStyle="#F7BC46"; MCX.fillRect((d.x+WORLD/2)*S2-1.5,(d.z+WORLD/2)*S2-1.5,3,3); }
  const MM = G.mission;
  if(MM && !MM.done && MM.marker){
    const mx = (MM.marker.x+WORLD/2)*S2, mz = (MM.marker.z+WORLD/2)*S2;
    MCX.strokeStyle = "#F7BC46"; MCX.lineWidth = 1.5;
    MCX.beginPath(); MCX.arc(mx, mz, 5 + Math.sin(G.t*0.004)*1.5, 0, 6.283); MCX.stroke();
  }
  for(const e of G.ents){
    if(e.dead) continue;
    MCX.fillStyle = e===G.player ? "#41E3EA" : e.boss ? "#F7BC46"
                  : e.team==="ally" ? "#5FE39A" : e.team==="civ" ? "#3E5A78" : "#FF5340";
    const s = (e===G.player||e.boss)?4:3;
    MCX.fillRect((e.x+WORLD/2)*S2-s/2, (e.z+WORLD/2)*S2-s/2, s, s);
  }
  if(G.player){
    MCX.strokeStyle="#41E3EA"; MCX.lineWidth=1.2;
    const px=(G.player.x+WORLD/2)*S2, pz=(G.player.z+WORLD/2)*S2;
    MCX.beginPath(); MCX.moveTo(px,pz);
    MCX.lineTo(px+Math.sin(G.camYaw)*11, pz+Math.cos(G.camYaw)*11); MCX.stroke();
  }
}
