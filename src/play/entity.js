/* == play/entity.js ==
   turning a being into something that stands in the world
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* --------------------------------------------------------------- entities */
let ENT_UID = 0;
function makeEnt(beingId, x, z, team, o){
  o = o||{};
  const b = BY_ID[beingId];
  const isPlayer = team==="you";
  const gear = isPlayer ? gearFor(beingId) : ((GEAR_BY_OWNER[beingId]||[])[0]||null);
  const pot  = isPlayer ? gearPotency(gear, beingId) : (gear?1:0);
  const ai   = isPlayer ? (S.installedAi?AI_BY_ID[S.installedAi]:null) : null;
  const u = unitStats(b, {level:isPlayer?level(beingId):(o.level||1), scale:o.scale||1, gear, pot, ai, player:isPlayer});
  /* a person is 1.8 m at size 1; the big ones get bigger */
  const size = (0.94 + b.tier*0.030) * (b.arch==="TITAN"?1.24:1) * (o.boss?1.18:1)
             * (b.tags.includes("beast")?0.94:1);
  const pal = palette(b);
  return {
    uid: ++ENT_UID,
    b, id:beingId, team, act:ACT[b.arch], pal, size,
    x, y:0, z, vx:0, vy:0, vz:0, yaw:Math.random()*6.283,
    rad:0.36*size, height:1.80*size*(palette(b).legs||1)*0.55 + 1.80*size*0.45, grounded:true,
    st:u.st, hp:u.maxHp, maxHp:u.maxHp, nrg:u.st.n, maxNrg:u.st.n,
    gear:u.gear, pot:u.pot, ai:u.ai,
    cds:{}, fx:{}, dead:false, hitT:-1e9, swingT:-1e9, moving:false, animT:Math.random()*100,
    fly:false, canFly:canFly(b), bank:0, dive:0, lift:0, boost:0, diveArmed:false, boss:!!o.boss, engaged:false, aiT:0, atkT:0, lastHurt:-1e9
  };
}

