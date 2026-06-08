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

// Map layout
const RAW_MAP = [ /* ... same as before ... */ ];
const MAP_DATA = RAW_MAP.map(row => row.split('').map(Number));

// ── STATE ──────────────────────────────────────────────────────────────────
let gameState = 'menu';
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
let bomb = {planted:false, x:0, y:0, timer:0, defusing:false, defuseProgress:0, planting:false, plantProgress:0, siteLabel:'A'};
let round = {num:1, ctScore:0, tScore:0, timer:ROUND_TIME, phase:'buy', phaseTimer:BUY_TIME, ctWon:false};
let roundEndTimer = 0;
let nextRoundTimer = 0;
let isBuyOpen = false;
let keys = {};
let mouseX = 0, mouseY = 0;
let mouseDown = false;
let bombsite = {x:0, y:0};

// Find spawn points and bombsites
let ctSpawns = [], tSpawns = [], bombsites = [];
MAP_DATA.forEach((row,r)=>row.forEach((cell,c)=>{
  if(cell===3) ctSpawns.push({x:c*TILE+TILE/2, y:r*TILE+TILE/2});
  if(cell===4) tSpawns.push({x:c*TILE+TILE/2, y:r*TILE+TILE/2});
  if(cell===2) bombsites.push({x:c*TILE+TILE/2, y:r*TILE+TILE/2});
}));
if(bombsites.length>0) bombsite = bombsites[Math.floor(bombsites.length/2)];

// ... Rest of your JavaScript code (all functions: spawnEnemy, initRound, isWall, etc.) ...

// Paste the entire <script> content (except the opening and closing <script> tags) here.
