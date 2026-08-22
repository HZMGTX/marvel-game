/* == body/palette.js ==
   the colours a name is worth, and the build it implies
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* ==========================================================================
   THE BODY
   A person is a skeleton of joints; the limbs are tubes between them and the
   joints are spheres, so the silhouette is human rather than stacked crates.
   Proportions are in metres for a 1.80 m frame at size 1.
   ========================================================================== */
const SKIN = [
  "#F0C8A0","#E0B088","#C89468","#A87048","#8A5836","#6B4226","#4E2F1C","#F5D6B8"
];
const HAIR = ["#1A1410","#2E1F14","#4A3520","#6B4A22","#8C6A2A","#A8A090","#E4E0D6","#2A2A32"];

const PALETTES = {};
function palette(b){
  if(PALETTES[b.id]) return PALETTES[b.id];
  const h = hash(b.name+"/"+b.arch);
  const p = n => ((h >> n) & 255)/255;
  const c1 = b.hue;
  const c2 = shiftHex(c1, 150 + p(3)*70, -18);
  const c3 = shiftHex(c1, -24 + p(5)*48, 24);
  const tags = b.tags.join(",");
  const machine = b.arch==="SYNTH" || b.tags.includes("ai") || b.tags.includes("vehicle") || b.tags.includes("object");
  const armoured = machine || b.arch==="TECH" || /armor|iron|war machine|doom|destroyer|sentinel|nimrod/i.test(b.name);
  const masked = p(9) > 0.22 || /spider|panther|daredevil|deadpool|moon knight|ghost/i.test(b.name);
  const pal = {
    c1:srgb(c1), c2:srgb(c2), c3:srgb(c3),
    dark:srgb(shiftHex(c1,0,-24)), light:srgb(shiftHex(c1,0,14)),
    skin:srgb(SKIN[(h>>>11)%SKIN.length]),
    hair:srgb(HAIR[(h>>>15)%HAIR.length]),
    cape: /monarch|asgardian|mystic|entity|celestial|eternal|demon/.test(tags)
          || /MONARCH|MYSTIC|ENTITY/.test(b.arch) ? p(7)>0.28 : p(7)>0.86,
    capeCol: srgb(/thor|jane foster|magneto|vision|doctor strange|strange supreme|sheriff/i.test(b.name)
                  ? "#8E1F1B"
                  : shiftHex(c1, p(19)>.72 ? 26 : 0, p(23)>.5 ? -22 : -12)),
    masked, machine, armoured,
    hooded: /mystic|demon/.test(tags) && p(21)>0.6,
    horns: /demon|deviant/.test(tags) || p(25)>0.975,
    winged: /^angel|archangel|^falcon|^vulture|^firelord|^stardust|^air-walker/i.test(b.name),
    bulk: 0.92 + (b.arch==="TITAN"?0.30:0) + (b.arch==="SPEED"||b.arch==="ROGUE"?-0.06:0) + p(27)*0.12,
    /* proportions, so six hundred people are not one mannequin at six
       hundred sizes. All within a plausible human range. */
    legs:   1.0 + (p(31)-0.5)*0.16 + (b.arch==="SPEED"?0.07:0) + (b.arch==="TITAN"?-0.05:0),
    torso:  1.0 + (p(37)-0.5)*0.12 + (b.arch==="TITAN"?0.06:0),
    shoulder:1.0 + (p(41)-0.5)*0.18 + (b.arch==="TITAN"?0.16:0) + (b.arch==="SPEED"?-0.08:0),
    headSz: 1.0 + (p(43)-0.5)*0.14 + (b.tags.includes("beast")?0.08:0),
    limb:   1.0 + (p(47)-0.5)*0.16 + (b.arch==="TITAN"?0.14:0) + (b.arch==="SPEED"?-0.09:0),
    arms:   1.0 + (p(53)-0.5)*0.12 + (b.tags.includes("beast")?0.10:0),
    glow: b.tier>=8 || b.arch==="COSMIC" || b.arch==="ENTITY",
    rough: machine ? 0.26 : /symbiote/.test(tags) ? 0.22 : 0.74,
    metal: armoured ? 0.85 : /symbiote/.test(tags) ? 0.25 : 0.04
  };
  PALETTES[b.id] = pal;
  return pal;
}

/* rotate a local point (x right, y up, z forward) into the world */
