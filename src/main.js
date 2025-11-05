import { parseUrl, setUrl, buildUrlFromState, getSeedAndMovesFromUrl, sanitizeMoves } from './url.js';
import { XorShift32 } from './random.js';
import { createBoardFromSeed, initializeState, moveRobotOne, simulateMoves, findProofWithinDepth } from './logic.js';
import { Renderer } from './ui.js';

const GRID_SIZE = 16;

const elements = {
  createRoom: document.getElementById('btn-create-room'),
  startProof: document.getElementById('btn-start-proof'),
  copyLink: document.getElementById('btn-copy-link'),
  proofInput: document.getElementById('proof-url-input'),
  playProof: document.getElementById('btn-play-proof'),
  status: document.getElementById('status-text'),
  directionControls: document.getElementById('direction-controls'),
  canvas: document.getElementById('board-canvas'),
  undo: document.getElementById('btn-undo'),
  playerName: document.getElementById('player-name'),
  overlay: document.getElementById('overlay'),
  modalMessage: document.getElementById('modal-message'),
  modalShare: document.getElementById('btn-share-proof'),
  modalClose: document.getElementById('btn-close-modal'),
};

let app = {
  board: null,            // { walls, robots, target }
  seed: null,             // numeric seed
  moves: '',              // proof moves e.g. 'ruyl...'
  proofMode: false,       // whether proof input is enabled
  selectedRobot: null,    // 'r'|'y'|'b'|'g'
  renderer: null,         // canvas renderer
  isReplaying: false,     // prevent input during replay
  mode: 'c',              // 'c' classic, 'r' random
  playerName: '',
  announcedSuccess: false, // prevent duplicate alerts
  proofCount: undefined,
};

function randomSeed() {
  // 32-bit unsigned, avoid 0
  const s = Math.floor(Math.random() * 0xffffffff) >>> 0;
  return s === 0 ? 1 : s;
}

function setupFromUrl() {
  const { seed, moves, mode, name } = getSeedAndMovesFromUrl();
  if (!seed) return false;
  app.seed = seed;
  app.mode = mode || 'c';
  app.playerName = name || '';
  const rng = new XorShift32(seed);
  app.board = createBoardFromSeed(rng, GRID_SIZE, app.mode);
  app.moves = moves || '';
  if (elements.playerName) elements.playerName.value = app.playerName;
  return true;
}

function refreshUrl() {
  const url = buildUrlFromState({ seed: app.seed, moves: app.moves, mode: app.mode, name: app.playerName });
  setUrl(url, true);
  elements.proofInput.value = url;
}

function renderAll() {
  app.renderer.render(app.board, app.selectedRobot);
}

function setStatus(text) {
  elements.status.textContent = text;
}

function updateSuccessUI() {
  const success = hasReachedTarget(app.board);
  app.board.success = success;
  elements.status.parentElement.classList.toggle('success', !!success);
  if (success) {
    setStatus('증명 성공');
  }
}

function showModal(message, { showCopy = true } = {}) {
  if (!elements.overlay) return;
  elements.modalMessage.textContent = message;
  if (elements.modalShare) elements.modalShare.style.display = showCopy ? 'inline-flex' : 'none';
  elements.overlay.classList.remove('hidden');
  elements.overlay.classList.add('show');
}

function hideModal() {
  if (!elements.overlay) return;
  elements.overlay.classList.add('hidden');
  elements.overlay.classList.remove('show');
}

function toggleProofMode(on) {
  app.proofMode = on;
  if (!on) app.selectedRobot = null;
  elements.directionControls.classList.toggle('hidden', !on);
  setStatus(on ? '증명 모드: 로봇 선택 후 방향 입력' : '대기 중');
  renderAll();
}

function onCreateRoom() {
  app.seed = randomSeed();
  const rng = new XorShift32(app.seed);
  // 기본은 클래식 모드. 필요 시 app.mode='r'로 바꿔 랜덤 장애물 모드 사용
  app.mode = 'c';
  app.playerName = (elements.playerName && elements.playerName.value.trim()) || '';
  app.announcedSuccess = false;
  app.board = createBoardFromSeed(rng, GRID_SIZE, app.mode);
  if (!app.board.markers) app.board.markers = [];
  app.moves = '';
  toggleProofMode(false);
  refreshUrl();
  renderAll();
  updateSuccessUI();
  // Asynchronously try to find a 20-step solution (time limited)
  setTimeout(() => {
    const path = findProofWithinDepth(app.board, 20, 800);
    setStatus(path ? '20수 이내 도달 가능' : '20수 이내 도달 여부 미확정');
  }, 0);
}

function onStartProof() {
  if (!app.board) return;
  toggleProofMode(!app.proofMode);
}

function onCopyLink() {
  const url = buildUrlFromState({ seed: app.seed, moves: app.moves, mode: app.mode, name: app.playerName });
  navigator.clipboard.writeText(url).then(() => {
    setStatus('링크를 복사했습니다.');
  }).catch(() => setStatus('클립보드 복사 실패'));
}

function onPlayProof() {
  const urlText = elements.proofInput.value.trim();
  if (!urlText) return;

  const { seed, moves, mode, name } = parseUrl(urlText);
  if (!seed) {
    setStatus('URL에 시드(s)가 없습니다.');
    return;
  }

  app.isReplaying = true;
  toggleProofMode(false);
  app.seed = seed >>> 0;
  app.mode = mode || 'c';
  app.playerName = name || '';
  app.announcedSuccess = false;
  const rng = new XorShift32(app.seed);
  app.board = createBoardFromSeed(rng, GRID_SIZE, app.mode);
  if (!app.board.markers) app.board.markers = [];
  app.moves = '';
  refreshUrl();
  renderAll();

  const delay = 700; // 0.5x slower replay
  simulateMoves(app.board, sanitizeMoves(moves), (stateAfter, i, movePair) => {
    app.board = stateAfter;
    app.moves += movePair;
    // push marker at robot's end position
    const rk = movePair[0];
    const pos = app.board.robots[rk];
    if (!app.board.markers) app.board.markers = [];
    app.board.markers.push({ x: pos.x, y: pos.y, step: i + 1, robot: rk });
    refreshUrl();
    renderAll();
    updateSuccessUI();
    if (hasReachedTarget(app.board) && !app.announcedSuccess) {
      app.announcedSuccess = true;
      app.proofCount = Math.floor((app.moves?.length || 0) / 2);
      const titleName = (app.playerName && app.playerName.trim().length > 0) ? app.playerName : '플레이어';
      document.title = `${titleName}님이 ${app.proofCount}수만에 증명하셨어요!`;
      showModal(`${titleName}님이 증명에 성공했습니다.`, { showCopy: false });
    }
  }, delay).then(() => {
    app.isReplaying = false;
    setStatus('증명 재생 완료');
    // 최종 상태에서도 성공 판정 및 안내 (이름 없으면 기본 문구)
    if (hasReachedTarget(app.board) && !app.announcedSuccess) {
      app.announcedSuccess = true;
      const name = app.playerName && app.playerName.trim().length > 0 ? app.playerName : '플레이어';
      showModal(`${name}님이 증명에 성공했습니다.`, { showCopy: false });
    }
  });
}

function wireInputs() {
  elements.createRoom.addEventListener('click', onCreateRoom);
  elements.startProof.addEventListener('click', onStartProof);
  elements.copyLink.addEventListener('click', onCopyLink);
  elements.playProof.addEventListener('click', onPlayProof);
  elements.undo.addEventListener('click', onUndo);
  if (elements.playerName) {
    elements.playerName.addEventListener('input', () => {
      app.playerName = elements.playerName.value.trim();
      if (app.seed) refreshUrl();
    });
  }
  if (elements.modalClose) elements.modalClose.addEventListener('click', hideModal);
  if (elements.modalShare) elements.modalShare.addEventListener('click', async () => {
    const url = buildUrlFromState({ seed: app.seed, moves: app.moves, mode: app.mode, name: app.playerName, count: app.proofCount });
    const name = app.playerName && app.playerName.trim().length > 0 ? app.playerName : '플레이어';
    const count = app.proofCount ?? Math.floor((app.moves?.length || 0) / 2);
    const title = `${name}님이 ${count}수만에 증명하셨어요!`;
    const text = `${title} \n${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        await navigator.clipboard.writeText(text);
        setStatus('공유 텍스트를 복사했습니다.');
      }
    } catch {
      setStatus('공유 실패');
    }
  });
  if (elements.overlay) elements.overlay.addEventListener('click', (e) => { if (e.target === elements.overlay) hideModal(); });

  // Canvas interactions
  elements.canvas.addEventListener('click', (e) => {
    if (!app.board) return;
    const { offsetX, offsetY } = e;
    const hit = app.renderer.pickCell(offsetX, offsetY);
    if (!hit) return;
    const { x, y } = hit;
    // Select robot if any at that cell when proof mode
    if (app.proofMode) {
      const key = ['r','y','b','g'].find(k => app.board.robots[k].x === x && app.board.robots[k].y === y);
      if (key) {
        app.selectedRobot = key;
        setStatus(`선택됨: ${key.toUpperCase()}`);
        renderAll();
      }
    }
  });

  // Arrow key controls when proof mode
  window.addEventListener('keydown', (e) => {
    if (!app.proofMode || app.isReplaying) return;
    // ignore when typing in inputs
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
    // Undo via Backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      onUndo();
      return;
    }
    if (!app.selectedRobot) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    // Layout-independent physical keys + character keys (EN and KR Dubeolsik)
    const codeMap = { KeyW: 'u', KeyA: 'l', KeyS: 'd', KeyD: 'r' };
    const keyMap = {
      ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r',
      w: 'u', a: 'l', s: 'd', d: 'r',
      'ㅈ': 'u', 'ㅁ': 'l', 'ㄴ': 'd', 'ㅇ': 'r',
    };
    const dir = keyMap[k] || codeMap[e.code];
    if (!dir) return;
    e.preventDefault();
    applyMove(app.selectedRobot, dir);
  });

  // Direction buttons
  elements.directionControls.addEventListener('click', (e) => {
    if (!app.proofMode || app.isReplaying) return;
    const btn = e.target.closest('button[data-dir]');
    if (!btn || !app.selectedRobot) return;
    applyMove(app.selectedRobot, btn.getAttribute('data-dir'));
  });
}

function applyMove(robotKey, dir) {
  const before = JSON.parse(JSON.stringify(app.board));
  const moved = moveRobotOne(before, robotKey, dir);
  if (!moved) {
    setStatus('해당 방향으로 이동할 수 없습니다.');
    return;
  }
  app.board = before;
  app.moves += robotKey + dir;
  if (!app.board.markers) app.board.markers = [];
  const pos = app.board.robots[robotKey];
  app.board.markers.push({ x: pos.x, y: pos.y, step: Math.floor(app.moves.length / 2), robot: robotKey });
  refreshUrl();
  renderAll();
  updateSuccessUI();
  // success check: target color robot reached target
  if (hasReachedTarget(app.board)) {
    app.announcedSuccess = true;
    app.proofCount = Math.floor((app.moves?.length || 0) / 2);
    const url = buildUrlFromState({ seed: app.seed, moves: app.moves, mode: app.mode, name: app.playerName, count: app.proofCount });
    setUrl(url, true);
    document.title = `${(app.playerName && app.playerName.trim()) ? app.playerName : '플레이어'}님이 ${app.proofCount}수만에 증명하셨어요!`;
    showModal('증명 성공! 링크를 공유하세요.', { showCopy: true });
  }
}

function rebuildBoardFromMoves() {
  const rng = new XorShift32(app.seed);
  const rebuilt = createBoardFromSeed(rng, GRID_SIZE, app.mode);
  rebuilt.markers = [];
  if (app.moves && app.moves.length % 2 === 0) {
    simulateMoves(rebuilt, app.moves, (s, i, pair) => {
      const rk = pair[0];
      const pos = s.robots[rk];
      s.markers.push({ x: pos.x, y: pos.y, step: i + 1, robot: rk });
    }, 0);
  }
  app.board = rebuilt;
}

function onUndo() {
  if (!app.proofMode || app.isReplaying) return;
  if (!app.moves || app.moves.length < 2) return;
  // drop last move pair
  app.moves = app.moves.slice(0, app.moves.length - 2);
  rebuildBoardFromMoves();
  refreshUrl();
  setStatus('마지막 이동을 되돌렸습니다.');
  renderAll();
}

function main() {
  app.renderer = new Renderer(elements.canvas, GRID_SIZE);
  wireInputs();

  const ok = setupFromUrl();
  if (!ok) {
    setStatus('초기 설정 없음: "방 만들기"를 눌러 시작하세요.');
  } else {
    setStatus('URL에서 보드를 불러왔습니다.');
    renderAll();
    // If URL already includes moves, show them applied
    if (app.moves && app.moves.length % 2 === 0) {
      const replayState = JSON.parse(JSON.stringify(app.board));
      replayState.markers = [];
      simulateMoves(replayState, app.moves, (s, i, pair) => {
        const rk = pair[0];
        const pos = s.robots[rk];
        s.markers.push({ x: pos.x, y: pos.y, step: i + 1, robot: rk });
        app.renderer.render(s, null);
      }, 0);
      app.board = replayState;
      renderAll();
    }
    elements.proofInput.value = buildUrlFromState({ seed: app.seed, moves: app.moves, mode: app.mode, name: app.playerName });
    updateSuccessUI();
  }
}

function hasReachedTarget(state) {
  if (!state || !state.target) return false;
  const color = state.target.color;
  if (!color) return false;
  const rpos = state.robots[color];
  return rpos && rpos.x === state.target.x && rpos.y === state.target.y;
}

main();


