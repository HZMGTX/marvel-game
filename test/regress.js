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
    o.dayNight = (()=>{
      const sum = a2 => a2.reduce((x,c)=>x+c, 0);
      G.timeOfDay = 0.25; applyDayNight();
      const noon = {sun:sum(G.world.sunCol), sky:sum(G.world.sky), night:G.world.night,
                    fogD:G.world.fogD, sunY:SUN[1]};
      G.timeOfDay = 0.75; applyDayNight();
      const dark = {sun:sum(G.world.sunCol), sky:sum(G.world.sky), night:G.world.night,
                    fogD:G.world.fogD, sunY:SUN[1]};
      G.timeOfDay = 0.30; applyDayNight();
      o.dayLighting = {
        dimmer:   dark.sun < noon.sun,                 /* night is darker */
        skyLifts: noon.sky > dark.sky*3,               /* and the sky is a real sky by day */
        windows:  noon.night < 0.05 && dark.night > 0.95,  /* lights off at noon, on at night */
        clearer:  noon.fogD < dark.fogD,               /* a clear day sees further */
        offZenith: noon.sunY < 0.85 && noon.sunY > 0.2,    /* the sun never stands overhead */
        moonlit:  dark.sunY > 0                        /* and night keeps a light of its own */
      };
      return Object.values(o.dayLighting).every(Boolean);
    })();

    // elites: six roles, each doing the one thing it says it does
    (()=>{
      const clear = ()=>{ G.ents = G.ents.filter(e=>e.team==="you"); G.lastCombat = -1e9; };
      const melee = sectorBeings(G.sector).find(b2=>!ACT[b2.arch].ranged).id;
      const foe = (role, dx)=>{ const e = makeEnt(melee, G.player.x+(dx||3), G.player.z, "foe", {});
                                if(role) makeElite(e, role); G.ents.push(e); return e; };
      const P = G.player;

      o.eliteRoles = ELITE_IDS.length === 6;
      o.eliteApplies = ELITE_IDS.every(k=>{
        const base = makeEnt(melee, 0, 0, "foe", {});
        const e = makeEnt(melee, 0, 0, "foe", {}); makeElite(e, k);
        return e.elite === k && e.hp === e.maxHp
            && e.maxHp === Math.round(base.maxHp*ELITES[k].hp) && e.spdMul === ELITES[k].spd;
      });

      clear(); const w = foe("warden", 3), near = foe(null, 5);
      w.roleT = 0; eliteThink(w, 33);
      o.eliteWarden = hasFx(near,"fortify") && hasFx(w,"fortify");

      clear(); const br = foe("breaker", 3);
      br.roleT = 0; eliteThink(br, 33);
      const winds = br.breakAt - G.t > 800;
      P.hp = P.maxHp; P.fx = {}; P.blocking = true; P.blockStart = G.t - 2000;
      P.yaw = Math.atan2(br.x-P.x, br.z-P.z);
      br.breakAt = G.t - 1; eliteThink(br, 33);
      o.eliteBreaker = winds && (P.maxHp - P.hp) > P.maxHp*0.04;   /* the guard did not help */

      clear(); const st = foe("stalker", 3);
      st.roleT = 0; eliteThink(st, 33);
      const veils = st.veil > G.t;
      P.yaw = 0; P.x = 0; P.z = 0; st.x = 0; st.z = 6; eliteThink(st, 33);
      const flanks = st.mz < -0.4;
      /* average a few — a single hit rolls crit and +-8% spread */
      P.blocking = false;
      const swing = (veiled)=>{ let sum = 0;
        for(let i=0;i<24;i++){ st.veil = veiled ? G.t + 3000 : 0;
          P.hp = P.maxHp; P.fx = {}; dealDamage(st,P,1.0,{}); sum += P.maxHp - P.hp; }
        return sum/24; };
      const open = swing(false), back = swing(true);
      st.veil = G.t + 3000; P.hp = P.maxHp; P.fx = {}; dealDamage(st,P,1.0,{});
      o.eliteStalker = veils && flanks && back > open*1.4 && !(st.veil > G.t);

      clear(); const mk = foe("marksman", 2);
      mk.roleT = 0; eliteThink(mk, 33);
      o.eliteMarksman = mk.dashT > G.t && mk.dashMul === 0;

      clear(); const lc = foe("leech", 3);
      lc.hp = Math.round(lc.maxHp*0.5); const lhp = lc.hp;
      P.fx = {}; P.hp = P.maxHp; dealDamage(lc, P, 1.0, {});
      o.eliteLeech = lc.hp > lhp;

      clear(); const hr = foe("herald", 3);
      const n0 = G.ents.filter(e=>e.team==="foe").length;
      hr.hp = hr.maxHp*0.5; eliteThink(hr, 33);
      const n1 = G.ents.filter(e=>e.team==="foe").length;
      hr.hp = hr.maxHp*0.2; eliteThink(hr, 33);
      o.eliteHerald = n1 - n0 === 2 && G.ents.filter(e=>e.team==="foe").length === n1;

      clear();
      const was = G.sector;
      G.sector = SECTORS[0].id; const lo = eliteChance();
      G.sector = SECTORS[SECTORS.length-1].id; const hi = eliteChance();
      G.sector = was;
      let seen = 0;
      for(let i=0;i<400;i++) if(maybeElite(makeEnt(melee,0,0,"foe",{})).elite) seen++;
      o.eliteRate = hi > lo && seen > 20 && seen < 160;

      clear();
      const rich = foe("herald", 3);
      S.essence = 0; killEnt(rich);
      const richEss = S.essence;
      const plain = foe(null, 3);
      S.essence = 0; killEnt(plain);
      o.eliteWorthMore = richEss > S.essence;
      clear(); P.hp = P.maxHp; P.fx = {}; P.blocking = false;
    })();

    // flight: a dive builds speed, pulling out spends it forward, landing lands
    (()=>{
      const step = (n)=>{ for(let i=0;i<n;i++) update(33); };
      const zero = ()=>Object.keys(input).forEach(k=>{ if(typeof input[k]==="number") input[k]=0; });
      const flier = BEINGS.find(b2=>canFly(b2));
      if(!S.unlocked.includes(flier.id)) S.unlocked.push(flier.id);
      G.ents = G.ents.filter(e=>e.team==="you"); G.lastCombat = -1e9;
      becomeHost(flier.id);
      const P = G.player;
      zero(); input.fly = 1; input.jump = 1;
      const y0 = P.y; step(45);
      o.flyClimbs = P.fly && P.y - y0 > 6;

      input.jump = 0; input.up = 1; step(40);
      const s1 = Math.hypot(P.vx, P.vz);
      input.up = 0; step(6);
      o.flyCoasts = s1 > 4 && Math.hypot(P.vx, P.vz) > s1*0.7;   /* momentum, not a dead stop */

      P.yaw = 0; P.vx = 9; P.vz = 0; step(12); const bR = P.bank;
      P.vx = -9; step(24);
      o.flyBanks = bR < -0.1 && P.bank > 0.1;                    /* leans both ways */

      P.y = 95; P.vy = 0; P.vx = P.vz = 0; P.dive = 0; P.boost = 0;
      input.down2 = 1; step(30);
      o.flyDives = P.dive > 0.9 && P.vy < -25;
      input.down2 = 0; step(2);
      const b1 = P.boost; step(2);
      o.flySwoops = b1 > 0.5 && P.boost <= b1;                   /* paid once, then decays */

      zero(); input.fly = 0; P.fly = false; P.dive = 0;
      G.ents = G.ents.filter(e=>e.team==="you");
      const mark = makeEnt(S.unlocked[0], P.x+2.0, P.z, "foe", {}); G.ents.push(mark);
      mark.hp = mark.maxHp; const hp0 = mark.hp;
      P.y = groundAt(P.x,P.z,P.rad) + 55; P.vy = -2; P.vx = P.vz = 0; P.grounded = false;
      G.rings.length = 0; G.shake = 0;
      let guard = 0; while(!P.grounded && guard++ < 400) update(33);
      o.hardLanding = G.rings.length > 0 && G.shake > 0.3 && mark.hp < hp0 && P.landK > 0.5;

      G.rings.length = 0; G.shake = 0; P.landK = 0;
      P.y = groundAt(P.x,P.z,P.rad) + 1.2; P.vy = 0; P.grounded = false;
      guard = 0; while(!P.grounded && guard++ < 200) update(33);
      o.softLanding = G.rings.length === 0 && G.shake === 0;      /* a hop is not an event */

      P.fly = true; P.y = 40; P.vx = 20; P.vz = 0; P.vy = -5; P.dive = 0.8;
      updateHud();
      o.flyHud = /ALT 40m/.test(el("tag-air").textContent) && /DIVE/.test(el("tag-air").textContent);
      P.fly = false; updateHud();
      o.flyHudHides = el("tag-air").style.display === "none";
      zero(); G.ents = G.ents.filter(e=>e.team==="you"); G.lastCombat = -1e9;
    })();

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
  ok("a day that is actually a day", r.dayNight, JSON.stringify(r.dayLighting));
  ok("six elite roles", r.eliteRoles);
  ok("every role reshapes its host", r.eliteApplies);
  ok("warden hardens the room", r.eliteWarden);
  ok("breaker warns, then no guard helps", r.eliteBreaker);
  ok("stalker veils, flanks and backstabs", r.eliteStalker);
  ok("marksman kites without hurting", r.eliteMarksman);
  ok("leech heals off what it lands", r.eliteLeech);
  ok("herald calls adds once", r.eliteHerald);
  ok("elites get commoner deeper in", r.eliteRate);
  ok("elites are worth more", r.eliteWorthMore);
  ok("flight climbs", r.flyClimbs);
  ok("flight carries momentum", r.flyCoasts);
  ok("flight banks into a turn", r.flyBanks);
  ok("a dive builds speed", r.flyDives);
  ok("pulling out pays once", r.flySwoops);
  ok("a hard landing lands", r.hardLanding);
  ok("a small hop does not", r.softLanding);
  ok("the air readout reads", r.flyHud && r.flyHudHides);
  ok("audio ready", r.sound);
  ok("save round-trips", r.save);

  await ctx.close(); await b.close();
  console.log("\n" + (errs.length ? "RUNTIME ERRORS:\n"+errs.join("\n") : "no runtime errors"));
  console.log(fail.length ? "\nFAILURES: "+fail.join(" | ") : "\nALL CHECKS PASSED");
  process.exit(fail.length || errs.length ? 1 : 0);
})().catch(e=>{ console.log("TEST ERROR:", e.message); console.log(errs.join("\n")); process.exit(1); });
