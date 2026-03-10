(() => {
  const ASSETS = {
    vikiRun: ["assets/Viki_runner_1.png", "assets/Viki_runner_2.png"],
    hofferRun: ["assets/hofferuv_syn_1.png", "assets/hofferuv_syn_2.png"],
    obstacles: [
      "assets/kniha.png",
      "assets/kocka.png",
      "assets/lego.png",
      "assets/medailon.png",
      "assets/stit.png",
    ],
    elixir: "assets/elixir.png",
  };

  const floatingMessages = [
    "Hoffer’s son is getting closer",
    "Chaos level rising",
    "This is getting ridiculous",
    "Viktorie gained +10 name‑day energy",
    "Hoffer’s son is confused",
  ];

  const elixirMessages = [
    "ELIXIR ACTIVATED",
    "Viktorie gained magical energy",
    "Name‑day boost unlocked",
  ];

  const GAME_DURATION = 60_000;
  const WORLD_WIDTH = 100;
  const WORLD_HEIGHT = 100;
  const GROUND_Y = 10;
  const PLAYER_X = 23;
  const CHASER_BASE_X = 12;

  const playerSize = { w: 12, h: 24 };
  const chaserSize = { w: 12, h: 24 };
  const obstacleSize = { w: 10, h: 18 };
  const elixirSize = { w: 8, h: 12 };

  const RUN_ANIM_INTERVAL = 140;
  const FLOATING_TEXT_MIN_INTERVAL = 3000;
  const FLOATING_TEXT_MAX_INTERVAL = 7500;
  const BOOST_DURATION = 3000;

  const MIN_SPAWN_INTERVAL_EASY = 1200;
  const MIN_SPAWN_INTERVAL_MED = 900;
  const MIN_SPAWN_INTERVAL_HARD = 650;

  const MAX_SPAWN_INTERVAL_EASY = 1700;
  const MAX_SPAWN_INTERVAL_MED = 1350;
  const MAX_SPAWN_INTERVAL_HARD = 1000;

  const BASE_SPEED_EASY = 30;
  const BASE_SPEED_MED = 36;
  const BASE_SPEED_HARD = 42;

  const BOOST_SPEED_MULTIPLIER = 0.75;

  const JUMP_STRENGTH = 52;
  const GRAVITY = -145;

  const gameRoot = document.getElementById("game-root");
  const bg1 = document.querySelector(".bg-1");
  const bg2 = document.querySelector(".bg-2");
  const gameLayer = document.getElementById("game-layer");
  const playerEl = document.getElementById("player");
  const chaserEl = document.getElementById("chaser");
  const playerShadowEl = document.getElementById("player-shadow");
  const chaserShadowEl = document.getElementById("chaser-shadow");
  const obstacleLayer = document.getElementById("obstacle-layer");
  const particleLayer = document.getElementById("particle-layer");
  const floatLayer = document.getElementById("floating-text-layer");

  const timerDisplay = document.getElementById("timer-display");
  const chaosDisplay = document.getElementById("chaos-display");
  const boostDisplay = document.getElementById("boost-display");

  const startScreen = document.getElementById("start-screen");
  const gameOverScreen = document.getElementById("game-over-screen");
  const winScreen = document.getElementById("win-screen");
  const loadingScreen = document.getElementById("loading-screen");

  const startButton = document.getElementById("start-button");
  const retryButton = document.getElementById("retry-button");
  const playAgainButton = document.getElementById("play-again-button");

  const jumpSound = document.getElementById("audio-jump");
  const boostSound = document.getElementById("audio-boost");

  let imagesLoaded = false;

  const state = {
    started: false,
    running: false,
    gameTime: 0,
    lastFrameTime: 0,
    backgroundOffset: 0,
    runFrameTime: 0,
    vikiFrameIndex: 0,
    hofferFrameIndex: 0,
    playerY: 0,
    playerVy: 0,
    onGround: true,
    chaserOffset: 0,
    obstacles: [],
    nextSpawnIn: 1200,
    lastFloatingTextAt: 0,
    nextFloatingTextIn: 4000,
    boostActive: false,
    boostUntil: 0,
    lastElixirAt: -10000,
    isWin: false,
    isGameOver: false,
  };

  function preloadImages() {
    const urls = [
      ...ASSETS.vikiRun,
      ...ASSETS.hofferRun,
      ...ASSETS.obstacles,
      ASSETS.elixir,
      "assets/background.jpg",
    ];
    const promises = urls.map(
      (url) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = url;
        })
    );
    return Promise.all(promises);
  }

  function setup() {
    preloadImages()
      .then(() => {
        imagesLoaded = true;
        loadingScreen.classList.remove("active");
        startScreen.classList.add("active");
      })
      .catch(() => {
        loadingScreen.querySelector("p").textContent =
          "Failed to preload images. You can still try to play!";
        loadingScreen.classList.remove("active");
        startScreen.classList.add("active");
      });
  }

  function resetState() {
    state.started = true;
    state.running = true;
    state.gameTime = 0;
    state.lastFrameTime = performance.now();
    state.backgroundOffset = 0;
    state.runFrameTime = 0;
    state.vikiFrameIndex = 0;
    state.hofferFrameIndex = 0;
    state.playerY = 0;
    state.playerVy = 0;
    state.onGround = true;
    state.chaserOffset = 0;
    state.obstacles.forEach((o) => obstacleLayer.removeChild(o.el));
    state.obstacles = [];
    state.nextSpawnIn = 900;
    state.lastFloatingTextAt = 0;
    state.nextFloatingTextIn = randomRange(
      FLOATING_TEXT_MIN_INTERVAL,
      FLOATING_TEXT_MAX_INTERVAL
    );
    state.boostActive = false;
    state.boostUntil = 0;
    state.lastElixirAt = -10000;
    state.isGameOver = false;
    state.isWin = false;

    updatePlayerGraphics();
    updateChaserGraphics();
    updateHud();
    hideAllScreens();
  }

  function hideAllScreens() {
    [startScreen, gameOverScreen, winScreen, loadingScreen].forEach((s) =>
      s.classList.remove("active")
    );
  }

  function startGame() {
    if (!imagesLoaded) return;
    resetState();
    requestAnimationFrame(gameLoop);
  }

  function jump() {
    if (!state.running) return;
    if (!state.onGround) return;
    state.onGround = false;
    state.playerVy = JUMP_STRENGTH;
    playerEl.classList.add("squash");
    setTimeout(() => playerEl.classList.remove("squash"), 180);
    playSound(jumpSound);
  }

  function playSound(el) {
    if (!el) return;
    try {
      el.currentTime = 0;
      el.play();
    } catch {
      // ignore autoplay-related errors
    }
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function gameLoop(timestamp) {
    if (!state.running) return;
    const dtMs = timestamp - state.lastFrameTime;
    state.lastFrameTime = timestamp;
    const dt = dtMs / 1000;

    state.gameTime += dtMs;
    if (state.gameTime >= GAME_DURATION) {
      state.running = false;
      state.isWin = true;
      showWinScreen();
      updateHud(0);
      return;
    }

    const t = state.gameTime;
    let baseSpeed;
    if (t < 15000) {
      baseSpeed = BASE_SPEED_EASY;
    } else if (t < 30000) {
      baseSpeed = BASE_SPEED_MED;
    } else if (t < 45000) {
      baseSpeed = BASE_SPEED_MED + 3;
    } else {
      baseSpeed = BASE_SPEED_HARD;
    }

    const speedMultiplier = state.boostActive ? BOOST_SPEED_MULTIPLIER : 1;
    const scrollSpeed = baseSpeed * speedMultiplier;

    const normalized = t / GAME_DURATION;
    const minSpawn =
      normalized < 0.25
        ? MIN_SPAWN_INTERVAL_EASY
        : normalized < 0.5
        ? MIN_SPAWN_INTERVAL_MED
        : MIN_SPAWN_INTERVAL_HARD;
    const maxSpawn =
      normalized < 0.25
        ? MAX_SPAWN_INTERVAL_EASY
        : normalized < 0.5
        ? MAX_SPAWN_INTERVAL_MED
        : MAX_SPAWN_INTERVAL_HARD;

    state.backgroundOffset -= (scrollSpeed * 0.35 * dt * 2) % 200;
    const bgOffset = ((state.backgroundOffset % 200) + 200) % 200;
    bg1.style.transform = `translate3d(${-bgOffset}%, 0, 0)`;
    bg2.style.transform = `translate3d(${200 - bgOffset}%, 0, 0)`;

    updateRunAnimation(dtMs);
    updatePlayerPhysics(dt);
    updateChaser(dt, scrollSpeed);
    updateObstacles(dt, scrollSpeed);
    handleCollisions();
    updateBoostState();
    maybeSpawnObstacle(dtMs, minSpawn, maxSpawn);
    maybeShowFloatingText(dtMs);
    updateHud(scrollSpeed);

    requestAnimationFrame(gameLoop);
  }

  function updateRunAnimation(dtMs) {
    state.runFrameTime += dtMs;
    if (state.runFrameTime >= RUN_ANIM_INTERVAL) {
      state.runFrameTime -= RUN_ANIM_INTERVAL;
      state.vikiFrameIndex = (state.vikiFrameIndex + 1) % ASSETS.vikiRun.length;
      state.hofferFrameIndex =
        (state.hofferFrameIndex + 1) % ASSETS.hofferRun.length;
      if (state.onGround) {
        updatePlayerGraphics();
      }
      updateChaserGraphics();
    }
  }

  function updatePlayerGraphics() {
    const frame = ASSETS.vikiRun[state.vikiFrameIndex];
    playerEl.style.backgroundImage = `url("${frame}")`;
  }

  function updateChaserGraphics() {
    const frame = ASSETS.hofferRun[state.hofferFrameIndex];
    chaserEl.style.backgroundImage = `url("${frame}")`;
  }

  function updatePlayerPhysics(dt) {
    if (!state.onGround) {
      state.playerVy += GRAVITY * dt;
      state.playerY += state.playerVy * dt;
      if (state.playerY <= 0) {
        state.playerY = 0;
        state.playerVy = 0;
        state.onGround = true;
      }
    }

    const yBottom = GROUND_Y + state.playerY * 0.5;
    playerEl.style.left = `${PLAYER_X}%`;
    playerEl.style.bottom = `${yBottom}%`;

    playerShadowEl.style.left = `${PLAYER_X + playerSize.w * 0.25}%`;
    playerShadowEl.style.transform = `scale(${
      1 - Math.min(state.playerY / 80, 0.4)
    }, ${1 - Math.min(state.playerY / 90, 0.5)})`;
  }

  function updateChaser(dt, scrollSpeed) {
    const targetOffset = state.boostActive ? -10 : -3;
    const diff = targetOffset - state.chaserOffset;
    state.chaserOffset += diff * Math.min(1, dt * 1.8);

    const chaosFactor = state.gameTime / GAME_DURATION;
    const extraOffset = chaosFactor * 6;

    const chaserX = CHASER_BASE_X + state.chaserOffset - extraOffset * 0.2;
    const yBottom = GROUND_Y;

    chaserEl.style.left = `${Math.max(3, chaserX)}%`;
    chaserEl.style.bottom = `${yBottom}%`;

    chaserShadowEl.style.left = `${Math.max(3, chaserX) + chaserSize.w * 0.2}%`;
  }

  function createObstacle(isElixir) {
    const el = document.createElement("div");
    el.classList.add("obstacle");
    let type = "harmful";
    if (isElixir) {
      type = "elixir";
      el.classList.add("elixir");
      el.style.backgroundImage = `url("${ASSETS.elixir}")`;
    } else {
      const sprite =
        ASSETS.obstacles[Math.floor(Math.random() * ASSETS.obstacles.length)];
      el.style.backgroundImage = `url("${sprite}")`;
    }
    obstacleLayer.appendChild(el);
    return {
      el,
      type,
      x: 110,
      y: 0,
      width: type === "elixir" ? elixirSize.w : obstacleSize.w,
      height: type === "elixir" ? elixirSize.h : obstacleSize.h,
    };
  }

  function maybeSpawnObstacle(dtMs, minSpawn, maxSpawn) {
    state.nextSpawnIn -= dtMs;
    if (state.nextSpawnIn > 0) return;

    const now = state.gameTime;
    const last = state.obstacles[state.obstacles.length - 1];
    if (last && last.x > WORLD_WIDTH + 10) {
      state.nextSpawnIn = 200;
      return;
    }

    const chanceElixir =
      now - state.lastElixirAt > 8000 ? (now < 20000 ? 0.18 : 0.25) : 0.07;
    const roll = Math.random();
    const isElixir = roll < chanceElixir;
    const obstacle = createObstacle(isElixir);
    state.obstacles.push(obstacle);
    if (isElixir) {
      state.lastElixirAt = now;
    }

    const t = now;
    let chaosBonus = 0;
    if (t > 30000 && t < 45000) chaosBonus = 80;
    else if (t >= 45000) chaosBonus = 150;

    state.nextSpawnIn = randomRange(minSpawn, maxSpawn) - chaosBonus;
    state.nextSpawnIn = Math.max(450, state.nextSpawnIn);
  }

  function updateObstacles(dt, scrollSpeed) {
    const speedWorld = (scrollSpeed / 60) * WORLD_WIDTH;
    for (const o of state.obstacles) {
      o.x -= (speedWorld * dt) / WORLD_WIDTH;
      if (o.type === "elixir") {
        o.el.style.bottom = `${GROUND_Y + 10}%`;
      } else {
        o.el.style.bottom = `${GROUND_Y}%`;
      }
      o.el.style.left = `${o.x}%`;
    }
    state.obstacles = state.obstacles.filter((o) => {
      if (o.x < -30) {
        obstacleLayer.removeChild(o.el);
        return false;
      }
      return true;
    });
  }

  function getPlayerHitbox() {
    const x = PLAYER_X + playerSize.w * 0.1;
    const width = playerSize.w * 0.8;
    const baseY = GROUND_Y + 2;
    const y = baseY + (state.playerY * 0.5 * WORLD_HEIGHT) / 100;
    const height = playerSize.h * 0.9;
    return { x, y, width, height };
  }

  function getObstacleHitbox(o) {
    if (o.type === "elixir") {
      return {
        x: o.x + o.width * 0.1,
        y: GROUND_Y + 10,
        width: o.width * 0.8,
        height: o.height * 0.8,
      };
    }
    return {
      x: o.x + o.width * 0.1,
      y: GROUND_Y,
      width: o.width * 0.8,
      height: o.height * 0.85,
    };
  }

  function rectsOverlap(a, b) {
    return !(
      a.x + a.width < b.x ||
      a.x > b.x + b.width ||
      a.y + a.height < b.y ||
      a.y > b.y + b.height
    );
  }

  function handleCollisions() {
    const playerBox = getPlayerHitbox();
    for (let i = state.obstacles.length - 1; i >= 0; i--) {
      const o = state.obstacles[i];
      const obBox = getObstacleHitbox(o);
      if (rectsOverlap(playerBox, obBox)) {
        if (o.type === "elixir") {
          collectElixir(o, i);
        } else {
          triggerGameOver();
        }
        break;
      }
    }
  }

  function collectElixir(o, index) {
    playSound(boostSound);
    state.boostActive = true;
    state.boostUntil = state.gameTime + BOOST_DURATION;
    playerEl.classList.add("boosted");
    boostDisplay.classList.remove("hidden");
    spawnElixirParticles();
    showFloatingText(
      elixirMessages[Math.floor(Math.random() * elixirMessages.length)]
    );
    obstacleLayer.removeChild(o.el);
    state.obstacles.splice(index, 1);
  }

  function spawnElixirParticles() {
    const rect = playerEl.getBoundingClientRect();
    const parentRect = gameRoot.getBoundingClientRect();
    for (let i = 0; i < 10; i++) {
      const p = document.createElement("div");
      p.classList.add("particle");
      const x =
        ((rect.left + rect.width / 2 - parentRect.left) / parentRect.width) *
        100;
      const y =
        ((rect.bottom - rect.height * 0.4 - parentRect.top) /
          parentRect.height) *
        100;
      p.style.left = `${x + randomRange(-6, 6)}%`;
      p.style.bottom = `${100 - y + randomRange(-4, 4)}%`;
      particleLayer.appendChild(p);
      p.addEventListener("animationend", () => {
        particleLayer.removeChild(p);
      });
    }
  }

  function triggerGameOver() {
    if (!state.running) return;
    state.running = false;
    state.isGameOver = true;
    gameLayer.classList.add("shake");
    setTimeout(() => gameLayer.classList.remove("shake"), 400);
    setTimeout(showGameOverScreen, 420);
  }

  function updateBoostState() {
    if (state.boostActive && state.gameTime > state.boostUntil) {
      state.boostActive = false;
      playerEl.classList.remove("boosted");
      boostDisplay.classList.add("hidden");
    }
  }

  function maybeShowFloatingText(dtMs) {
    state.lastFloatingTextAt += dtMs;
    if (state.lastFloatingTextAt < state.nextFloatingTextIn) return;
    state.lastFloatingTextAt = 0;
    state.nextFloatingTextIn = randomRange(
      FLOATING_TEXT_MIN_INTERVAL,
      FLOATING_TEXT_MAX_INTERVAL
    );
    const msg =
      floatingMessages[Math.floor(Math.random() * floatingMessages.length)];
    showFloatingText(msg);
  }

  function showFloatingText(text) {
    const el = document.createElement("div");
    el.classList.add("floating-text");
    el.textContent = text;
    floatLayer.appendChild(el);
    el.addEventListener("animationend", () => {
      if (el.parentNode === floatLayer) floatLayer.removeChild(el);
    });
  }

  function updateHud(scrollSpeed) {
    const remainingMs = Math.max(0, GAME_DURATION - state.gameTime);
    const seconds = (remainingMs / 1000).toFixed(1);
    timerDisplay.textContent = `Time left: ${seconds}s`;
    if (remainingMs <= 10_000) {
      timerDisplay.classList.add("final-seconds");
    } else {
      timerDisplay.classList.remove("final-seconds");
    }

    let chaos;
    const t = state.gameTime;
    if (t < 15000) chaos = "Calm-ish";
    else if (t < 30000) chaos = "Warming up";
    else if (t < 45000) chaos = "Spicy";
    else chaos = "Maximum name‑day chaos";
    chaosDisplay.textContent = `Chaos level: ${chaos}`;

    if (scrollSpeed != null) {
      const speedEmoji =
        scrollSpeed < 34 ? "🦥" : scrollSpeed < 40 ? "🏃" : "🚀";
      chaosDisplay.textContent += ` ${speedEmoji}`;
    }
  }

  function showGameOverScreen() {
    hideAllScreens();
    gameOverScreen.classList.add("active");
  }

  function showWinScreen() {
    hideAllScreens();
    winScreen.classList.add("active");
  }

  function handleKeydown(e) {
    if (e.code === "Space") {
      e.preventDefault();
      if (!state.started) return;
      jump();
    }
  }

  function handlePointerDown() {
    if (!state.started) return;
    jump();
  }

  startButton.addEventListener("click", () => {
    startGame();
  });

  retryButton.addEventListener("click", () => {
    startGame();
  });

  playAgainButton.addEventListener("click", () => {
    startGame();
  });

  window.addEventListener("keydown", handleKeydown);
  gameRoot.addEventListener("mousedown", handlePointerDown);
  gameRoot.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      handlePointerDown();
    },
    { passive: false }
  );

  window.addEventListener("load", setup);
})();

