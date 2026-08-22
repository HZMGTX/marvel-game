/* Multiverse Vessel — regression harness.
 *
 * Drives the real game in a real browser and asserts from page state rather
 * than from screenshots: that the world comes up,  that every one of the 680
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

  /* the title sits over a city that is actually running */
  await p.waitForTimeout(900);
  const t0 = await p.evaluate(()=>({attract:!!G.attract, world:!!G.world, player:!!G.player,
                                    calls:drawCalls, cars:G.cars.length, ents:G.ents.length,
                                    x:G.attract?G.attract.x:0, tod:G.timeOfDay}));
  await p.waitForTimeout(900);
  const t1 = await p.evaluate(()=>({x:G.attract?G.attract.x:0, tod:G.timeOfDay}));

  await p.click('[data-start="luke-cage"]');
  await p.waitForTimeout(1300);
  const t2 = await p.evaluate(()=>({attract:!!G.attract, player:!!G.player}));

  const r = await p.evaluate(()=>{
    const o = {};
    o.live = !!G.player && G.ents.length>1 && G.world.boxes.length>0 && drawCalls>100;
    o.counts = {beings:BEINGS.length, gear:GEAR_LIST.length, ai:AI_LIST.length, sectors:SECTORS.length};

    /* nobody is in the roster twice, and nothing owns gear that does not exist —
       both of which happened the first time the roster grew */
    (()=>{
      const seenId = {}, seenName = {}, dupes = [];
      for(const b2 of BEINGS){
        if(seenId[b2.id]) dupes.push("id "+b2.id);
        if(seenName[b2.name]) dupes.push("name "+b2.name);
        seenId[b2.id] = seenName[b2.name] = 1;
      }
      o.rosterDupes = dupes;
      o.orphanGear = GEAR_LIST.filter(g=>!BY_ID[g.ownerId]).map(g=>g.name);
      o.deadMinds  = AI_LIST.filter(a=>!BEINGS.some(b2=>aiAllowed(a, b2, null))).map(a=>a.name);
      o.thinSectors = SECTORS.filter(s2=>sectorBeings(s2.id).length < 3 || !sectorBoss(s2.id))
                             .map(s2=>s2.id);
    })();

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

    // the air: hovering is not a free win any more
    (()=>{
      const clear = ()=>{ G.ents = G.ents.filter(e=>e.team==="you"); G.lastCombat = -1e9; G.projs.length = 0; };
      const meleeId  = sectorBeings(G.sector).find(b2=>!ACT[b2.arch].ranged).id;
      const rangedId = (BEINGS.find(b2=>ACT[b2.arch].ranged)||{}).id;
      const foe = (id, dx)=>{ const e = makeEnt(id, G.player.x+(dx||3), G.player.z, "foe", {});
                              G.ents.push(e); return e; };
      const P = G.player;
      const home = {x:P.x, y:P.y, z:P.z};        /* put you back where you started */

      clear();                                   /* a shot goes where you are */
      const sh = foe(rangedId, 10);
      P.x = sh.x; P.z = sh.z; P.y = sh.y + 12;
      sh.cds = {}; sh.nrg = sh.maxNrg; useAbility(sh, "light");
      o.airShotAims = G.projs.length > 0 && G.projs[0].vy > 4;

      clear();                                   /* too high to jump: it throws */
      const th = foe(meleeId, 3);
      P.x = th.x + 2; P.z = th.z; P.y = th.y + 22; th.airT = 0;
      groundAnswersAir(th, P, distXZ(th, P));
      o.airThrows = G.projs.length === 1 && G.projs[0].vy > 4;

      clear();                                   /* low enough to jump: it jumps */
      const lp = foe(meleeId, 3);
      P.x = lp.x + 3; P.z = lp.z; P.y = lp.y + 6;
      lp.airT = 0; lp.vy = 0; lp.grounded = true;
      groundAnswersAir(lp, P, distXZ(lp, P));
      o.airLeaps = lp.vy > 8 && !lp.grounded && G.projs.length === 0;

      clear();                                   /* and once up there it connects */
      const hi = foe(meleeId, 1.2);
      hi.grounded = false; hi.y = P.y = 20; hi.x = P.x + 1.2; hi.z = P.z;
      hi.yaw = Math.atan2(P.x-hi.x, P.z-hi.z);
      P.hp = P.maxHp; P.fx = {}; P.blocking = false;
      hi.cds = {}; hi.nrg = hi.maxNrg; useAbility(hi, "light");
      o.airConnects = P.hp < P.maxHp && vReach({grounded:false}) > vReach({grounded:true});

      clear();                                   /* your finisher lifts them */
      const lift = foe(meleeId, 1.5);
      lift.grounded = true; lift.vy = 0; lift.y = groundAt(lift.x, lift.z, lift.rad);
      P.y = lift.y; P.hp = P.maxHp; P.fx = {};
      P.yaw = Math.atan2(lift.x-P.x, lift.z-P.z);
      P.cds = {}; P.nrg = P.maxNrg; P.comboStep = 1; P.comboT = G.t;
      useAbility(P, "light");
      const boss = foe(meleeId, 1.5); boss.boss = true; boss.grounded = true; boss.vy = 0;
      launchInto(boss, {launch:true});
      o.airLaunch = P.comboStep === 2 && lift.vy > 5 && !lift.grounded
                    && boss.vy === 0 && boss.grounded;

      clear();                                   /* and a dive lands on people too */
      const tgt = foe(meleeId, 0.6);
      tgt.hp = tgt.maxHp;
      P.fly = true; P.dive = 1; P.vy = -30; P.y = tgt.y + 0.6; P.x = tgt.x - 0.6; P.z = tgt.z;
      P.diveHit = null;
      diveStrike(P);
      const once = tgt.maxHp - tgt.hp;
      diveStrike(P);
      o.airDive = once > 0 && (tgt.maxHp - tgt.hp) === once;
      P.fly = false; P.dive = 0; P.diveHit = null;

      /* the whole point: thirteen seconds of hovering over a crowd is not free */
      const hover = (height)=>{
        clear();
        /* keep the spark in the body: a sample that kills you leaves every
           later sample measuring a corpse, which is how this check first lied */
        P.dead = false; P.hp = P.maxHp; P.fx = {}; G.ended = false;
        const melee = sectorBeings(G.sector).filter(b2=>!ACT[b2.arch].ranged);
        const gy = groundAt(P.x, P.z, P.rad);
        for(let i=0;i<4;i++){
          const a2 = i/4*6.283;
          const e = makeEnt(melee[i%melee.length].id, P.x+Math.sin(a2)*4, P.z+Math.cos(a2)*4, "foe", {});
          e.engaged = true; e.engagedT = 1e12; e.airT = 0;
          e.y = groundAt(e.x, e.z, e.rad); e.grounded = true;
          G.ents.push(e);
        }
        Object.keys(input).forEach(k=>{ if(typeof input[k]==="number") input[k]=0; });
        input.fly = 1; P.fly = true; P.vx = P.vz = 0;
        let touched = 0;
        for(let i=0;i<400;i++){
          P.y = gy + height; P.vy = 0; P.fx.iframe = 0;
          P.dead = false; P.hp = P.maxHp; G.ended = false;
          const before = P.hp;
          update(33);
          if(P.hp < before) touched++;
        }
        Object.keys(input).forEach(k=>{ if(typeof input[k]==="number") input[k]=0; });
        P.fly = false; P.dead = false; P.hp = P.maxHp; G.ended = false;
        return touched;
      };
      o.hoverCosts = {low: hover(6), high: hover(20)};
      o.airHoverNotFree = o.hoverCosts.low > 5 && o.hoverCosts.high > 2;

      clear();
      P.x = home.x; P.y = home.y; P.z = home.z;
      P.hp = P.maxHp; P.fx = {}; P.vx = P.vy = P.vz = 0; P.grounded = true;
      P.comboStep = 0; P.cds = {}; P.blocking = false;
    })();

    // artificial minds: all twelve do something you can see
    (()=>{
      const clear = ()=>{ G.ents = G.ents.filter(e=>e.team==="you"); G.lastCombat = -1e9; };
      const melee = sectorBeings(G.sector).find(b2=>!ACT[b2.arch].ranged).id;
      const foe = ()=>{ const e = makeEnt(melee, G.player.x+3, G.player.z, "foe", {});
                        e.maxHp = 1e7; e.hp = e.maxHp; G.ents.push(e); return e; };
      const wear = fx => (G.player.ai = AI_LIST.find(x=>x.fx===fx));
      const P = G.player;

      o.mindsAllWired = Object.keys(AI_FX).every(k => AI_LIST.some(a=>a.fx===k));
      o.mindCount = Object.keys(AI_FX).length === 12;

      /* the first blow of a fight, and only the first */
      clear(); wear("strike"); const t = foe();
      const swing = fresh => { if(fresh) G.struck = false; t.hp = t.maxHp;
                               dealDamage(P,t,1.0,{}); return t.maxHp - t.hp; };
      let first = 0; for(let i=0;i<40;i++) first += swing(true);
      G.struck = true;
      let later = 0; for(let i=0;i<40;i++) later += swing(false);
      o.mindStrike = first > later*1.25 && first < later*1.65;

      /* a shield on the bell */
      clear(); wear("plating"); P.fx = {}; mindsOnFightStart(P);
      o.mindPlating = hasFx(P,"shield");

      /* a quarter of it passes through */
      clear(); wear("phase"); const t2 = foe();
      let through = 0;
      for(let i=0;i<400;i++){ P.hp = P.maxHp; P.fx = {}; if(dealDamage(t2,P,1.0,{}) === 0) through++; }
      o.mindPhase = through > 60 && through < 160;

      /* one hit in seven slips, and the riders land less often */
      clear(); wear("foresee");
      let slipped = 0;
      for(let i=0;i<600;i++){ P.hp = P.maxHp; P.fx = {}; if(dealDamage(t2,P,1.0,{}) === 0) slipped++; }
      let burned = 0;
      for(let i=0;i<300;i++){ P.hp = P.maxHp; P.fx = {}; dealDamage(t2,P,1.0,{burn:true}); if(hasFx(P,"burn")) burned++; }
      o.mindForesee = slipped > 40 && slipped < 190 && burned > 150 && burned < 270;

      /* the longer the fight runs the less it hurts */
      clear(); wear("adapt");
      G.fightStart = G.t;         const early = mindMitigation(P);
      G.fightStart = G.t - 20000; const late  = mindMitigation(P);
      o.mindAdapt = early === 1 && late < 0.75 && late > 0.7;

      /* and one of them catches you, once per sector */
      clear(); wear("backup"); G.usedBackup = false; G.ended = false;
      P.hp = 1; P.dead = false; killEnt(P);
      const caught = !P.dead && P.hp > 1 && !G.ended;
      P.hp = 1; P.dead = false; G.ended = false; killEnt(P);
      o.mindBackup = caught && P.dead;

      /* the chip says which mind you are carrying and what it just did */
      clear(); P.dead = false; P.hp = P.maxHp; P.fx = {}; G.ended = false;
      wear("targeting"); G.mindFire = null;
      const idle = mindChip(P);
      mindFired("ORBITAL STRIKE");
      const firing = mindChip(P);
      updateHud();
      const shown = el("tag-mind").style.display !== "none" && el("tag-mind").dataset.on === "1";
      P.ai = null; G.mindFire = null; updateHud();
      o.mindChip = idle === "TARGETING SOLUTION" && firing === "ORBITAL STRIKE"
                   && shown && el("tag-mind").style.display === "none";

      clear(); P.hp = P.maxHp; P.fx = {}; P.dead = false; G.ended = false;
      G.usedBackup = false; G.struck = false;
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

    // the story reaches every sector, and the last one ends it
    (()=>{
      o.storySilent = SECTORS.filter(s2=>!STORY[s2.id]).map(s2=>s2.id);
      const was = G.sector;
      G.sector = "lat"; const named = bossMeetLine({name:"Doctor Doom"});
      G.sector = "qns"; const plain = bossMeetLine({name:"Somebody"});
      G.sector = was;
      o.bossLines = /Doom/.test(named) && named !== plain && plain.length > 8;

      S.worn = 0; S.spent = 0;
      G.ents = G.ents.filter(e2=>e2.team==="you"); G.lastCombat = -1e9;
      const other = S.unlocked.find(x=>x !== S.host);
      const tookOne = becomeHost(other) && S.worn === 1;
      G.player.hp = 1; killEnt(G.player);
      o.tally = tookOne && S.spent === 1;
      G.player.dead = false; G.player.hp = G.player.maxHp; G.player.fx = {}; G.ended = false;

      /* the argument at the top, and both ways out of it */
      const html = endingHtml();
      const hasBoth = /data-act="hold-on"/.test(html) && /data-act="let-go"/.test(html);
      S.worn = 7; S.spent = 3;
      o.endingReads = hasBoth && /7 bodies/.test(endingHtml()) && /3 of them out/.test(endingHtml());
      S.cleared = {hk:true, qns:true};
      const heldBefore = S.heldOn || 0;
      S.heldOn = heldBefore + 1; S.cleared = {};      /* what hold-on does */
      o.holdOnReopens = Object.keys(S.cleared).length === 0 && S.heldOn === heldBefore + 1;
      o.letGoSummary = /data-act="begin-again"/.test(letGoHtml());
      S.worn = 0; S.spent = 0; S.heldOn = heldBefore;
    })();

    // distance costs less to draw than it used to
    (()=>{
      const melee = sectorBeings(G.sector)[0].id;
      G.ents = G.ents.filter(e=>e.team==="you"); G.lastCombat = -1e9;
      const e = makeEnt(melee, G.player.x + 3, G.player.z, "foe", {});
      G.ents.push(e);
      const cost = fn => { resetQueue(); fn(); return Q_OPAQUE.length + Q_ALPHA.length; };
      const full = cost(()=>drawChar(e, 8));
      const imp  = cost(()=>drawCharFar(e));
      resetQueue();
      /* and the switch happens out there, never on you */
      e.x = G.player.x + 200;
      const before = (()=>{ resetQueue(); buildFrame(); return Q_OPAQUE.length + Q_ALPHA.length; })();
      e.x = G.player.x + 3;
      const after = (()=>{ resetQueue(); buildFrame(); return Q_OPAQUE.length + Q_ALPHA.length; })();
      o.charLod = full > imp*2 && imp > 2 && after > before;
      G.ents = G.ents.filter(e2=>e2.team==="you"); G.lastCombat = -1e9;
      resetQueue();
    })();

    // a press is an edge as well as a level
    (()=>{
      clearTaps();
      tapped.light = true;
      const once = pressed("light"), twice = pressed("light");
      input.power = 1; const held1 = pressed("power"), held2 = pressed("power");
      input.power = 0;
      tapped.ult = true; clearTaps();
      o.tapLatch = once && !twice && held1 && held2 && !pressed("ult");
    })();

    // sound
    audioInit(); o.sound = SND.ready;

    // save round-trip
    save(); const raw = localStorage.getItem(SAVE_KEY);
    o.save = !!raw && JSON.parse(raw).host === S.host;
    return o;
  });

  ok("the title runs over a living city",
     t0.attract && t0.world && !t0.player && t0.calls > 100 && t0.cars > 0 && t0.ents > 0,
     JSON.stringify({calls:t0.calls, cars:t0.cars, ents:t0.ents}));
  ok("and that city moves", t0.x !== t1.x && t0.tod !== t1.tod);
  ok("picking a body takes over from it", !t2.attract && t2.player);
  ok("world comes up live", r.live);
  ok("content counts", r.counts.beings>=670 && r.counts.gear>=74 && r.counts.ai>=30 && r.counts.sectors===30, JSON.stringify(r.counts));
  ok("nobody is in the roster twice", r.rosterDupes.length===0, r.rosterDupes.join(", "));
  ok("no gear without an owner", r.orphanGear.length===0, r.orphanGear.join(", "));
  ok("no mind without a possible host", r.deadMinds.length===0, r.deadMinds.join(", "));
  ok("every sector has people and a boss", r.thinSectors.length===0, r.thinSectors.join(", "));
  ok("every being builds", r.allBeings.bad===0, r.allBeings.badName);
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
  ok("shots aim where the target is", r.airShotAims);
  ok("a grounded enemy throws at a high hover", r.airThrows);
  ok("and jumps at a low one", r.airLeaps);
  ok("a swing reaches higher off the ground", r.airConnects);
  ok("the finisher launches, but not a boss", r.airLaunch);
  ok("a dive lands on people, once", r.airDive);
  ok("hovering over a crowd is not free", r.airHoverNotFree, JSON.stringify(r.hoverCosts));
  ok("twelve minds, all of them wired", r.mindsAllWired && r.mindCount);
  ok("orbital strike hits the first blow only", r.mindStrike);
  ok("plating shields you when a fight starts", r.mindPlating);
  ok("density control phases a quarter of it", r.mindPhase);
  ok("precognition slips hits and resists riders", r.mindForesee);
  ok("adaptive learning stacks with the fight", r.mindAdapt);
  ok("backup catches you once per sector", r.mindBackup);
  ok("the mind chip reads and flashes", r.mindChip);
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
  ok("every sector has something to say", r.storySilent.length===0, r.storySilent.join(","));
  ok("bosses greet you by name where written", r.bossLines);
  ok("the spark counts what it has worn out", r.tally);
  ok("the last sector ends the story", r.endingReads && r.holdOnReopens && r.letGoSummary);
  ok("distant people cost a fraction to draw", r.charLod);
  ok("a press is an edge as well as a level", r.tapLatch);
  ok("save round-trips", r.save);

  /* --- and the same game on a phone --------------------------------------- */
  const mctx = await b.newContext({viewport:{width:390,height:844}, isMobile:true,
                                   hasTouch:true, deviceScaleFactor:2});
  const m = await mctx.newPage(); m.setDefaultTimeout(25000);
  m.on("pageerror", e=>errs.push("MOBILE PAGEERROR: "+e.message));
  m.on("console", e=>{ if(e.type()==="error"&&!/net::/.test(e.text())) errs.push("MOBILE CONSOLE: "+e.text()); });
  await m.goto(process.env.GAME_URL || ("file://" + require("path").resolve(__dirname, "../index.html")));
  await m.waitForTimeout(400);
  await m.evaluate(()=>{ quality="low"; resize(); });
  await m.tap('[data-start="luke-cage"]');
  await m.waitForTimeout(1400);
  await m.evaluate(()=>{ G.player.ai = AI_LIST[0]; G.lastCombat = G.t; updateHud(); });
  await m.waitForTimeout(200);

  const swing0 = await m.evaluate(()=>G.player.swingT);
  await m.tap('[data-ab="light"]');                 /* a quick tap, not a hold */
  await m.waitForTimeout(300);
  const mob = await m.evaluate(()=>{
    const box = id => { const r2 = el(id).getBoundingClientRect();
                        return {t:r2.top, b:r2.bottom, l:r2.left, r:r2.right}; };
    const over = (a2,b2) => !(a2.r <= b2.l || b2.r <= a2.l || a2.b <= b2.t || b2.b <= a2.t);
    const zones = {self:box("hud-self"), sector:box("hud-sector"), map:box("minimap"),
                   become:box("hud-squad"), pad:box("pad"), extra:box("extra")};
    let spill = 0;
    document.querySelectorAll("#pad .abtn").forEach(btn=>{
      const lab = btn.querySelector("span[id^=lab-]");
      if(lab && lab.scrollWidth > btn.clientWidth + 1) spill++;
    });
    return {
      touch: document.body.dataset.touch === "1",
      live: !!G.player && G.ents.length > 1 && drawCalls > 40,
      swing: G.player.swingT,
      clean: !over(zones.sector, zones.map) && !over(zones.self, zones.become)
             && !over(zones.pad, zones.extra),
      spill,
      onScreen: zones.pad.r <= 390 && zones.extra.r <= 390 && zones.map.r <= 390
                && zones.pad.b <= 844
    };
  });
  await mctx.close();
  ok("the phone build comes up in touch mode", mob.touch && mob.live);
  ok("nothing on the phone HUD collides", mob.clean && mob.onScreen);
  ok("no ability label spills its button", mob.spill === 0, "spilled: "+mob.spill);
  ok("a quick tap fires an ability", mob.swing !== swing0);

  await ctx.close(); await b.close();
  console.log("\n" + (errs.length ? "RUNTIME ERRORS:\n"+errs.join("\n") : "no runtime errors"));
  console.log(fail.length ? "\nFAILURES: "+fail.join(" | ") : "\nALL CHECKS PASSED");
  process.exit(fail.length || errs.length ? 1 : 0);
})().catch(e=>{ console.log("TEST ERROR:", e.message); console.log(errs.join("\n")); process.exit(1); });
