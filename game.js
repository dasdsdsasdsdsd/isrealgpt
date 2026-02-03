const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");

const keys = new Set();
const gravity = 0.65;
const level = {
  width: 2600,
  height: 540,
  groundY: 440,
  groundSegments: [
    { x: 0, w: 640 },
    { x: 720, w: 520 },
    { x: 1340, w: 460 },
    { x: 1900, w: 700 },
  ],
  platforms: [
    { x: 180, y: 360, w: 180, h: 22 },
    { x: 440, y: 300, w: 160, h: 22 },
    { x: 760, y: 260, w: 220, h: 22 },
    { x: 1080, y: 330, w: 200, h: 22 },
    { x: 1400, y: 280, w: 160, h: 22 },
    { x: 1720, y: 230, w: 200, h: 22 },
    { x: 2100, y: 320, w: 220, h: 22 },
  ],
  clouds: [
    { x: 140, y: 80, size: 60 },
    { x: 560, y: 60, size: 80 },
    { x: 980, y: 90, size: 50 },
    { x: 1500, y: 70, size: 70 },
    { x: 1980, y: 95, size: 55 },
    { x: 2360, y: 75, size: 65 },
  ],
};

const hero = {
  x: 120,
  y: 360,
  vx: 0,
  vy: 0,
  width: 76,
  height: 90,
  outline: "#b34444",
  hat: "#e53935",
  hatBrim: "#b71c1c",
  shirt: "#f4511e",
  overalls: "#1e88e5",
  gloves: "#f5f5f5",
  boots: "#6d4c41",
  skin: "#ffcc80",
  hair: "#5d4037",
  onGround: false,
  face: 1,
  dashTimer: 0,
  jumpBuffer: 0,
};

const enemies = [
  { type: "goomba", x: 540, y: 0, vx: -1.4, w: 70, h: 60, alive: true },
  { type: "koopa", x: 1040, y: 0, vx: 1.2, w: 72, h: 66, alive: true },
  { type: "goomba", x: 1620, y: 0, vx: -1.3, w: 70, h: 60, alive: true },
  { type: "koopa", x: 2140, y: 0, vx: -1.1, w: 72, h: 66, alive: true },
];

const coins = Array.from({ length: 8 }, (_, index) => ({
  x: 260 + index * 220,
  y: 210 + (index % 2) * 40,
  collected: false,
}));

const blocks = [
  { x: 260, y: 260, w: 46, h: 46, type: "brick", used: false, bump: 0 },
  { x: 330, y: 260, w: 46, h: 46, type: "question", used: false, bump: 0 },
  { x: 400, y: 260, w: 46, h: 46, type: "brick", used: false, bump: 0 },
  { x: 820, y: 210, w: 46, h: 46, type: "question", used: false, bump: 0 },
  { x: 1260, y: 260, w: 46, h: 46, type: "question", used: false, bump: 0 },
  { x: 1760, y: 190, w: 46, h: 46, type: "brick", used: false, bump: 0 },
  { x: 1820, y: 190, w: 46, h: 46, type: "question", used: false, bump: 0 },
];

const flag = {
  x: 2420,
  y: 140,
  w: 28,
  h: 300,
};

let cameraX = 0;
let score = 0;
let lives = 3;
let started = false;
let gameOver = false;
let victory = false;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function getAllPlatforms() {
  const grounds = level.groundSegments.map((segment) => ({
    x: segment.x,
    y: level.groundY,
    w: segment.w,
    h: level.height - level.groundY,
  }));
  return [...level.platforms, ...grounds, ...blocks];
}

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
  level.groundSegments.forEach((segment) => {
    ctx.fillRect(segment.x, level.groundY, segment.w, level.height - level.groundY);
  });
  ctx.fillStyle = "#8d5524";
  for (let i = 0; i < 70; i += 1) {
    ctx.fillRect(i * 60, level.groundY + 10, 30, 12);
  }
}

function drawPlatforms() {
  ctx.fillStyle = "#ffcf6a";
  ctx.strokeStyle = "#b06d1c";
  ctx.lineWidth = 3;
  level.platforms.forEach((plat) => {
    ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
  });
}

function drawBlock(block) {
  const bumpOffset = block.bump > 0 ? Math.sin((block.bump / 8) * Math.PI) * 6 : 0;
  const blockY = block.y - bumpOffset;
  if (block.type === "question") {
    ctx.fillStyle = block.used ? "#f4d06f" : "#ffcf6a";
  } else {
    ctx.fillStyle = "#e28b5b";
  }
  ctx.strokeStyle = "#a34c28";
  ctx.lineWidth = 3;
  ctx.fillRect(block.x, blockY, block.w, block.h);
  ctx.strokeRect(block.x, blockY, block.w, block.h);
  if (block.type === "question" && !block.used) {
    ctx.fillStyle = "#a34c28";
    ctx.font = "bold 20px Trebuchet MS";
    ctx.fillText("?", block.x + 15, blockY + 30);
  }
}

function drawHero(character) {
  ctx.save();
  ctx.translate(character.x, character.y);
  ctx.scale(character.face, 1);

  ctx.fillStyle = character.shirt;
  ctx.strokeStyle = character.outline;
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.ellipse(0, 12, 52, 44, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = character.overalls;
  ctx.beginPath();
  ctx.ellipse(0, 22, 48, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fdd835";
  ctx.beginPath();
  ctx.arc(-15, 10, 5, 0, Math.PI * 2);
  ctx.arc(15, 10, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = character.skin;
  ctx.beginPath();
  ctx.ellipse(0, -18, 36, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = character.hair;
  ctx.beginPath();
  ctx.ellipse(-8, -28, 20, 14, 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = character.hat;
  ctx.strokeStyle = character.hatBrim;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(-6, -50, 30, 18, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = character.hatBrim;
  ctx.beginPath();
  ctx.ellipse(-6, -40, 40, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fafafa";
  ctx.beginPath();
  ctx.ellipse(-2, -52, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = character.hatBrim;
  ctx.font = "bold 12px Trebuchet MS";
  ctx.fillText("M", -6, -48);

  ctx.beginPath();
  ctx.ellipse(10, -18, 16, 12, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#2b2b2b";
  ctx.beginPath();
  ctx.arc(-12, -24, 4, 0, Math.PI * 2);
  ctx.arc(4, -22, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = character.hair;
  ctx.beginPath();
  ctx.ellipse(-2, -10, 18, 8, 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#2b2b2b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-20, -2);
  ctx.quadraticCurveTo(-5, 6, 12, -4);
  ctx.stroke();

  ctx.fillStyle = character.gloves;
  ctx.beginPath();
  ctx.ellipse(-38, 18, 16, 12, 0, 0, Math.PI * 2);
  ctx.ellipse(38, 18, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = character.boots;
  ctx.beginPath();
  ctx.ellipse(-28, 52, 26, 12, 0, 0, Math.PI * 2);
  ctx.ellipse(28, 52, 26, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  if (character.dashTimer > 0) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.beginPath();
    ctx.ellipse(-60, 0, 22, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawEnemy(enemy) {
  if (!enemy.alive) return;
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.fillStyle = enemy.type === "koopa" ? "#81c784" : "#c17c3a";
  ctx.strokeStyle = enemy.type === "koopa" ? "#2e7d32" : "#6d3f18";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 32, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (enemy.type === "koopa") {
    ctx.fillStyle = "#2e7d32";
    ctx.beginPath();
    ctx.ellipse(0, 10, 24, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#2b2b2b";
  ctx.beginPath();
  ctx.arc(-10, -5, 4, 0, Math.PI * 2);
  ctx.arc(10, -5, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.ellipse(-12, 16, 10, 8, 0, 0, Math.PI * 2);
  ctx.ellipse(12, 16, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCoin(coin) {
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

function drawFlag() {
  ctx.strokeStyle = "#6d4c41";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(flag.x, flag.y);
  ctx.lineTo(flag.x, flag.y + flag.h);
  ctx.stroke();

  ctx.fillStyle = "#ff5252";
  ctx.beginPath();
  ctx.moveTo(flag.x, flag.y + 20);
  ctx.lineTo(flag.x + 80, flag.y + 40);
  ctx.lineTo(flag.x, flag.y + 60);
  ctx.closePath();
  ctx.fill();
}

function drawScore() {
  ctx.fillStyle = "#2b2b2b";
  ctx.font = "bold 22px Trebuchet MS";
  ctx.fillText(`Coins: ${score}/${coins.length}`, 20, 32);
  ctx.fillText(`Lives: ${lives}`, 180, 32);
}

function spawnCoin(x, y) {
  coins.push({ x, y, collected: false, bonus: true, lift: 0 });
  score += 1;
}

function resetGame(fullReset = true) {
  if (fullReset) {
    score = 0;
    lives = 3;
  }
  coins.forEach((coin) => {
    coin.collected = false;
  });
  blocks.forEach((block) => {
    block.used = false;
    block.bump = 0;
  });
  enemies.forEach((enemy, index) => {
    enemy.alive = true;
    enemy.x = 520 + index * 520;
    enemy.y = 0;
  });
  hero.x = 120;
  hero.y = 320;
  hero.vx = 0;
  hero.vy = 0;
  hero.dashTimer = 0;
  hero.onGround = false;
  cameraX = 0;
  gameOver = false;
  victory = false;
  statusEl.textContent = "Press any arrow key to start!";
}

function applyHorizontalMovement() {
  hero.vx *= 0.85;
  if (keys.has("ArrowLeft")) {
    hero.vx = -4.2;
    hero.face = -1;
  }
  if (keys.has("ArrowRight")) {
    hero.vx = 4.2;
    hero.face = 1;
  }
  hero.x += hero.vx;
  hero.x = clamp(hero.x, 40, level.width - 40);
}

function applyVerticalMovement() {
  hero.vy += gravity;
  hero.y += hero.vy;
  hero.onGround = false;

  getAllPlatforms().forEach((plat) => {
    const heroBox = {
      x: hero.x - hero.width / 2,
      y: hero.y - hero.height / 2,
      w: hero.width,
      h: hero.height,
    };
    const platBox = { x: plat.x, y: plat.y, w: plat.w, h: plat.h };

    if (rectsOverlap(heroBox, platBox)) {
      if (hero.vy >= 0 && heroBox.y + heroBox.h - hero.vy <= plat.y + 6) {
        hero.y = plat.y - hero.height / 2;
        hero.vy = 0;
        hero.onGround = true;
      } else if (hero.vy < 0 && heroBox.y - hero.vy >= plat.y + plat.h - 6) {
        hero.y = plat.y + plat.h + hero.height / 2;
        hero.vy = 0;
        if (plat.type) {
          plat.bump = 8;
          if (plat.type === "question" && !plat.used) {
            plat.used = true;
            spawnCoin(plat.x + plat.w / 2, plat.y - 20);
          }
        }
      }
    }
  });

  if (hero.jumpBuffer > 0) {
    hero.jumpBuffer -= 1;
  }
}

function handleJump() {
  if ((keys.has("ArrowUp") || keys.has("Space")) && hero.jumpBuffer === 0) {
    hero.jumpBuffer = 8;
  }
  if (hero.jumpBuffer > 0 && hero.onGround) {
    hero.vy = -12.5;
    hero.onGround = false;
    hero.jumpBuffer = 0;
  }
}

function updateEnemies() {
  enemies.forEach((enemy) => {
    if (!enemy.alive) return;
    enemy.x += enemy.vx;
    if (enemy.x < 200 || enemy.x > level.width - 200) {
      enemy.vx *= -1;
    }
    enemy.y += gravity;
    if (enemy.y + enemy.h / 2 > level.groundY) {
      enemy.y = level.groundY - enemy.h / 2;
    }
  });
}

function updateCoins() {
  coins.forEach((coin) => {
    if (coin.collected) return;
    if (coin.bonus) {
      coin.lift += 1;
      coin.y -= 1.5;
      if (coin.lift > 30) {
        coin.collected = true;
      }
    }
  });
}

function loseLife() {
  lives -= 1;
  if (lives <= 0) {
    gameOver = true;
    statusEl.textContent = "Game over! Press R to restart.";
  } else {
    statusEl.textContent = "Oof! Lost a life. Keep waddling!";
    hero.x = 120;
    hero.y = 320;
    hero.vx = 0;
    hero.vy = 0;
    cameraX = 0;
  }
}

function checkCollisions() {
  coins.forEach((coin) => {
    if (coin.collected) return;
    const dx = hero.x - coin.x;
    const dy = hero.y - coin.y;
    if (Math.hypot(dx, dy) < 45) {
      coin.collected = true;
      score += 1;
    }
  });

  enemies.forEach((enemy) => {
    if (!enemy.alive) return;
    const heroBox = {
      x: hero.x - hero.width / 2,
      y: hero.y - hero.height / 2,
      w: hero.width,
      h: hero.height,
    };
    const enemyBox = {
      x: enemy.x - enemy.w / 2,
      y: enemy.y - enemy.h / 2,
      w: enemy.w,
      h: enemy.h,
    };

    if (rectsOverlap(heroBox, enemyBox)) {
      if (hero.vy > 0 && heroBox.y + heroBox.h - hero.vy <= enemyBox.y + 12) {
        enemy.alive = false;
        hero.vy = -9;
      } else {
        loseLife();
      }
    }
  });

  const flagBox = {
    x: flag.x,
    y: flag.y,
    w: 90,
    h: flag.h,
  };
  const heroBox = {
    x: hero.x - hero.width / 2,
    y: hero.y - hero.height / 2,
    w: hero.width,
    h: hero.height,
  };
  if (!gameOver && rectsOverlap(heroBox, flagBox)) {
    victory = true;
    statusEl.textContent = "Goal reached! Big belly victory dance!";
  }

  if (hero.y > level.height + 120) {
    loseLife();
  }
}

function updateCamera() {
  cameraX = clamp(hero.x - canvas.width / 2, 0, level.width - canvas.width);
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-cameraX, 0);

  level.clouds.forEach(drawCloud);
  drawGround();
  drawPlatforms();
  blocks.forEach(drawBlock);
  coins.forEach(drawCoin);
  drawFlag();
  enemies.forEach(drawEnemy);
  drawHero(hero);

  ctx.restore();
  drawScore();
}

function loop() {
  drawScene();

  if (started && !gameOver && !victory) {
    handleJump();
    applyHorizontalMovement();
    applyVerticalMovement();
    updateEnemies();
    updateCoins();
    checkCollisions();
    updateCamera();
  }

  blocks.forEach((block) => {
    if (block.bump > 0) {
      block.bump -= 1;
    }
  });

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
