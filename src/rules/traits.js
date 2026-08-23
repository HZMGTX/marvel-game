/* == rules/traits.js ==
   the one thing that is true of this person and nobody quite like them
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* ==========================================================================
   TRAITS
   Six hundred and seventy-four beings shared sixteen fighting kits, which
   meant that once you had played a Brawler you had played every Brawler.
   The stats differed. Nothing you did differed.

   A trait is one behaviour laid over the archetype. Where the codex says
   what somebody is — a demon, a symbiote, an Asgardian — the trait comes
   from that. Where it does not, it comes from the name, the same way the
   costume colours do, so it is stable, it is theirs, and no two rows of the
   roster read the same. Enemies carry them too: a Hand assassin that jumps
   its hits to the one behind you is not the Hand assassin you just beat.
   ========================================================================== */
const TRAITS = {
  kindled:    {name:"Kindled",     hex:"#FF8A4A", line:"Everything it lands is still burning afterwards."},
  frostbound: {name:"Frostbound",  hex:"#8FE8FF", line:"What it hits goes slow, and stays slow."},
  arcing:     {name:"Arcing",      hex:"#FFE96B", line:"A hit jumps to whoever is standing too close."},
  venomous:   {name:"Venomous",    hex:"#8AF0B8", line:"Its wounds keep opening, and it drinks from them."},
  kinetic:    {name:"Kinetic",     hex:"#41E3EA", line:"Everything it has comes back sooner."},
  siege:      {name:"Siege",       hex:"#F7BC46", line:"It moves people, and it breaks stances twice as fast."},
  precise:    {name:"Precise",     hex:"#FF5340", line:"It finds the seam, and goes straight through it."},
  warded:     {name:"Warded",      hex:"#A8A0FF", line:"Leave it alone for a moment and it closes back up."},
  swarming:   {name:"Swarming",    hex:"#7BF0F6", line:"Whatever it throws, it throws more of."},
  reaving:    {name:"Reaving",     hex:"#CFE86B", line:"Its worst reaches further than it has any right to."},
  relentless: {name:"Relentless",  hex:"#FFC46B", line:"The longer it keeps hitting you, the worse it gets."},
  untouchable:{name:"Untouchable", hex:"#D6CEEA", line:"Not reliably where the blow arrives."}
};
const TRAIT_KEYS = Object.keys(TRAITS);

/* what the codex already says about somebody decides it, where it says
   anything useful. "hero", "villain" and "mutant" say nothing about how a
   fight goes, so they are not in here. */
const TAG_TRAIT = {
  demon:"kindled",    gamma:"siege",      asgardian:"arcing",  inhuman:"arcing",
  symbiote:"venomous",beast:"venomous",   spider:"untouchable",skrull:"untouchable",
  mystic:"warded",    magic:"warded",     ai:"swarming",       robot:"swarming",
  synthetic:"swarming",cyborg:"swarming", tech:"swarming",     cosmic:"reaving",
  celestial:"reaving",eternal:"reaving",  entity:"reaving",    kree:"precise",
  agent:"precise",    military:"precise", wakandan:"precise",  atlantean:"frostbound",
  hydra:"precise",    deviant:"siege"
};

/* Most specific first, because the order the tags happen to be written in is
   not an opinion about anybody. Somebody who is both "tech" and "symbiote" is
   read as the symbiote: that is the half of them a fight notices. */
const TAG_ORDER = ["symbiote","demon","spider","gamma","deviant","celestial","atlantean",
  "skrull","kree","wakandan","hydra","asgardian","inhuman","eternal","robot","cyborg",
  "synthetic","agent","military","magic","beast","ai","cosmic","mystic","entity","tech"];

/* Four of the twelve arrive on tags alone — half the roster is cosmic,
   technological, magical or Asgardian in some form — so the coin the rest of
   the roster is read off does not carry those four. It fills in the ones
   nobody's tags reach, and the spread across the whole roster comes out
   roughly two to one instead of five to one. */
const HASH_POOL = TRAIT_KEYS.filter(k =>
  k!=="reaving" && k!=="swarming" && k!=="warded" && k!=="arcing");

const _trait = {};
function traitOf(b){
  if(!b) return null;
  if(_trait[b.id] !== undefined) return _trait[b.id];
  let k = null;
  for(const t of TAG_ORDER) if(b.tags.includes(t)){ k = TAG_TRAIT[t]; break; }
  if(!k) k = HASH_POOL[hash(b.name + "/trait") % HASH_POOL.length];
  return (_trait[b.id] = k);
}
const hasTrait = (e, k) => !!e && traitOf(e.b) === k;
function traitName(b){ const t = TRAITS[traitOf(b)]; return t ? t.name : ""; }

/* ------------------------------------------- the ones that reshape the kit */
/* Cooldowns, counts and reach are read off e.act every frame, so the three
   traits that change those get their own copy of the archetype's table
   rather than a branch in the hot path. */
const _act = {};
function actFor(b){
  const k = traitOf(b);
  if(_act[b.id]) return _act[b.id];
  const base = ACT[b.arch];
  if(k !== "kinetic" && k !== "reaving" && k !== "swarming") return (_act[b.id] = base);
  const a = {ranged:base.ranged, spd:base.spd};
  for(const slot of ["light","power","util","ult"]){
    const s = Object.assign({}, base[slot]);
    if(k === "kinetic"){ s.cd = Math.round(s.cd*0.80); }
    if(k === "reaving"){
      /* not an orbit's radius: pushing the blades out opens a hole under the
         caster, which is the one place a sorcerer needs them. It stays up
         longer instead. */
      if(s.kind === "orbit") s.dur = Math.round(s.dur*1.40);
      else if(s.radius) s.radius = Math.round(s.radius*1.35);
      if(s.len)    s.len    = Math.round(s.len*1.25);
      if(s.wid)    s.wid    = Math.round(s.wid*1.25);
      if(s.arc)    s.arc    = Math.min(3.0, s.arc*1.30);
      if(s.reach)  s.reach  = Math.round(s.reach*1.14);
    }
    if(k === "swarming"){
      if(s.count) s.count += 2;
      if(s.kind === "shot"){ s.kind = "spread"; s.count = 2; s.arc = 0.16; s.mul *= 0.72; }
    }
    a[slot] = s;
  }
  if(k === "kinetic") a.spd = Math.round(base.spd*1.08);
  return (_act[b.id] = a);
}

/* ---------------------------------------------------- the ones that hook a hit */
/* Called from dealDamage while the numbers are still being decided. */
function traitCrit(att){
  return hasTrait(att, "precise") ? 0.14 : 0;
}
function traitPoise(def, dmg, att){
  return hasTrait(att, "siege") ? dmg*2 : dmg;
}
function traitKnock(att, k){
  return hasTrait(att, "siege") ? k*1.7 : k;
}
/* relentless: a stack a hit, six deep, gone two and a half seconds after the last */
const RELENT_CAP = 6, RELENT_STEP = 0.05, RELENT_HOLD = 2500;
function traitOutgoing(att, def){
  let m = 1;
  if(hasTrait(att, "kindled") && hasFx(def, "burn")) m *= 1.08;
  if(hasTrait(att, "relentless")){
    if(now() - (att.relentT||0) > RELENT_HOLD) att.relent = 0;
    m *= 1 + Math.min(RELENT_CAP, att.relent||0)*RELENT_STEP;
  }
  return m;
}
function traitLanded(att, def, dmg, mul, o){
  if(hasTrait(att, "relentless")){
    att.relent = Math.min(RELENT_CAP, (att.relent||0)+1);
    att.relentT = now();
  }
  if(hasTrait(att, "kindled"))   setFx(def, "burn",  2600);
  if(hasTrait(att, "frostbound"))setFx(def, "chill", 2400);
  if(hasTrait(att, "venomous")){
    setFx(def, "bleed", 3000);
    att.hp = Math.min(att.maxHp, att.hp + dmg*0.10);
  }
  if(hasTrait(att, "arcing") && !o.chained) traitArc(att, def, mul);
}
/* arcing: the hit jumps once, to one body, and never jumps back */
const ARC_R = 6.5, ARC_SHARE = 0.45;
function traitArc(att, def, mul){
  let best = null, bd = ARC_R;
  for(const t of G.ents){
    if(t === def || !canHit(att, t)) continue;
    const d = distXZ(t, def);
    if(d < bd){ bd = d; best = t; }
  }
  if(!best) return;
  G.beams.push({x:def.x, y:def.y+def.height*0.6, z:def.z,
                yaw:Math.atan2(best.x-def.x, best.z-def.z),
                len:Math.max(0.6, bd), wid:0.22, c:srgb(TRAITS.arcing.hex), t:0, life:150});
  dealDamage(att, best, mul*ARC_SHARE, {chained:true});
}
/* untouchable: sometimes the blow simply does not find them */
function traitDodges(def){
  if(!hasTrait(def, "untouchable") || Math.random() > 0.10) return false;
  G.pops.push({x:def.x, y:def.y+def.height*1.05, z:def.z, txt:"MISS", t:0, life:650,
               col:TRAITS.untouchable.hex, size:13});
  return true;
}
/* warded: four seconds untouched and the circle is back up */
const WARD_QUIET = 4000;
function traitTick(e){
  if(hasTrait(e, "warded") && now() - (e.lastHurt||-1e9) > WARD_QUIET) setFx(e, "shield", 600);
  if(hasTrait(e, "relentless") && e.relent && now()-(e.relentT||0) > RELENT_HOLD) e.relent = 0;
}
/* the first one of each you meet says what it is, once, and never again */
function announceTrait(e){
  const k = traitOf(e.b);
  if(!k || e.traitSaid) return;
  e.traitSaid = true;
  S.hints = S.hints || {};
  const id = "trait/"+k;
  if(S.hints[id]) return;
  S.hints[id] = true; save();
  feed(TRAITS[k].name.toUpperCase()+" — "+TRAITS[k].line, "big");
}
const traitIframe = e => hasTrait(e, "untouchable") ? 1.5 : 1;
const traitRollCd = e => hasTrait(e, "untouchable") ? 0.7 : 1;
