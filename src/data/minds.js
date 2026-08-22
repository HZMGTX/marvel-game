/* == data/minds.js ==
   thirty artificial minds and what they do to a host
   Part of Multiverse Vessel. Loaded in order from index.html. */

const AIS = [
["J.A.R.V.I.S.","tech",{p:4,d:4,s:4,n:10},"targeting","Runs the suit, the house, and most of Tony's better decisions."],
["F.R.I.D.A.Y.","tech",{p:8,d:2,s:6,n:8},"assist","Faster, blunter, and less inclined to argue than her predecessor."],
["E.D.I.T.H.","tech",{p:10,d:0,s:4,n:8},"strike","A satellite network handed to a teenager. It went badly."],
["Karen","tech",{p:4,d:2,s:8,n:8},"encourage","The suit lady. Enthusiastically in favour of instant kill mode."],
["Veronica","tech",{p:6,d:12,s:-2,n:6},"plating","Orbital support that drops armour plates on request."],
["Ultron","synth",{p:16,d:8,s:4,n:6},"adapt","There are no strings on him. There is also no off switch."],
["Vision's Mind Stone","synth",{p:12,d:10,s:2,n:14},"phase","A stone that learned to be a person, still doing sums."],
["Arnim Zola","synth",{p:10,d:6,s:0,n:10},"backup","A consciousness on tape. It has been copied many times."],
["Cerebro","psi",{p:6,d:0,s:0,n:20},"foresee","Amplifies a mind until every other mind is a room you can enter."],
["Danger","synth",{p:10,d:10,s:6,n:8},"simulate","The training room woke up and remembered every session."],
["Nimrod Protocol","synth",{p:14,d:12,s:8,n:8},"adapt","Learns the shape of you and stops letting it work."],
["Master Mold Core","synth",{p:12,d:16,s:-4,n:6},"plating","It exists to build the things that hunt."],
["H.E.R.B.I.E.","tech",{p:2,d:6,s:4,n:10},"repair","Politely competent. Frequently the only adult present."],
["Miss Minutes","any",{p:6,d:4,s:6,n:10},"foresee","Friendly clock face. Absolutely not on your side."],
["Worldmind","any",{p:12,d:8,s:6,n:18},"allocate","The recorded mind of Xandar, allocating force by the microsecond."],
["Supreme Intelligence","any",{p:14,d:10,s:2,n:16},"foresee","A lake of the best Kree minds, all of them certain."],
["Griot","tech",{p:6,d:6,s:6,n:10},"repair","Wakandan systems intelligence. Never raises its voice."],
["Machine Man","synth",{p:12,d:10,s:8,n:8},"assist","X-51 chose to be a person, which none of the others managed."],
["Jocasta","synth",{p:8,d:8,s:6,n:12},"repair","Built from a mind that was taken. She kept the better half."],
["ISAAC","any",{p:8,d:6,s:2,n:14},"allocate","Titan's caretaker system, still running an empty moon."],
["Doombot Core","tech",{p:12,d:12,s:0,n:8},"backup","Insists, under interrogation, that it is the real Doom."],
["The Maker's Uplink","tech",{p:16,d:4,s:6,n:12},"strike","A Reed Richards with none of the restraint."],
["Recorder 451","any",{p:6,d:8,s:0,n:12},"simulate","Records everything. Has plans about what to do with it."],
["Sage","psi",{p:6,d:2,s:6,n:14},"simulate","A human computer who never stopped taking notes."],
["Warlock","synth",{p:14,d:10,s:10,n:10},"adapt","Technarch, and genuinely delighted to be your friend."],
["Bastion Directive","synth",{p:14,d:14,s:4,n:6},"adapt","A future that keeps trying to install itself early."],
["Alkhema","synth",{p:14,d:6,s:8,n:6},"strike","Ultron built a partner. She disagreed about the extinction."],
["SP//dr OS","tech",{p:8,d:8,s:10,n:10},"encourage","The suit and the pilot share a nervous system. And a temper."],
["Prison 42 Warden","tech",{p:6,d:14,s:-2,n:8},"plating","Runs the cells, the doors, and the silence between them."],
["Quantum Bands AI (Eon)","any",{p:10,d:10,s:6,n:16},"allocate","The Protector's briefing, arriving unasked in your head."]
];

const AI_FX = {
  targeting:{label:"Targeting Solution", desc:"+12% critical chance, and your criticals hit harder."},
  assist:   {label:"Combat Assist",      desc:"Once per fight, cancels a hit that would drop you below a quarter health."},
  strike:   {label:"Orbital Strike",     desc:"The first blow you land in each fight hits 45% harder."},
  encourage:{label:"Encouragement",      desc:"Energy comes back much faster while you are below half health."},
  plating:  {label:"Drop Plating",       desc:"A shield goes up by itself the moment a fight starts."},
  adapt:    {label:"Adaptive Learning",  desc:"The longer a fight runs the less it hurts — 2% a second, to a quarter off."},
  phase:    {label:"Density Control",    desc:"A quarter of everything aimed at you passes straight through."},
  backup:   {label:"Backup Consciousness",desc:"Once per sector, puts you back on your feet at 30% when the host falls."},
  foresee:  {label:"Precognition",       desc:"You slip one hit in seven, and afflictions land 30% less often."},
  simulate: {label:"Combat Simulation",  desc:"+10% damage against anyone you have already beaten once."},
  repair:   {label:"Field Repair",       desc:"Steadily puts health back while you are still standing."},
  allocate: {label:"Force Allocation",   desc:"+30% energy regeneration."}
};

/* ------------------------------------------------------------- generation */
