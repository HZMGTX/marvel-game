/* == fight/damage.js ==
   damage, guards, parries, poise, and how a hit feels
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* ------------------------------------------------------- combat, in metres */
/* the ability table is written in abstract units; these turn it into metres */
const MPU      = 0.055;   /* movement */
const U_REACH  = 0.028;   /* melee reach, plus an offset below */
const U_RADIUS = 0.050;   /* blast radius */
const U_LEN    = 0.062;   /* beam length */
const U_WID    = 0.030;   /* beam width */
const U_DIST   = 0.050;   /* dash distance */
const U_SPEED  = 0.068;   /* projectile speed */
const reachOf  = a => a.reach*U_REACH + 0.62;
const now = () => G.t;
function hasFx(e,k){ return (e.fx[k]||0) > now(); }
function setFx(e,k,ms){ e.fx[k] = Math.max(e.fx[k]||0, now()+ms); }
function mitigationK(def){ return 44 + 13*def.b.tier; }
const dist3 = (a,b) => Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z);
const distXZ = (a,b) => Math.hypot(a.x-b.x, a.z-b.z);

const BLOCK_CUT    = 0.30;   /* damage that still gets through a guard */
const PARRY_WINDOW = 240;    /* ms from raising the guard */
const BLOCK_DRAIN  = 22;     /* energy per second held */
const POISE_FRAC   = 0.26;   /* share of max health that breaks a stance */
const STAGGER_MS   = 1200;
const PLAYER_HP_MULT = 1.7;
const ENEMY_DMG_MULT = 0.55;
const HIT_IFRAME = 340;

function canHit(att, def){
  if(!def || def.dead || def.team === att.team) return false;
  if(def.team === "civ" && att.team === "you") return false;   /* not on your watch */
  return true;
}
function dealDamage(att, def, mul, o){
  o = o||{};
  if(!canHit(att, def)) return 0;
  if(def.team==="you" && hasFx(def,"iframe")) return 0;
  const K = mitigationK(def);
  const dEff = def.st.d * (1 - (o.pierce?0.4:0));
  let dmg = att.st.p * mul * (K/(K+dEff)) * (att.team==="foe" ? ENEMY_DMG_MULT*(att.boss?1.35:1) : 1);
  if(hasFx(att,"charge")){ dmg *= 1.6; att.fx.charge = 0; }
  if(hasFx(att,"surge"))   dmg *= 1.6;
  if(hasFx(att,"weaken"))  dmg *= .70;
  if(hasFx(def,"fortify")) dmg *= .70;
  if(hasFx(def,"mark"))    dmg *= 1.25;
  if(att.ai && att.ai.fx==="simulate" && S.defeated[def.id]) dmg *= 1.10;
  if(att.elite === "stalker" && now() < (att.veil||0)) dmg *= 1.70;   /* out of nowhere */
  if(def.ai && def.ai.fx==="adapt") dmg *= .82;
  let crit = .05 + (att.st.s-def.st.s)/900 + (o.crit||0);
  if(att.ai && att.ai.fx==="targeting") crit += .12;
  const isCrit = Math.random() < Math.max(.02, Math.min(.5, crit));
  if(isCrit) dmg *= (att.ai && att.ai.fx==="targeting") ? 1.85 : 1.6;
  dmg *= 0.92 + Math.random()*0.16;
  dmg = Math.max(1, Math.round(dmg));
  if(hasFx(def,"shield")) dmg = Math.round(dmg*0.45);
  if(def.ai && def.ai.fx==="assist" && !def.usedAssist && def.hp-dmg < def.maxHp*.25 && def.hp > def.maxHp*.25){
    def.usedAssist = true; feed(def.ai.name+" cancels the hit.","good"); return 0;
  }
  /* a guard, and the moment at the start of it that turns a hit around */
  if(def.blocking && !o.unblockable){
    const facing = Math.atan2(att.x-def.x, att.z-def.z);
    let rel = facing - def.yaw;
    while(rel >  Math.PI) rel -= 6.2832;
    while(rel < -Math.PI) rel += 6.2832;
    if(Math.abs(rel) < 1.35){                       /* only what you face */
      if(now() - (def.blockStart||0) < PARRY_WINDOW){
        setFx(att, "stun", 950);
        att.poise = 0;
        att.hp -= Math.round(dmg*0.25);
        G.freeze = Math.max(G.freeze, 110);
        G.shake += 0.5;
        shock(def.x, def.y+1.0, def.z, 2.4, GOLD3, 380);
        SFX.parry(def.x, def.z);
        G.pops.push({x:def.x, y:def.y+def.height*1.1, z:def.z, txt:"PARRY", t:0, life:900,
                     col:"#F7BC46", size:22});
        if(att.hp<=0) killEnt(att);
        if(def.team==="you") G.lastCombat = now();
        return 0;
      }
      dmg = Math.max(1, Math.round(dmg*BLOCK_CUT));
      def.nrg -= 14;
      SFX.block(def.x, def.z);
      spark(def.x, def.y+1.0, def.z, 5, GUARD3);
      if(def.nrg <= 0){                              /* guard broken */
        def.nrg = 0; def.blocking = false;
        setFx(def, "stun", 700);
        G.pops.push({x:def.x, y:def.y+def.height*1.05, z:def.z, txt:"GUARD BROKEN", t:0,
                     life:900, col:"#FF5340", size:16});
      }
    }
  }

  /* poise: enough punishment in a short window and the stance breaks */
  def.poise = (def.poise||0) + dmg;
  if(now() - (def.poiseT||0) > 2600) def.poise = dmg;
  def.poiseT = now();
  if(!hasFx(def,"stun") && def.poise > def.maxHp*POISE_FRAC){
    def.poise = 0;
    setFx(def, "stun", STAGGER_MS);
    G.pops.push({x:def.x, y:def.y+def.height*1.05, z:def.z, txt:"STAGGERED", t:0, life:1000,
                 col:"#F7BC46", size:16});
    shock(def.x, def.y+0.3, def.z, 1.6, GOLD3, 340);
  }
  if(hasFx(def,"stun")) dmg = Math.round(dmg*1.4);   /* free hits on a broken stance */

  def.hp -= dmg;
  def.hitT = now(); def.lastHurt = now();
  if(att.team==="you" || def.team==="you") G.lastCombat = now();
  if(def.team==="you") setFx(def,"iframe", HIT_IFRAME + vesselLevel("iframe")*70);
  if(o.knock){
    const a = Math.atan2(def.x-att.x, def.z-att.z);
    const k = o.knock*0.022;
    def.vx += Math.sin(a)*k; def.vz += Math.cos(a)*k;
    if(def.grounded) def.vy += k*0.34;
  }
  if(o.bleed) setFx(def,"bleed",3200);
  if(o.burn)  setFx(def,"burn",3000);
  if(o.weaken)setFx(def,"weaken",3600);
  if(o.mark)  setFx(def,"mark",4000);
  if(o.stun)  setFx(def,"stun",o.stun);
  if(o.drain) att.hp = Math.min(att.maxHp, att.hp + dmg*o.drain);
  if(att.elite) eliteOnHit(att, def, dmg);
  /* the world stops for a breath when something really lands */
  if(att.team === "you" && (isCrit || dmg > def.maxHp*0.09))
    G.freeze = Math.max(G.freeze, isCrit ? 95 : 65);
  SFX.hit(def.x, def.z, dmg > def.maxHp*0.07, isCrit);
  popNumber(def, dmg, isCrit, att.team==="you");
  spark(def.x, def.y + def.height*0.62, def.z, isCrit?14:7, att.team==="you"?SPARK_A:SPARK_B);
  if(att.team==="you"){ G.combo++; G.comboT = now()+2200; G.surge = Math.min(100, G.surge + dmg/def.maxHp*14); }
  else G.surge = Math.min(100, G.surge + dmg/def.maxHp*88*(1 + vesselLevel("surge")*0.18));
  if(def.hp<=0) killEnt(def);
  return dmg;
}

function killEnt(e){
  if(e.dead) return;
  e.dead = true; e.deadT = now();
  burst(e.x, e.y+e.height*0.5, e.z, 30, e.pal.c3);
  SFX.down(e.x, e.z);
  G.shake = Math.min(1, G.shake + (e.boss?.9:.28));
  if(e.team==="foe") onFoeDown(e); else if(e===G.player) onHostDown();
}
