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
  const target = candidateTargets.length ? candidateTargets[rng.nextInt(candidateTargets.length)] : { x: 7, y: 7, color: 'r' };

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
    const [target] = distinctPositions(rng, size, 1);
    const targetColor = ['r','y','b','g'][rng.nextInt(4)];
    const used = new Set([`${target.x},${target.y}`]);
    const r = pickCellInQuadrant(rng, size, 0, used);
    const y = pickCellInQuadrant(rng, size, 1, used);
    const b = pickCellInQuadrant(rng, size, 2, used);
    const g = pickCellInQuadrant(rng, size, 3, used);
    const robots = { r, y, b, g };
    return { size, walls, robots, target: { x: target.x, y: target.y, color: targetColor }, markers: [] };
  }
  return createClassicBoardFromSeed(rng, size);
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

function slideUntilStop(board, fromX, fromY, dir) {
  const { size, walls, robots } = board;
  const d = DIRS[dir];
  let x = fromX, y = fromY;
  while (true) {
    if (isWall(walls, x, y, dir)) break; // wall at edge of current cell
    const nx = x + d.dx, ny = y + d.dy;
    if (!inBounds(size, nx, ny)) break;
    if (occupiedByRobot(robots, nx, ny)) break;
    x = nx; y = ny;
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


