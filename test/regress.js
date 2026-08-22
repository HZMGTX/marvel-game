/* Multiverse Vessel — regression harness.
 *
 * Drives the real game in a real browser and asserts from page state rather
 * than from screenshots: that the world comes up, that every one of the 616
 * beings builds, that a body cannot be changed mid-fight, that guarding,
 * parrying and rolling do what they claim, that gear stays bound to its
 * owner, that missions start and abandon, that ranks buy, that bosses turn,
 * that the city stays populated, and that the save round-trips.
 *
 *   npm i playwright
 *   node test/regress.js            # exits non-zero on any failure
 *
 * Set GAME_URL to point at a different build; defaults to the file beside it.
 */
const { chromium } = require('playwright');
const errs=[]; const fail=[];
const ok = (name, cond, extra) => { (cond?0:fail.push(name+(extra?" ("+extra+")":""))); console.log((cond?"  PASS  ":"  FAIL  ")+name+(extra?"  "+extra:"")); };
(async ()=>{
  const launch = {args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']};
  if(process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;
  const b = await chromium.launch(launch);
  const ctx = await b.newContext({viewport:{width:900,height:560}});
  const p = await ctx.newPage(); p.setDefaultTimeout(25000);
  p.on("pageerror", e=>errs.push("PAGEERROR: "+e.message+" @ "+(e.stack||"").split("\n")[1]));
  p.on("console", m=>{ if(m.type()==="error"&&!/net::/.test(m.text())) errs.push("CONSOLE: "+m.text()); });
  await p.goto(process.env.GAME_URL || ("file://" + require("path").resolve(__dirname, "../index.html")));
  await p.waitForTimeout(400);
  await p.evaluate(()=>{ quality="low"; resize(); });
  await p.click('[data-start="luke-cage"]');
  await p.waitForTimeout(1300);

  const r = await p.evaluate(()=>{
    const o = {};
    o.live = !!G.player && G.ents.length>1 && G.world.boxes.length>0 && drawCalls>100;
    o.counts = {beings:BEINGS.length, gear:GEAR_LIST.length, ai:AI_LIST.length, sectors:SECTORS.length};

    // every being builds a palette and a unit without throwing
    let bad = 0, badName = "";
    for(const bn of BEINGS){ try{ palette(bn); unitStats(bn,{level:1}); }catch(e){ bad++; badName=bn.name+": "+e.message; } }
    o.allBeings = {bad, badName};

    o.city = {cars:G.cars.length, civs:G.ents.filter(e=>e.team==="civ").length,
              props:G.world.props.length, weather:G.weather};

    // combat lock
    G.lastCombat = G.t;
    const h0 = S.host, other = S.unlocked.find(x=>x!==h0);
    becomeHost(other); o.lockedInCombat = S.host === h0;
    G.ents = G.ents.filter(e=>e.team==="you"); G.lastCombat = -1e9;
    becomeHost(other); o.freeOutOfCombat = S.host === other;

    // guard / parry / roll / stagger
    G.lastCombat = -1e9;
    S.host = h0; buildHost();
    const P = G.player;
    const foe = makeEnt(S.unlocked[1], P.x+1.2, P.z, "foe", {}); G.ents.push(foe);
    P.hp = P.maxHp; P.blocking = false; P.fx = {};
    const open0 = P.hp; dealDamage(foe,P,1.0,{}); const openDmg = open0-P.hp;
    P.hp = P.maxHp; P.fx = {}; P.blocking = true; P.blockStart = G.t-1000;
    P.yaw = Math.atan2(foe.x-P.x, foe.z-P.z);
    const blk0 = P.hp; dealDamage(foe,P,1.0,{}); const blkDmg = blk0-P.hp;
    o.block = blkDmg < openDmg*0.6;
    P.hp = P.maxHp; P.fx = {}; P.blockStart = G.t; foe.fx = {};
    dealDamage(foe,P,1.0,{});
    o.parry = P.hp === P.maxHp && hasFx(foe,"stun");
    P.blocking=false; P.fx={}; P.rollT=0; P.rollCd=0; P.grounded=true;
    startRoll(P,{x:0,y:1}); o.roll = !!P.rollT && hasFx(P,"iframe");

    // gear rule
    const g = GEAR_LIST.find(x=>BY_ID[x.ownerId]);
    S.gearOwned.push(g.id);
    o.gearBoundOnly = !canEquip(g, h0) || g.ownerId === h0;
    S.attuned.push(g.id);
    o.gearEchoesWhenAttuned = canEquip(g, h0);
    S.attuned.pop();

    // missions
    const offers = missionOffers(G.sector);
    o.missionOffers = offers.length === 3;
    G.mission = null; startMission(offers[0]); o.missionStarts = !!G.mission && !!G.mission.marker;
    abandonMission(); o.missionAbandons = !G.mission;

    // progression
    S.essence = 99999; G.lastCombat = -1e9;
    const lv0 = abilLevel(S.host,"light"); upgradeAbility(S.host,"light");
    o.abilUp = abilLevel(S.host,"light") === lv0+1;
    const vv = vesselLevel("surge"); upgradeVessel("surge");
    o.vesselUp = vesselLevel("surge") === vv+1;

    // boss phases
    S.kills[G.sector] = 99; G.bossEnt = null; spawnBoss();
    const boss = G.bossEnt; boss.hp = boss.maxHp*0.5; bossPhaseCheck(boss);
    o.bossPhase = boss.phase === 1 && boss.enrage > 1;

    // people come back after the street is cleared
    G.ents = G.ents.filter(e=>e.team!=="civ");
    G.civT = 0; G.paused = false;
    for(let i=0;i<8;i++){ G.civT = 0; update(16); }
    o.civsReturn = G.ents.filter(e=>e.team==="civ" && !e.dead).length > 0;
    o.dayNight = (()=>{ G.timeOfDay=0.25; applyDayNight(); const n=G.world.sunCol.reduce((a,c)=>a+c,0);
                        G.timeOfDay=0.75; applyDayNight(); const d=G.world.sunCol.reduce((a,c)=>a+c,0);
                        G.timeOfDay=0.30; applyDayNight(); return d < n; })();

    // sound
    audioInit(); o.sound = SND.ready;

    // save round-trip
    save(); const raw = localStorage.getItem(SAVE_KEY);
    o.save = !!raw && JSON.parse(raw).host === S.host;
    return o;
  });

  ok("world comes up live", r.live);
  ok("content counts", r.counts.beings===616 && r.counts.gear===74 && r.counts.ai===30 && r.counts.sectors===30, JSON.stringify(r.counts));
  ok("all 616 beings build", r.allBeings.bad===0, r.allBeings.badName);
  ok("body change locked in combat", r.lockedInCombat);
  ok("body change free out of combat", r.freeOutOfCombat);
  ok("guard cuts damage", r.block);
  ok("parry negates and stuns", r.parry);
  ok("roll gives i-frames", r.roll);
  ok("gear bound to owner only", r.gearBoundOnly);
  ok("attuned gear echoes", r.gearEchoesWhenAttuned);
  ok("three missions offered", r.missionOffers);
  ok("mission starts with marker", r.missionStarts);
  ok("mission abandons", r.missionAbandons);
  ok("ability rank buys", r.abilUp);
  ok("vessel rank buys", r.vesselUp);
  ok("boss phase fires", r.bossPhase);
  ok("city populated", r.city.cars>0 && r.city.civs>0 && r.city.props>0, JSON.stringify(r.city));
  ok("civilians replenish", r.civsReturn);
  ok("night darker than noon", r.dayNight);
  ok("audio ready", r.sound);
  ok("save round-trips", r.save);

  await ctx.close(); await b.close();
  console.log("\n" + (errs.length ? "RUNTIME ERRORS:\n"+errs.join("\n") : "no runtime errors"));
  console.log(fail.length ? "\nFAILURES: "+fail.join(" | ") : "\nALL CHECKS PASSED");
  process.exit(fail.length || errs.length ? 1 : 0);
})().catch(e=>{ console.log("TEST ERROR:", e.message); console.log(errs.join("\n")); process.exit(1); });
