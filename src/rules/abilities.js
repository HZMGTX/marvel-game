/* == rules/abilities.js ==
   how tier and archetype become stats and four ability slots
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* ==========================================================================
   ACTION LAYER
   The codex above decides who you are. Everything below decides how that
   feels to play: reach, cooldowns, whether you shoot or swing, who can fly.
   ========================================================================== */

/* Every archetype gets four buttons. Names come from the codex kit so the
   flavour survives; the numbers here are what the hands actually do.        */
const ACT = {
  BRAWLER:{ranged:false,spd:118,
    light:{kind:"swipe",mul:.55,reach:64,arc:1.9,cd:330,knock:190},
    power:{kind:"dash",mul:1.25,cost:18,cd:1300,dist:230,knock:320},
    util :{kind:"buff",cost:14,cd:5200,self:{fortify:5000}},
    ult  :{kind:"slam",mul:2.4,cost:48,cd:8500,radius:155,knock:470}},
  TITAN:{ranged:false,spd:100,
    light:{kind:"swipe",mul:.70,reach:76,arc:2.0,cd:470,knock:270},
    power:{kind:"slam",mul:1.45,cost:22,cd:2100,radius:132,knock:430},
    util :{kind:"buff",cost:18,cd:6000,self:{shield:6000,fortify:4000}},
    ult  :{kind:"slam",mul:2.85,cost:52,cd:10500,radius:215,knock:640}},
  SPEED:{ranged:false,spd:178,
    light:{kind:"swipe",mul:.34,reach:50,arc:1.6,cd:135,knock:80},
    power:{kind:"dash",mul:.85,cost:12,cd:620,dist:310,knock:150},
    util :{kind:"buff",cost:12,cd:5000,self:{haste:5000}},
    ult  :{kind:"blitz",mul:.80,hits:5,cost:44,cd:9000,dist:330}},
  BLAST:{ranged:true,spd:124,
    light:{kind:"shot",mul:.50,cost:0,cd:270,speed:540,life:1000,r:7},
    power:{kind:"beam",mul:1.45,cost:20,cd:1700,len:470,wid:26,burn:true},
    util :{kind:"buff",cost:12,cd:5600,self:{charge:6000}},
    ult  :{kind:"slam",mul:2.6,cost:50,cd:9500,radius:265,knock:400,burn:true}},
  TECH:{ranged:true,spd:126,
    light:{kind:"shot",mul:.50,cd:250,speed:580,life:900,r:6},
    power:{kind:"spread",mul:.55,count:5,arc:.7,cost:20,cd:1500,speed:430,life:1200,r:6,home:.9},
    util :{kind:"heal",heal:.15,cost:16,cd:7800,self:{shield:4000}},
    ult  :{kind:"beam",mul:2.55,cost:48,cd:9800,len:540,wid:42}},
  MYSTIC:{ranged:true,spd:120,
    light:{kind:"shot",mul:.50,cd:290,speed:470,life:1000,r:8},
    power:{kind:"orbit",mul:.42,count:3,cost:20,cd:3800,dur:3400,radius:74},
    util :{kind:"buff",cost:18,cd:6800,self:{shield:5000,regen:5000}},
    ult  :{kind:"slam",mul:2.5,cost:50,cd:9800,radius:245,knock:360}},
  PSI:{ranged:true,spd:122,
    light:{kind:"shot",mul:.48,cd:290,speed:430,life:1100,r:7,pierce:true},
    power:{kind:"beam",mul:1.2,cost:18,cd:1450,len:430,wid:22,weaken:true},
    util :{kind:"buff",cost:10,cd:5600,cleanse:true,nrg:34},
    ult  :{kind:"slam",mul:2.2,cost:48,cd:9600,radius:305,stun:900}},
  ROGUE:{ranged:false,spd:150,
    light:{kind:"swipe",mul:.42,reach:54,arc:1.5,cd:205,knock:110},
    power:{kind:"dash",mul:1.1,cost:14,cd:820,dist:250,knock:170,bleed:true},
    util :{kind:"buff",cost:12,cd:6000,self:{haste:4200,charge:4200}},
    ult  :{kind:"blitz",mul:1.0,hits:3,cost:44,cd:8800,dist:270}},
  MARKSMAN:{ranged:true,spd:134,
    light:{kind:"shot",mul:.55,cd:255,speed:670,life:900,r:5},
    power:{kind:"spread",mul:.60,count:3,arc:.42,cost:16,cd:1150,speed:600,life:900,r:5},
    util :{kind:"buff",cost:10,cd:5000,self:{charge:5000}},
    ult  :{kind:"beam",mul:2.65,cost:46,cd:8800,len:760,wid:16,pierce:true}},
  BEAST:{ranged:false,spd:142,
    light:{kind:"swipe",mul:.50,reach:58,arc:1.7,cd:255,knock:150,bleed:true},
    power:{kind:"dash",mul:1.15,cost:16,cd:1000,dist:250,knock:220,bleed:true},
    util :{kind:"heal",heal:.10,cost:12,cd:6200,self:{haste:4000}},
    ult  :{kind:"frenzy",mul:.95,hits:3,cost:44,cd:8800,radius:120}},
  SYNTH:{ranged:true,spd:120,
    light:{kind:"shot",mul:.52,cd:275,speed:540,life:950,r:6},
    power:{kind:"beam",mul:1.35,cost:20,cd:1650,len:440,wid:28},
    util :{kind:"heal",heal:.19,cost:16,cd:8200,cleanse:true},
    ult  :{kind:"slam",mul:2.65,cost:48,cd:9800,radius:200,pierce:true,knock:330}},
  COSMIC:{ranged:true,spd:132,
    light:{kind:"shot",mul:.55,cd:255,speed:580,life:1000,r:8},
    power:{kind:"spread",mul:.68,count:4,arc:.6,cost:22,cd:1450,speed:470,life:1100,r:7},
    util :{kind:"heal",heal:.13,cost:18,cd:7000,self:{shield:4500}},
    ult  :{kind:"beam",mul:2.85,cost:54,cd:10600,len:620,wid:54}},
  SYMBIOTE:{ranged:false,spd:140,
    light:{kind:"swipe",mul:.52,reach:70,arc:1.8,cd:275,knock:170},
    power:{kind:"dash",mul:1.2,cost:16,cd:950,dist:240,knock:220,drain:.30},
    util :{kind:"buff",cost:12,cd:6000,self:{regen:5000,haste:3600}},
    ult  :{kind:"slam",mul:2.55,cost:46,cd:8800,radius:185,knock:380,drain:.22}},
  MONARCH:{ranged:false,spd:118,
    light:{kind:"swipe",mul:.55,reach:62,arc:1.8,cd:315,knock:180},
    power:{kind:"shot",mul:1.15,cost:18,cd:1250,speed:520,life:1000,r:9,mark:true},
    util :{kind:"heal",heal:.12,cost:18,cd:7000,self:{fortify:4500,charge:4500}},
    ult  :{kind:"slam",mul:2.6,cost:50,cd:9800,radius:225,knock:420}},
  WILD:{ranged:true,spd:128,
    light:{kind:"shot",mul:.50,cd:275,speed:490,life:1000,r:8,wobble:.4},
    power:{kind:"spread",mul:.46,count:6,arc:1.1,cost:20,cd:1550,speed:420,life:1000,r:6,wobble:.5},
    util :{kind:"buff",cost:14,cd:6000,random:true},
    ult  :{kind:"slam",mul:2.7,cost:52,cd:10000,radius:265,knock:380,random:true}},
  ENTITY:{ranged:true,spd:130,
    light:{kind:"shot",mul:.60,cd:295,speed:500,life:1100,r:10,pierce:true},
    power:{kind:"beam",mul:1.55,cost:24,cd:1550,len:520,wid:48,pierce:true},
    util :{kind:"heal",heal:.16,cost:20,cd:7200,self:{shield:5200}},
    ult  :{kind:"slam",mul:2.9,cost:58,cd:11500,radius:340,pierce:true,knock:520}}
};

/* who leaves the ground */
const FLY_ARCH = {COSMIC:1,ENTITY:1,BLAST:1};
const FLY_TAG  = {cosmic:1,entity:1,celestial:1,vehicle:1,eternal:1,asgardian:1,kree:1,inhuman:0,skrull:1};
const FLY_NAME = /thor|iron man|war machine|rescue|ironheart|falcon|vulture|storm|silver surfer|superman|angel|archangel|human torch|captain marvel|photon|nova|sentry|void|hulkling|wasp|goblin|sanctuary|quinjet|helicarrier|milano|benatar|blackbird|fantasticar|dark aster|statesman|taa ii|ego|knowhere|galactus|beta ray|jane foster|valkyrie|heimdall|hela|odin|loki|magneto|polaris|vision|ultron|nimrod|sentinel|master mold|banshee|northstar|aurora|firestar|sunfire|havok|cannonball|jean grey|phoenix|rachel|cable|psylocke|onslaught|apocalypse|namor|attuma|namora|black bolt|medusa|crystal|gorgon|ronan|super-skrull|annihilus|blastaar|thanos|corvus|proxima|ebony maw|supergiant|surtur|mangog|ymir|dormammu|umar|shuma|mephisto|nightmare|zarathos|ghost rider|dr |doctor strange|clea|wong|agamotto|vishanti|living tribunal|eternity|infinity|oblivion|order|chaos|in-betweener|one above all|stranger|watcher|arishem|eson|tiamut|jemiah|progenitor|ikaris|makkari|sersi|ajak|kingo|thena|gilgamesh|druig|phastos|sprite|zuras|starfox|eros|quasar|firelord|air-walker|terrax|stardust|morg|worldmind|gladiator|kahhori|america chavez|wiccan|scarlet witch|sylvie|alioth|beyonder|molecule man|franklin|legion|proteus|nate grey|vulcan|selene|exodus|krakoa|bast|great protector|shou-lao|fin fang|giganto|jormungandr|fenris|garm|dweller|belasco|surtur|sindr|drake|leviathan/i;

function canFly(b){
  if(FLY_ARCH[b.arch]) return true;
  for(const t of b.tags) if(FLY_TAG[t]) return true;
  if(FLY_NAME.test(b.name)) return true;
  return b.tier>=9;
}

