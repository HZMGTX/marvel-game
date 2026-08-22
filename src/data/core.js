/* == data/core.js ==
   tiers, statuses, the sixteen archetypes and the thirty sectors
   Part of Multiverse Vessel. Loaded in order from index.html. */

"use strict";
/* ==========================================================================
   MULTIVERSE VESSEL
   A fan-made prototype. You are a spark with no body of its own. You inhabit.
   --------------------------------------------------------------------------
   THE RULE: gear belongs to a person. Become the person, then wear the gear.
   ========================================================================== */

/* ---------------------------------------------------------------- constants */
const TIER_NAME = [null,"Street","Vigilante","Enhanced","Superhuman","Elite",
  "Powerhouse","Cosmic","World-Breaker","Skyfather","Abstract"];

const STATUS = {
  burn:    {label:"BURN",    tone:"bad",     desc:"Loses health each turn."},
  bleed:   {label:"BLEED",   tone:"bad",     desc:"Loses health each turn, worse when struck."},
  stun:    {label:"STUN",    tone:"bad",     desc:"Skips its turn."},
  weaken:  {label:"WEAKEN",  tone:"bad",     desc:"Deals 30% less damage."},
  mark:    {label:"MARKED",  tone:"bad",     desc:"Takes 25% more damage."},
  silence: {label:"SILENCED",tone:"bad",     desc:"Cannot use its ultimate."},
  lock:    {label:"LOCKED",  tone:"bad",     desc:"Powers sealed — basic strikes only."},
  shield:  {label:"SHIELD",  tone:"goodfx",  desc:"Absorbs damage before health."},
  fortify: {label:"FORTIFY", tone:"goodfx",  desc:"Takes 30% less damage."},
  regen:   {label:"REGEN",   tone:"goodfx",  desc:"Recovers health each turn."},
  charge:  {label:"CHARGED", tone:"neutral", desc:"Next strike deals 65% more."},
  haste:   {label:"HASTE",   tone:"neutral", desc:"Higher chance to evade and strike twice."},
  surge:   {label:"SURGE",   tone:"goodfx",  desc:"The vessel is burning through the host — 60% more damage."}
};

/* ------------------------------------------------------------- archetypes */
/* Every being in the codex resolves to one of these fighting shapes.        */
const ARCH = {
  BRAWLER:{name:"Brawler", w:{p:1.24,d:1.10,s:.95,n:.85}, kit:[
    {n:"Hammerblow",c:0,m:1.00,d:"A plain, heavy hit. Recovers energy."},
    {n:"Rib-Cracker",c:22,m:1.55,foe:{bleed:3},d:"Opens a wound that keeps bleeding."},
    {n:"Set Jaw",c:14,self:{fortify:2},nrg:18,d:"Brace up. Take 30% less for two turns."},
    {n:"Knockout Blow",c:48,m:2.50,foe:{stun:1},chance:.45,d:"Everything, swung once."}]},

  TITAN:{name:"Titan", w:{p:1.24,d:1.26,s:.80,n:.85}, kit:[
    {n:"Sledge",c:0,m:1.12,d:"Slow, enormous, unavoidable."},
    {n:"Quake Slam",c:26,m:1.55,foe:{stun:1},chance:.35,d:"The floor answers for it."},
    {n:"Dig In",c:22,self:{shield:2,fortify:2},d:"Plant both feet and become terrain."},
    {n:"Strongest There Is",c:55,m:2.80,rage:true,d:"Hits harder the more health you have lost."}]},

  SPEED:{name:"Speedster", w:{p:1.00,d:.86,s:1.70,n:1.00}, kit:[
    {n:"Flurry",c:0,m:.62,hits:2,d:"Two strikes before the eye reports one."},
    {n:"Sonic Pass",c:20,m:1.25,foe:{mark:3},d:"Runs through, leaves them off-balance."},
    {n:"Blur",c:14,self:{haste:3},nrg:10,d:"Stop being where you are."},
    {n:"Time-Lapse Barrage",c:46,m:.95,hits:4,d:"Four hits in one heartbeat."}]},

  BLAST:{name:"Blaster", w:{p:1.15,d:.86,s:1.00,n:1.10}, kit:[
    {n:"Bolt",c:0,m:1.00,d:"A clean discharge at range."},
    {n:"Searing Beam",c:24,m:1.60,foe:{burn:3},d:"Holds the beam until something cooks."},
    {n:"Charge Cells",c:0,nrg:40,self:{charge:2},d:"Draw power in. Next strike hits far harder."},
    {n:"Full Discharge",c:52,m:2.85,d:"Empty the whole reservoir at once."}]},

  TECH:{name:"Technologist", w:{p:1.04,d:1.05,s:1.00,n:1.15}, kit:[
    {n:"Repulsor",c:0,m:1.00,d:"Palm-mounted, reliable."},
    {n:"Micro-Missiles",c:24,m:.85,hits:2,foe:{burn:2},d:"Swarm launch from the shoulder rack."},
    {n:"Field Diagnostics",c:14,heal:.14,self:{shield:2},d:"Patch the plating, reroute the power."},
    {n:"Unibeam",c:50,m:2.80,foe:{lock:1},d:"Chest cannon. Scrambles their systems."}]},

  MYSTIC:{name:"Sorcerer", w:{p:1.20,d:.92,s:1.00,n:1.30}, kit:[
    {n:"Eldritch Whip",c:0,m:.95,d:"A lash of shaped force."},
    {n:"Crimson Bands",c:22,m:1.42,foe:{silence:2},d:"Bind the caster, seal the working."},
    {n:"Ward of Vishanti",c:20,self:{shield:2,regen:3},d:"A circle nothing crosses cheaply."},
    {n:"Images of Ikonn",c:54,m:2.60,heal:.10,d:"Reality briefly does as it is told."}]},

  PSI:{name:"Telepath", w:{p:1.14,d:.88,s:1.05,n:1.25}, kit:[
    {n:"Mindspike",c:0,m:.90,pierce:.40,d:"Skips the body entirely."},
    {n:"Fracture Will",c:24,m:1.46,foe:{weaken:3},d:"Take the fight out of them."},
    {n:"Serenity",c:12,cleanse:true,nrg:26,d:"Clear your own head. Removes all afflictions."},
    {n:"Psychic Scream",c:52,m:2.40,foe:{stun:1},chance:.65,pierce:.30,d:"Every thought at once, at volume."}]},

  ROGUE:{name:"Infiltrator", w:{p:1.07,d:.88,s:1.35,n:.95}, kit:[
    {n:"Quick Strike",c:0,m:1.00,d:"Fast, low, and already done."},
    {n:"Precision Cut",c:20,m:1.45,foe:{bleed:3},crit:.25,d:"Finds the seam in anything."},
    {n:"Vanish",c:12,self:{haste:2,charge:2},d:"Be gone, then be behind them."},
    {n:"Blindside",c:46,m:2.60,crit:.35,d:"They never learn which direction it came from."}]},

  MARKSMAN:{name:"Marksman", w:{p:1.08,d:.86,s:1.15,n:.95}, kit:[
    {n:"Snap Shot",c:0,m:1.00,d:"Drawn, fired, and holstered."},
    {n:"Trick Round",c:22,m:1.40,rand:true,d:"You never know which one you grabbed."},
    {n:"Take Aim",c:8,self:{charge:2},nrg:22,d:"Breathe out. Hold. Wait."},
    {n:"Impossible Shot",c:48,m:2.75,pierce:.35,ignoreShield:true,d:"Through the shield, through the gap, done."}]},

  BEAST:{name:"Feral", w:{p:1.10,d:1.10,s:1.05,n:.75}, kit:[
    {n:"Claw",c:0,m:1.05,d:"What the hands are actually for."},
    {n:"Savage Rend",c:22,m:1.42,foe:{bleed:4},d:"Tearing, not punching."},
    {n:"Catch Scent",c:10,self:{haste:2},heal:.08,d:"Find the wounded thing. Heal a little."},
    {n:"Frenzy",c:46,m:1.05,hits:3,d:"Nothing left of the plan but appetite."}]},

  SYNTH:{name:"Synthetic", w:{p:1.18,d:1.14,s:1.00,n:1.10}, kit:[
    {n:"Servo Strike",c:0,m:1.08,d:"Actuators at full torque."},
    {n:"Overclock Cannon",c:24,m:1.58,selfDmg:.03,d:"Past the rated tolerance. It costs you."},
    {n:"Recompile",c:15,heal:.20,cleanse:true,d:"Roll back to a clean state."},
    {n:"Phase Density",c:48,m:2.85,pierce:.50,d:"Put a hand inside them and make it solid."}]},

  COSMIC:{name:"Cosmic", w:{p:1.18,d:1.08,s:1.05,n:1.15}, kit:[
    {n:"Cosmic Lash",c:0,m:1.02,d:"An offhand use of impossible power."},
    {n:"Nova Flare",c:26,m:1.55,foe:{burn:3},d:"A small star, briefly, at close range."},
    {n:"Reconstitute",c:20,heal:.13,self:{shield:2},d:"Reassemble from the pattern up."},
    {n:"Power Cosmic",c:58,m:2.80,d:"The full weight of what you carry."}]},

  SYMBIOTE:{name:"Symbiote", w:{p:1.12,d:1.05,s:1.15,n:.85}, kit:[
    {n:"Tendril",c:0,m:1.05,d:"The suit reaches without being asked."},
    {n:"Maw",c:22,m:1.45,drain:.28,d:"Bites, and gives the health back to you."},
    {n:"Camouflage",c:12,self:{haste:2,regen:2},d:"Go quiet and knit yourself closed."},
    {n:"Bond Surge",c:48,m:2.60,self:{regen:3},d:"Host and other, briefly, agreeing."}]},

  MONARCH:{name:"Monarch", w:{p:1.14,d:1.10,s:.95,n:1.10}, kit:[
    {n:"Command Strike",c:0,m:1.08,d:"Struck with total certainty of the right."},
    {n:"Rally",c:18,heal:.13,self:{fortify:2,charge:2},d:"Straighten up. The throne is watching."},
    {n:"Decree",c:22,foe:{weaken:3,mark:3},d:"Name them lesser, and make it stick."},
    {n:"Sovereign Judgement",c:50,m:2.65,bonusMarked:.6,foe:{mark:2},d:"Far worse for anyone you have already marked — and marks them anyway."}]},

  WILD:{name:"Wildcard", w:{p:1.08,d:.98,s:1.05,n:1.10}, kit:[
    {n:"Hex Bolt",c:0,m:1.00,wobble:.35,d:"Damage is a suggestion, not a promise."},
    {n:"Probability Collapse",c:24,m:1.40,rand:true,d:"Something goes wrong for them. Unclear what."},
    {n:"Improbable Luck",c:14,randSelf:true,nrg:14,d:"Something goes right for you. Also unclear."},
    {n:"Rewrite",c:54,m:2.70,foe:{lock:2},d:"Edit the part of reality where they had powers."}]},

  ENTITY:{name:"Abstract", w:{p:1.24,d:1.16,s:1.05,n:1.25}, kit:[
    {n:"Concept Touch",c:0,m:1.05,d:"Contact with something that has no business touching you."},
    {n:"Unmaking",c:30,m:1.55,pierce:.35,d:"Removes the part of them that was resisting."},
    {n:"Eternal Poise",c:24,heal:.14,self:{shield:2},d:"You were never really damaged. Agree with that."},
    {n:"Decree of the Absolute",c:62,m:2.95,foe:{lock:2,weaken:3},d:"A ruling handed down, not a blow struck."}]}
};
const ARCH_IDS = Object.keys(ARCH);

/* ------------------------------------------------------------------ sectors */
/* Order is the campaign order. Each sector draws its encounters from the      */
/* beings tagged to it, weakest first, boss last.                             */
const SECTORS = [
  {id:"hk",    name:"Hell's Kitchen",      blurb:"Forty blocks of brick, rain and broken noses. Everything here can bleed."},
  {id:"qns",   name:"Queens",              blurb:"Web-lines over the expressway. Every rooftop has somebody on it."},
  {id:"man",   name:"Manhattan",           blurb:"Towers, helicarrier shadows, and the people who answer when it goes wrong."},
  {id:"raft",  name:"The Raft",            blurb:"A prison under the harbour. The doors are open now. That is the problem."},
  {id:"wch",   name:"Westchester",         blurb:"A school with a war memorial. The students are the weapons."},
  {id:"kra",   name:"Krakoa",              blurb:"A living island that decided mutants were worth keeping."},
  {id:"wak",   name:"Wakanda",             blurb:"Vibranium under the soil, and a nation that never once knelt."},
  {id:"lat",   name:"Latveria",            blurb:"Gothic spires, immaculate roads, and one man's absolute will."},
  {id:"sav",   name:"Savage Land",         blurb:"A jungle under Antarctic ice where extinction never happened."},
  {id:"kun",   name:"K'un-Lun",            blurb:"A city that touches Earth once a decade. The dragon is still awake."},
  {id:"att",   name:"Attilan",             blurb:"Terrigen mist and a king whose voice levels mountains."},
  {id:"sanc",  name:"Sanctum Sanctorum",   blurb:"A house on Bleecker Street with more rooms inside than outside."},
  {id:"dark",  name:"Dark Dimension",      blurb:"No time, no death, and something enormous that wants your world."},
  {id:"limbo", name:"Limbo",               blurb:"A demon realm on a hillside of stopped clocks."},
  {id:"asg",   name:"Asgard",              blurb:"Golden halls on a shard of rock. Thunder is a family trait."},
  {id:"musp",  name:"Muspelheim",          blurb:"The fire realm. Everything is either burning or about to be."},
  {id:"hel",   name:"Hel",                 blurb:"Where the unchosen dead go, and the one who keeps them."},
  {id:"quant", name:"Quantum Realm",       blurb:"Below the smallest thing. Time behaves badly here, and so do the Kangs."},
  {id:"nz",    name:"Negative Zone",       blurb:"Anti-matter space. An insect emperor rules it and is never satisfied."},
  {id:"sak",   name:"Sakaar",              blurb:"A junk planet with an arena at the middle and a Grandmaster in the box seat."},
  {id:"know",  name:"Knowhere",            blurb:"A mining colony inside a dead Celestial's skull. Nothing here is legal."},
  {id:"xan",   name:"Xandar",              blurb:"Nova Corps home. The helmet chooses, and then you carry the Nova Force."},
  {id:"hala",  name:"Hala",                blurb:"The Kree throneworld, run by a lake of preserved genius."},
  {id:"tarnax",name:"Tarnax IV",           blurb:"Skrull empire. Anyone standing beside you may not be."},
  {id:"titan", name:"Titan",               blurb:"A dead moon and the balance-obsessed son who emptied it."},
  {id:"oly",   name:"Olympia",             blurb:"Eternals, Deviants, and the enormous silent things that made them."},
  {id:"bw",    name:"Battleworld",         blurb:"A patchwork planet stitched from dead universes by one god's hand."},
  {id:"tva",   name:"TVA",                 blurb:"An office outside time that prunes anything it did not authorise."},
  {id:"bleed", name:"The Bleed",           blurb:"The red space between universes, where two Earths are about to touch."},
  {id:"above", name:"Above All Others",    blurb:"Not a place. A level of authorship. You should not be able to stand here."}
];

/* ------------------------------------------------------------------ beings */
/* name | tier | archetype | sector | tags | signature move name (optional)   */
