/* == play/story.js ==
   what the sectors say back to you
   Part of Multiverse Vessel. Loaded in order from index.html. */

/* -------------------------------------------------------------- first steps */
/* Contextual, one at a time, triggered by what the player has just done
   rather than dumped on them at the start. */
const HINTS = [
  {id:"move",   when:()=>true,
   text:()=>touched ? "Left half of the screen to move, right half to look around."
                    : "WASD to move. Drag the mouse — or click once — to look around."},
  {id:"strike", when:()=>G.player && Math.hypot(G.player.vx,G.player.vz) > 2,
   text:()=>touched ? "The four round buttons fight. Three strikes in a row hit hardest on the third."
                    : "Z strikes. Three in a row run together and the third one lands properly."},
  {id:"guard",  when:()=>G.player && G.player.hp < G.player.maxHp*0.92,
   text:()=>touched ? "GUARD holds them off. A hit the instant you raise it is a parry."
                    : "Hold F to guard. A hit in the first quarter-second of it is a parry — it staggers them and hands it back."},
  {id:"kill",   when:()=>S.unlocked.length > 3,
   text:()=>"Everything you beat becomes a body you can wear. Eight of the locals draws the boss out."},
  {id:"become", when:()=>S.unlocked.length > 5 && !inCombat(),
   text:()=>touched ? "Tap your portrait to become someone else — but never mid-fight."
                    : "B to become someone else. Free out of a fight, impossible in one."},
  {id:"work",   when:()=>S.essence > 180,
   text:()=>"There is work on the board in the menu, and essence buys ranks under Power."},
  {id:"gear",   when:()=>S.gearOwned.length > 0,
   text:()=>"You picked something up. It only works properly in the hands it was made for — become its owner first."}
];
function hintTick(){
  if(G.paused || !G.player) return;
  S.hints = S.hints || {};
  if(G.hintHold && G.t < G.hintHold) return;
  for(const h of HINTS){
    if(S.hints[h.id]) continue;
    if(!h.when()) continue;
    S.hints[h.id] = true;
    G.hintHold = G.t + 7000;
    feed(h.text(), "big");
    save();
    return;
  }
}

/* ------------------------------------------------------------------ story */
const STORY = {
  hk:   "The first one is always the worst. You did not ask what they wanted with the rest of their evening.",
  qns:  "One of them looked straight at where you were, and there was nothing there to look at.",
  man:  "They keep records here. Somewhere in a file is a list of people who behaved strangely for one afternoon.",
  raft: "Every cell in this place holds somebody who could not stop. You are wondering when you last chose to.",
  wch:  "A telepath brushed the inside of the body you were wearing and recoiled. Not from the body.",
  kra:  "The island knew. It let you walk anyway, the way you let a stray in out of the rain.",
  wak:  "The panther god watched you the whole way through and did not say a word about it.",
  lat:  "Doom addressed the spark, not the mouth. Nobody has done that before.",
  asg:  "Odin has a word for what you are. He would not repeat it.",
  sanc: "Strange offered to put you back where you came from. You did not know how to answer.",
  dark: "Dormammu made an offer. The frightening part was how reasonable it sounded.",
  titan:"Thanos said you were the only honest thing he had met in a century, and meant it as a compliment.",
  bw:   "On a world stitched from dead universes, nobody could tell you were borrowed.",
  tva:  "The file on you is one line long, and it has been redacted twice.",
  bleed:"Between universes there is nothing to hold on to, and you are still here. That answers something.",
  above:"They have all been watching. The question was never whether you could. It was whether you would stop."
};
