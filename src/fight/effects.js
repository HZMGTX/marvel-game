/* == fight/effects.js ==
   sparks, bursts, rings, damage numbers, the feed
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* --------------------------------------------------------------- effects */
const SPARK_A = srgb("#FF6A4A"), SPARK_B = srgb("#5AE0F0"), GUARD3 = srgb("#8FE8FF");
function spark(x,y,z,n,c){
  for(let i=0;i<n;i++){
    const a=Math.random()*6.283, p=Math.random()*3.14;
    const s=1.6+Math.random()*5;
    G.parts.push({x,y,z,vx:Math.cos(a)*Math.sin(p)*s, vy:Math.cos(p)*s+1.4, vz:Math.sin(a)*Math.sin(p)*s,
      t:0, life:280+Math.random()*280, c, r:0.045+Math.random()*0.075});
  }
}
function burst(x,y,z,n,c){
  for(let i=0;i<n;i++){
    const a=Math.random()*6.283, p=Math.random()*3.14, s=2.5+Math.random()*8;
    G.parts.push({x,y,z,vx:Math.cos(a)*Math.sin(p)*s, vy:Math.cos(p)*s+2.5, vz:Math.sin(a)*Math.sin(p)*s,
      t:0, life:480+Math.random()*480, c, r:0.07+Math.random()*0.13});
  }
}
function shock(x,y,z,r,c,ms){ G.rings.push({x,y,z,r,c,t:0,life:ms||360}); }
function popNumber(e, n, crit, mine){
  G.pops.push({x:e.x, y:e.y+e.height*0.95, z:e.z, txt:(crit?"!":"")+n, t:0, life:800,
    col: crit?"#F7BC46":(mine?"#FFFFFF":"#FF5340"), size: crit?26:17});
}
function feed(msg,cls){
  const el = document.createElement("div");
  el.className = cls||""; el.textContent = msg;
  FEED.appendChild(el); setTimeout(()=>el.remove(), 4200);
  while(FEED.children.length>5) FEED.firstChild.remove();
}
