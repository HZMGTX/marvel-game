# Multiverse Vessel

A single-file 3D action game. You are a spark with no body of your own. You can hold on to
a person, and while you do, everything they can do is something you can do.

**616 beings. 74 pieces of gear. 30 artificial minds. 30 sectors.** One HTML file, no
libraries, no art files, no audio files — every character, every building and every effect
is generated from code at runtime.

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
opens, and a mind comes free.

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
| Change body | `B` | the portrait |
| Menu | `Esc` | ☰ |

Scroll to pull the camera in or out. Space climbs and Ctrl drops while flying. Jump onto
the rooftops — they are solid.

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

## Unofficial fan project

Not affiliated with, endorsed by, or produced by Marvel or The Walt Disney Company. All
character names are trademarks of their respective owners and are used here as an unpaid
tribute by a fan. No Marvel art, audio or code is copied or included — everything you see
is drawn procedurally from the source in this repository.
