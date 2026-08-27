/* == data/build.js ==
   hashing, colour and the code that turns those lines into beings
   Part of Multiverse Vessel. Loaded in order from index.html. */

function hash(str){let h=2166136261>>>0;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
function jitter(seed,spread){return ((hash(seed)%1000)/1000-.5)*2*spread;}
function slug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
/* nudge a family colour so a grid of six hundred marks does not read as six colours */
function shiftHex(hex,dh,dl){
  let r=parseInt(hex.slice(1,3),16)/255, g=parseInt(hex.slice(3,5),16)/255, b=parseInt(hex.slice(5,7),16)/255;
  const mx=Math.max(r,g,b), mn=Math.min(r,g,b); let h=0,sK=0,l=(mx+mn)/2;
  if(mx!==mn){ const d=mx-mn; sK = l>.5 ? d/(2-mx-mn) : d/(mx+mn);
    h = mx===r ? (g-b)/d + (g<b?6:0) : mx===g ? (b-r)/d+2 : (r-g)/d+4; h*=60; }
  h = (h + dh + 360) % 360; l = Math.min(.72, Math.max(.24, l + dl/100));
  const c=(1-Math.abs(2*l-1))*sK, x=c*(1-Math.abs((h/60)%2-1)), m=l-c/2;
  let rgb = h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  return "#"+rgb.map(v=>Math.round((v+m)*255).toString(16).padStart(2,"0")).join("");
}

/* A hex out of the tables above is a poster colour: fully saturated, high
   value, the way a logo is drawn. Cloth is never that. Real dye sits well
   below full saturation and a fabric under daylight is darker than the swatch
   it was picked from — and everybody being at 100% is most of why six hundred
   people read as painted plastic. This pulls a hex back to something a dyer
   could actually have made, with a little variation so a street is not one
   tone. */
function fabric(hex, sat, lift, jitter){
  let r=parseInt(hex.slice(1,3),16)/255, g=parseInt(hex.slice(3,5),16)/255, b=parseInt(hex.slice(5,7),16)/255;
  const mx=Math.max(r,g,b), mn=Math.min(r,g,b);
  let h=0, sK=0; const l=(mx+mn)/2;
  if(mx!==mn){ const d=mx-mn; sK = l>.5 ? d/(2-mx-mn) : d/(mx+mn);
    h = mx===r ? (g-b)/d + (g<b?6:0) : mx===g ? (b-r)/d+2 : (r-g)/d+4; h*=60; }
  sK = Math.max(0, Math.min(1, sK*(sat===undefined?0.66:sat)));
  const L = Math.max(0.05, Math.min(0.88, l*(lift===undefined?0.80:lift) + (jitter||0)));
  const c=(1-Math.abs(2*L-1))*sK, x=c*(1-Math.abs((h/60)%2-1)), m=L-c/2;
  const rgb = h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  return "#"+rgb.map(v=>Math.round(Math.max(0,Math.min(1,v+m))*255).toString(16).padStart(2,"0")).join("");
}

const HUES = {hero:"#2C6FE4",villain:"#B7231A",antihero:"#7B4BC9",cosmic:"#1E9AA8",mutant:"#C98A05",
  mystic:"#8E3AA8",ai:"#0E7C78",beast:"#7A5A22",tech:"#2E7D5B",entity:"#4A3E9E",object:"#5B6470",
  symbiote:"#232336",vehicle:"#3C5A78",civilian:"#6A6076",agent:"#3B4A63"};


/* A figure should be recognisable across a street. Named colours first,
   then family colours, then the tag palette. */
const NAME_HUE = [
[/^daredevil/i,"#B01118"],[/elektra/i,"#B5372B"],[/punisher/i,"#17181C"],[/kingpin/i,"#DCD6C6"],
[/luke cage/i,"#E8B62A"],[/iron fist/i,"#16A862"],[/moon knight|mister knight|jake lockley/i,"#E4E1D8"],
[/^blade/i,"#1B1B22"],[/shang-chi/i,"#B5372B"],[/^stick|colleen|misty/i,"#8C6A3A"],
[/^spider-man\b|^spider-man \(|^ben reilly|scarlet spider|superior spider/i,"#CE1F25"],
[/miles morales/i,"#17171E"],[/ghost-spider|spider-ham/i,"#E2DCD2"],[/spider-man 2099/i,"#1F5FD0"],
[/spider-woman|^silk\b/i,"#B5232B"],[/^venom|agent venom|riot|phage|lasher|agony|doppelganger/i,"#15141B"],
[/carnage|^scream/i,"#A9171B"],[/anti-venom/i,"#DEDACF"],[/^toxin/i,"#8C2C2C"],
[/green goblin|hobgoblin/i,"#2C9448"],[/doctor octopus/i,"#2C9459"],[/^electro/i,"#DFC024"],
[/sandman/i,"#B99A48"],[/^rhino/i,"#75787F"],[/kraven|^lizard/i,"#7E5628"],
[/mysterio/i,"#2AAE9B"],[/vulture/i,"#4A6551"],[/black cat|^prowler|chameleon/i,"#16161D"],
[/captain america|captain carter|^patriot|u\.s\. agent/i,"#2A4890"],[/winter soldier/i,"#4A535F"],
[/^falcon/i,"#96372A"],[/black widow|yelena|taskmaster/i,"#1A1A22"],[/hawkeye|kate bishop/i,"#662B85"],
[/^iron man|iron heart|ironheart|^rescue|iron spider/i,"#BC1029"],[/war machine/i,"#53575D"],
[/^the hulk|bruce banner|^skaar|maestro/i,"#3B9137"],[/she-hulk/i,"#4AA645"],[/red hulk/i,"#A82720"],
[/abomination/i,"#67853F"],[/^thor\b|thor corps|party thor|jane foster|^throg/i,"#2A56A0"],
[/^loki|sylvie|kid loki|alligator loki/i,"#1D7241"],[/^odin|heimdall|adam warlock|^nova\b|nova prime|nova corps|nova centurion/i,"#C09B24"],
[/^hela|karnilla/i,"#1E6548"],[/valkyrie/i,"#2C68A0"],[/beta ray bill|korg|^skurge/i,"#9C372A"],
[/surtur|mangog|sindr|^ulik/i,"#BC3F1E"],[/^ymir|frost giant|laufey|skadi/i,"#6FA8C8"],
[/^vision\b/i,"#A63737"],[/ultron|nimrod|sentinel|master mold|bastion|doombot|adaptoid|awesome android/i,"#767C84"],
[/scarlet witch|wiccan|agatha/i,"#A9222A"],[/quicksilver|^speed\b|makkari|northstar|aurora/i,"#8598AC"],
[/captain marvel|photon|mar-vell|genis-vell|monica/i,"#1B4CA0"],[/ms\. marvel|kamala/i,"#A9222A"],
[/ant-man|hank pym|cassie|^ghost\b|yellowjacket/i,"#A9222A"],[/^wasp|janet/i,"#E0B82C"],
[/black panther|^shuri|^okoye|^nakia|white wolf|killmonger|^ayo|^ramonda|^zuri|dora/i,"#282341"],
[/^storm\b|emma frost|silver surfer|^sif\b/i,"#DEDACF"],[/wolverine|^x-23|honey badger|old man logan/i,"#D8AE12"],
[/cyclops|^havok|^bishop|^forge/i,"#1F5AC0"],[/jean grey|phoenix|rachel summers|^firestar|^magma/i,"#BC3F1E"],
[/professor x|^cable|^cypher|^sage/i,"#68758A"],[/magneto|polaris|^exodus/i,"#851F85"],
[/mystique|^destiny|^angel\b|archangel/i,"#2C68A0"],[/nightcrawler|^pixie|^magik|darkchylde/i,"#1D2764"],
[/colossus|^warpath|^juggernaut|absorbing man/i,"#7F858E"],[/^rogue\b|^beast\b|^wolfsbane|^banshee/i,"#1D7147"],
[/gambit|psylocke|^emplate|^selene|^stryfe/i,"#66288A"],[/^iceman|^blizzard|^crystal/i,"#79BFDE"],
[/sabretooth|^toad|^blob|^marrow|omega red/i,"#B39A44"],[/apocalypse|^onslaught|^nate grey|^proteus|^legion/i,"#463586"],
[/deadpool|deadpool corps/i,"#A81118"],[/^domino|^longshot|^jubilee|^dazzler/i,"#D9B02C"],
[/doctor doom|god emperor doom|kristoff/i,"#3A7346"],[/mister fantastic|invisible woman|^valeria|^franklin/i,"#2C55A0"],
[/human torch|^firelord|^sunfire|^sunspot|^inferno/i,"#DE6520"],[/the thing|^korg|^m'baku/i,"#BC8036"],
[/galactus|^terrax|^stardust|^morg|air-walker|^ego\b/i,"#553586"],
[/thanos|^eros|^starfox|^mentor|black order|corvus|proxima|cull obsidian|supergiant|ebony maw/i,"#67458A"],
[/^gamora|^mantis|^groot|^xavin/i,"#2C8A56"],[/star-lord|^yondu|^kraglin|^drax/i,"#733728"],
[/rocket raccoon|^cosmo|^lockjaw|^zabu|^old lace|devil dinosaur|^goose|^jeff|^redwing|^miek/i,"#835628"],
[/^nebula|death's head|^worldmind|^praxagora|^jocasta|machine man|miss minutes/i,"#466A8A"],
[/^ronan|supreme intelligence|korath|yon-rogg|minn-erva|att-lass|kree/i,"#2C7466"],
[/skrull|super-skrull|^talos|^soren|veranke|^paibok|^dorrek/i,"#3A8A46"],
[/doctor strange|sheriff strange|strange supreme|^clea|^ancient one/i,"#1F4CA0"],
[/^wong|brother voodoo|^hellstrom|^satana|^rintrah/i,"#73282A"],[/mordo|^kaecilius|^umar|^kaluu|black swan|black priest/i,"#2C7455"],
[/dormammu|shuma-gorath|^cyttorak|^chthon|^belasco|s'ym|n'astirh/i,"#B03F1E"],
[/mephisto|blackheart|^nightmare|zarathos|^dweller|^mangog/i,"#A9171B"],
[/ghost rider|robbie reyes|danny ketch|^johnny blaze/i,"#DE7B26"],
[/morbius|werewolf|^man-thing|^sauron|^stegron|fin fang|^giganto|^garm|^fenris|jormungandr/i,"#5B7238"],
[/living tribunal|^eternity|^infinity\b|oblivion|master order|lord chaos|in-betweener|one above all|^stranger|vishanti|agamotto|^roma|^merlyn|beyonder|ivory kings/i,"#C0A24A"],
[/arishem|^eson|^tiamut|^jemiah|progenitor|celestial|^knowhere/i,"#8A6A2A"],
[/^sersi|^ikaris|^thena|gilgamesh|^kingo|^sprite|^phastos|^druig|^ajak|^zuras|^kro\b/i,"#B8942C"],
[/kang|rama-tut|scarlet centurion|he who remains|immortus|renslayer|council of kangs/i,"#2C7455"],
[/^alioth|time-keeper|mobius|hunter b-15|minuteman|pruning/i,"#C08A2A"],
[/annihilus|blastaar|^ravenous|^syphonn|^tyros/i,"#9C7A22"],
[/^namor|^namora|^attuma|^talokan|namorita/i,"#2C8A7A"],
[/black bolt|^medusa|^karnak|^gorgon|^triton|^maximus|^lash|^ahura|^iso\b|^reader|^quake|^kamran/i,"#4A3A86"],
[/grandmaster|collector|^topaz|^caiera|red king|^elloe|^hiroim/i,"#B04A8A"],
[/krakoa|^warlock|^danger|^bast|great protector|shou-lao/i,"#4A8A3A"],
[/molecule man|beyonders|^sentry|^void\b|blue marvel|^kahhori|america chavez/i,"#C0A24A"],
[/^sentinel|^prison 42|helicarrier|quinjet|milano|benatar|blackbird|fantasticar|statesman|dark aster|taa ii|sanctuary ii|^griot|^herbie|^edith|jarvis|friday|^karen/i,"#4A5A6E"]
];
const FAMILY_HUE = {symbiote:"#15141B",asgardian:"#C09B24",kree:"#2C7466",skrull:"#3A8A46",
  celestial:"#8A6A2A",eternal:"#B8942C",inhuman:"#4A3A86",atlantean:"#2C8A7A",demon:"#A9171B",
  ai:"#3E7A7A",vehicle:"#4A5A6E",wakandan:"#282341",spider:"#CE1F25",mutant:"#B08A22"};
function hueFor(name, tags){
  for(const [re,hex] of NAME_HUE) if(re.test(name)) return hex;
  for(const t of tags) if(FAMILY_HUE[t]) return FAMILY_HUE[t];
  for(const t of tags) if(HUES[t]) return HUES[t];
  return "#6A6076";
}

function buildBeing(row,idx){
  const [name,tierS,arch,sector,tagS,sig] = row.split("|");
  const tier = parseInt(tierS,10);
  const tags = tagS ? tagS.split(",") : [];
  const w = ARCH[arch].w;
  const base = 12 + tier*6;
  const seed = name+arch;
  const st = {
    p: Math.max(4,Math.round(base*w.p + jitter(seed+"p",base*.09))),
    d: Math.max(4,Math.round(base*w.d + jitter(seed+"d",base*.09))),
    s: Math.max(3,Math.round(base*w.s + jitter(seed+"s",base*.09))),
    n: Math.max(46,Math.round((58 + tier*5)*w.n))
  };
  let hue = hueFor(name, tags);
  hue = shiftHex(hue, jitter(seed+"h",7), jitter(seed+"l",6));
  const initials = name.replace(/[^A-Za-z0-9 ]/g,"").split(/\s+/).filter(Boolean)
    .slice(0,2).map(x=>x[0]).join("").toUpperCase() || "?";
  return {
    id:slug(name), i:idx, name, tier, arch, sector, tags, sig:sig||"", st,
    hp: Math.round(130 + tier*42 + st.d*1.2),
    hue, initials,
    kind:"being"
  };
}

const BEINGS = ROSTER.map(buildBeing);
const BY_ID = {}; BEINGS.forEach(b=>{BY_ID[b.id]=b;});

const GEAR_LIST = GEAR.map(([name,owner,kind,p,d,s,n,move,note],i)=>({
  id:slug(name), i, name, owner, ownerId:slug(owner), kind,
  mods:{p,d,s,n}, move, note, hue:kind==="relic"?"#9A6A04":kind==="substance"?"#2F7D4F":"#3C5A78",
  initials:name.replace(/[^A-Za-z0-9 ]/g,"").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()
}));
const GEAR_BY_ID = {}; GEAR_LIST.forEach(g=>{GEAR_BY_ID[g.id]=g;});
const GEAR_BY_OWNER = {}; GEAR_LIST.forEach(g=>{(GEAR_BY_OWNER[g.ownerId] ||= []).push(g);});

const AI_LIST = AIS.map(([name,req,mods,fx,note],i)=>({
  id:slug(name), i, name, req, mods, fx, note, hue:"#0E7C78",
  initials:name.replace(/[^A-Za-z0-9. ]/g,"").replace(/\./g,"").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()
}));
const AI_BY_ID = {}; AI_LIST.forEach(a=>{AI_BY_ID[a.id]=a;});
