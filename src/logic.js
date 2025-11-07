const DIRS = {
  u: { dx: 0, dy: -1, idx: 0, opp: 'd' },
  r: { dx: 1, dy: 0, idx: 1, opp: 'l' },
  d: { dx: 0, dy: 1, idx: 2, opp: 'u' },
  l: { dx: -1, dy: 0, idx: 3, opp: 'r' },
};

function makeWalls(size) {
  const walls = new Array(size);
  for (let y = 0; y < size; y++) {
    walls[y] = new Array(size);
    for (let x = 0; x < size; x++) {
      walls[y][x] = { u: false, r: false, d: false, l: false };
    }
  }
  // Outer boundaries
  for (let x = 0; x < size; x++) {
    walls[0][x].u = true;
    walls[size - 1][x].d = true;
  }
  for (let y = 0; y < size; y++) {
    walls[y][0].l = true;
    walls[y][size - 1].r = true;
  }
  return walls;
}

function inBounds(size, x, y) {
  return x >= 0 && y >= 0 && x < size && y < size;
}

function addWall(walls, x, y, dir) {
  const size = walls.length;
  const d = DIRS[dir];
  const nx = x + d.dx, ny = y + d.dy;
  if (!inBounds(size, x, y)) return false;
  walls[y][x][dir] = true;
  if (inBounds(size, nx, ny)) {
    walls[ny][nx][d.opp] = true;
  }
  return true;
}

function randomObstacles(rng, walls, count) {
  const size = walls.length;
  let placed = 0;
  const dirs = ['u', 'r', 'd', 'l'];
  let guard = 0;
  while (placed < count && guard < 5000) {
    guard++;
    const x = rng.nextInt(size);
    const y = rng.nextInt(size);
    const dir = dirs[rng.nextInt(4)];
    // Skip if already has wall on that edge
    if (walls[y][x][dir]) continue;
    // Avoid adding walls that would point outside (handled by addWall boundaries)
    addWall(walls, x, y, dir);
    placed++;
  }
}

function distinctPositions(rng, size, n) {
  const used = new Set();
  const res = [];
  while (res.length < n) {
    const x = rng.nextInt(size), y = rng.nextInt(size);
    const key = `${x},${y}`;
    if (used.has(key)) continue;
    used.add(key);
    res.push({ x, y });
  }
  return res;
}

// --- Classic mode (quadrants) data ---
// Simple sample quadrants (8x8 each). Not the official board, but deterministic templates.
// walls: list of {x,y,dir} within 0..7; targets: potential target cells with fixed color inside the quadrant
const QUADRANTS = [
  {
    walls: [
      {x:1,y:1,dir:'r'}, {x:1,y:1,dir:'d'}, {x:2,y:3,dir:'d'}, {x:2,y:3,dir:'r'},
      {x:5,y:0,dir:'d'}, {x:5,y:1,dir:'d'}, {x:6,y:2,dir:'l'}, {x:6,y:2,dir:'d'},
      {x:0,y:5,dir:'r'}, {x:3,y:6,dir:'u'}, {x:4,y:6,dir:'u'}
    ],
    targets: [{x:3,y:2,color:'r'}]
  },
  {
    walls: [
      {x:2,y:1,dir:'d'}, {x:3,y:1,dir:'d'}, {x:4,y:2,dir:'l'}, {x:4,y:2,dir:'d'},
      {x:6,y:3,dir:'l'}, {x:6,y:4,dir:'l'}, {x:1,y:6,dir:'r'}, {x:1,y:6,dir:'u'}
    ],
    targets: [{x:5,y:3,color:'y'}]
  },
  {
    walls: [
      {x:1,y:2,dir:'r'}, {x:1,y:3,dir:'r'}, {x:2,y:4,dir:'d'}, {x:2,y:4,dir:'r'},
      {x:5,y:5,dir:'u'}, {x:6,y:5,dir:'u'}, {x:6,y:1,dir:'l'}
    ],
    targets: [{x:2,y:5,color:'b'}]
  },
  {
    walls: [
      {x:0,y:1,dir:'d'}, {x:0,y:1,dir:'r'}, {x:3,y:3,dir:'u'}, {x:4,y:3,dir:'u'},
      {x:5,y:6,dir:'l'}, {x:6,y:6,dir:'l'}, {x:2,y:0,dir:'d'}
    ],
    targets: [{x:6,y:1,color:'g'}]
  }
];

function rotatePoint(x, y, rot, size) {
  // rot: 0,1,2,3 times 90deg clockwise within square of given size (8)
  if (rot === 0) return { x, y };
  if (rot === 1) return { x: size - 1 - y, y: x };
  if (rot === 2) return { x: size - 1 - x, y: size - 1 - y };
  return { x: y, y: size - 1 - x }; // rot === 3
}

function rotateDir(dir, rot) {
  const order = ['u','r','d','l'];
  let idx = order.indexOf(dir);
  idx = (idx + rot) % 4;
  return order[idx];
}

function stampQuadrant(walls, quad, rot, offsetX, offsetY) {
  const sizeQ = 8;
  for (const w of quad.walls) {
    const p = rotatePoint(w.x, w.y, rot, sizeQ);
    const d = rotateDir(w.dir, rot);
    addWall(walls, offsetX + p.x, offsetY + p.y, d);
  }
}

function addCentralCross(walls) {
  // Block the four inner edges of the central 2x2: (7,7),(8,7),(7,8),(8,8)
  addWall(walls, 7, 7, 'r');
  addWall(walls, 7, 8, 'r');
  addWall(walls, 7, 7, 'd');
  addWall(walls, 8, 7, 'd');
}

function pickDistinctCells(rng, size, count, forbidden) {
  const used = new Set(forbidden || []);
  const res = [];
  let guard = 0;
  while (res.length < count && guard < 10000) {
    guard++;
    const x = rng.nextInt(size), y = rng.nextInt(size);
    const key = `${x},${y}`;
    // avoid center 2x2 and duplicates
    if ((x === 7 || x === 8) && (y === 7 || y === 8)) continue;
    if (used.has(key)) continue;
    used.add(key);
    res.push({ x, y });
  }
  return res;
}

function pickCellInQuadrant(rng, size, quadIndex, used) {
  // quadIndex: 0 TL, 1 TR, 2 BL, 3 BR
  const mid = size >> 1; // 8 for 16x16
  const xRange = quadIndex % 2 === 0 ? [0, mid - 1] : [mid, size - 1];
  const yRange = quadIndex < 2 ? [0, mid - 1] : [mid, size - 1];
  let guard = 0;
  while (guard++ < 5000) {
    const x = xRange[0] + rng.nextInt(xRange[1] - xRange[0] + 1);
    const y = yRange[0] + rng.nextInt(yRange[1] - yRange[0] + 1);
    // avoid center 2x2 and used
    if ((x === 7 || x === 8) && (y === 7 || y === 8)) continue;
    const key = `${x},${y}`;
    if (used.has(key)) continue;
    used.add(key);
    return { x, y };
  }
  // fallback: anywhere not used
  let altGuard = 0;
  while (altGuard++ < 10000) {
    const x = rng.nextInt(size), y = rng.nextInt(size);
    if ((x === 7 || x === 8) && (y === 7 || y === 8)) continue;
    const key = `${x},${y}`;
    if (used.has(key)) continue;
    used.add(key);
    return { x, y };
  }
  return { x: 0, y: 0 };
}

function createClassicBoardFromSeed(rng, size) {
  const walls = makeWalls(size);
  // choose permutation of quadrants and rotation for each
  const indices = [0,1,2,3];
  // shuffle indices
  for (let i = indices.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const rots = [rng.nextInt(4), rng.nextInt(4), rng.nextInt(4), rng.nextInt(4)];
  // offsets: TL(0,0), TR(8,0), BL(0,8), BR(8,8)
  const offsets = [ {x:0,y:0}, {x:8,y:0}, {x:0,y:8}, {x:8,y:8} ];
  for (let q = 0; q < 4; q++) {
    const quad = QUADRANTS[indices[q]];
    const rot = rots[q];
    const off = offsets[q];
    stampQuadrant(walls, quad, rot, off.x, off.y);
  }
  addCentralCross(walls);

  // gather candidate targets from quadrants, rotate and offset to board coords
  const candidateTargets = [];
  for (let q = 0; q < 4; q++) {
    const quad = QUADRANTS[indices[q]];
    const rot = rots[q];
    const off = offsets[q];
    for (const t of quad.targets) {
      const p = rotatePoint(t.x, t.y, rot, 8);
      candidateTargets.push({ x: off.x + p.x, y: off.y + p.y, color: t.color });
    }
  }
  // helper to check wall adjacency on any side
  const hasAnyWall = (x, y) => {
    const w = walls[y][x];
    return w.u || w.r || w.d || w.l;
  };
  const validTargets = candidateTargets.filter(t => hasAnyWall(t.x, t.y));
  let target = (validTargets.length ? validTargets : candidateTargets)[
    (validTargets.length ? rng.nextInt(validTargets.length) : (candidateTargets.length ? rng.nextInt(candidateTargets.length) : 0))
  ] || { x: 7, y: 7, color: 'r' };
  // enforce adjacency if not satisfied by adding a nearby wall
  if (!hasAnyWall(target.x, target.y)) {
    if (target.x > 0) addWall(walls, target.x, target.y, 'l');
    else if (target.x < size - 1) addWall(walls, target.x, target.y, 'r');
    else if (target.y > 0) addWall(walls, target.x, target.y, 'u');
    else addWall(walls, target.x, target.y, 'd');
  }

  // robots: one per quadrant (TL,TR,BL,BR), avoid target and center 2x2
  const used = new Set([`${target.x},${target.y}`]);
  const r = pickCellInQuadrant(rng, size, 0, used); // TL
  const y = pickCellInQuadrant(rng, size, 1, used); // TR
  const b = pickCellInQuadrant(rng, size, 2, used); // BL
  const g = pickCellInQuadrant(rng, size, 3, used); // BR
  const robots = { r, y, b, g };
  return { size, walls, robots, target: { x: target.x, y: target.y, color: target.color }, markers: [] };
}

export function createBoardFromSeed(rng, size, mode = 'c') {
  if (mode === 'r') {
    const walls = makeWalls(size);
    const obstacleCount = 10 + rng.nextInt(3); // 10~12
    randomObstacles(rng, walls, obstacleCount);
    let [target] = distinctPositions(rng, size, 1);
    const targetColor = ['r','y','b','g'][rng.nextInt(4)];
    const used = new Set([`${target.x},${target.y}`]);
    const r = pickCellInQuadrant(rng, size, 0, used);
    const y = pickCellInQuadrant(rng, size, 1, used);
    const b = pickCellInQuadrant(rng, size, 2, used);
    const g = pickCellInQuadrant(rng, size, 3, used);
    const robots = { r, y, b, g };
    // ensure target has adjacent wall or boundary; retry a few times else add a wall
    const hasAnyWall = (x, y) => walls[y][x].u || walls[y][x].r || walls[y][x].d || walls[y][x].l;
    let guard = 0;
    while (!hasAnyWall(target.x, target.y) && guard++ < 200) {
      const cand = distinctPositions(rng, size, 1)[0];
      if (!cand) break;
      target = cand;
    }
    if (!hasAnyWall(target.x, target.y)) {
      if (target.x > 0) addWall(walls, target.x, target.y, 'l');
      else if (target.x < size - 1) addWall(walls, target.x, target.y, 'r');
      else if (target.y > 0) addWall(walls, target.x, target.y, 'u');
      else addWall(walls, target.x, target.y, 'd');
    }
    return { size, walls, robots, target: { x: target.x, y: target.y, color: targetColor }, markers: [] };
  }
  return createClassicBoardFromSeed(rng, size);
}

export function addHardFeatures(rng, board) {
  const size = board.size;
  const walls = board.walls;
  const cellHasAnyWall = (x, y) => walls[y][x].u || walls[y][x].r || walls[y][x].d || walls[y][x].l;
  // mirrors: 3~5
  const mirrorCount = 3 + rng.nextInt(3);
  const mirrors = [];
  const used = new Set();
  used.add(`${board.target.x},${board.target.y}`);
  ['r','y','b','g'].forEach(k => used.add(`${board.robots[k].x},${board.robots[k].y}`));
  let guard = 0;
  while (mirrors.length < mirrorCount && guard++ < 5000) {
    const x = rng.nextInt(size), y = rng.nextInt(size);
    // avoid outer boundary rows/cols for mirrors as well
    if (x === 0 || y === 0 || x === size - 1 || y === size - 1) continue;
    // avoid sticking to obstacles: skip cells that have any wall edge
    if (cellHasAnyWall(x, y)) continue;
    if ((x === 7 || x === 8) && (y === 7 || y === 8)) continue;
    const key = `${x},${y}`;
    if (used.has(key)) continue;
    used.add(key);
    const type = rng.nextInt(2) === 0 ? '/' : '\\';
    mirrors.push({ x, y, type });
  }

  // wormholes: single pair
  let a = null, b = null;
  guard = 0;
  while (!a && guard++ < 5000) {
    const x = rng.nextInt(size), y = rng.nextInt(size);
    const key = `${x},${y}`;
    // avoid outer boundary rows/cols
    if (x === 0 || y === 0 || x === size - 1 || y === size - 1) continue;
    // avoid sticking to obstacles
    if (cellHasAnyWall(x, y)) continue;
    if ((x === 7 || x === 8) && (y === 7 || y === 8)) continue;
    if (used.has(key)) continue;
    used.add(key);
    a = { x, y };
  }
  guard = 0;
  while (!b && guard++ < 5000) {
    const x = rng.nextInt(size), y = rng.nextInt(size);
    const key = `${x},${y}`;
    if (x === 0 || y === 0 || x === size - 1 || y === size - 1) continue;
    if (cellHasAnyWall(x, y)) continue;
    if ((x === 7 || x === 8) && (y === 7 || y === 8)) continue;
    if (used.has(key)) continue;
    used.add(key);
    b = { x, y };
  }

  board.mirrors = mirrors;
  board.wormholes = (a && b) ? [a, b] : [];
}

export function initializeState() {
  return {};
}

function isWall(walls, x, y, dir) {
  return walls[y][x][dir];
}

function occupiedByRobot(robots, x, y) {
  return ['r','y','b','g'].some(k => robots[k].x === x && robots[k].y === y);
}

function getMirrorAt(board, x, y) {
  if (!board.mirrors) return null;
  return board.mirrors.find(m => m.x === x && m.y === y) || null;
}

function getWormholeDest(board, x, y) {
  if (!board.wormholes || board.wormholes.length !== 2) return null;
  const [a, b] = board.wormholes;
  if (a.x === x && a.y === y) return b;
  if (b.x === x && b.y === y) return a;
  return null;
}

function turnByMirror(dir, mirrorType) {
  // '/' or '\'
  if (mirrorType === '/') {
    if (dir === 'u') return 'r';
    if (dir === 'r') return 'u';
    if (dir === 'd') return 'l';
    if (dir === 'l') return 'd';
  } else { // '\'
    if (dir === 'u') return 'l';
    if (dir === 'l') return 'u';
    if (dir === 'd') return 'r';
    if (dir === 'r') return 'd';
  }
  return dir;
}

function slideUntilStop(board, fromX, fromY, dir) {
  const { size, walls, robots } = board;
  let x = fromX, y = fromY;
  let currentDir = dir;
  let guard = 0;
  while (guard++ < 1000) {
    const d = DIRS[currentDir];
    if (isWall(walls, x, y, currentDir)) break;
    const nx = x + d.dx, ny = y + d.dy;
    if (!inBounds(size, nx, ny)) break;
    if (occupiedByRobot(robots, nx, ny)) break;
    // step into next cell
    x = nx; y = ny;
    // wormhole teleport
    const dest = getWormholeDest(board, x, y);
    if (dest) {
      // If destination occupied, stop before entering wormhole
      if (occupiedByRobot(robots, dest.x, dest.y)) {
        // revert last step
        x -= d.dx; y -= d.dy;
        break;
      }
      x = dest.x; y = dest.y;
    }
    // mirror deflection
    const mirror = getMirrorAt(board, x, y);
    if (mirror) {
      currentDir = turnByMirror(currentDir, mirror.type);
      continue;
    }
  }
  return { x, y };
}

export function moveRobotOne(state, robotKey, dir) {
  const pos = state.robots[robotKey];
  const end = slideUntilStop(state, pos.x, pos.y, dir);
  if (end.x === pos.x && end.y === pos.y) return false;
  state.robots[robotKey] = end;
  return true;
}

export function simulateMoves(state, moves, onStep, delay = 0) {
  // moves: string of pairs like 'ruyl...'
  const steps = [];
  const norm = String(moves).toLowerCase();
  for (let i = 0; i + 1 < norm.length; i += 2) {
    const r = norm[i];
    const d = norm[i + 1];
    if (!'rybg'.includes(r)) continue;
    if (!'urdl'.includes(d)) continue;
    steps.push(r + d);
  }

  if (delay <= 0) {
    steps.forEach((pair, i) => {
      const r = pair[0], d = pair[1];
      moveRobotOne(state, r, d);
      onStep && onStep(state, i, pair);
    });
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let i = 0;
    function tick() {
      if (i >= steps.length) { resolve(); return; }
      const pair = steps[i++];
      const r = pair[0], d = pair[1];
      moveRobotOne(state, r, d);
      onStep && onStep(state, i - 1, pair);
      setTimeout(tick, delay);
    }
    tick();
  });
}


// --------- Proof search (depth-limited) ---------
function robotsKey(robots) {
  // stable order r|y|b|g
  return `r${robots.r.x},${robots.r.y}|y${robots.y.x},${robots.y.y}|b${robots.b.x},${robots.b.y}|g${robots.g.x},${robots.g.y}`;
}

function moveImmutable(board, robots, robotKey, dir) {
  const tmpBoard = { size: board.size, walls: board.walls, robots };
  const from = robots[robotKey];
  const end = slideUntilStop(tmpBoard, from.x, from.y, dir);
  if (end.x === from.x && end.y === from.y) return null;
  const next = {
    r: robots.r, y: robots.y, b: robots.b, g: robots.g
  };
  next[robotKey] = { x: end.x, y: end.y };
  return next;
}

export function findProofWithinDepth(board, maxDepth = 20, timeLimitMs = 700) {
  const start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const targetColor = board.target?.color;
  const targetX = board.target?.x, targetY = board.target?.y;
  if (!targetColor || targetX === undefined) return null;

  const dirs = ['u','r','d','l'];
  const robotOrder = ['r','y','b','g'];
  // Bias target robot first
  const orderedRobots = [targetColor, ...robotOrder.filter(k => k !== targetColor)];

  const visited = new Map(); // key -> minDepth

  function isGoal(robots) {
    const p = robots[targetColor];
    return p.x === targetX && p.y === targetY;
  }

  function timedOut() {
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    return (now - start) > timeLimitMs;
  }

  function dfs(robots, depth, lastRobot, path) {
    if (isGoal(robots)) return path;
    if (depth >= maxDepth) return null;
    if (timedOut()) return null;

    const key = robotsKey(robots);
    const prevDepth = visited.get(key);
    if (prevDepth !== undefined && prevDepth <= depth) return null;
    visited.set(key, depth);

    // generate moves, prefer those that move target robot closer to target
    const candidates = [];
    for (const rk of orderedRobots) {
      for (const d of dirs) {
        const next = moveImmutable(board, robots, rk, d);
        if (!next) continue;
        // optional pruning: avoid no-op repeats is already handled; allow same robot consecutively
        const pos = next[targetColor];
        const heuristic = Math.abs(pos.x - targetX) + Math.abs(pos.y - targetY);
        candidates.push({ rk, d, next, heuristic });
      }
    }
    candidates.sort((a,b) => a.heuristic - b.heuristic);

    for (const c of candidates) {
      const found = dfs(c.next, depth + 1, c.rk, path + c.rk + c.d);
      if (found) return found;
      if (timedOut()) return null;
    }
    return null;
  }

  return dfs(board.robots, 0, null, '') || null;
}


