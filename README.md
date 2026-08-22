# Multiverse Vessel

A single-file 3D action game. You are a spark with no body of your own. You can hold on to
a person, and while you do, everything they can do is something you can do.

**616 beings. 74 pieces of gear. 30 artificial minds. 30 sectors.** One HTML file, no
libraries, no art files, no audio files — every character, every building, every effect and
every sound is generated from code at runtime.

Open `index.html` in a browser. That's the whole install.

## The rules that make it a game

**Beat somebody, become somebody.** Everything you put down joins the list of bodies you
can wear — from a Hell's Kitchen enforcer to the One Above All.

**You choose your body whenever you like — but never mid-fight.** Out of a fight, open the
menu and become anyone you have beaten; health comes back full. The moment you trade blows,
or something living starts hunting you, the choice locks for six seconds after the last
hit. Break away first.

**Gear belongs to a person.** Armour, hammers, symbiotes, cloaks — each is bound to its
owner. To use a suit properly you have to *be* the person it was built for; in anyone
else's hands it sits inert. Ten kills as its rightful owner attunes a piece to the vessel,
and after that any body can echo it at 55%, which is never the same thing.

**Artificial minds install into you, not into the body.** They follow you through every
change. Most of them refuse to run on flesh — Ultron will not, J.A.R.V.I.S. wants
circuitry, Cerebro only amplifies a mind that was already reaching.

**Eight locals draws the boss out.** Put the boss down and the sector is clear, the next
opens, a mind comes free, and you get a line of the story back.

**There is always work.** Every sector generates three jobs out of its own roster — hunt a
named target, hold a marker for thirty seconds while they keep coming, get civilians clear,
recover a piece of gear from whoever is standing over it, or run down someone who is
already running. Finish three and new work comes in.

## Controls

| | Keyboard | Touch |
|---|---|---|
| Move | `W A S D` / arrows | stick — touch anywhere on the left half |
| Look | drag, or click to lock the mouse | drag on the right half |
| Strike | `Z` | the four round buttons |
| Power | `X` | |
| Guard or heal | `C` | |
| Ultimate | `V` | |
| Jump | `Space` | JUMP |
| Fly | hold `Shift` | FLY |
| Surge | `Q` | SURGE |
| Guard / parry | hold `F` or right mouse | GUARD |
| Roll | `Shift` (if you can't fly) | ROLL |
| Lock on | `T` | LOCK |
| Change body | `B` | the portrait |
| Menu | `Esc` | ☰ |

Scroll to pull the camera in or out. Space climbs and Ctrl drops while flying. Jump onto
the rooftops — they are solid.

## Fighting

Three light strikes chain and the third lands at 1.6× with real knockback. Guarding stops
most of what you are facing and drains energy — run it dry and your guard breaks. A hit
that arrives in the first quarter-second of a guard is a **parry**: no damage, the attacker
staggers, and a quarter of it goes back. Enemies wind up for about half a second before
anything heavy, with a flare around their feet — that is your cue to block, parry or roll.
Enough punishment in a few seconds breaks a stance outright, and hits on a broken stance
land 40% harder.

## Spending what you gather

Essence buys four things, and none of it can be done mid-fight:

- **The vessel** — a deeper surge, faster out-of-combat recovery, more essence per kill,
  longer invulnerability on rolls. These carry across every body you wear.
- **Abilities** — each of a body's four moves can be worked up three ranks: +9% damage and
  6% faster recovery per rank.
- **Gear** — three ranks per piece, and each rank also lowers how many kills it takes to
  attune.
- **Mastery** costs nothing but use: every kill while wearing a body counts, and 25 / 75 /
  150 each add +4% to everything they are.

## The city

Every sector builds its own ground. Four terrains — city blocks and straight streets,
crowded uneven towers, low wide halls with open ground between them, and open ground with a
few masses on it — so Sanctum Sanctorum does not look like Hell's Kitchen in a different
colour. A 608-metre grid with traffic running the roads, people on the
pavement who scatter when a fight starts, street lamps and cars you can wreck, and
buildings that stand on pillars so you can walk in under them. The sun goes round on an
eight-minute cycle — dawn, noon, dusk, night with the windows lit — and it rains about
a third of the time.

## Sound

Sixteen sounds, all synthesised at the moment they play — impacts, a bright chime for a
parry, whooshes, beams, explosions, footsteps, a low city drone and rain that fades with
the weather. There are no audio files in this repository. It starts on your first tap,
because that is the rule browsers hold you to, and there is an on/off switch in Rules.

## Under the hood

- **Renderer**: hand-written WebGL. Sun with a real shadow map (packed depth, 3×3 PCF),
  sky-and-ground hemisphere ambient, specular and fresnel rim, exponential height fog,
  bloom, ACES filmic tonemap. Procedural asphalt, kerbs, road paint and building facades —
  every lit window is a shader term, not a texture.
- **Characters**: forward kinematics over a real skeleton — hip/knee/ankle and
  shoulder/elbow/wrist — with limbs as tapered tubes and joints as spheres. Costume
  colours, capes, visors, horns and wings are derived from the character's name, so the
  same being always looks the same and no two look quite alike.
- **Balance**: stats derive from tier and archetype and were tuned against a simulator.
  Same-tier archetype win rates sit in a 59–74% band; sector bosses are 33–68% at level 1
  and comfortably beatable with levels, bound gear and the right mind.
- **Quality**: High / Medium / Low in the Rules tab. Low turns off shadows and bloom.
  Progress saves to your browser; there is a save code in the same tab.

## Checking it still works

`test/regress.js` drives the real game in a real browser and asserts from page state, not
from screenshots — that the world comes up, that all 616 beings build, that a body cannot
be changed mid-fight, that guarding, parrying and rolling do what they claim, that gear
stays bound to its owner, that missions start and abandon, that ranks buy, that bosses
turn, that the city stays populated, and that the save round-trips.

```
npm i playwright
node test/regress.js
```

It exits non-zero on any failure. Twenty-one checks, currently all passing.

## Unofficial fan project

Not affiliated with, endorsed by, or produced by Marvel or The Walt Disney Company. All
character names are trademarks of their respective owners and are used here as an unpaid
tribute by a fan. No Marvel art, audio or code is copied or included — everything you see
is drawn procedurally from the source in this repository.
