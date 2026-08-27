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
  const p = await ctx.newPage(); p.setDefaultTimeout(45000);
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
      /* a weapon has to look like a weapon: the shape table is regexes over
         gear names, and a name it does not know falls through to bare hands */
      const wantShape = {
        "Billy Clubs":"staff", "Sai":"sword", "Katanas":"sword", "Psychic Knife":"sword",
        "Hofund":"sword", "Bo Staff":"staff", "Mjolnir":"hammer", "Vibranium Shield":"shield",
        "Cloak of Levitation":"cloak", "Silver Surfer's Board":"board",
        "Venom Symbiote":"sheen", "Goblin Glider":"wings", "Magneto's Helmet":"head",
        "Adamantium Claws":"hands", "Doom's Armor":"armor", "Extremis":"aura"
      };
      o.gearShapes = Object.keys(wantShape).filter(n=>{
        const g = GEAR_LIST.find(x=>x.name===n);
        return !g || gearShape(g) !== wantShape[n];
      });

      /* every named boss has to exist and live in the sector it is named for */
      o.badBosses = Object.keys(SECTOR_BOSS).filter(sec=>{
        const b2 = BY_ID[SECTOR_BOSS[sec]];
        return !b2 || b2.sector !== sec || sectorBoss(sec).id !== b2.id;
      });
      o.namedBossCount = Object.keys(SECTOR_BOSS).length;
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

    // every ability of every archetype fires, and lands on something
    (()=>{
      const slots = ["light","power","util","ult"];
      const threw = [], inert = [];
      const kinds = {};
      const hostWas = S.host;
      for(const archId of ARCH_IDS){
        const being = BEINGS.find(b2=>b2.arch===archId);
        if(!being){ threw.push(archId+": nobody has this archetype"); continue; }
        if(!S.unlocked.includes(being.id)) S.unlocked.push(being.id);
        G.ents = G.ents.filter(e=>e.team==="you"); G.lastCombat = -1e9;
        becomeHost(being.id);
        const P = G.player;
        if(!P || P.b.arch !== archId){ threw.push(archId+": could not be become"); continue; }
        for(const slot of slots){
          const {a} = abilityOf(P, slot);
          kinds[a.kind] = (kinds[a.kind]||0) + 1;
          const t = makeEnt(BEINGS[0].id, P.x + 1.4, P.z, "foe", {});
          t.maxHp = 1e7; t.hp = t.maxHp; G.ents.push(t);
          P.yaw = Math.atan2(t.x-P.x, t.z-P.z);
          P.cds = {}; P.nrg = P.maxNrg; P.fx = {};
          let ok = true;
          try{ useAbility(P, slot); for(let i=0;i<25;i++) update(33); }
          catch(e){ ok = false; threw.push(archId+"/"+slot+" ("+a.kind+"): "+e.message); }
          /* a util slot is a self-buff; everything else has to touch somebody */
          if(ok && slot !== "util" && t.hp >= t.maxHp) inert.push(archId+"/"+slot+" ("+a.kind+")");
          G.ents = G.ents.filter(e2=>e2!==t);
        }
      }
      G.ents = G.ents.filter(e=>e.team==="you"); G.lastCombat = -1e9;
      if(hostWas) becomeHost(hostWas);
      o.abilThrew = threw;
      o.abilInert = inert;
      o.abilCount = Object.values(kinds).reduce((x,y)=>x+y, 0);
      o.abilKinds = Object.keys(kinds).length;
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

    /* all five kinds of work have to be finishable. A mission type that cannot
       be completed is a job a player takes and can never put down. */
    (()=>{
      const P = G.player;
      const bad = [];
      for(const kind of Object.keys(MISSION_DEFS)){
        const base = missionOffers(G.sector)[0];
        const pool = sectorBeings(G.sector).filter(b2=>b2.id !== sectorBoss(G.sector).id);
        const held = pool.flatMap(b2=>(GEAR_BY_OWNER[b2.id]||[]).map(g=>({g,b:b2})))[0];
        const m = Object.assign({}, base, {kind, id:"probe/"+kind,
          targetId: pool[0].id, count: 3,
          gearId: kind==="recover" && held ? held.g.id : null,
          gearOwner: kind==="recover" && held ? held.b.id : null});
        G.ents = G.ents.filter(e=>e.team==="you"); G.lastCombat = -1e9;
        G.drops.length = 0; G.mission = null;
        const before = S.essence, doneBefore = S.missionsDone || 0;
        try{
          if(startMission(m) === false || !G.mission){ bad.push(kind+": would not start"); continue; }
          const M = G.mission;
          if(kind === "hunt"){ M.ents[0].hp = 1; killEnt(M.ents[0]); updateMission(33); }
          else if(kind === "chase"){ P.x = M.ents[0].x; P.z = M.ents[0].z; updateMission(33); }
          else if(kind === "recover"){ G.drops.length = 0; updateMission(33); }
          else if(kind === "hold"){ P.x = M.marker.x; P.z = M.marker.z;
                                    for(let i=0;i<400 && G.mission && !G.mission.done;i++) updateMission(120); }
          else if(kind === "rescue"){ for(const c of M.ents){ P.x = c.x; P.z = c.z; updateMission(33); } }
          if(!M.done) bad.push(kind+": never finished");
          else if(S.essence <= before) bad.push(kind+": paid nothing");
          else if((S.missionsDone||0) <= doneBefore) bad.push(kind+": not counted");
        }catch(e){ bad.push(kind+": "+e.message); }
        G.mission = null;
      }
      o.missionKinds = bad;
      G.ents = G.ents.filter(e=>e.team==="you"); G.lastCombat = -1e9;
      P.hp = P.maxHp; P.fx = {}; P.dead = false; G.ended = false;
    })();

    /* gear has to reach you the way the game says it does: beat somebody
       carrying something, it falls where they fell, you walk over it. */
    (()=>{
      const clear = ()=>{ G.ents = G.ents.filter(e=>e.team==="you"); G.lastCombat = -1e9;
                          G.drops.length = 0; };
      const P = G.player;
      /* somebody in this sector who owns a piece you have not got */
      const owner = BEINGS.find(b2=>(GEAR_BY_OWNER[b2.id]||[]).some(g=>!S.gearOwned.includes(g.id)));
      if(!owner){ o.dropLoop = "everything is already owned"; return; }
      const piece = GEAR_BY_OWNER[owner.id].find(g=>!S.gearOwned.includes(g.id));

      clear();
      const e = makeEnt(owner.id, P.x + 4, P.z, "foe", {});
      G.ents.push(e);
      e.hp = 1; killEnt(e);
      const dropped = G.drops.length === 1 && G.drops[0].gid === piece.id;
      const where = dropped && Math.abs(G.drops[0].x - e.x) < 0.01;

      /* not yours until you go and get it */
      const ownedBefore = S.gearOwned.includes(piece.id);
      P.x = e.x; P.z = e.z; P.y = e.y;
      update(33);
      const ownedAfter = S.gearOwned.includes(piece.id);
      const cleared = G.drops.length === 0;

      /* and nothing drops twice */
      clear();
      const again = makeEnt(owner.id, P.x + 4, P.z, "foe", {});
      G.ents.push(again); again.hp = 1; killEnt(again);
      const noDouble = G.drops.length === 0;

      o.dropLoop = dropped && where && !ownedBefore && ownedAfter && cleared && noDouble;
      clear();
      P.hp = P.maxHp; P.fx = {}; P.dead = false; G.ended = false;
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

    /* each of the thirty bosses has one beat that is its own. Every behaviour
       has to fire, and do the thing its name claims. */
    (()=>{
      const P = G.player;
      const bad = [], seen = {};
      const was = G.sector;
      o.bossKitGaps = SECTORS.filter(s2=>!BOSS_KIT[s2.id]).map(s2=>s2.id);
      for(const sec of SECTORS.map(s2=>s2.id)){
        const kit = BOSS_KIT[sec];
        if(!kit || seen[kit]) continue;
        seen[kit] = sec;
        G.sector = sec;
        G.ents = G.ents.filter(e2=>e2.team==="you"); G.lastCombat = -1e9;
        const e = makeEnt(sectorBoss(sec).id, P.x + 6, P.z, "foe", {boss:true});
        e.maxHp = 1e7; e.hp = e.maxHp; e.phase = 0; e.enrage = 1; e.kitT = 0;
        G.ents.push(e);
        P.hp = P.maxHp; P.fx = {}; P.dead = false; P.grounded = true;
        P.vx = P.vz = 0; P.x = e.x - 6; P.z = e.z;
        const hp0 = P.hp, ents0 = G.ents.length, ex0 = e.x;
        try{
          bossKitTick(e, 33);
          const telegraphed = !!e.kitAt;
          if(telegraphed){ e.kitAt = now() - 1; bossKitTick(e, 33); }
          const did =
            kit === "quake"   ? (telegraphed && P.hp < hp0) :
            kit === "sweep"   ? (telegraphed && P.hp < hp0) :
            kit === "summon"  ? (G.ents.length - ents0 === 2) :
            kit === "bulwark" ? (hasFx(e,"shield") && hasFx(e,"fortify")) :
            kit === "vanish"  ? (Math.abs(e.x - ex0) > 1) :
            kit === "hunger"  ? (Math.abs(P.vx) > 0.5) : false;
          if(!did) bad.push(sec+"/"+kit+" did nothing");
        }catch(err){ bad.push(sec+"/"+kit+": "+err.message); }
      }
      G.sector = was;
      G.ents = G.ents.filter(e2=>e2.team==="you"); G.lastCombat = -1e9;
      P.hp = P.maxHp; P.fx = {}; P.vx = P.vz = 0;
      o.bossKits = bad;
      o.bossKitCount = new Set(Object.values(BOSS_KIT)).size;
    })();

    // a body is built to human proportions, and can be measured to prove it
    (()=>{
      const e = makeEnt("misty-knight", 0, 0, "foe", {});   /* an ordinary human */
      const pal = e.pal, sz = e.size;
      const LG = pal.legs||1, TO = pal.torso||1, SH = pal.shoulder||1, HS = pal.headSz||1;
      const hipY = 0.92*LG, chestY = hipY + 0.53*TO;
      const headH = 0.246*sz*HS;
      const top = (chestY + 0.222*HS + 0.246*HS*0.5)*sz;
      const shoulders = (0.145*sz*pal.bulk*SH)*2 + 0.132*sz*pal.bulk*SH;
      o.body = {
        headsTall: +(top/headH).toFixed(2),                 /* a person is 7.5 */
        shoulderFrac: +((chestY*sz)/top).toFixed(3),        /* 0.82 */
        hipFrac: +((hipY*sz)/top).toFixed(3),               /* 0.52 */
        shoulderOverHead: +(shoulders/(0.168*sz*HS)).toFixed(2)   /* 2.9 */
      };
      /* the neck has to reach the skull: a stub that stops short is what made
         every head in the game float above its shoulders */
      o.neckMeetsHead = (chestY + 0.222*HS - 0.070*HS) > (chestY + 0.222*HS - 0.123*HS);
    })();

    // traits: the one thing that is true of this person and nobody quite like them
    (()=>{
      const P = G.player;
      const clear = ()=>{ G.ents = G.ents.filter(e=>e===P); G.lastCombat = -1e9; G.beams.length = 0; };
      const bad = [], spread = {};
      for(const bb of BEINGS){
        const k = traitOf(bb);
        if(!TRAITS[k]){ bad.push(bb.name+" -> "+k); continue; }
        spread[k] = (spread[k]||0)+1;
      }
      o.traitBad = bad.slice(0,6);
      o.traitAll = Object.keys(spread).length === Object.keys(TRAITS).length;
      const counts = Object.values(spread);
      o.traitSpread = Math.max(...counts) / Math.min(...counts);
      /* the tags that say something decide it, whatever order they were written in */
      o.traitFromTags = BEINGS.filter(bb=>bb.tags.includes("symbiote")).every(bb=>traitOf(bb)==="venomous")
                     && BEINGS.filter(bb=>bb.tags.includes("demon")).every(bb=>traitOf(bb)==="kindled")
                     && BEINGS.filter(bb=>bb.tags.includes("spider") && !bb.tags.includes("symbiote"))
                              .every(bb=>traitOf(bb)==="untouchable");
      o.traitStable = traitOf(BY_ID.daredevil) === traitOf(BY_ID.daredevil);

      const withTrait = k => BEINGS.find(bb=>traitOf(bb)===k);
      const att = k => { const e = makeEnt(withTrait(k).id, P.x, P.z, "you", {});
                         e.st = {p:60,d:40,s:40,n:60}; return e; };
      const dummyWas = _trait["hand-assassin"];
      _trait["hand-assassin"] = "kindled";      /* nothing that changes taking a hit */
      delete _act["hand-assassin"];
      const foeAt = (dx,dz)=>{ const t = makeEnt("hand-assassin", P.x+dx, P.z+(dz||0), "foe", {});
                               t.maxHp = 1e7; t.hp = t.maxHp; t.fx = {}; t.poise = 0;
                               G.ents.push(t); return t; };
      const missing = [];

      clear();
      let t = foeAt(2);
      dealDamage(att("kindled"), t, 1, {});
      if(!hasFx(t,"burn")) missing.push("kindled");

      t.fx = {};
      dealDamage(att("frostbound"), t, 1, {});
      if(!hasFx(t,"chill")) missing.push("frostbound");
      (()=>{                                   /* and a chill is felt in the legs */
        /* on open ground: against a building it cannot move either way, and
           zero against zero proves nothing */
        const open = G.world.spawns[0];
        t.x = open.x; t.z = open.z; t.y = 0; t.grounded = true;
        t.fx = {}; t.mx = 1; t.mz = 0; t.vx = 0; t.vz = 0;
        const x0 = t.x; stepEnt(t, 0.25); const warm = Math.abs(t.x-x0);
        t.x = x0; t.z = open.z; t.vx = 0; t.vz = 0;
        setFx(t, "chill", 3000); stepEnt(t, 0.25);
        const cold = Math.abs(t.x-x0);
        if(!(warm > 0.4 && cold < warm*0.8)) missing.push("frostbound/slow "+warm.toFixed(2)+"/"+cold.toFixed(2));
      })();

      /* the jump lands on one body and stops there — it does not cascade */
      clear();
      const A = foeAt(2), B = foeAt(4), C = foeAt(6);
      dealDamage(att("arcing"), A, 1, {});
      const jumped = (B.hp < B.maxHp ? 1 : 0) + (C.hp < C.maxHp ? 1 : 0);
      if(jumped !== 1 || !G.beams.length) missing.push("arcing("+jumped+")");

      clear(); t = foeAt(2);
      const v = att("venomous"); v.hp = v.maxHp*0.5;
      const vhp = v.hp;
      dealDamage(v, t, 1, {});
      if(!hasFx(t,"bleed") || v.hp <= vhp) missing.push("venomous");

      /* the three that rewrite the kit do it on their own copy of the table */
      (()=>{
        const kb = withTrait("kinetic"), rb = withTrait("reaving"), sb = withTrait("swarming");
        const k = actFor(kb), r2 = actFor(rb), s2 = actFor(sb);
        if(!(k.light.cd < ACT[kb.arch].light.cd && k.spd > ACT[kb.arch].spd)) missing.push("kinetic");
        const ru = ACT[rb.arch].ult;
        if(!((r2.ult.radius||0) > (ru.radius||0) || (r2.ult.len||0) > (ru.len||0)
             || (r2.ult.arc||0) > (ru.arc||0))) missing.push("reaving");
        const sp = ACT[sb.arch].power;
        if(!((s2.power.count||1) > (sp.count||1)
             || (ACT[sb.arch].light.kind==="shot" && s2.light.kind==="spread"))) missing.push("swarming");
        if(k === ACT[kb.arch] || ACT[kb.arch].light.cd === k.light.cd) missing.push("kinetic/shared");
      })();

      clear(); t = foeAt(2);
      (()=>{                                   /* siege moves people and breaks stances */
        /* averaged, because a single hit can crit and one sample proves nothing */
        const run = a => { let k = 0, po = 0;
          for(let i=0;i<200;i++){
            t.vx = t.vz = 0; t.poise = 0; t.poiseT = 0; t.fx = {};
            dealDamage(a, t, 1, {knock:200});
            k += Math.hypot(t.vx, t.vz); po += t.poise;
          }
          return {k:k/200, po:po/200}; };
        const plain = run(att("kindled")), heavy = run(att("siege"));
        if(!(heavy.k > plain.k*1.4 && heavy.po > plain.po*1.6))
          missing.push("siege k"+(heavy.k/plain.k).toFixed(2)+" po"+(heavy.po/plain.po).toFixed(2));
      })();

      clear(); t = foeAt(2); t.maxHp = 1e9; t.hp = t.maxHp;
      (()=>{                                   /* precise cuts deeper into armour */
        const mean = k => { const e = att(k); let s2 = 0;
          for(let i=0;i<300;i++){ t.fx = {}; t.poise = 0; s2 += dealDamage(e,t,1,{}); }
          return s2/300; };
        if(!(mean("precise") > mean("kindled")*1.04)) missing.push("precise");
      })();

      (()=>{                                   /* relentless climbs, and it comes back down */
        /* both ends averaged: one hit can crit, and a single sample against a
           mean proves nothing either way */
        const a = att("relentless");
        const hit = ()=>{ t.fx = {}; t.poise = 0; return dealDamage(a, t, 1, {}); };
        let cold = 0;
        for(let i=0;i<80;i++){ a.relent = 0; a.relentT = 0; cold += hit(); }
        cold /= 80;
        a.relent = 0; a.relentT = 0;
        for(let i=0;i<10;i++) hit();                    /* wind it up to the cap */
        let hot = 0;
        for(let i=0;i<80;i++) hot += hit();
        hot /= 80;
        const climbed = hot > cold*1.15 && (a.relent||0) >= 6;
        a.relentT = now() - 9000; traitTick(a);         /* and it lets go again */
        if(!(climbed && !a.relent)) missing.push("relentless "+(hot/cold).toFixed(2));
      })();

      (()=>{                                   /* untouchable: sometimes it is not there */
        const u = att("untouchable");
        let dodged = 0;
        for(let i=0;i<800;i++) if(traitDodges(u)) dodged++;
        if(!(dodged > 40 && dodged < 170 && traitIframe(u) > 1 && traitRollCd(u) < 1))
          missing.push("untouchable("+dodged+")");
      })();

      (()=>{                                   /* warded closes up, but only if left alone */
        const w = att("warded"); w.fx = {}; w.lastHurt = -1e9; traitTick(w);
        const w2 = att("warded"); w2.fx = {}; w2.lastHurt = now(); traitTick(w2);
        if(!(hasFx(w,"shield") && !hasFx(w2,"shield"))) missing.push("warded");
      })();

      o.traitWorks = missing;

      /* and the first one of each you meet says what it is, once */
      const hintsWere = S.hints;
      S.hints = {};
      const e1 = makeEnt(withTrait("kindled").id, 0, 0, "foe", {});
      announceTrait(e1);
      const said = !!S.hints["trait/kindled"];
      const n0 = document.querySelectorAll("#feed > *").length;
      announceTrait(makeEnt(withTrait("kindled").id, 0, 0, "foe", {}));
      o.traitAnnounce = said && document.querySelectorAll("#feed > *").length === n0;
      S.hints = hintsWere;

      clear();
      if(dummyWas === undefined) delete _trait["hand-assassin"];
      else _trait["hand-assassin"] = dummyWas;
      delete _act["hand-assassin"];
      P.hp = P.maxHp; P.fx = {}; P.poise = 0; P.dead = false; G.lastCombat = -1e9;
    })();

    // echoes: two bodies you have worn, called back to fight beside you
    (()=>{
      const P = G.player;
      const clear = ()=>{ G.ents = G.ents.filter(e=>e.team==="you"); G.lastCombat = -1e9; };
      const pool = sectorBeings(G.sector).filter(b2=>b2.id!==P.id).map(b2=>b2.id);
      const A = pool[0], B = pool[1];
      [A,B].forEach(id=>{ if(!S.unlocked.includes(id)) S.unlocked.push(id); });
      clear();
      G.echoCd = [0,0];

      o.echoSet = setEcho(0, A) && setEcho(1, B)
                  && S.echoes[0]===A && S.echoes[1]===B;
      setEcho(1, A);                                 /* one body, one slot */
      o.echoNoDouble = S.echoes[0]===null || S.echoes[1]===null;
      setEcho(0, A); setEcho(1, B);

      /* mid-fight the choice closes, exactly like taking a body does */
      G.lastCombat = G.t;
      o.echoLocked = setEcho(0, B) === false && S.echoes[0] === A;
      G.lastCombat = -1e9;

      o.echoCall = callEcho(0) && callEcho(1);
      const outs = G.ents.filter(e=>e.team==="ally" && !e.dead);
      o.echoOut = outs.length === 2 && outs.every(e=>e.echoUntil > now());
      o.echoAgain = callEcho(0) === false;            /* already standing */

      /* it comes back as strong as the bond you built wearing it */
      const lvWas = S.levels[A];
      S.levels[A] = 1; const low  = makeEnt(A,0,0,"ally",{level:level(A)});
      S.levels[A] = 8; const high = makeEnt(A,0,0,"ally",{level:level(A)});
      S.levels[A] = lvWas;
      o.echoScales = high.st.p > low.st.p*1.2 && high.maxHp > low.maxHp;

      /* it is you, as far as anything with a fist is concerned */
      const mate = outs[0];
      const foe1 = makeEnt(pool[2]||A, P.x+4, P.z, "foe", {});
      const civ  = G.ents.find(e=>e.team==="civ");
      o.echoFriendly = !canHit(mate, P) && !canHit(P, mate)
                       && canHit(mate, foe1) && canHit(foe1, mate)
                       && (!civ || !canHit(mate, civ));

      /* and it hits softer than the body would — averaged, because one hit
         either side can crit and a single pair proves nothing */
      const you = makeEnt(mate.id, P.x, P.z, "you", {});
      you.st = Object.assign({}, mate.st);
      foe1.maxHp = 1e9; foe1.hp = foe1.maxHp;
      const meanHit = a2 => { let s2 = 0;
        for(let i=0;i<120;i++){ foe1.fx = {}; foe1.poise = 0; s2 += dealDamage(a2, foe1, 1, {}); }
        return s2/120; };
      o.echoSofter = meanHit(mate) < meanHit(you)*0.85;
      foe1.hp = foe1.maxHp; foe1.fx = {}; foe1.poise = 0;

      /* it goes for whatever is already hitting you, not just whatever is near */
      const far = makeEnt(pool[2]||A, mate.x+9, mate.z, "foe", {});
      far.tgt = P; far.tgtT = now()+9999;
      const near = makeEnt(pool[2]||A, mate.x+5, mate.z+1, "foe", {});
      near.tgt = null;
      G.ents.push(far, near);
      o.echoPicksYourFight = allyTarget(mate) === far;

      /* it pulls something off you only by getting between you and it */
      const bully = makeEnt(pool[2]||A, 0, 0, "foe", {});
      G.ents.push(bully);
      bully.x = 0; bully.z = 0; bully.tgt = null; bully.tgtT = 0;
      mate.x = 2; mate.z = 0; P.x = 24; P.z = 0;
      o.echoTanks = foeTarget(bully) === mate;
      mate.x = 30; mate.z = 30; bully.tgt = null; bully.tgtT = 0;
      o.echoReleases = foeTarget(bully) === P;

      /* with nothing to hit it stays with you */
      G.ents = G.ents.filter(e=>e.team!=="foe");
      mate.x = P.x + 20; mate.z = P.z; mate.mx = mate.mz = 0;
      allyThink(mate, 33);
      o.echoFollows = mate.mx < -0.4;                 /* pointed back at you */

      /* the clock runs out, and the wait starts from there */
      const m2 = outs[1];
      m2.echoUntil = now() - 1;
      echoTick();
      o.echoFades = m2.dead && G.echoCd[m2.echoSlot] > now();
      o.echoWaits = callEcho(m2.echoSlot) === false && echoStatus(m2.echoSlot).cool > 0.5;

      /* and a longer memory stands longer and comes back sooner */
      const cd0 = echoCooldown(), lf0 = echoLife();
      S.vessel = S.vessel||{}; S.vessel.echo = VESSEL_MAX;
      o.echoRank = echoCooldown() < cd0 && echoLife() > lf0 && !!VESSEL_UP.echo;
      delete S.vessel.echo;

      /* both slots are on the HUD under your own face */
      buildHostHud();
      const slots = [...document.querySelectorAll("#hud-squad .slot--echo")];
      updateHud();
      o.echoHud = slots.length === ECHO_SLOTS
                  && slots.every(s2=>s2.querySelector("b").textContent.length > 0);

      clear();
      G.echoCd = [0,0]; S.echoes = [null,null]; buildHostHud();
      P.hp = P.maxHp; P.fx = {}; P.x = 0; P.z = 0; P.dead = false;
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

    /* the controls card is the first thing a new player reads and the only
       thing they can consult later; it must not describe a game we stopped
       making. It told people to press 1/2/3 to swap body mid-fight for hours
       after that became the one thing you cannot do. */
    (()=>{
      const c = controlsHtml();
      o.controls = {
        become:  /BECOME/.test(c) && /<b>B<\/b>/.test(c),
        theRule: /cannot/i.test(c) && /six seconds/.test(c),
        stale:   /1 2 3/.test(c) || /as often as you like/i.test(c),
        dive:    /dive/i.test(c),
        roles:   /WARDEN/.test(c) && /HERALD/.test(c),
        mind:    /artificial mind/i.test(c),
        echoes:  /Echoes/.test(c) && /<b>1<\/b>/.test(c)
      };
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
  ok("content counts", r.counts.beings>=670 && r.counts.gear>=100 && r.counts.ai>=30 && r.counts.sectors===30, JSON.stringify(r.counts));
  ok("nobody is in the roster twice", r.rosterDupes.length===0, r.rosterDupes.join(", "));
  ok("no gear without an owner", r.orphanGear.length===0, r.orphanGear.join(", "));
  ok("no mind without a possible host", r.deadMinds.length===0, r.deadMinds.join(", "));
  ok("every sector has people and a boss", r.thinSectors.length===0, r.thinSectors.join(", "));
  ok("a weapon is drawn as a weapon", r.gearShapes.length===0, r.gearShapes.join(", "));
  ok("all thirty bosses are the ones named", r.badBosses.length===0 && r.namedBossCount===30,
     r.badBosses.join(", "));
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
  ok("every ability of every archetype fires",
     r.abilThrew.length===0 && r.abilCount===64 && r.abilKinds>=11,
     r.abilThrew.slice(0,3).join(" | ") || (r.abilCount+" across "+r.abilKinds+" kinds"));
  ok("and every attack lands on somebody", r.abilInert.length===0, r.abilInert.join(", "));
  ok("shots aim where the target is", r.airShotAims);
  ok("a grounded enemy throws at a high hover", r.airThrows);
  ok("and jumps at a low one", r.airLeaps);
  ok("a swing reaches higher off the ground", r.airConnects);
  ok("the finisher launches, but not a boss", r.airLaunch);
  ok("a dive lands on people, once", r.airDive);
  ok("hovering over a crowd is not free", r.airHoverNotFree, JSON.stringify(r.hoverCosts));
  ok("all five kinds of work can be finished", r.missionKinds.length===0, r.missionKinds.join(" | "));
  ok("gear falls where they fell and you can pick it up", r.dropLoop === true, String(r.dropLoop));
  ok("twelve minds, all of them wired", r.mindsAllWired && r.mindCount);
  ok("orbital strike hits the first blow only", r.mindStrike);
  ok("plating shields you when a fight starts", r.mindPlating);
  ok("density control phases a quarter of it", r.mindPhase);
  ok("precognition slips hits and resists riders", r.mindForesee);
  ok("adaptive learning stacks with the fight", r.mindAdapt);
  ok("backup catches you once per sector", r.mindBackup);
  ok("the mind chip reads and flashes", r.mindChip);
  ok("every sector's boss has a beat of its own",
     r.bossKitGaps.length===0 && r.bossKitCount===6, r.bossKitGaps.join(", "));
  ok("and all six of those beats land", r.bossKits.length===0, r.bossKits.join(" | "));
  ok("a body is built to human proportions",
     r.body.headsTall > 7.0 && r.body.headsTall < 8.3
     && r.body.shoulderFrac > 0.79 && r.body.shoulderFrac < 0.85
     && r.body.hipFrac > 0.49 && r.body.hipFrac < 0.57
     && r.body.shoulderOverHead > 2.5 && r.body.shoulderOverHead < 3.3
     && r.neckMeetsHead,
     JSON.stringify(r.body));
  ok("every being has a trait, and all twelve are used",
     r.traitBad.length===0 && r.traitAll, r.traitBad.join(", "));
  ok("what the codex says about somebody decides it", r.traitFromTags && r.traitStable);
  ok("and no one trait swallows the roster", r.traitSpread < 4, "widest/narrowest "+r.traitSpread.toFixed(1));
  ok("all twelve traits do what they say", r.traitWorks.length===0, r.traitWorks.join(" | "));
  ok("meeting one tells you what it is, once", r.traitAnnounce);
  ok("two echoes are held, and never the same body twice", r.echoSet && r.echoNoDouble);
  ok("holding one is a choice you make out of a fight", r.echoLocked);
  ok("calling one stands it up beside you", r.echoCall && r.echoOut && r.echoAgain);
  ok("an echo is as strong as the bond you built", r.echoScales);
  ok("it cannot be hit by you and cannot hit you", r.echoFriendly);
  ok("and it lands softer than the body would", r.echoSofter);
  ok("it goes for whatever is already hitting you", r.echoPicksYourFight);
  ok("it pulls a foe off you only by getting between", r.echoTanks && r.echoReleases);
  ok("with nothing to hit it stays with you", r.echoFollows);
  ok("it runs out, and the wait starts there", r.echoFades && r.echoWaits);
  ok("a longer memory stands longer and returns sooner", r.echoRank);
  ok("both echoes read on the HUD", r.echoHud);
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
  ok("the controls card describes this game",
     r.controls.become && r.controls.theRule && !r.controls.stale
     && r.controls.dive && r.controls.roles && r.controls.mind && r.controls.echoes,
     JSON.stringify(r.controls));
  ok("every sector has something to say", r.storySilent.length===0, r.storySilent.join(","));
  ok("bosses greet you by name where written", r.bossLines);
  ok("the spark counts what it has worn out", r.tally);
  ok("the last sector ends the story", r.endingReads && r.holdOnReopens && r.letGoSummary);
  ok("distant people cost a fraction to draw", r.charLod);
  ok("a press is an edge as well as a level", r.tapLatch);
  ok("save round-trips", r.save);

  /* --- switching quality mid-game must not drop the world ------------------ */
  const qsw = await p.evaluate(()=>{
    const seen = [];
    for(const qq of ["high","low","medium","high","low"]){
      quality = qq; resize();
      for(let i=0;i<6;i++){ update(33); renderScene(); }
      seen.push({q:qq, calls:drawCalls, shadow:!!SHADOW, live:!!G.player && G.ents.length>0});
    }
    quality = "low"; resize();
    return seen;
  });
  ok("quality can be switched mid-game",
     qsw.every(x=>x.live && x.calls > 40) && qsw.some(x=>x.shadow) && qsw.some(x=>!x.shadow),
     qsw.map(x=>x.q+":"+x.calls).join(" "));

  /* --- and a full save has to survive a real reload ------------------------ */
  const before = await p.evaluate(()=>{
    BEINGS.slice(0,60).forEach(b2=>{ if(!S.unlocked.includes(b2.id)) S.unlocked.push(b2.id);
                                     S.defeated[b2.id] = true; });
    GEAR_LIST.slice(0,12).forEach(g=>{ if(!S.gearOwned.includes(g.id)) S.gearOwned.push(g.id); });
    GEAR_LIST.slice(0,4).forEach(g=>{ if(!S.attuned.includes(g.id)) S.attuned.push(g.id);
                                      S.gearLv[g.id] = 2; });
    AI_LIST.slice(0,8).forEach(a=>{ if(!S.aiOwned.includes(a.id)) S.aiOwned.push(a.id); });
    S.installedAi = AI_LIST[3].id;
    S.essence = 5000; S.levels[S.host] = 7; S.xp[S.host] = 40;
    S.abil[S.host] = {light:2, power:1}; S.vessel = {surge:2, regen:1, essence:3, iframe:1};
    S.mastery[S.host] = 120; S.kills = {hk:9, qns:4}; S.cleared = {hk:true};
    S.missionsDone = 7; S.missionRound = 2; S.story = {hk:true};
    S.worn = 11; S.spent = 4; S.letGo = 1; S.heldOn = 2;
    S.loadout[S.host] = GEAR_LIST[0].id;
    save();
    return JSON.parse(localStorage.getItem(SAVE_KEY));
  });
  await p.reload();
  await p.waitForTimeout(1200);
  const after = await p.evaluate(()=>JSON.parse(JSON.stringify(S)));
  const drift = Object.keys(before).filter(k=>JSON.stringify(before[k]) !== JSON.stringify(after[k]));
  ok("a whole save survives a reload", drift.length===0 && Object.keys(before).length >= 25,
     drift.length ? "drifted: "+drift.join(", ") : Object.keys(before).length+" keys");

  /* --- and the same game on a phone --------------------------------------- */
  const mctx = await b.newContext({viewport:{width:390,height:844}, isMobile:true,
                                   hasTouch:true, deviceScaleFactor:2});
  const m = await mctx.newPage(); m.setDefaultTimeout(60000);
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
