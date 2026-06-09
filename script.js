const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const miniCanvas = document.getElementById('minimap');
const mctx = miniCanvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const TILE = 40;
const MAP_W = 30, MAP_H = 22;
const PLAYER_R = 10;
const BULLET_SPEED = 14;
const ENEMY_SPEED = 1.2;
const ROUND_TIME = 115;
const BUY_TIME = 20;
const BOMB_TIME = 40;
const DEFUSE_TIME = 5;
const PLANT_TIME = 3;

// Weapons
const WEAPONS = {
  glock:  {name:'GLOCK-17', dmg:22, rof:180, reload:1.5, mag:15, reserve:45, spread:0.08, auto:false, cost:200, type:'Pistol'},
  usp:    {name:'USP-S',    dmg:25, rof:250, reload:2.0, mag:12, reserve:36, spread:0.05, auto:false, cost:300, type:'Pistol'},
  deagle: {name:'DEAGLE',  dmg:98, rof:700, reload:2.2, mag:7,  reserve:35, spread:0.06, auto:false, cost:700, type:'Pistol'},
  mp5:    {name:'MP5-SD',  dmg:28, rof:120, reload:2.0, mag:30, reserve:120,spread:0.06, auto:true,  cost:1500,type:'SMG'},
  ak47:   {name:'AK-47',   dmg:86, rof:600, reload:2.5, mag:30, reserve:90, spread:0.10, auto:true,  cost:2700,type:'Rifle'},
  m4a1:   {name:'M4A1-S',  dmg:74, rof:500, reload:3.1, mag:20, reserve:80, spread:0.05, auto:true,  cost:2900,type:'Rifle'},
  awp:    {name:'AWP',     dmg:999,rof:1300,reload:3.7, mag:5,  reserve:30, spread:0.01, auto:false, cost:4750,type:'Sniper'},
  helmet: {name:'HELMET',  cost:350, type:'Equipment'},
  armor:  {name:'ARMOR',   cost:650, type:'Equipment'},
  he:     {name:'HE GREN', cost:300, type:'Grenade'},
};

// Map layout (0=floor,1=wall,2=bombsite,3=spawn-ct,4=spawn-t)
const RAW_MAP = [
  '111111111111111111111111111111',
  '130000000001000000000010000031',
  '100011100001000000000010001001',
  '100011100001000011110010001001',
  '100000000001000011110010000001',
  '100000000001000000000010000001',
  '111001111001000000000001001111',
  '100001000001111001110001000001',
  '100001000000000000000000000001',
  '100001000000000000000000000001',
  '100000000001110001110001000001',
  '100000011100000000000111000001',
  '100000011100000000000111000001',
  '100000000001110001110001000001',
  '100001000000000000000000000001',
  '100001000000000000000000000001',
  '100001000001111001110001000001',
  '111001111001000000000001001111',
  '100000000001000000000010000001',
  '100011100001000022220010001001',
  '140000000001000022220010000041',
  '111111111111111111111111111111',
];

const MAP_DATA = RAW_MAP.map(row => row.split('').map(Number));

// ── STATE ──────────────────────────────────────────────────────────────────
let gameState = 'menu'; // menu, buyphase, playing, roundend, gameover
let camera = {x:0, y:0};

const player = {
  x:0, y:0, angle:0,
  hp:100, armor:0, hasHelmet:false,
  money:800,
  weapons:[{...WEAPONS.usp, ammo:12, reserve:36, key:'usp'}],
  activeWeapon:0,
  hasBomb:false,
  lastShot:0, reloading:false, reloadEnd:0,
  alive:true, isT:false,
  name:'GHOST_7'
};

let enemies = [];
let bullets = [];
let effects = [];
let killfeed = [];
let bomb = {planted:false, x:0, y:0, timer:0, defusing:false, defuseProgress:0, planting:false, plantProgress:0, siteLabel:'A', dropped:false, droppedX:0, droppedY:0};
let round = {num:1, ctScore:0, tScore:0, timer:ROUND_TIME, phase:'buy', phaseTimer:BUY_TIME, ctWon:false};
let roundEndTimer = 0;
let nextRoundTimer = 0;
let isBuyOpen = false;
let keys = {};
let mouseX = 0, mouseY = 0;
let mouseDown = false;
let bombsite = {x:0, y:0};

// Find spawn points
let ctSpawns = [], tSpawns = [], bombsites = [];
MAP_DATA.forEach((row,r)=>row.forEach((cell,c)=>{
  if(cell===3) ctSpawns.push({x:c*TILE+TILE/2, y:r*TILE+TILE/2});
  if(cell===4) tSpawns.push({x:c*TILE+TILE/2, y:r*TILE+TILE/2});
  if(cell===2) bombsites.push({x:c*TILE+TILE/2, y:r*TILE+TILE/2});
}));
if(bombsites.length>0) bombsite = bombsites[Math.floor(bombsites.length/2)];

function spawnEnemy(spawn, id) {
  const weps = ['ak47','glock'];
  const w = id===0?'ak47':id===1?'mp5':'glock';
  const wdata = {...WEAPONS[w], ammo:WEAPONS[w].mag, reserve:WEAPONS[w].reserve, key:w};
  const names = ['PHANTOM','KARAK','SLEDGE','WRAITH','IGNITION'];
  return {
    x:spawn.x, y:spawn.y, angle:0,
    hp:100, armor:id<2?50:0,
    weapon:wdata, lastShot:0,
    alive:true, isT:true,
    hasBomb: id===0,
    id, name:names[id%names.length],
    state:'patrol',
    targetX:spawn.x, targetY:spawn.y,
    patrolTimer:0, seenPlayer:false,
    path:[],
  };
}

function initRound() {
  const sp = ctSpawns[Math.floor(Math.random()*ctSpawns.length)];
  player.x=sp.x; player.y=sp.y; player.alive=true;
  player.hp=100; player.hasBomb=false;
  
  if(player.weapons.length===0) player.weapons=[{...WEAPONS.usp, ammo:WEAPONS.usp.mag, reserve:WEAPONS.usp.reserve, key:'usp'}];
  player.weapons.forEach(w=>{w.ammo=Math.min(w.ammo+Math.ceil(w.mag/2),w.mag); });
  player.reloading=false; player.activeWeapon=Math.min(player.activeWeapon,player.weapons.length-1);

  enemies = [];
  const numEnemies = Math.min(3 + Math.floor(round.num/3), 5);
  for(let i=0;i<numEnemies;i++){
    const sp2 = tSpawns[i%tSpawns.length];
    const e = spawnEnemy({x:sp2.x+(Math.random()-0.5)*20, y:sp2.y+(Math.random()-0.5)*20}, i);
    enemies.push(e);
  }

  bullets=[]; effects=[];
  bomb = {planted:false, x:0, y:0, timer:BOMB_TIME, defusing:false, defuseProgress:0, planting:false, plantProgress:0, siteLabel:'A', dropped:false, droppedX:0, droppedY:0};
  round.phase = 'buy';
  round.phaseTimer = BUY_TIME;
  round.timer = ROUND_TIME;
  gameState = 'buyphase';
  document.getElementById('buy-phase-banner').style.display='block';
  isBuyOpen = false;
  document.getElementById('dead-msg').style.display='none';
  updatePips();
}

// ── COLLISION ───────────────────────────────────────────────────────────────
function isWall(x, y) {
  const c = Math.floor(x/TILE), r = Math.floor(y/TILE);
  if(r<0||r>=MAP_H||c<0||c>=MAP_W) return true;
  return MAP_DATA[r][c]===1;
}

function moveWithCollision(obj, dx, dy) {
  const r = PLAYER_R;
  let nx=obj.x+dx, ny=obj.y+dy;
  if(!isWall(nx-r,obj.y-r)&&!isWall(nx+r,obj.y-r)&&!isWall(nx-r,obj.y+r)&&!isWall(nx+r,obj.y+r)) obj.x=nx;
  nx=obj.x;
  if(!isWall(nx-r,ny-r)&&!isWall(nx+r,ny-r)&&!isWall(nx-r,ny+r)&&!isWall(nx+r,ny+r)) obj.y=ny;
}

function hasLineOfSight(ax,ay,bx,by) {
  const dist = Math.hypot(bx-ax,by-ay);
  const steps = Math.ceil(dist/8);
  for(let i=1;i<steps;i++){
    const tx=ax+(bx-ax)*i/steps, ty=ay+(by-ay)*i/steps;
    if(isWall(tx,ty)) return false;
  }
  return true;
}

// ── INPUT ───────────────────────────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  keys[e.key.toLowerCase()]=true;
  if(gameState==='menu') return;
  if(e.key==='b'||e.key==='B') toggleBuyMenu();
  if(e.key==='r'||e.key==='R') startReload();
  if(e.key==='1') switchWeapon(0);
  if(e.key==='2') switchWeapon(1);
  if(e.key==='3') switchWeapon(2);
  if(e.key==='Escape') { isBuyOpen=false; document.getElementById('buy-menu').style.display='none'; }
});
document.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
document.addEventListener('mousemove',e=>{mouseX=e.clientX; mouseY=e.clientY;});
canvas.addEventListener('mousedown',e=>{ if(e.button===0) mouseDown=true; });
canvas.addEventListener('mouseup',e=>{ if(e.button===0) mouseDown=false; });
canvas.addEventListener('contextmenu',e=>e.preventDefault());

document.getElementById('mm-start').addEventListener('click',()=>{
  document.getElementById('main-menu').style.display='none';
  document.getElementById('hud').style.display='flex';
  initRound();
  loop();
});

// ── SHOOTING ────────────────────────────────────────────────────────────────
function tryShoot() {
  if(!player.alive) return;
  if(isBuyOpen) return;
  const w = player.weapons[player.activeWeapon];
  if(!w) return;
  if(player.reloading) return;
  const now = Date.now();
  if(now - player.lastShot < w.rof) return;
  if(w.ammo<=0) { startReload(); return; }
  player.lastShot = now;
  w.ammo--;
  const spread = w.spread;
  const da = (Math.random()-0.5)*spread*2;
  const angle = player.angle + da;
  bullets.push({x:player.x, y:player.y, vx:Math.cos(angle)*BULLET_SPEED, vy:Math.sin(angle)*BULLET_SPEED, owner:'player', dmg:w.dmg, life:60});
  effects.push({type:'muzzle', x:player.x, y:player.y, life:3, maxLife:3, angle:player.angle});
  updateHUD();
}

function startReload() {
  if(!player.alive) return;
  const w = player.weapons[player.activeWeapon];
  if(!w||player.reloading||w.ammo===w.mag||w.reserve===0) return;
  player.reloading=true;
  const rt = w.reload*1000;
  player.reloadEnd = Date.now()+rt;
  document.getElementById('reload-bar').style.display='block';
  const fill = document.getElementById('reload-fill');
  fill.style.transition=`width ${w.reload}s linear`;
  fill.style.width='0%';
  setTimeout(()=>fill.style.width='100%',10);
  setTimeout(()=>{
    if(!player.alive) return;
    const needed = w.mag-w.ammo;
    const take = Math.min(needed, w.reserve);
    w.ammo+=take; w.reserve-=take;
    player.reloading=false;
    document.getElementById('reload-bar').style.display='none';
    fill.style.width='0%'; fill.style.transition='none';
    updateHUD();
  }, rt);
}

function switchWeapon(idx) {
  if(idx<player.weapons.length) {
    player.activeWeapon=idx;
    player.reloading=false;
    document.getElementById('reload-bar').style.display='none';
    updateHUD();
  }
}

// ── BUY MENU ────────────────────────────────────────────────────────────────
function toggleBuyMenu() {
  if(gameState!=='buyphase'&&gameState!=='playing') return;
  if(gameState==='playing'&&round.timer<ROUND_TIME-BUY_TIME) return;
  isBuyOpen=!isBuyOpen;
  const menu = document.getElementById('buy-menu');
  if(isBuyOpen) {
    menu.style.display='flex'; buildBuyMenu();
  } else {
    menu.style.display='none';
  }
}

function buildBuyMenu() {
  const items = document.getElementById('buy-items');
  items.innerHTML='';
  document.getElementById('buy-money').textContent=`FUNDS: $${player.money}`;
  const shopItems = [
    {key:'m4a1',w:WEAPONS.m4a1},{key:'awp',w:WEAPONS.awp},{key:'deagle',w:WEAPONS.deagle},
    {key:'mp5',w:WEAPONS.mp5},{key:'armor',w:WEAPONS.armor},{key:'helmet',w:WEAPONS.helmet},
    {key:'he',w:WEAPONS.he},{key:'usp',w:WEAPONS.usp}
  ];
  shopItems.forEach(({key,w})=>{
    const div = document.createElement('div');
    div.className='buy-item'+(player.money<w.cost?' cant-afford':'');
    div.innerHTML=`<div class="bi-type">${w.type}</div><div class="bi-name">${w.name}</div><div class="bi-cost">$${w.cost}</div>`;
    if(player.money>=w.cost) {
      div.addEventListener('click',()=>buyItem(key,w));
    }
    items.appendChild(div);
  });
}

function buyItem(key,w) {
  if(player.money<w.cost) return;
  player.money-=w.cost;
  if(key==='armor') { player.armor=100; }
  else if(key==='helmet') { player.hasHelmet=true; }
  else if(key==='he') { /* grenade support later */ }
  else {
    const existing = player.weapons.find(pw=>pw.key===key);
    if(existing) { existing.reserve=Math.min(existing.reserve+existing.mag, existing.mag*3); }
    else { player.weapons.push({...w, ammo:w.mag, reserve:w.reserve, key}); }
  }
  addKillfeed('YOU', `BOUGHT ${w.name}`, '', 'ct');
  buildBuyMenu();
  updateHUD();
}

// ── HUD ─────────────────────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById('money').textContent=`$${player.money}`;
  document.getElementById('health-num').textContent=player.alive?player.hp:0;
  document.getElementById('hp-fill').style.width=(player.alive?player.hp:0)+'%';
  document.getElementById('armor-num').textContent=`♦ ${player.armor}`;
  const w = player.weapons[player.activeWeapon];
  if(w){ 
    document.getElementById('weapon-info').textContent=w.name; 
    document.getElementById('ammo-info').textContent=`${w.ammo}/${w.reserve}`; 
  }
  document.getElementById('score-ct').textContent=round.ctScore;
  document.getElementById('score-t').textContent=round.tScore;
}

function updateTimer() {
  const t = Math.ceil(round.timer);
  const m = Math.floor(t/60), s = t%60;
  document.getElementById('round-timer').textContent=`${m}:${s.toString().padStart(2,'0')}`;
  document.getElementById('round-info').textContent=`ROUND ${round.num} OF 30`;
}

function updatePips() {
  const ctPips = document.getElementById('ct-pips');
  const tPips = document.getElementById('t-pips');
  ctPips.innerHTML=''; tPips.innerHTML='';
  const cpip = document.createElement('div');
  cpip.className='pip ct'+(player.alive?'':' dead');
  ctPips.appendChild(cpip);
  enemies.forEach(e=>{
    const p2 = document.createElement('div');
    p2.className='pip t'+(e.alive?'':' dead');
    tPips.appendChild(p2);
  });
}

function addKillfeed(killer, weapon, victim, side) {
  const kf = document.getElementById('killfeed');
  const div = document.createElement('div');
  div.className=`kf-entry kf-${side}`;
  div.innerHTML=`<span class="kf-killer">${killer}</span><span class="kf-weapon">✦${weapon}✦</span><span class="kf-victim">${victim}</span>`;
  kf.insertBefore(div, kf.firstChild);
  if(kf.children.length>4) kf.removeChild(kf.lastChild);
  setTimeout(()=>{ 
    div.style.opacity='0'; 
    setTimeout(()=>{ if(div.parentNode) div.remove(); }, 1000); 
  },4000);
}

// ── AI ─────────────────────────────────────────────────────────────────────
function updateEnemy(e, dt) {
  if(!e.alive) return;
  const dx = player.x-e.x, dy = player.y-e.y;
  const dist = Math.hypot(dx,dy);
  const canSee = dist<400 && hasLineOfSight(e.x,e.y,player.x,player.y);

  if(canSee && player.alive) {
    e.seenPlayer=true;
    e.state='attack';
    e.targetX=player.x; e.targetY=player.y;
  } else if(e.seenPlayer && e.state==='attack') {
    e.state='chase';
    e.patrolTimer=180;
  }

  if(e.hasBomb && !bomb.planted && !canSee) {
    e.state='plant';
    e.targetX=bombsite.x; e.targetY=bombsite.y;
  }

  if(e.state==='patrol') {
    e.patrolTimer-=1;
    if(e.patrolTimer<=0) {
      e.patrolTimer=120+Math.random()*180;
      const r2 = 200;
      e.targetX=e.x+(Math.random()-0.5)*r2;
      e.targetY=e.y+(Math.random()-0.5)*r2;
    }
    const pdx=e.targetX-e.x, pdy=e.targetY-e.y;
    const pd=Math.hypot(pdx,pdy);
    if(pd>5) { 
      e.angle=Math.atan2(pdy,pdx); 
      moveWithCollision(e, (pdx/pd)*ENEMY_SPEED*0.6, (pdy/pd)*ENEMY_SPEED*0.6); 
    }
  } else if(e.state==='attack') {
    if(!player.alive) { e.state='patrol'; return; }
    e.angle = Math.atan2(dy,dx);
    if(dist>80) moveWithCollision(e, (dx/dist)*ENEMY_SPEED, (dy/dist)*ENEMY_SPEED);
    const now=Date.now();
    if(canSee && now-e.lastShot>e.weapon.rof*1.5) {
      e.lastShot=now;
      const spread=e.weapon.spread*1.5;
      const da=(Math.random()-0.5)*spread*2;
      const ang=e.angle+da;
      bullets.push({x:e.x,y:e.y,vx:Math.cos(ang)*BULLET_SPEED,vy:Math.sin(ang)*BULLET_SPEED,owner:'enemy',dmg:e.weapon.dmg,life:60,eid:e.id});
      effects.push({type:'muzzle',x:e.x,y:e.y,life:3,maxLife:3,angle:e.angle});
    }
  } else if(e.state==='chase') {
    const pdx=e.targetX-e.x, pdy=e.targetY-e.y;
    const pd=Math.hypot(pdx,pdy);
    e.angle=Math.atan2(pdy,pdx);
    if(pd>8) moveWithCollision(e, (pdx/pd)*ENEMY_SPEED, (pdy/pd)*ENEMY_SPEED);
    else { e.state='patrol'; e.patrolTimer=60; }
  } else if(e.state==='plant') {
    const pdx=bombsite.x-e.x, pdy=bombsite.y-e.y;
    const pd=Math.hypot(pdx,pdy);
    e.angle=Math.atan2(pdy,pdx);
    if(pd>20) moveWithCollision(e, (pdx/pd)*ENEMY_SPEED, (pdy/pd)*ENEMY_SPEED);
    else if(!bomb.planted && e.hasBomb) {
      bomb.planted=true; bomb.x=bombsite.x; bomb.y=bombsite.y;
      bomb.timer=BOMB_TIME; bomb.siteLabel='A';
      e.hasBomb=false;
      addKillfeed(e.name, 'PLANTED', 'BOMB', 't');
      document.getElementById('bomb-status').style.display='flex';
    }
    if(canSee && player.alive) e.state='attack';
  }
}

// ── MAIN LOOP ────────────────────────────────────────────────────────────────
let lastTime = 0;
function loop(ts=0) {
  requestAnimationFrame(loop);
  const dt = Math.min((ts-lastTime)/16.67,3);
  lastTime=ts;
  if(gameState==='menu') return;
  update(dt);
  draw();
}

function update(dt) {
  if(gameState==='buyphase') {
    round.phaseTimer-=dt/60;
    if(round.phaseTimer<=0) {
      gameState='playing';
      document.getElementById('buy-phase-banner').style.display='none';
      document.getElementById('buy-menu').style.display='none';
      isBuyOpen=false;
    }
  }

  if(gameState==='roundend') {
    nextRoundTimer-=dt/60;
    const el=document.getElementById('re-next');
    if(el) el.textContent=`NEXT ROUND IN ${Math.ceil(Math.max(nextRoundTimer,0))}...`;
    if(nextRoundTimer<=0) {
      document.getElementById('round-end').style.display='none';
      round.num++;
      if(round.ctScore>=16||round.tScore>=16||round.num>30) { endGame(); return; }
      initRound();
    }
    return;
  }

  if(gameState!=='playing'&&gameState!=='buyphase') return;

  // Player movement
  if(player.alive && !isBuyOpen) {
    const spd=2.2;
    let dx=0,dy=0;
    if(keys['w']||keys['arrowup']) dy-=spd;
    if(keys['s']||keys['arrowdown']) dy+=spd;
    if(keys['a']||keys['arrowleft']) dx-=spd;
    if(keys['d']||keys['arrowright']) dx+=spd;
    if(dx&&dy){dx*=0.707;dy*=0.707;}
    if(dx||dy) moveWithCollision(player, dx, dy);

    const cx=canvas.width/2, cy=canvas.height/2;
    player.angle=Math.atan2(mouseY-cy, mouseX-cx);

    const w=player.weapons[player.activeWeapon];
    if(mouseDown) tryShoot();

    if(w && w.ammo===0 && !player.reloading) startReload();
  }

  if(gameState==='playing') {
    round.timer-=dt/60;
    updateTimer();
    if(round.timer<=0) { endRound(false, 'TIME EXPIRED'); return; }
  }

  // Bomb logic
  if(bomb.planted) {
    bomb.timer-=dt/60;
    const pct=bomb.timer/BOMB_TIME*100;
    document.getElementById('bomb-bar').style.width=pct+'%';
    if(bomb.timer<=0) { endRound(false,'BOMB EXPLODED'); return; }

    const ddx=player.x-bomb.x, ddy=player.y-bomb.y;
    const dd=Math.hypot(ddx,ddy);
    if(dd<40 && player.alive && !isBuyOpen) {
      document.getElementById('defuse-prompt').style.display='block';
      if(keys['f']) {
        bomb.defuseProgress+=dt/60/DEFUSE_TIME;
        if(bomb.defuseProgress>=1) { endRound(true,'BOMB DEFUSED'); return; }
      } else {
        bomb.defuseProgress=Math.max(0,bomb.defuseProgress-dt/60/2);
      }
    } else {
      document.getElementById('defuse-prompt').style.display='none';
      bomb.defuseProgress=Math.max(0,bomb.defuseProgress-dt/60/2);
    }
  } else {
    document.getElementById('defuse-prompt').style.display='none';
  }

  // Update bullets
  for(let i=bullets.length-1;i>=0;i--) {
    const b=bullets[i];
    b.x+=b.vx; b.y+=b.vy; b.life--;
    if(b.life<=0||isWall(b.x,b.y)) {
      if(isWall(b.x,b.y)) effects.push({type:'impact',x:b.x,y:b.y,life:8,maxLife:8});
      bullets.splice(i,1); continue;
    }

    // Hit player
    if(b.owner==='enemy'&&player.alive) {
      if(Math.hypot(b.x-player.x, b.y-player.y)<PLAYER_R+3) {
        let dmg=b.dmg;
        if(player.armor>0) { 
          const absorbed=Math.min(dmg*0.5, player.armor); 
          player.armor-=absorbed; dmg-=absorbed; 
        }
        player.hp-=dmg; player.hp=Math.max(0,player.hp);
        effects.push({type:'blood',x:player.x,y:player.y,life:15,maxLife:15});
        bullets.splice(i,1);
        updateHUD();
        if(player.hp<=0) { player.alive=false; playerDied(); }
        continue;
      }
    }

    // Hit enemy
    if(b.owner==='player') {
      for(let j=enemies.length-1;j>=0;j--) {
        const e=enemies[j];
        if(!e.alive) continue;
        if(Math.hypot(b.x-e.x, b.y-e.y)<PLAYER_R+3) {
          let dmg=b.dmg;
          if(e.armor>0) { 
            const a=Math.min(dmg*0.5,e.armor); e.armor-=a; dmg-=a; 
          }
          e.hp-=dmg; e.hp=Math.max(0,e.hp);
          effects.push({type:'blood',x:e.x,y:e.y,life:15,maxLife:15});
          bullets.splice(i,1);
          if(e.hp<=0) {
            e.alive=false;
            const w=player.weapons[player.activeWeapon];
            addKillfeed(player.name, w?w.name:'GUN', e.name, 'ct');
            player.money=Math.min(16000, player.money+300);
            updateHUD();
            updatePips();
          }
          break;
        }
      }
    }
  }

  // Effects
  for(let i=effects.length-1;i>=0;i--) {
    effects[i].life--;
    if(effects[i].life<=0) effects.splice(i,1);
  }

  // Enemies AI
  enemies.forEach(e=>updateEnemy(e,dt));

  // Win conditions
  if(gameState==='playing') {
    const allEnemiesDead = enemies.every(e=>!e.alive);
    if(allEnemiesDead && !bomb.planted) { 
      endRound(true, 'ALL TERRORISTS ELIMINATED'); 
    }
  }

  camera.x = player.x - canvas.width/2;
  camera.y = player.y - canvas.height/2;
}

function playerDied() {
  document.getElementById('dead-msg').style.display='block';
  updatePips();
}

function endRound(ctWins, reason) {
  if(gameState==='roundend') return;
  gameState='roundend';
  if(ctWins) { 
    round.ctScore++; 
    player.money=Math.min(16000,player.money+3250); 
  } else { 
    round.tScore++; 
    player.money=Math.min(16000,player.money+1400); 
  }
  document.getElementById('bomb-status').style.display='none';
  document.getElementById('defuse-prompt').style.display='none';
  document.getElementById('plant-prompt').style.display='none';

  const re=document.getElementById('round-end');
  re.style.display='flex';
  document.getElementById('re-title').textContent=ctWins?'CT WIN':'T WIN';
  document.getElementById('re-title').style.color=ctWins?'#5ba3f0':'#e05c4a';
  document.getElementById('re-reason').textContent=reason.toUpperCase();
  document.getElementById('re-rewards').textContent=ctWins?`+$3,250 (CT WIN)`:`+$1,400 (LOSS BONUS)`;
  nextRoundTimer=5;
  updateHUD();
}

function endGame() {
  gameState='gameover';
  const re=document.getElementById('round-end');
  re.style.display='flex';
  document.getElementById('re-title').textContent=round.ctScore>round.tScore?'VICTORY':'DEFEAT';
  document.getElementById('re-title').style.color=round.ctScore>round.tScore?'#00ff88':'#e05c4a';
  document.getElementById('re-reason').textContent=`FINAL SCORE: CT ${round.ctScore} — T ${round.tScore}`;
  document.getElementById('re-rewards').textContent='';
  document.getElementById('re-next').textContent='REFRESH TO PLAY AGAIN';
}

// ── DRAWING ──────────────────────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.translate(-camera.x,-camera.y);

  // Floor & Walls
  for(let r=0;r<MAP_H;r++) {
    for(let c=0;c<MAP_W;c++) {
      const cell=MAP_DATA[r][c];
      const x=c*TILE, y=r*TILE;
      if(cell===1) {
        ctx.fillStyle='#1a2030';
        ctx.fillRect(x,y,TILE,TILE);
        ctx.strokeStyle='rgba(200,169,110,0.06)';
        ctx.strokeRect(x,y,TILE,TILE);
      } else if(cell===2) {
        ctx.fillStyle='rgba(192,57,43,0.12)';
        ctx.fillRect(x,y,TILE,TILE);
        ctx.strokeStyle='rgba(192,57,43,0.3)';
        ctx.strokeRect(x,y,TILE,TILE);
        ctx.fillStyle='rgba(192,57,43,0.25)';
        ctx.font='bold 18px Barlow Condensed';
        ctx.textAlign='center';
        ctx.fillText('A',x+TILE/2,y+TILE/2+6);
      } else {
        ctx.fillStyle = (r+c)%2===0 ? '#141820' : '#131720';
        ctx.fillRect(x,y,TILE,TILE);
      }
    }
  }

  // Effects
  effects.forEach(ef=>{
    const a=ef.life/ef.maxLife;
    if(ef.type==='blood') {
      ctx.globalAlpha=a*0.6;
      ctx.fillStyle='#8B1A1A';
      ctx.beginPath(); ctx.arc(ef.x,ef.y,6,0,Math.PI*2); ctx.fill();
    } else if(ef.type==='impact') {
      ctx.globalAlpha=a;
      ctx.fillStyle='#FFB300';
      ctx.beginPath(); ctx.arc(ef.x,ef.y,3,0,Math.PI*2); ctx.fill();
    } else if(ef.type==='muzzle') {
      ctx.globalAlpha=a*0.9;
      ctx.fillStyle='#FFD700';
      const mx=ef.x+Math.cos(ef.angle)*18, my=ef.y+Math.sin(ef.angle)*18;
      ctx.beginPath(); ctx.arc(mx,my,5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(255,200,50,0.5)';
      ctx.beginPath(); ctx.arc(mx,my,10,0,Math.PI*2); ctx.fill();
    }
  });
  ctx.globalAlpha=1;

  // Planted Bomb
  if(bomb.planted) {
    const pulse=Math.sin(Date.now()/200)*0.4+0.6;
    ctx.globalAlpha=pulse;
    ctx.fillStyle='#FFB300';
    ctx.beginPath(); ctx.arc(bomb.x,bomb.y,7,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#FF6600';
    ctx.lineWidth=2;
    ctx.stroke();
    ctx.globalAlpha=1;

    if(bomb.defuseProgress>0) {
      ctx.strokeStyle='#00FF88';
      ctx.lineWidth=3;
      ctx.beginPath();
      ctx.arc(bomb.x,bomb.y,14,-Math.PI/2,-Math.PI/2+bomb.defuseProgress*Math.PI*2);
      ctx.stroke();
    }
  }

  // Bullets
  bullets.forEach(b=>{
    ctx.fillStyle=b.owner==='player'?'#FFD700':'#FF4444';
    ctx.beginPath();
    ctx.arc(b.x,b.y,2,0,Math.PI*2);
    ctx.fill();
  });

  // Enemies
  enemies.forEach(e=>{
    if(!e.alive) return;
    drawCharacter(e, '#E05C4A', '#C0392B');
    ctx.fillStyle='rgba(0,0,0,0.5)';
    ctx.fillRect(e.x-16,e.y-22,32,4);
    ctx.fillStyle=e.hp>50?'#4caf50':'#e05c4a';
    ctx.fillRect(e.x-16,e.y-22,32*(e.hp/100),4);
    if(e.hasBomb) {
      ctx.fillStyle='#FFB300';
      ctx.font='bold 10px Share Tech Mono';
      ctx.textAlign='center';
      ctx.fillText('C4',e.x,e.y-26);
    }
  });

  // Player
  if(player.alive) drawCharacter(player,'#5BA3F0','#2E86C1', true);

  ctx.restore();

  drawMinimap();
}

function drawCharacter(obj, bodyColor, darkColor, isPlayer=false) {
  ctx.save();
  ctx.translate(obj.x, obj.y);
  ctx.rotate(obj.angle);

  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(2,2,PLAYER_R,PLAYER_R*0.7,0,0,Math.PI*2); ctx.fill();

  ctx.fillStyle=bodyColor;
  ctx.beginPath(); ctx.arc(0,0,PLAYER_R,0,Math.PI*2); ctx.fill();

  ctx.strokeStyle=darkColor;
  ctx.lineWidth=isPlayer?2:1.5;
  ctx.stroke();

  ctx.fillStyle=darkColor;
  ctx.fillRect(PLAYER_R-2, -2, 10, 4);

  ctx.fillStyle='rgba(255,255,255,0.3)';
  ctx.beginPath(); ctx.arc(3,0,4,0,Math.PI*2); ctx.fill();

  ctx.restore();
}

function drawMinimap() {
  const mm=miniCanvas;
  mctx.clearRect(0,0,mm.width,mm.height);

  const tileW=mm.width/MAP_W, tileH=mm.height/MAP_H;

  for(let r=0;r<MAP_H;r++) {
    for(let c=0;c<MAP_W;c++) {
      const cell=MAP_DATA[r][c];
      if(cell===1) mctx.fillStyle='#1a2030';
      else if(cell===2) mctx.fillStyle='rgba(192,57,43,0.4)';
      else mctx.fillStyle='#141820';
      mctx.fillRect(c*tileW,r*tileH,tileW,tileH);
    }
  }

  if(bomb.planted) {
    const bx=bomb.x/TILE*tileW, by=bomb.y/TILE*tileH;
    const p=Math.sin(Date.now()/300)*0.5+0.5;
    mctx.fillStyle=`rgba(255,179,0,${p})`;
    mctx.fillRect(bx-2,by-2,4,4);
  }

  enemies.forEach(e=>{
    if(!e.alive) return;
    const ex=e.x/TILE*tileW, ey=e.y/TILE*tileH;
    mctx.fillStyle='#e05c4a';
    mctx.beginPath(); mctx.arc(ex,ey,2.5,0,Math.PI*2); mctx.fill();
  });

  if(player.alive) {
    const px=player.x/TILE*tileW, py=player.y/TILE*tileH;
    mctx.fillStyle='#5ba3f0';
    mctx.beginPath(); mctx.arc(px,py,3,0,Math.PI*2); mctx.fill();
    mctx.strokeStyle='rgba(91,163,240,0.7)';
    mctx.lineWidth=1;
    mctx.beginPath();
    mctx.moveTo(px,py);
    mctx.lineTo(px+Math.cos(player.angle)*7,py+Math.sin(player.angle)*7);
    mctx.stroke();
  }

  mctx.strokeStyle='rgba(200,169,110,0.3)';
  mctx.strokeRect(0,0,mm.width,mm.height);
}

// Resize handler
window.addEventListener('resize',()=>{
  canvas.width=window.innerWidth;
  canvas.height=window.innerHeight;
});

canvas.addEventListener('click',e=>{
  if(gameState!=='playing'&&gameState!=='buyphase') return;
  if(isBuyOpen) return;
  const w=player.weapons[player.activeWeapon];
  if(w&&!w.auto) tryShoot();
});

document.addEventListener('contextmenu',e=>e.preventDefault());
