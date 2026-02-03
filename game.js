const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");

const keys = new Set();
const gravity = 0.6;
const floorY = 420;
const clouds = [
  { x: 120, y: 80, size: 60 },
  { x: 420, y: 60, size: 80 },
  { x: 760, y: 90, size: 50 },
];

const hero = {
  x: 120,
  y: floorY,
  vx: 0,
  vy: 0,
  width: 80,
  height: 80,
  color: "#ff7b7b",
  outline: "#b34444",
  hat: "#e53935",
  hatBrim: "#b71c1c",
  shirt: "#f4511e",
  overalls: "#1e88e5",
  gloves: "#f5f5f5",
  boots: "#6d4c41",
  skin: "#ffcc80",
  hair: "#5d4037",
  onGround: true,
  face: 1,
  dashTimer: 0,
};

const enemy = {
  x: 700,
  y: floorY,
  vx: 2.2,
  width: 90,
  height: 90,
  color: "#8ee26b",
  outline: "#4d8f37",
};

const donutCoins = Array.from({ length: 5 }, (_, index) => ({
  x: 220 + index * 130,
  y: 320 + (index % 2) * 30,
  collected: false,
}));

let score = 0;
let started = false;
let gameOver = false;

function drawCloud(cloud) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.beginPath();
  ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
  ctx.arc(cloud.x + cloud.size * 0.7, cloud.y + 10, cloud.size * 0.7, 0, Math.PI * 2);
  ctx.arc(cloud.x - cloud.size * 0.6, cloud.y + 10, cloud.size * 0.8, 0, Math.PI * 2);
  ctx.fill();
}

function drawGround() {
  ctx.fillStyle = "#ffb347";
  ctx.fillRect(0, floorY + 30, canvas.width, canvas.height - floorY - 30);
  ctx.fillStyle = "#8d5524";
  for (let i = 0; i < 20; i += 1) {
    ctx.fillRect(i * 60, floorY + 40, 30, 10);
  }
}

function drawHero(character) {
  ctx.save();
  ctx.translate(character.x, character.y);
  ctx.scale(character.face, 1);

  ctx.fillStyle = character.shirt;
  ctx.fillStyle = character.color;
  ctx.strokeStyle = character.outline;
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.ellipse(0, 0, 45, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(-10, -35, 25, 20, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#2b2b2b";
  ctx.beginPath();
  ctx.arc(-15, -40, 5, 0, Math.PI * 2);
  ctx.arc(5, -38, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#2b2b2b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-25, -20);
  ctx.quadraticCurveTo(-5, -10, 10, -22);
  ctx.stroke();

  ctx.fillStyle = "#fbd0c8";
  ctx.beginPath();
  ctx.ellipse(-30, 5, 16, 12, 0, 0, Math.PI * 2);
  ctx.ellipse(30, 5, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffcc80";
  ctx.beginPath();
  ctx.ellipse(-25, 35, 22, 12, 0, 0, Math.PI * 2);
  ctx.ellipse(25, 35, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  if (character.dashTimer > 0) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.beginPath();
    ctx.ellipse(-55, 0, 22, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawEnemy(character) {
  ctx.save();
  ctx.translate(character.x, character.y);

  ctx.fillStyle = character.color;
  ctx.strokeStyle = character.outline;
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.ellipse(0, 0, 48, 38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#2b2b2b";
  ctx.beginPath();
  ctx.arc(-10, -15, 5, 0, Math.PI * 2);
  ctx.arc(15, -20, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#2b2b2b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-20, 5);
  ctx.quadraticCurveTo(0, 12, 20, 5);
  ctx.stroke();

  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.ellipse(-25, 30, 14, 10, 0, 0, Math.PI * 2);
  ctx.ellipse(25, 30, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawDonut(coin) {
  if (coin.collected) return;
  ctx.save();
  ctx.translate(coin.x, coin.y);
  ctx.fillStyle = "#ffb6c1";
  ctx.strokeStyle = "#ff7aa2";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffeef2";
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawScore() {
  ctx.fillStyle = "#2b2b2b";
  ctx.font = "bold 22px Trebuchet MS";
  ctx.fillText(`Donuts: ${score}/5`, 20, 32);
}

function resetGame() {
  score = 0;
  donutCoins.forEach((coin) => {
    coin.collected = false;
  });
  hero.x = 120;
  hero.y = floorY;
  hero.vx = 0;
  hero.vy = 0;
  hero.dashTimer = 0;
  enemy.x = 700;
  gameOver = false;
  statusEl.textContent = "Press any arrow key to start!";
}

function updateHero() {
  hero.vx *= 0.85;
  if (keys.has("ArrowLeft")) {
    hero.vx = -4.2;
    hero.face = -1;
  }
  if (keys.has("ArrowRight")) {
    hero.vx = 4.2;
    hero.face = 1;
  }
  if (keys.has("ArrowUp") && hero.onGround) {
    hero.vy = -12;
    hero.onGround = false;
  }
  if (keys.has("Space") && hero.dashTimer === 0) {
    hero.vy -= 4;
    hero.dashTimer = 12;
  }

  if (hero.dashTimer > 0) {
    hero.vy -= 0.15;
    hero.dashTimer -= 1;
  }

  hero.vy += gravity;
  hero.x += hero.vx;
  hero.y += hero.vy;

  if (hero.y >= floorY) {
    hero.y = floorY;
    hero.vy = 0;
    hero.onGround = true;
  }

  hero.x = Math.max(60, Math.min(canvas.width - 60, hero.x));
}

function updateEnemy() {
  enemy.x += enemy.vx;
  if (enemy.x > canvas.width - 100 || enemy.x < 100) {
    enemy.vx *= -1;
  }
}

function checkCollisions() {
  donutCoins.forEach((coin) => {
    if (coin.collected) return;
    const dx = hero.x - coin.x;
    const dy = hero.y - coin.y;
    if (Math.hypot(dx, dy) < 50) {
      coin.collected = true;
      score += 1;
    }
  });

  const enemyDistance = Math.hypot(hero.x - enemy.x, hero.y - enemy.y);
  if (enemyDistance < 90) {
    gameOver = true;
    statusEl.textContent = "Booped! Press R to try again.";
  }

  if (score === 5 && !gameOver) {
    statusEl.textContent = "All donuts collected! You win!";
  }
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  clouds.forEach(drawCloud);
  drawGround();
  donutCoins.forEach(drawDonut);
  drawEnemy(enemy);
  drawHero(hero);
  drawScore();

  if (started && !gameOver && score < 5) {
    updateHero();
    updateEnemy();
    checkCollisions();
  }

  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) {
    event.preventDefault();
  }
  keys.add(event.code);
  if (!started && ["ArrowLeft", "ArrowRight", "ArrowUp"].includes(event.code)) {
    started = true;
    statusEl.textContent = "Waddle on!";
  }
  if (event.code === "KeyR") {
    resetGame();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

resetGame();
loop();
