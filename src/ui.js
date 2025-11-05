const COLORS = {
  bg: '#0e1421',
  grid: '#263042',
  wall: '#94a3b8',
  target: '#8b5cf6', // fallback when no color provided
  r: '#f43f5e',
  y: '#f59e0b',
  b: '#3b82f6',
  g: '#22c55e',
  select: '#ffffff',
};

export class Renderer {
  constructor(canvas, gridSize) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gridSize = gridSize;
    this.padding = 24;
    this.pixelRatio = Math.max(1, window.devicePixelRatio || 1);
    window.addEventListener('resize', () => this.resizeToDisplaySize());
    this.resizeToDisplaySize();
  }

  resizeToDisplaySize() {
    const { canvas, pixelRatio } = this;
    const displayWidth = Math.floor(canvas.clientWidth * pixelRatio);
    const displayHeight = Math.floor(canvas.clientHeight * pixelRatio);
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }
  }

  cellGeom(board) {
    const w = this.canvas.width, h = this.canvas.height;
    const size = board.size;
    const pad = this.padding * this.pixelRatio;
    const side = Math.min(w, h) - pad * 2;
    const cell = side / size;
    const originX = Math.floor((w - side) / 2);
    const originY = Math.floor((h - side) / 2);
    return { originX, originY, cell, side };
  }

  clear() {
    const { ctx, canvas } = this;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  render(board, selectedRobotKey) {
    if (!board) return;
    this.resizeToDisplaySize();
    this.clear();
    const g = this.cellGeom(board);
    this.drawGrid(board, g);
    this.drawWalls(board, g);
    this.drawTarget(board, g);
    this.drawRobots(board, g, selectedRobotKey);
    // markers last to ensure they stay visible above robots
    this.drawMarkers(board, g);
  }

  drawGrid(board, g) {
    const { ctx } = this;
    const { originX, originY, side } = g;
    const s = board.size;
    const step = side / s;
    ctx.save();
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1 * this.pixelRatio;
    for (let i = 0; i <= s; i++) {
      const x = Math.round(originX + i * step) + 0.5;
      ctx.beginPath(); ctx.moveTo(x, originY); ctx.lineTo(x, originY + side); ctx.stroke();
      const y = Math.round(originY + i * step) + 0.5;
      ctx.beginPath(); ctx.moveTo(originX, y); ctx.lineTo(originX + side, y); ctx.stroke();
    }
    ctx.restore();
  }

  drawMarkers(board, g) {
    if (!board.markers || board.markers.length === 0) return;
    const { ctx } = this;
    const { originX, originY, cell } = g;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fontSize = Math.max(12, cell * 0.6);
    ctx.font = `bold ${Math.floor(fontSize)}px ui-sans-serif, system-ui, -apple-system, Segoe UI`;
    for (const m of board.markers) {
      const cx = originX + m.x * cell + cell / 2;
      const cy = originY + m.y * cell + cell / 2;
      const r = Math.max(12, cell * 0.36);
      // background badge (subtle, over robots)
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      // number colored by robot
      const colorKey = m.robot || 'target';
      ctx.fillStyle = COLORS[colorKey] || '#ffffff';
      const text = String(m.step);
      // stroke outline for readability on any background
      ctx.lineWidth = Math.max(2, cell * 0.06);
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(text, cx, cy + 0.5);
      ctx.fillText(text, cx, cy + 0.5);
    }
    ctx.restore();
  }

  drawWalls(board, g) {
    const { ctx } = this;
    const { originX, originY, cell } = g;
    ctx.save();
    ctx.strokeStyle = COLORS.wall;
    ctx.lineWidth = Math.max(2, Math.floor(cell * 0.08));
    for (let y = 0; y < board.size; y++) {
      for (let x = 0; x < board.size; x++) {
        const cx = originX + x * cell;
        const cy = originY + y * cell;
        const w = board.walls[y][x];
        // Draw up and left only to avoid duplicates. Down/right will be drawn by neighbor.
        if (w.u) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + cell, cy);
          ctx.stroke();
        }
        if (w.l) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx, cy + cell);
          ctx.stroke();
        }
        // For outermost right and bottom edges, ensure drawn.
        if (x === board.size - 1 && w.r) {
          ctx.beginPath();
          ctx.moveTo(cx + cell, cy);
          ctx.lineTo(cx + cell, cy + cell);
          ctx.stroke();
        }
        if (y === board.size - 1 && w.d) {
          ctx.beginPath();
          ctx.moveTo(cx, cy + cell);
          ctx.lineTo(cx + cell, cy + cell);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  drawTarget(board, g) {
    const { ctx } = this;
    const { originX, originY, cell } = g;
    const { x, y } = board.target;
    const cx = originX + x * cell + cell / 2;
    const cy = originY + y * cell + cell / 2;
    const r = cell * 0.22;
    ctx.save();
    const colorKey = (board.target && board.target.color) ? board.target.color : 'target';
    ctx.fillStyle = COLORS[colorKey] || COLORS.target;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // success highlight ring
    if (board.success) {
      ctx.lineWidth = Math.max(3, cell * 0.1);
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawRobots(board, g, selected) {
    const { ctx } = this;
    const { originX, originY, cell } = g;
    const order = ['r','y','b','g'];
    for (const k of order) {
      const pos = board.robots[k];
      const x = originX + pos.x * cell + cell * 0.1;
      const y = originY + pos.y * cell + cell * 0.1;
      const w = cell * 0.8;
      const h = cell * 0.8;
      ctx.save();
      ctx.fillStyle = COLORS[k];
      const radius = Math.max(4, cell * 0.18);
      roundRect(ctx, x, y, w, h, radius);
      ctx.fill();
      if (selected === k) {
        ctx.lineWidth = Math.max(2, cell * 0.06);
        ctx.strokeStyle = COLORS.select;
        roundRect(ctx, x, y, w, h, radius);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  pickCell(offsetX, offsetY) {
    // Translate canvas CSS pixels to device pixels
    const rect = this.canvas.getBoundingClientRect();
    const xCss = offsetX;
    const yCss = offsetY;
    // offsetX/offsetY are already CSS pixels relative to canvas; compute cell
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const size = this.gridSize;
    const pad = this.padding;
    const side = Math.min(w, h) - pad * 2;
    const originX = Math.floor((w - side) / 2);
    const originY = Math.floor((h - side) / 2);
    if (xCss < originX || yCss < originY || xCss > originX + side || yCss > originY + side) return null;
    const cell = side / size;
    const x = Math.floor((xCss - originX) / cell);
    const y = Math.floor((yCss - originY) / cell);
    return { x, y };
  }
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
}


