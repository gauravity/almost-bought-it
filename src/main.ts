import './styles/tokens.css';
import './styles/app.css';
import { WORLD_HEIGHT, WORLD_WIDTH } from './engine/content';
import {
  attemptBuyMacbook,
  createInitialState,
  dismissKeynote,
  getStationPosition,
  interactAtNearestStation,
  playWowRaid,
  rotateOfficeLayout,
  setJoshWalkTarget,
  shipWordPressTicket,
  stackCoupon,
  startGame,
  switchAiProvider,
  tick,
  vibeCodeModularMail,
} from './engine/gameEngine';
import { hitTestWorldStation, renderWorld } from './renderer/worldRenderer';
import {
  HudController,
  queryHudElements,
  setMuteButtonIcon,
  wireGlobalHudButtons,
} from './ui/hud';
import { sound } from './ui/sound';

const state = createInitialState();
const el = queryHudElements();
const hud = new HudController(el);
setMuteButtonIcon(el, sound.isMuted());

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function setupHiDpiCanvas(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = WORLD_WIDTH * dpr;
  canvas.height = WORLD_HEIGHT * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
setupHiDpiCanvas();
window.addEventListener('resize', setupHiDpiCanvas);

// Keyboard input state
const pressed = new Set<string>();

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();

  if (state.status === 'keynote') {
    if (key === ' ' || key === 'enter' || key === 'escape') {
      e.preventDefault();
      dismissKeynote(state);
    }
    return;
  }

  if (state.status !== 'playing') return;

  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
    e.preventDefault();
  }

  pressed.add(key);

  if (e.repeat) return;
  if (key === 'e' || key === ' ') {
    interactAtNearestStation(state);
  } else if (key === 'c') {
    stackCoupon(state);
  } else if (key === 'r') {
    rotateOfficeLayout(state);
  } else if (key === 'q' && state.activeAiProvider !== state.leadingAiProvider) {
    switchAiProvider(state);
  } else if (key === '1') {
    shipWordPressTicket(state);
  } else if (key === '2') {
    vibeCodeModularMail(state);
  } else if (key === '3') {
    playWowRaid(state);
  } else if (key === 'b') {
    attemptBuyMacbook(state);
  } else if (key === 'm') {
    const muted = sound.toggleMute();
    setMuteButtonIcon(el, muted);
  }
});

window.addEventListener('keyup', (e) => {
  pressed.delete(e.key.toLowerCase());
});

// Pointer / Touch click-to-walk & click-to-interact directly on RPG Canvas
canvas.addEventListener('pointerdown', (e) => {
  if (state.status === 'keynote') {
    dismissKeynote(state);
    return;
  }
  if (state.status !== 'playing') return;

  const rect = canvas.getBoundingClientRect();
  const worldX = ((e.clientX - rect.left) / rect.width) * WORLD_WIDTH;
  const worldY = ((e.clientY - rect.top) / rect.height) * WORLD_HEIGHT;

  const hitStation = hitTestWorldStation(state, worldX, worldY);
  if (hitStation) {
    const targetPos = getStationPosition(state, hitStation);
    const distToStation = Math.hypot(state.josh.x - targetPos.x, state.josh.y - targetPos.y);
    if (distToStation < 86) {
      state.nearestStation = hitStation;
      interactAtNearestStation(state);
    } else {
      setJoshWalkTarget(state, targetPos, hitStation);
    }
  } else {
    setJoshWalkTarget(state, { x: worldX, y: worldY }, null);
  }
});

el.btnMute.addEventListener('click', () => {
  const muted = sound.toggleMute();
  setMuteButtonIcon(el, muted);
});

function handleStart(): void {
  startGame(state);
  sound.startMusic();
  hud.resetForNewRun(state);
  hud.sync(state);
}

wireGlobalHudButtons(el, () => state, handleStart);

// Open intro modal on first load using native showModal()
el.introDialog.showModal();

// Main 60fps loop
let lastTs = performance.now();

function frame(now: number): void {
  const dt = Math.min(0.05, (now - lastTs) / 1000);
  lastTs = now;

  let dx = 0;
  let dy = 0;
  if (pressed.has('arrowleft') || pressed.has('a')) dx -= 1;
  if (pressed.has('arrowright') || pressed.has('d')) dx += 1;
  if (pressed.has('arrowup') || pressed.has('w')) dy -= 1;
  if (pressed.has('arrowdown') || pressed.has('s')) dy += 1;

  tick(state, dt, { dx, dy });
  if (state.events.length > 0) {
    sound.playEvents(state.events);
  }
  sound.setMusicState(state.status, state.timeRemaining);

  renderWorld(ctx, state);
  hud.sync(state);

  requestAnimationFrame(frame);
}

renderWorld(ctx, state);
hud.sync(state);
requestAnimationFrame(frame);
