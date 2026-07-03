// ==================================================
// 1. CANVAS SETUP
// ==================================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// ==================================================
// 2. THE POOL / CHARITY: WATER-INSPIRED COLOR PALETTE
// ==================================================

const COLORS = {
  yellow: "#FFC908",
  deepTeal: "#214A4F",
  olive: "#8F9133",
  softPeach: "#E8C7B8",
  burntOrange: "#C24F21",
  cream: "#F5F2E0",
  peach: "#F5B89E",
  navy: "#1C2B40",
  black: "#000000",
  white: "#FFFFFF",
  cleanWater: "#77A8BB"
};

// ==================================================
// 3. GAME SETTINGS
// ==================================================

const gravity = 0.7;
const moveSpeed = 5;
const jumpPower = -14;

let keys = {};
let score = 0;
let lives = 3;
let gameWon = false;
let gameOver = false;
let attackCooldown = 0;
let invincibleTimer = 0;
let startTime = Date.now();

let skillCheckActive = false;
let skillCheckTargetObstacle = null;
let skillCheckStartTime = 0;
let skillCheckDuration = 2000;
let skillCheckSuccess = false;
let skillCheckTargetTime = 0;
let skillCheckTolerance = 0;

let particles = [];
let particlesCreated = false;
let totalObstacles = 0;

const DIFFICULTIES = {
  easy: {
    name: "Easy",
    lives: 5,
    germSpeedMultiplier: 0.7,
    obstacleHpMin: 1,
    obstacleHpMax: 3,
    skillDurationMin: 2200,
    skillDurationMax: 3000,
    skillToleranceMin: 300,
    skillToleranceMax: 450,
    scoreMultiplier: 1
  },

  normal: {
    name: "Normal",
    lives: 3,
    germSpeedMultiplier: 1,
    obstacleHpMin: 2,
    obstacleHpMax: 4,
    skillDurationMin: 1500,
    skillDurationMax: 2500,
    skillToleranceMin: 150,
    skillToleranceMax: 350,
    scoreMultiplier: 1
  },

  hard: {
    name: "Hard",
    lives: 2,
    germSpeedMultiplier: 1.35,
    obstacleHpMin: 3,
    obstacleHpMax: 5,
    skillDurationMin: 1200,
    skillDurationMax: 2000,
    skillToleranceMin: 90,
    skillToleranceMax: 220,
    scoreMultiplier: 1.25
  }
};

let currentDifficulty = "normal";
let gameLoopStarted = false;
let difficultyMenuOpen = true;

function getDifficultySettings() {
  return DIFFICULTIES[currentDifficulty];
}

function showDifficultyMenu() {
  const menu = document.getElementById("difficultyMenu");

  if (menu) {
    menu.style.display = "flex";
  }

  difficultyMenuOpen = true;
}

function startGameWithDifficulty(difficultyName) {
  currentDifficulty = difficultyName;

  const menu = document.getElementById("difficultyMenu");

  if (menu) {
    menu.style.display = "none";
  }

  difficultyMenuOpen = false;

  loadLevel();

  if (!gameLoopStarted) {
    gameLoopStarted = true;
    gameLoop();
  }
}

function setupDifficultyButtons() {
  const buttons = document.querySelectorAll(".difficulty-btn");

  buttons.forEach(function(button) {
    button.addEventListener("click", function() {
      const selectedDifficulty = button.dataset.difficulty;
      startGameWithDifficulty(selectedDifficulty);
    });
  });
}

// ==================================================
// 4. PLAYER
// ==================================================

const player = {
  x: 60,
  y: 420,
  w: 40,
  h: 55,
  vx: 0,
  vy: 0,
  onGround: false,
  facing: 1
};

// ==================================================
// 5. LEVEL OBJECTS
// ==================================================

let platforms;
let obstacles;
let germs;
let pipe;
let waterDrops;

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function loadLevel() {
  const difficulty = getDifficultySettings();

  player.x = 60;
  player.y = 420;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.facing = 1;

  score = 0;
  lives = difficulty.lives;
  gameWon = false;
  gameOver = false;
  attackCooldown = 0;
  invincibleTimer = 0;
  startTime = Date.now();
  skillCheckActive = false;
  skillCheckTargetObstacle = null;
  skillCheckTargetTime = 0;
  skillCheckTolerance = 0;
  particles = [];
  particlesCreated = false;

  platforms = [
    { x: 0, y: 500, w: 960, h: 40 }
  ];

  const platformSpecs = [
    { gapMin: 50, gapMax: 110, yMin: 380, yMax: 440 },
    { gapMin: 50, gapMax: 120, yMin: 300, yMax: 380 },
    { gapMin: 50, gapMax: 130, yMin: 220, yMax: 330 }
  ];

  let previousPlatform = { x: 60, w: 40, y: 500 };

  platformSpecs.forEach(function(spec, index) {
    const width = randomBetween(120, 180);
    const minX = previousPlatform.x + previousPlatform.w + spec.gapMin;
    const maxX = Math.min(previousPlatform.x + previousPlatform.w + spec.gapMax, WIDTH - 160 - width);
    const x = randomBetween(minX, Math.max(minX, maxX));
    const y = randomBetween(spec.yMin, spec.yMax);

    platforms.push({ x: x, y: y, w: width, h: 25 });
    previousPlatform = platforms[platforms.length - 1];

    if (index === platformSpecs.length - 1) {
      const rightLimit = WIDTH - 200 - width;
      if (previousPlatform.x < rightLimit) {
        previousPlatform.x = randomBetween(previousPlatform.x, rightLimit);
      }
    }
  });

  const groundPlatform = platforms[0];
  const pipeX = randomBetween(groundPlatform.x + 10, groundPlatform.x + groundPlatform.w - 65);

  const pipeBounds = {
    x: pipeX,
    w: 55
  };

  function randomPlatformX(platform) {
    const minX = platform.x + 10;
    const maxX = platform.x + platform.w - 70;
    return randomBetween(minX, maxX);
  }

  function randomObstacleX(platform, pipeBounds) {
    const minX = platform.x + 10;
    const maxX = platform.x + platform.w - 70;
    let x = randomBetween(minX, maxX);

    if (pipeBounds) {
      const obstacleRight = x + 60;
      const pipeRight = pipeBounds.x + pipeBounds.w;
      const hasCollision = x < pipeRight && obstacleRight > pipeBounds.x;

      if (hasCollision) {
        const leftSpace = pipeBounds.x - 10 - 60;
        const rightSpace = maxX - (pipeBounds.x + pipeBounds.w + 10);

        if (leftSpace >= 0 && leftSpace > rightSpace) {
          x = Math.max(minX, pipeBounds.x - 60 - 10);
        } else if (rightSpace >= 0) {
          x = Math.min(maxX, pipeBounds.x + pipeBounds.w + 10);
        }
      }
    }

    return x;
  }

  obstacles = [
    {
      x: randomObstacleX(platforms[1], null),
      y: platforms[1].y - 60,
      w: 60,
      h: 60,
      hp: randomBetween(difficulty.obstacleHpMin, difficulty.obstacleHpMax)
    },
    {
      x: randomObstacleX(platforms[2], null),
      y: platforms[2].y - 60,
      w: 60,
      h: 60,
      hp: randomBetween(difficulty.obstacleHpMin, difficulty.obstacleHpMax)
    },
    {
      x: randomObstacleX(platforms[3], null),
      y: platforms[3].y - 60,
      w: 60,
      h: 60,
      hp: randomBetween(difficulty.obstacleHpMin, difficulty.obstacleHpMax)
    }
  ];
  totalObstacles = obstacles.length;

  germs = [
  {
    x: randomBetween(90, 250),
    y: 460,
    w: 40,
    h: 40,
    vx: randomBetween(16, 24) / 10,
    minX: 90,
    maxX: 250
  },
  {
    x: randomBetween(platforms[2].x, platforms[2].x + platforms[2].w - 40),
    y: platforms[2].y - 40,
    w: 40,
    h: 40,
    vx: randomBetween(15, 22) / 10,
    minX: platforms[2].x,
    maxX: platforms[2].x + platforms[2].w - 40
  },
  {
    x: randomBetween(platforms[3].x, platforms[3].x + platforms[3].w - 40),
    y: platforms[3].y - 40,
    w: 40,
    h: 40,
    vx: randomBetween(14, 20) / 10,
    minX: platforms[3].x,
    maxX: platforms[3].x + platforms[3].w - 40
  }
];

germs.forEach(function(germ) {
  germ.vx *= difficulty.germSpeedMultiplier;
});

  pipe = {
    x: pipeX,
    y: groundPlatform.y - 85,
    w: 55,
    h: 80
  };

  waterDrops = [
    { x: 40, y: 120, speed: 0.7 },
    { x: 170, y: 160, speed: 0.5 },
    { x: 330, y: 110, speed: 0.9 },
    { x: 610, y: 150, speed: 0.6 },
    { x: 790, y: 130, speed: 0.8 }
  ];
}

setupDifficultyButtons();
showDifficultyMenu();

// ==================================================
// 6. KEYBOARD CONTROLS
// ==================================================

document.addEventListener("keydown", function(event) {
  const key = event.key.toLowerCase();
  keys[key] = true;

  if (key === " " || key === "arrowup") {
    event.preventDefault();
  }

  if ((key === "e" || key === "f") && !gameWon && !gameOver) {
    if (skillCheckActive) {
      // Attempt skill check
      const elapsed = Date.now() - skillCheckStartTime;
      const success = Math.abs(elapsed - skillCheckTargetTime) < skillCheckTolerance;
      completeSkillCheck(success);
    } else {
      attackObstacle();
    }
  }

  if (key === "r") {
  showDifficultyMenu();
}
});

document.addEventListener("keyup", function(event) {
  keys[event.key.toLowerCase()] = false;
});

// ==================================================
// 7. GAME LOOP
// ==================================================

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}



// ==================================================
// 8. UPDATE GAME LOGIC
// ==================================================

function update() {
  if (difficultyMenuOpen) {
    return;
  }

  animateBackgroundWater();
  updateParticles();

  if (gameWon) {
    if (!particlesCreated) {
      createConfetti();
      particlesCreated = true;
    }
    return;
  }

  if (gameOver || skillCheckActive) {
    return;
  }

  if (attackCooldown > 0) attackCooldown--;
  if (invincibleTimer > 0) invincibleTimer--;

  movePlayer();
  moveGerms();
  checkGermDamage();
  checkPipeGoal();
}

function animateBackgroundWater() {
  waterDrops.forEach(function(drop) {
    drop.y += drop.speed;

    if (drop.y > 500) {
      drop.y = 90;
    }
  });
}

function createConfetti() {
  for (let i = 0; i < 30; i++) {
    particles.push({
      x: Math.random() * WIDTH,
      y: -10,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 3 + 2,
      size: Math.random() * 6 + 4,
      color: [COLORS.yellow, COLORS.cleanWater, COLORS.peach, COLORS.white][Math.floor(Math.random() * 4)],
      life: 1,
      decay: Math.random() * 0.01 + 0.005
    });
  }
}

function updateParticles() {
  particles.forEach(function(particle) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.1;
    particle.life -= particle.decay;
  });

  particles = particles.filter(function(particle) {
    return particle.life > 0 && particle.y < HEIGHT;
  });
}

function drawParticles() {
  particles.forEach(function(particle) {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = particle.life;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

// ==================================================
// 9. PLAYER MOVEMENT
// ==================================================

function movePlayer() {
  player.vx = 0;

  if (keys["a"] || keys["arrowleft"]) {
    player.vx = -moveSpeed;
    player.facing = -1;
  }

  if (keys["d"] || keys["arrowright"]) {
    player.vx = moveSpeed;
    player.facing = 1;
  }

  if ((keys["w"] || keys[" "] || keys["arrowup"]) && player.onGround) {
    player.vy = jumpPower;
    player.onGround = false;
  }

  player.vy += gravity;

  moveWithCollision("x");
  moveWithCollision("y");

  if (player.x < 0) player.x = 0;
  if (player.x + player.w > WIDTH) player.x = WIDTH - player.w;

  if (player.y > HEIGHT) {
    damagePlayer();
  }
}

// ==================================================
// 10. COLLISION
// ==================================================

function getSolidObjects() {
  return platforms.concat(obstacles);
}

function moveWithCollision(axis) {
  const solids = getSolidObjects();

  if (axis === "x") {
    player.x += player.vx;

    solids.forEach(function(solid) {
      if (isColliding(player, solid)) {
        if (player.vx > 0) {
          player.x = solid.x - player.w;
        } else if (player.vx < 0) {
          player.x = solid.x + solid.w;
        }

        player.vx = 0;
      }
    });
  }

  if (axis === "y") {
    player.y += player.vy;
    player.onGround = false;

    solids.forEach(function(solid) {
      if (isColliding(player, solid)) {
        if (player.vy > 0) {
          player.y = solid.y - player.h;
          player.onGround = true;
        } else if (player.vy < 0) {
          player.y = solid.y + solid.h;
        }

        player.vy = 0;
      }
    });
  }
}

function isColliding(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

// ==================================================
// 11. BREAKABLE OBSTACLES
// ==================================================

function attackObstacle() {
  if (attackCooldown > 0) return;
  if (skillCheckActive) return;

  const attackBox = {
    x: player.facing === 1 ? player.x + player.w : player.x - 40,
    y: player.y + 10,
    w: 40,
    h: 35
  };

  for (let i = 0; i < obstacles.length; i++) {
    if (isColliding(attackBox, obstacles[i])) {
      // Initiate skill check for this obstacle
      skillCheckActive = true;
      skillCheckTargetObstacle = obstacles[i];
      skillCheckStartTime = Date.now();
      
      // Randomize difficulty
      const difficulty = getDifficultySettings();

      skillCheckDuration = randomBetween(
        difficulty.skillDurationMin,
        difficulty.skillDurationMax
    );

    skillCheckTolerance = randomBetween(
      difficulty.skillToleranceMin,
      difficulty.skillToleranceMax
    );

    skillCheckTargetTime = randomBetween(400, skillCheckDuration - 400);
      skillCheckSuccess = false;
      attackCooldown = 20;
      return;
    }
  }
}

function completeSkillCheck(success) {
  if (!skillCheckActive) return;

  skillCheckActive = false;

  if (success && skillCheckTargetObstacle) {
    skillCheckTargetObstacle.hp--;

    if (skillCheckTargetObstacle.hp <= 0) {
      skillCheckTargetObstacle.broken = true;
      const difficulty = getDifficultySettings();
      score += Math.floor(50 * difficulty.scoreMultiplier);
    }
  } else if (!success) {
    // Failed skill check: lose points
    score = Math.max(0, score - 10);
  }

  obstacles = obstacles.filter(function(obstacle) {
    return !obstacle.broken;
  });

  skillCheckTargetObstacle = null;
}

// ==================================================
// 12. GERM / BACTERIA ENEMIES
// ==================================================

function moveGerms() {
  germs.forEach(function(germ) {
    germ.x += germ.vx;

    if (germ.x < germ.minX || germ.x > germ.maxX) {
      germ.vx *= -1;
    }
  });
}

function checkGermDamage() {
  germs.forEach(function(germ) {
    if (isColliding(player, germ) && invincibleTimer <= 0) {
      damagePlayer();
    }
  });
}

function damagePlayer() {
  lives--;
  invincibleTimer = 90;

  player.x = 60;
  player.y = 420;
  player.vx = 0;
  player.vy = 0;

  if (lives <= 0) {
    gameOver = true;
  }
}

// ==================================================
// 13. PIPE GOAL
// ==================================================

function checkPipeGoal() {
  if (isColliding(player, pipe) && obstacles.length === 0) {
    const difficulty = getDifficultySettings();
    score += Math.floor(200 * difficulty.scoreMultiplier);
    gameWon = true;
  }
}

// ==================================================
// 14. DRAWING
// ==================================================

function draw() {
  drawBackground();
  drawPlatforms();
  drawObstacles();
  drawPipe();
  drawGerms();
  drawPlayer();
  drawUI();
  drawTutorialText();

  if (skillCheckActive) {
    drawSkillCheck();
  }

  if (gameWon) {
    drawCenterMessage("Clean Water Restored!", "Press R to restart");
    drawParticles();
  }

  if (gameOver) {
    drawCenterMessage("Game Over", "Press R to try again");
  }
}

function drawBackground() {
  ctx.fillStyle = COLORS.cream;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = COLORS.cleanWater;
  ctx.fillRect(0, 0, WIDTH, 360);

  ctx.fillStyle = COLORS.olive;
  ctx.fillRect(0, 360, WIDTH, 180);

  ctx.fillStyle = COLORS.deepTeal;
  ctx.fillRect(0, 500, WIDTH, 40);

  ctx.fillStyle = COLORS.yellow;
  ctx.beginPath();
  ctx.arc(80, 75, 34, 0, Math.PI * 2);
  ctx.fill();

  drawCloud(180, 95);
  drawCloud(720, 90);

  waterDrops.forEach(function(drop) {
    drawWaterDrop(drop.x, drop.y, 8);
  });
}

function drawCloud(x, y) {
  ctx.fillStyle = COLORS.white;
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.arc(x + 30, y - 12, 34, 0, Math.PI * 2);
  ctx.arc(x + 68, y, 24, 0, Math.PI * 2);
  ctx.fill();
}

function drawWaterDrop(x, y, size) {
  ctx.fillStyle = COLORS.white;
  ctx.beginPath();
  ctx.arc(x, y + size, size, 0, Math.PI * 2);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x - size, y + size);
  ctx.lineTo(x + size, y + size);
  ctx.closePath();
  ctx.fill();
}

function drawPlatforms() {
  platforms.forEach(function(platform) {
    ctx.fillStyle = COLORS.deepTeal;
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);

    ctx.fillStyle = COLORS.yellow;
    ctx.fillRect(platform.x, platform.y, platform.w, 5);
  });
}

function drawObstacles() {
  obstacles.forEach(function(obstacle) {
    ctx.fillStyle = COLORS.burntOrange;
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);

    ctx.fillStyle = COLORS.yellow;
    ctx.fillRect(obstacle.x + 8, obstacle.y + 8, obstacle.w - 16, 8);

    ctx.strokeStyle = COLORS.navy;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(obstacle.x + 12, obstacle.y + 20);
    ctx.lineTo(obstacle.x + 30, obstacle.y + 38);
    ctx.lineTo(obstacle.x + 22, obstacle.y + 58);
    ctx.stroke();

    ctx.fillStyle = COLORS.white;
    ctx.font = "16px Arial";
    ctx.fillText("HP " + obstacle.hp, obstacle.x + 10, obstacle.y + 38);
  });
}

function drawPipe() {
  ctx.fillStyle = COLORS.navy;
  ctx.fillRect(pipe.x, pipe.y, pipe.w, pipe.h);

  ctx.fillStyle = COLORS.deepTeal;
  ctx.fillRect(pipe.x + 8, pipe.y + 8, pipe.w - 16, pipe.h - 16);

  if (obstacles.length > 0) {
    // Pipe is still blocked
    ctx.fillStyle = COLORS.burntOrange;
    ctx.fillRect(pipe.x + 16, pipe.y + 16, pipe.w - 32, pipe.h - 32);

    // Small debris marks
    ctx.strokeStyle = COLORS.navy;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pipe.x + 16, pipe.y + 28);
    ctx.lineTo(pipe.x + 38, pipe.y + 48);
    ctx.moveTo(pipe.x + 38, pipe.y + 24);
    ctx.lineTo(pipe.x + 20, pipe.y + 58);
    ctx.stroke();

    ctx.fillStyle = COLORS.white;
    ctx.font = "13px Arial";
    ctx.fillText("BLOCKED", pipe.x - 7, pipe.y - 10);
  } else {
    // Pipe has been restored
    ctx.fillStyle = COLORS.cleanWater;
    ctx.fillRect(pipe.x + 16, pipe.y + 16, pipe.w - 32, pipe.h - 32);

    // Clean water glow
    ctx.strokeStyle = COLORS.yellow;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(pipe.x + pipe.w / 2, pipe.y + pipe.h / 2, 34, 0, Math.PI * 2);
    ctx.stroke();

    // Water stream coming from pipe
    ctx.fillStyle = COLORS.cleanWater;
    ctx.fillRect(pipe.x + pipe.w / 2 - 6, pipe.y + pipe.h, 12, 500 - (pipe.y + pipe.h));

    ctx.fillStyle = COLORS.white;
    ctx.font = "13px Arial";
    ctx.fillText("CLEAN!", pipe.x + 3, pipe.y - 10);
  }

  ctx.strokeStyle = COLORS.yellow;
  ctx.lineWidth = 4;
  ctx.strokeRect(pipe.x, pipe.y, pipe.w, pipe.h);
}

function drawGerms() {
  germs.forEach(function(germ) {
    ctx.fillStyle = COLORS.deepTeal;
    ctx.beginPath();
    ctx.arc(germ.x + germ.w / 2, germ.y + germ.h / 2, germ.w / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = COLORS.navy;
    ctx.lineWidth = 3;

    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i;
      const cx = germ.x + germ.w / 2;
      const cy = germ.y + germ.h / 2;
      const startX = cx + Math.cos(angle) * 18;
      const startY = cy + Math.sin(angle) * 18;
      const endX = cx + Math.cos(angle) * 27;
      const endY = cy + Math.sin(angle) * 27;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    ctx.fillStyle = COLORS.white;
    ctx.font = "11px Arial";
    ctx.fillText("GERM", germ.x + 3, germ.y + 24);
  });
}

function drawPlayer() {
  if (invincibleTimer > 0 && Math.floor(invincibleTimer / 8) % 2 === 0) {
    return;
  }

  ctx.fillStyle = COLORS.white;
  ctx.fillRect(player.x, player.y, player.w, player.h);

  ctx.fillStyle = COLORS.softPeach;
  ctx.beginPath();
  ctx.arc(player.x + player.w / 2, player.y - 8, 14, 0, Math.PI * 2);
  ctx.fill();

  drawJerryCan(player.x - 12, player.y + 12, 16, 24);

  ctx.fillStyle = COLORS.yellow;

  if (player.facing === 1) {
    ctx.fillRect(player.x + player.w - 8, player.y + 16, 8, 8);
  } else {
    ctx.fillRect(player.x, player.y + 16, 8, 8);
  }
}

// ==================================================
// 15. CHARITY: WATER-INSPIRED JERRY CAN ICON
// ==================================================

function drawJerryCan(x, y, w, h) {
  ctx.fillStyle = COLORS.yellow;
  roundRect(x, y, w, h, 3, true, false);

  ctx.fillStyle = COLORS.white;
  roundRect(x + w * 0.28, y + h * 0.08, w * 0.44, h * 0.13, 2, true, false);

  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(x + w * 0.25, y + h * 0.28);
  ctx.lineTo(x + w * 0.50, y + h * 0.55);
  ctx.lineTo(x + w * 0.75, y + h * 0.28);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + w * 0.25, y + h * 0.78);
  ctx.lineTo(x + w * 0.50, y + h * 0.55);
  ctx.lineTo(x + w * 0.75, y + h * 0.78);
  ctx.stroke();
}

function roundRect(x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();

  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

// ==================================================
// 16. USER INTERFACE
// ==================================================

function drawUI() {
  const time = Math.floor((Date.now() - startTime) / 1000);

  let waterProgress = 0;

  if (totalObstacles > 0) {
    waterProgress = Math.floor(((totalObstacles - obstacles.length) / totalObstacles) * 100);
  }

  drawJerryCan(26, 20, 20, 28);

  ctx.fillStyle = COLORS.black;
  ctx.font = "22px Arial";
  ctx.textAlign = "left";
  ctx.fillText("charity: water", 58, 41);

  ctx.font = "18px Arial";
  ctx.fillText(`Lives: ${lives}`, 250, 41);
  ctx.fillText(`Time: ${time}`, 360, 41);

  ctx.textAlign = "right";
  ctx.fillText(`Score: ${score}`, WIDTH - 20, 41);
  ctx.textAlign = "left";

  ctx.font = "16px Arial";
  ctx.fillStyle = COLORS.black;
  ctx.fillText(`Water Restored: ${waterProgress}%`, 58, 70);

  const barX = 220;
  const barY = 57;
  const barWidth = 220;
  const barHeight = 18;

  ctx.fillStyle = COLORS.white;
  ctx.fillRect(barX, barY, barWidth, barHeight);

  ctx.strokeStyle = COLORS.deepTeal;
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  ctx.fillStyle = COLORS.cleanWater;
  ctx.fillRect(barX, barY, barWidth * (waterProgress / 100), barHeight);

  ctx.fillStyle = COLORS.yellow;
  ctx.fillRect(barX, barY, barWidth * (waterProgress / 100), 4);

  const difficulty = getDifficultySettings();

  ctx.fillStyle = COLORS.black;
  ctx.font = "14px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Difficulty: ${difficulty.name}`, 58, 92);
  ctx.fillText("Press R to reopen difficulty menu", 58, 112);
}

function drawTutorialText() {
  const timeSinceStart = Date.now() - startTime;

  if (timeSinceStart > 10000 || score > 0 || gameWon || gameOver) {
    return;
  }

  const boxX = 55;
  const boxY = 90;
  const boxWidth = 330;
  const boxHeight = 105;

  ctx.fillStyle = "rgba(245, 242, 224, 0.9)";
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

  ctx.strokeStyle = COLORS.yellow;
  ctx.lineWidth = 3;
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

  ctx.fillStyle = COLORS.black;
  ctx.font = "16px Arial";
  ctx.textAlign = "left";

  ctx.fillText("Mission: Clear debris to restore clean water.", boxX + 12, boxY + 25);
  ctx.fillText("Move: A/D or Arrow Keys", boxX + 12, boxY + 50);
  ctx.fillText("Jump: W, Space, or Up Arrow", boxX + 12, boxY + 72);
  ctx.fillText("Clear debris: Press E or F", boxX + 12, boxY + 94);
}

function drawSkillCheck() {
  const elapsed = Date.now() - skillCheckStartTime;
  const progress = Math.min(1, elapsed / skillCheckDuration);

  const boxWidth = 400;
  const boxHeight = 200;
  const boxX = (WIDTH - boxWidth) / 2;
  const boxY = (HEIGHT - boxHeight) / 2;

  ctx.fillStyle = "rgba(28, 43, 64, 0.9)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = COLORS.white;
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

  ctx.strokeStyle = COLORS.yellow;
  ctx.lineWidth = 5;
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

  ctx.fillStyle = COLORS.black;
  ctx.font = "24px Arial";
  ctx.textAlign = "center";
  ctx.fillText("SKILL CHECK!", WIDTH / 2, boxY + 40);

  ctx.font = "18px Arial";
  ctx.fillText("Press E or F at the right time!", WIDTH / 2, boxY + 70);

  // Draw timing bar
  const barWidth = 300;
  const barHeight = 40;
  const barX = (WIDTH - barWidth) / 2;
  const barY = boxY + 100;

  ctx.fillStyle = COLORS.deepTeal;
  ctx.fillRect(barX, barY, barWidth, barHeight);

  ctx.strokeStyle = COLORS.yellow;
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  ctx.fillStyle = COLORS.cleanWater;
  ctx.fillRect(barX, barY, barWidth * progress, barHeight);

  // Draw target zone
  const targetZoneWidth = (skillCheckTolerance / skillCheckDuration) * barWidth;
  const targetZoneProgress = skillCheckTargetTime / skillCheckDuration;
  const targetZoneX = barX + (barWidth * targetZoneProgress) - targetZoneWidth / 2;
  ctx.fillStyle = "rgba(255, 201, 8, 0.3)";
  ctx.fillRect(targetZoneX, barY, targetZoneWidth, barHeight);

  ctx.fillStyle = COLORS.black;
  ctx.font = "16px Arial";
  ctx.fillText("Time remaining: " + Math.ceil((skillCheckDuration - elapsed) / 1000) + "s", WIDTH / 2, boxY + 170);

  ctx.textAlign = "left";

  // Auto-fail if time runs out
  if (elapsed > skillCheckDuration) {
    completeSkillCheck(false);
  }
}

function drawCenterMessage(title, subtitle) {
  const boxWidth = 520;
  const boxHeight = 210;
  const boxX = (WIDTH - boxWidth) / 2;
  const boxY = (HEIGHT - boxHeight) / 2;

  ctx.fillStyle = "rgba(28, 43, 64, 0.88)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = COLORS.white;
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

  ctx.strokeStyle = COLORS.yellow;
  ctx.lineWidth = 5;
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

  drawJerryCan(boxX + 40, boxY + 40, 42, 62);

  const textX = boxX + boxWidth * 0.65;
  const titleY = boxY + 70;
  const subtitleY = boxY + 120;

  ctx.fillStyle = COLORS.black;
  ctx.textAlign = "center";

  ctx.font = "30px Arial";
  ctx.fillText(title, textX, titleY);

  ctx.font = "20px Arial";
  ctx.fillText(subtitle, textX, subtitleY);

  ctx.textAlign = "left";
}
