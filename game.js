const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const playPauseBtn = document.getElementById('playPause');
const restartBtn = document.getElementById('restart');

const heroImg = new Image();
heroImg.src = 'assets/hero.svg';

let width = 0;
let height = 0;
let groundY = 0;
let lastTime = 0;
let score = 0;
let best = Number(localStorage.getItem('dash-best') || 0);
let running = false;
let spawnTimer = 0;
let nextSpawn = 1200;
let speed = 0;

const hero = {
  x: 120,
  y: 0,
  w: 72,
  h: 80,
  vy: 0,
  gravity: 0,
  jumpForce: 0,
  grounded: false,
  jumps: 0,
  maxJumps: 2
};

const obstacles = [];
const stars = Array.from({ length: 40 }, () => ({
  x: Math.random(),
  y: Math.random(),
  r: Math.random() * 2 + 0.5
}));

function resize() {
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  groundY = height - 80;
  hero.gravity = 0.0032 * height;
  hero.jumpForce = Math.max(0.82, 0.9 * (height / 600));
  if (!running) draw();
}

function resetGame() {
  score = 0;
  speed = 0.32 * width;
  spawnTimer = 0;
  nextSpawn = 1200;
  obstacles.length = 0;
  hero.x = width * 0.15;
  hero.y = groundY - hero.h;
  hero.vy = 0;
  hero.grounded = true;
  hero.jumps = 0;
  overlay.style.opacity = 1;
  overlay.querySelector('h2').textContent = 'اضغط أو المس للّقفز';
  overlay.querySelector('p').textContent = 'Space / لمس الشاشة للقفز وتفادي العقبات';
  updateScoreUI();
}

function updateScoreUI() {
  scoreEl.textContent = Math.floor(score).toLocaleString('ar-EG');
  bestEl.textContent = Math.floor(best).toLocaleString('ar-EG');
}

function spawnObstacle() {
  const baseHeight = 40 + Math.random() * 60;
  const obs = {
    x: width + 40,
    y: groundY - baseHeight,
    w: 26 + Math.random() * 40,
    h: baseHeight,
    color: `hsl(${Math.random() * 50 + 25}, 90%, 60%)`
  };
  obstacles.push(obs);
}

function jump() {
  if (hero.grounded || hero.jumps < hero.maxJumps) {
    hero.vy = -hero.jumpForce;
    hero.grounded = false;
    hero.jumps += 1;
  }
}

function update(delta) {
  const deltaMs = Math.min(delta, 32); // clamp for stability
  speed += deltaMs * 0.08;

  hero.vy += hero.gravity * deltaMs / 16;
  hero.y += hero.vy * deltaMs;

  if (hero.y + hero.h >= groundY) {
    hero.y = groundY - hero.h;
    hero.vy = 0;
    hero.grounded = true;
    hero.jumps = 0;
  }

  spawnTimer += deltaMs * (0.9 + Math.random() * 0.1);
  if (spawnTimer > nextSpawn) {
    spawnObstacle();
    spawnTimer = 0;
    nextSpawn = 900 + Math.random() * 900;
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.x -= (speed / 1000) * deltaMs;
    if (obs.x + obs.w < -20) {
      obstacles.splice(i, 1);
    }
    if (collides(hero, obs)) {
      gameOver();
    }
  }

  score += deltaMs * 0.08;
  if (score > best) {
    best = score;
    localStorage.setItem('dash-best', Math.floor(best));
  }
  updateScoreUI();
}

function collides(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function drawBackground() {
  ctx.fillStyle = '#0b111d';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#10182a';
  for (let i = 0; i < 4; i++) {
    const y = height * (0.25 + i * 0.15);
    ctx.fillRect(0, y, width, 2);
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(32,198,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < stars.length; i++) {
    const star = stars[i];
    const x = (star.x * width + speed * 0.003) % width;
    const y = star.y * height * 0.6 + 30;
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + star.r);
  }
  ctx.stroke();
  ctx.restore();

  ctx.save();
  const grad = ctx.createLinearGradient(0, groundY, 0, height);
  grad.addColorStop(0, '#0f1726');
  grad.addColorStop(1, '#0c101d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, groundY, width, height - groundY);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = '#182232';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(width, groundY);
  ctx.stroke();
  ctx.restore();
}

function drawHero() {
  ctx.save();
  const glow = ctx.createRadialGradient(hero.x + hero.w / 2, hero.y + hero.h / 2, hero.w / 6, hero.x + hero.w / 2, hero.y + hero.h / 2, hero.w);
  glow.addColorStop(0, 'rgba(32,198,255,0.25)');
  glow.addColorStop(1, 'rgba(32,198,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(hero.x - 40, hero.y - 20, hero.w + 80, hero.h + 60);
  ctx.restore();

  const size = hero.w;
  ctx.drawImage(heroImg, hero.x, hero.y, size, size + 8);
}

function drawObstacles() {
  obstacles.forEach((obs, i) => {
    ctx.save();
    const grad = ctx.createLinearGradient(obs.x, obs.y, obs.x, obs.y + obs.h);
    grad.addColorStop(0, obs.color);
    grad.addColorStop(1, '#0e1523');
    ctx.fillStyle = grad;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    const radius = 10;
    const { x, y, w, h } = obs;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x + 6, y + 8, w - 12, 6);
    ctx.restore();
  });
}

function draw() {
  drawBackground();
  drawObstacles();
  drawHero();
}

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const delta = timestamp - lastTime;
  lastTime = timestamp;
  if (running) {
    update(delta);
  }
  draw();
  requestAnimationFrame(gameLoop);
}

function start() {
  running = true;
  overlay.style.opacity = 0;
  playPauseBtn.textContent = 'إيقاف مؤقت';
}

function pause() {
  running = false;
  overlay.style.opacity = 1;
  overlay.querySelector('h2').textContent = 'اللعبة متوقفة';
  overlay.querySelector('p').textContent = 'اضغط للمتابعة';
  playPauseBtn.textContent = 'متابعة';
}

function gameOver() {
  running = false;
  overlay.style.opacity = 1;
  overlay.querySelector('h2').textContent = 'اصطدمت بالعائق!';
  overlay.querySelector('p').textContent = 'اضغط لإعادة المحاولة';
  playPauseBtn.textContent = 'متابعة';
}

function togglePlay() {
  if (running) {
    pause();
  } else {
    start();
  }
}

function restart() {
  resetGame();
  start();
}

function handleInput(e) {
  const key = e.key?.toLowerCase();
  if (key === ' ' || key === 'w' || key === 'arrowup') {
    jump();
  }
  if (key === 'p') togglePlay();
}

canvas.addEventListener('pointerdown', () => {
  if (!running) start();
  jump();
});
window.addEventListener('keydown', handleInput);
playPauseBtn.addEventListener('click', togglePlay);
restartBtn.addEventListener('click', restart);
window.addEventListener('resize', resize);

heroImg.onload = () => draw();

resetGame();
resize();
requestAnimationFrame(gameLoop);
