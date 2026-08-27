/* == data/bosses.js ==
   who comes out to meet you at the end of each sector
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* Picking the boss by tier alone put Kronos on Titan instead of Thanos, Alioth
   in the TVA instead of He Who Remains, and Man-Thing in Hell's Kitchen — an
   alphabetical tiebreak deciding a sector's climax. These are named. Anything
   not named here still falls back to the highest tier in the sector. */
const SECTOR_BOSS = {
  hk:    "kingpin",
  qns:   "green-goblin",
  man:   "ultron",
  raft:  "juggernaut",
  wch:   "dark-phoenix",
  kra:   "onslaught",
  wak:   "killmonger",
  lat:   "doctor-doom",
  sav:   "fin-fang-foom",
  kun:   "shou-lao-the-undying",
  att:   "black-bolt",
  sanc:  "mephisto",
  dark:  "dormammu",
  limbo: "belasco",
  asg:   "odin",
  musp:  "surtur",
  hel:   "hela",
  quant: "kang-the-conqueror",
  nz:    "annihilus",
  sak:   "grandmaster",
  know:  "the-collector",
  xan:   "galactus",
  hala:  "supreme-intelligence",
  tarnax:"super-skrull",
  titan: "thanos",
  oly:   "arishem-the-judge",
  bw:    "god-emperor-doom",
  tva:   "he-who-remains",
  bleed: "knull",
  above: "the-living-tribunal"
};
