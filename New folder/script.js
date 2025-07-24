// Game elements
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOver");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const finalScoreElement = document.getElementById("finalScore");
const currentScoreElement = document.getElementById("currentScore");
const highScoreElement = document.getElementById("highScore");
const medalContainer = document.getElementById("medalContainer");

// Game settings
const GRAVITY = 0.18;
const JUMP_FORCE = -5;
const BASE_PIPE_SPEED = 1.5;
const MAX_PIPE_SPEED = 3.5;
const SPEED_INCREASE_RATE = 0.002;
const PIPE_GAP = 220;
const PIPE_WIDTH = 70;
const PIPE_FREQUENCY = 1900;
const GROUND_HEIGHT = 60;
const GRAVITY_DELAY = 30;

// Game state
let gameRunning = false;
let gameStarted = false;
let score = 0;
let highScore = localStorage.getItem("flappyHighScore") || 0;
let lastPipeTime = 0;
let animationId = null;
let groundOffset = 0;
let adCounter = 0;
let gravityDelayCounter = 0;
let currentPipeSpeed = BASE_PIPE_SPEED;

// Images with fallback colors
const images = {
  bird: new Image(),
  background: new Image(),
  pipeTop: new Image(),
  pipeBottom: new Image(),
  ground: new Image(),
  medalGold: new Image(),
  medalSilver: new Image(),
  medalBronze: new Image(),
};

// Load images with error handling
function loadImage(img, src, fallbackColor) {
  return new Promise((resolve) => {
    img.onload = () => resolve(true);
    img.onerror = () => {
      console.log(`Failed to load image: ${src}`);
      img.fallbackColor = fallbackColor;
      resolve(false);
    };
    img.src = src;
  });
}

// Load all images
async function loadAllImages() {
  await Promise.all([
    loadImage(images.bird, "https://iili.io/3bqPgkX.png", "#ffd700"),
    loadImage(images.background, "https://iili.io/3bFEgYg.png", "#70c5ce"),
    loadImage(images.pipeTop, "https://iili.io/3bBmEla.png", "#4CAF50"),
    loadImage(images.pipeBottom, "https://iili.io/3bBmEla.png", "#4CAF50"),
    loadImage(images.ground, "https://iili.io/3bqPU7t.png", "#8B4513"),
    loadImage(images.medalGold, "https://iili.io/JWZ5Jlu.png", null),
    loadImage(images.medalSilver, "https://iili.io/JWZ5YwI.png", null),
    loadImage(images.medalBronze, "https://iili.io/JWZ5Npf.png", null),
  ]);
  drawStartScreen();
}

// Sound effects with error handling
const sounds = {
  jump: new Audio(
    "https://assets.mixkit.co/sfx/preview/mixkit-quick-jump-arcade-game-239.mp3"
  ),
  score: new Audio(
    "https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3"
  ),
  hit: new Audio(
    "https://assets.mixkit.co/sfx/preview/mixkit-arcade-game-explosion-2759.mp3"
  ),
  die: new Audio(
    "https://assets.mixkit.co/sfx/preview/mixkit-retro-arcade-lose-2027.mp3"
  ),
};

// Bird object
const bird = {
  x: 100,
  y: 300,
  width: 40,
  height: 30,
  velocity: 0,
  rotation: 0,
};

// Pipes array
const pipes = [];

// Initialize canvas
function resizeCanvas() {
  const container = document.querySelector(".game-container");
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  bird.y = canvas.height / 2;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Event listeners
startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);
canvas.addEventListener("click", handleJump);
canvas.addEventListener("touchstart", handleJump);
document.addEventListener("keydown", (e) => {
  if (["Space", " ", "ArrowUp"].includes(e.code || e.key)) handleJump(e);
});

// Game functions
function handleJump(e) {
  e.preventDefault();
  if (gameRunning) birdJump();
  else if (!gameStarted) startGame();
}

function birdJump() {
  bird.velocity = JUMP_FORCE;
  bird.rotation = -20;
  playSound("jump");
  gravityDelayCounter = 0;
}

function playSound(type) {
  try {
    sounds[type].currentTime = 0;
    sounds[type].play();
  } catch (e) {
    console.log("Sound error:", e);
  }
}

function startGame() {
  gameStarted = true;
  gameRunning = true;
  score = 0;
  bird.y = canvas.height / 2;
  bird.velocity = 0;
  bird.rotation = 0;
  pipes.length = [];
  lastPipeTime = 0;
  groundOffset = 0;
  gravityDelayCounter = GRAVITY_DELAY;
  currentPipeSpeed = BASE_PIPE_SPEED;
  medalContainer.innerHTML = "";

  startScreen.style.display = "none";
  gameOverScreen.style.display = "none";

  if (typeof sdk !== "undefined" && sdk.showBanner) {
    sdk.showBanner();
  }

  if (animationId) cancelAnimationFrame(animationId);
  gameLoop();
}

function gameLoop(timestamp) {
  if (!gameRunning) return;

  animationId = requestAnimationFrame(gameLoop);

  if (currentPipeSpeed < MAX_PIPE_SPEED) {
    currentPipeSpeed += SPEED_INCREASE_RATE;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (images.background.complete) {
    ctx.drawImage(images.background, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = images.background.fallbackColor || "#70c5ce";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  updatePipes(timestamp);
  drawPipes();
  updateBird();
  drawBird();
  drawGround();

  if (checkCollisions()) {
    gameOver();
    return;
  }

  currentScoreElement.textContent = score;
  highScoreElement.textContent = highScore;
}

function updateBird() {
  if (gravityDelayCounter > 0) {
    gravityDelayCounter--;
    bird.rotation = Math.sin(Date.now() / 100) * 5;
  } else {
    bird.velocity += GRAVITY;
    bird.rotation = Math.min(30, bird.rotation + 1);
  }

  bird.y += bird.velocity;

  if (bird.y - bird.height / 2 < 0) {
    bird.y = bird.height / 2;
    bird.velocity = 0;
  }
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate((bird.rotation * Math.PI) / 180);

  if (images.bird.complete) {
    ctx.drawImage(
      images.bird,
      -bird.width / 2,
      -bird.height / 2,
      bird.width,
      bird.height
    );
  } else {
    ctx.fillStyle = images.bird.fallbackColor || "#ffd700";
    ctx.beginPath();
    ctx.ellipse(0, 0, bird.width / 2, bird.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function updatePipes(timestamp) {
  if (timestamp - lastPipeTime > PIPE_FREQUENCY) {
    const minHeight = 50;
    const maxHeight = canvas.height - PIPE_GAP - minHeight - GROUND_HEIGHT;
    const pipeHeight =
      Math.floor(Math.random() * (maxHeight - minHeight)) + minHeight;

    pipes.push({
      x: canvas.width,
      topHeight: pipeHeight,
      bottomY: pipeHeight + PIPE_GAP,
      passed: false,
    });
    lastPipeTime = timestamp;
  }

  for (let i = pipes.length - 1; i >= 0; i--) {
    pipes[i].x -= currentPipeSpeed;

    if (!pipes[i].passed && pipes[i].x + PIPE_WIDTH < bird.x) {
      pipes[i].passed = true;
      score++;
      playSound("score");
    }

    if (pipes[i].x + PIPE_WIDTH < 0) {
      pipes.splice(i, 1);
    }
  }
}

function drawPipes() {
  for (const pipe of pipes) {
    if (images.pipeTop.complete) {
      ctx.save();
      ctx.translate(pipe.x, pipe.topHeight);
      ctx.scale(1, -1);
      ctx.drawImage(images.pipeTop, 0, 0, PIPE_WIDTH, pipe.topHeight);
      ctx.restore();
    } else {
      ctx.fillStyle = images.pipeTop.fallbackColor || "#4CAF50";
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
    }

    if (images.pipeBottom.complete) {
      ctx.drawImage(
        images.pipeBottom,
        pipe.x,
        pipe.bottomY,
        PIPE_WIDTH,
        canvas.height - pipe.bottomY - GROUND_HEIGHT
      );
    } else {
      ctx.fillStyle = images.pipeBottom.fallbackColor || "#4CAF50";
      ctx.fillRect(
        pipe.x,
        pipe.bottomY,
        PIPE_WIDTH,
        canvas.height - pipe.bottomY - GROUND_HEIGHT
      );
    }
  }
}

function drawGround() {
  if (images.ground.complete) {
    const patternWidth = images.ground.width;
    groundOffset = (groundOffset + currentPipeSpeed) % patternWidth;

    for (
      let x = -patternWidth + groundOffset;
      x < canvas.width;
      x += patternWidth
    ) {
      ctx.drawImage(
        images.ground,
        x,
        canvas.height - GROUND_HEIGHT,
        patternWidth,
        GROUND_HEIGHT
      );
    }
  } else {
    ctx.fillStyle = images.ground.fallbackColor || "#8B4513";
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
  }
}

function checkCollisions() {
  if (bird.y + bird.height / 2 > canvas.height - GROUND_HEIGHT) {
    playSound("hit");
    return true;
  }

  for (const pipe of pipes) {
    if (
      bird.x + bird.width / 2 > pipe.x &&
      bird.x - bird.width / 2 < pipe.x + PIPE_WIDTH &&
      (bird.y - bird.height / 2 < pipe.topHeight ||
        bird.y + bird.height / 2 > pipe.bottomY)
    ) {
      playSound("hit");
      return true;
    }
  }

  return false;
}

function showMedal() {
  if (score >= 20) {
    const medalImg = document.createElement("img");
    if (score >= 50 && images.medalGold.complete) {
      medalImg.src = images.medalGold.src;
    } else if (score >= 30 && images.medalSilver.complete) {
      medalImg.src = images.medalSilver.src;
    } else if (images.medalBronze.complete) {
      medalImg.src = images.medalBronze.src;
    }
    if (medalImg.src) {
      medalContainer.appendChild(medalImg);
    }
  }
}

function gameOver() {
  gameRunning = false;
  gameStarted = false;
  cancelAnimationFrame(animationId);

  if (score > highScore) {
    highScore = score;
    localStorage.setItem("flappyHighScore", highScore);
  }

  showMedal();
  finalScoreElement.textContent = score;
  playSound("die");
  gameOverScreen.style.display = "flex";

  if (
    adCounter % 2 === 0 &&
    typeof sdk !== "undefined" &&
    sdk.showInterstitial
  ) {
    sdk.showInterstitial();
  }
  adCounter++;

  if (typeof sdk !== "undefined" && sdk.showBanner) {
    sdk.showBanner();
  }
}

// Initialize game
window.onload = function () {
  resizeCanvas();
  ctx.fillStyle = "#70c5ce";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "30px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Loading...", canvas.width / 2, canvas.height / 2);

  loadAllImages();
};

function drawStartScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (images.background.complete) {
    ctx.drawImage(images.background, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = images.background.fallbackColor || "#70c5ce";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  startScreen.style.display = "flex";

  if (typeof sdk !== "undefined" && sdk.showBanner) {
    sdk.showBanner();
  }
}
