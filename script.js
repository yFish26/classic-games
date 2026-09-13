/* ==========================================================
   Classic Games v1.0 — Bricks, Tetris
   ========================================================== */

// ---------- 屏幕切换 ----------
const screens = document.querySelectorAll('.screen');
const menuBtns = document.querySelectorAll('.menu-btn:not(.disabled)');
const backBtns = document.querySelectorAll('.back-btn');
const menuScreen = document.getElementById('menu-screen');

function showScreen(id) {
  screens.forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

menuBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const game = btn.dataset.game;
    showScreen('game-' + game);
    startGame(game);
  });
});

backBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    stopGame();
    showScreen('menu-screen');
  });
});

// ---------- 时间计数器 ----------
let timerInterval = null;
let seconds = 0;
const timeSpans = document.querySelectorAll('.time');

function startTimer() {
  seconds = 0;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    seconds++;
    updateTimerDisplay();
  }, 1000);
}

function updateTimerDisplay() {
  timeSpans.forEach(el => { el.textContent = seconds; });
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// ---------- 更新积分/生命显示 ----------
function updateGameUI(game, score, lives) {
  const scoreEl = document.getElementById(game + '-score');
  const livesEl = document.getElementById(game + '-lives');
  if (scoreEl) scoreEl.textContent = score;
  if (livesEl) livesEl.textContent = lives;
}

// ---------- 当前游戏状态 ----------
let currentGame = null;
let animId = null;

function stopGame() {
  stopTimer();
  if (animId) {
    cancelAnimationFrame(animId);
    animId = null;
  }
  if (currentGame === 'bricks') stopBricks();
  else if (currentGame === 'tetris') stopTetris();
  currentGame = null;
}

function startGame(name) {
  stopGame();
  currentGame = name;
  startTimer();
  if (name === 'bricks') initBricks();
  else if (name === 'tetris') initTetris();
}

// ============================================================
//  触摸 / 移动端通用辅助
// ============================================================

// 为每个 canvas 创建触摸控制层
function setupTouchControls(canvas, handlers) {
  let startX, startY;

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // 死区 15px，防止误触
    if (Math.max(absDx, absDy) < 15) return;

    if (absDx > absDy) {
      // 水平滑动
      if (dx > 0 && handlers.right) handlers.right();
      else if (dx < 0 && handlers.left) handlers.left();
    } else {
      // 垂直滑动
      if (dy > 0 && handlers.down) handlers.down();
      else if (dy < 0 && handlers.up) handlers.up();
    }

    // 重置起点，支持连续滑动
    startX = t.clientX;
    startY = t.clientY;
  }, { passive: false });

  // 点击 tap 作为确认/下落
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (handlers.tap) handlers.tap();
  }, { passive: false });
}

// ============================================================
//  1) BRICKS (打砖块)
// ============================================================
const bricksCanvas = document.getElementById('bricks-canvas');
const bCtx = bricksCanvas.getContext('2d');

let bPaddle, bBall, bBricks, bScore, bLives;
let bRunning = false;
let bKeys = {};

function initBricks() {
  bPaddle = { x: 190, y: 310, w: 100, h: 10 };
  bBall  = { x: 200, y: 290, r: 6, dx: 3, dy: -3 };
  bScore = 0;
  bLives = 3;
  bKeys = {};
  updateGameUI('bricks', bScore, bLives);

  // 砖块布局 (6行 x 8列)
  bBricks = [];
  const rows = 6, cols = 8;
  for (let r = 0; r < rows; r++) {
    bBricks[r] = [];
    for (let c = 0; c < cols; c++) {
      bBricks[r][c] = { x: c * 60, y: r * 20, w: 56, h: 16, alive: true };
    }
  }

  bRunning = true;
  document.addEventListener('keydown', bKeyDown);
  document.addEventListener('keyup', bKeyUp);

  // 触摸控制：左右滑动移动挡板
  setupTouchControls(bricksCanvas, {
    left:  () => { bKeys['ArrowLeft']  = true;  setTimeout(() => bKeys['ArrowLeft']  = false, 100); },
    right: () => { bKeys['ArrowRight'] = true;  setTimeout(() => bKeys['ArrowRight'] = false, 100); },
    up:    () => {},
    down:  () => {},
    tap:   () => {}
  });

  bLoop();
}

function stopBricks() {
  bRunning = false;
  document.removeEventListener('keydown', bKeyDown);
  document.removeEventListener('keyup', bKeyUp);
}

function bKeyDown(e) { bKeys[e.key] = true; }
function bKeyUp(e)   { bKeys[e.key] = false; }

function bLoop() {
  if (!bRunning) return;
  bUpdate();
  bDraw();
  animId = requestAnimationFrame(bLoop);
}

function bUpdate() {
  // 移动挡板
  if (bKeys['ArrowLeft']  && bPaddle.x > 0) bPaddle.x -= 6;
  if (bKeys['ArrowRight'] && bPaddle.x + bPaddle.w < bricksCanvas.width) bPaddle.x += 6;

  // 移动球
  bBall.x += bBall.dx;
  bBall.y += bBall.dy;

  // 墙壁碰撞
  if (bBall.x - bBall.r < 0 || bBall.x + bBall.r > bricksCanvas.width)  bBall.dx = -bBall.dx;
  if (bBall.y - bBall.r < 0) bBall.dy = -bBall.dy;

  // 挡板碰撞
  if (bBall.y + bBall.r > bPaddle.y &&
      bBall.x > bPaddle.x && bBall.x < bPaddle.x + bPaddle.w &&
      bBall.dy > 0) {
    bBall.dy = -bBall.dy;
    bBall.y = bPaddle.y - bBall.r;
  }

  // 砖块碰撞
  for (let r = 0; r < bBricks.length; r++) {
    for (let c = 0; c < bBricks[r].length; c++) {
      const br = bBricks[r][c];
      if (!br.alive) continue;
      if (bBall.x > br.x && bBall.x < br.x + br.w &&
          bBall.y > br.y && bBall.y < br.y + br.h) {
        bBall.dy = -bBall.dy;
        br.alive = false;
        bScore++;
        updateGameUI('bricks', bScore, bLives);
      }
    }
  }

  // 掉出屏幕 → 失去一条命
  if (bBall.y - bBall.r > bricksCanvas.height) {
    bLives--;
    updateGameUI('bricks', bScore, bLives);
    if (bLives <= 0) {
      // 生命归零，自动退出回主菜单
      stopGame();
      showScreen('menu-screen');
      return;
    } else {
      // 重置球
      bBall.x = 200; bBall.y = 290;
      bBall.dx = 3; bBall.dy = -3;
    }
  }

  // 全部砖块清空 → 加分奖励并重置砖块
  let aliveCount = 0;
  for (let r = 0; r < bBricks.length; r++)
    for (let c = 0; c < bBricks[r].length; c++)
      if (bBricks[r][c].alive) aliveCount++;
  if (aliveCount === 0) {
    bScore += 10; // 通关奖励
    for (let r = 0; r < bBricks.length; r++)
      for (let c = 0; c < bBricks[r].length; c++)
        bBricks[r][c].alive = true;
    updateGameUI('bricks', bScore, bLives);
  }
}

function bDraw() {
  bCtx.fillStyle = '#111';
  bCtx.fillRect(0, 0, bricksCanvas.width, bricksCanvas.height);

  // 挡板
  bCtx.fillStyle = '#f39c12';
  bCtx.fillRect(bPaddle.x, bPaddle.y, bPaddle.w, bPaddle.h);

  // 球
  bCtx.beginPath();
  bCtx.arc(bBall.x, bBall.y, bBall.r, 0, Math.PI * 2);
  bCtx.fillStyle = '#fff';
  bCtx.fill();
  bCtx.closePath();

  // 砖块
  for (let r = 0; r < bBricks.length; r++) {
    for (let c = 0; c < bBricks[r].length; c++) {
      const br = bBricks[r][c];
      if (!br.alive) continue;
      bCtx.fillStyle = `hsl(${r * 40 + 20}, 80%, 60%)`;
      bCtx.fillRect(br.x, br.y, br.w, br.h);
    }
  }
}

// ============================================================
//  2) TETRIS (俄罗斯方块)
// ============================================================
const tetrisCanvas = document.getElementById('tetris-canvas');
const tCtx = tetrisCanvas.getContext('2d');

const COLS = 10, ROWS = 20;
const BLOCK = 30;
let tBoard, tPiece, tRunning = false;
let tDropTimer = null;
let tScore = 0;
let tLives = 3;

const PIECES = [
  { shape: [[1,1,1,1]], color: '#00f0f0' },    // I
  { shape: [[1,1],[1,1]], color: '#f0f000' },   // O
  { shape: [[0,1,0],[1,1,1]], color: '#a000f0' }, // T
  { shape: [[1,0,0],[1,1,1]], color: '#f0a000' }, // L
  { shape: [[0,0,1],[1,1,1]], color: '#0000f0' }, // J
  { shape: [[0,1,1],[1,1,0]], color: '#00f000' }, // S
  { shape: [[1,1,0],[0,1,1]], color: '#f00000' }  // Z
];

function initTetris() {
  tBoard = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  tPiece = newPiece();
  tScore = 0;
  tLives = 3;
  tRunning = true;
  updateGameUI('tetris', tScore, tLives);
  if (tDropTimer) clearInterval(tDropTimer);
  tDropTimer = setInterval(() => { if (tRunning) tDrop(); }, 400);
  document.addEventListener('keydown', tKey);

  // 触摸控制：左右滑动移动，上滑旋转，下滑加速下落，点击下落
  setupTouchControls(tetrisCanvas, {
    left:  () => {
      const p = tPiece;
      if (!tCollision(p.shape, p.x - 1, p.y)) p.x--;
    },
    right: () => {
      const p = tPiece;
      if (!tCollision(p.shape, p.x + 1, p.y)) p.x++;
    },
    up:    () => {
      const p = tPiece;
      const rotated = p.shape[0].map((_, i) => p.shape.map(row => row[i]).reverse());
      if (!tCollision(rotated, p.x, p.y)) p.shape = rotated;
    },
    down:  () => { tDrop(); },
    tap:   () => { tDrop(); }
  });

  tLoop();
}

function stopTetris() {
  tRunning = false;
  if (tDropTimer) { clearInterval(tDropTimer); tDropTimer = null; }
  document.removeEventListener('keydown', tKey);
}

function newPiece() {
  const idx = Math.floor(Math.random() * PIECES.length);
  const p = PIECES[idx];
  return {
    shape: p.shape.map(row => [...row]),
    color: p.color,
    x: Math.floor((COLS - p.shape[0].length) / 2),
    y: 0
  };
}

function tCollision(shape, px, py) {
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[0].length; c++)
      if (shape[r][c]) {
        const nx = px + c, ny = py + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && tBoard[ny][nx]))
          return true;
      }
  return false;
}

function tMerge() {
  const p = tPiece;
  for (let r = 0; r < p.shape.length; r++)
    for (let c = 0; c < p.shape[0].length; c++)
      if (p.shape[r][c] && p.y + r >= 0)
        tBoard[p.y + r][p.x + c] = p.color;
}

function tClearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (tBoard[r].every(cell => cell !== 0)) {
      tBoard.splice(r, 1);
      tBoard.unshift(Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared > 0) {
    // 1行=10分, 2行=30分, 3行=60分, 4行=100分
    const points = [0, 10, 30, 60, 100];
    tScore += points[Math.min(cleared, 4)];
    updateGameUI('tetris', tScore, tLives);
  }
}

function tDrop() {
  if (!tRunning) return;
  if (!tCollision(tPiece.shape, tPiece.x, tPiece.y + 1)) {
    tPiece.y++;
  } else {
    tMerge();
    tClearLines();
    tPiece = newPiece();
    if (tCollision(tPiece.shape, tPiece.x, tPiece.y)) {
      // 方块堆到顶 → 失去一条命
      tLives--;
      updateGameUI('tetris', tScore, tLives);
      if (tLives <= 0) {
        // 生命归零，自动退出回主菜单
        stopGame();
        showScreen('menu-screen');
        return;
      } else {
        // 保留分数，清空棋盘继续
        tBoard = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        tPiece = newPiece();
      }
    }
  }
}

function tKey(e) {
  if (!tRunning) return;
  const p = tPiece;
  if (e.key === 'ArrowLeft') {
    if (!tCollision(p.shape, p.x - 1, p.y)) p.x--;
  } else if (e.key === 'ArrowRight') {
    if (!tCollision(p.shape, p.x + 1, p.y)) p.x++;
  } else if (e.key === 'ArrowDown') {
    tDrop();
  } else if (e.key === 'ArrowUp') {
    // 旋转
    const rotated = p.shape[0].map((_, i) => p.shape.map(row => row[i]).reverse());
    if (!tCollision(rotated, p.x, p.y)) p.shape = rotated;
  }
  e.preventDefault();
}

function tLoop() {
  if (!tRunning) return;
  tDraw();
  animId = requestAnimationFrame(tLoop);
}

function tDraw() {
  tCtx.fillStyle = '#111';
  tCtx.fillRect(0, 0, tetrisCanvas.width, tetrisCanvas.height);

  // 已固定的方块
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (tBoard[r][c]) {
        tCtx.fillStyle = tBoard[r][c];
        tCtx.fillRect(c * BLOCK, r * BLOCK, BLOCK - 1, BLOCK - 1);
      }

  // 当前方块
  const p = tPiece;
  for (let r = 0; r < p.shape.length; r++)
    for (let c = 0; c < p.shape[0].length; c++)
      if (p.shape[r][c] && p.y + r >= 0) {
        tCtx.fillStyle = p.color;
        tCtx.fillRect((p.x + c) * BLOCK, (p.y + r) * BLOCK, BLOCK - 1, BLOCK - 1);
      }
}
