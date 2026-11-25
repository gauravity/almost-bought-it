import {
  AI_PROVIDERS,
  FIXED_STATIONS,
  ROOMS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../engine/content';
import {
  getCurrentOfficeLayout,
  getCurrentTier,
  getEffectivePrice,
  getStationPosition,
} from '../engine/gameEngine';
import type { GameState, Rect, StationId } from '../engine/types';
import {
  createPixelCanvas,
  drawSpriteAt,
  drawSpriteCentered,
  getSpriteBank,
  PX,
  snap2,
} from './pixelArt';

// Track last walk phases to pick neutral idle frame when Josh/Hin stop moving
let lastJoshWalkPhase = -1;
let lastHinPatrolPhase = -1;
let cachedStaticWorld: HTMLCanvasElement | null = null;

function stripEmojis(text: string): string {
  return text
    .replace(/[\u{1F1E6}-\u{1F1FF}]|[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

// -----------------------------------------------------------------------------
// STATIC 16-BIT HOUSE, GARDEN, DRIVEWAY & APPLE STORE ARCHITECTURE (CACHED)
// -----------------------------------------------------------------------------

function drawPixelPlankFloor(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  colors: [string, string, string],
  seamColor: string,
  plankSize: number,
  horizontal: boolean,
): void {
  ctx.fillStyle = colors[0];
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  if (horizontal) {
    let row = 0;
    for (let y = rect.y; y < rect.y + rect.h; y += plankSize) {
      const h = Math.min(plankSize, rect.y + rect.h - y);
      const offset = (row % 2) * 30;
      let col = 0;
      for (let x = rect.x - offset; x < rect.x + rect.w; x += 60) {
        const px = Math.max(rect.x, x);
        const pw = Math.min(rect.x + rect.w, x + 60) - px;
        if (pw > 0) {
          ctx.fillStyle = colors[(row + col) % 3];
          ctx.fillRect(px, y, pw, h);
          ctx.fillStyle = seamColor;
          ctx.fillRect(px, y + h - 2, pw, 2);
          if (x >= rect.x) {
            ctx.fillRect(x, y, 2, h);
          }
          if (pw > 18 && h > 9) {
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.fillRect(px + 6, y + 3, Math.min(20, pw - 12), 3);
          }
        }
        col++;
      }
      row++;
    }
  } else {
    let col = 0;
    for (let x = rect.x; x < rect.x + rect.w; x += plankSize) {
      const w = Math.min(plankSize, rect.x + rect.w - x);
      const offset = (col % 2) * 33;
      let row = 0;
      for (let y = rect.y - offset; y < rect.y + rect.h; y += 66) {
        const py = Math.max(rect.y, y);
        const ph = Math.min(rect.y + rect.h, y + 66) - py;
        if (ph > 0) {
          ctx.fillStyle = colors[(row + col) % 3];
          ctx.fillRect(x, py, w, ph);
          ctx.fillStyle = seamColor;
          ctx.fillRect(x + w - 2, py, 2, ph);
          if (y >= rect.y) {
            ctx.fillRect(x, y, w, 2);
          }
        }
        row++;
      }
      col++;
    }
  }
}

function drawWovenRug(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  base: string,
  border: string,
  inner: string,
  fringe: string,
): void {
  ctx.fillStyle = 'rgba(28, 19, 12, 0.14)';
  ctx.fillRect(x + 3, y + 3, w, h);

  ctx.fillStyle = fringe;
  for (let fy = y + 4; fy < y + h - 4; fy += 6) {
    ctx.fillRect(x - 4, fy, 4, 3);
    ctx.fillRect(x + w, fy, 4, 3);
  }

  ctx.fillStyle = border;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = base;
  ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
  ctx.fillStyle = inner;
  ctx.fillRect(x + 11, y + 11, w - 22, h - 22);
  ctx.fillStyle = base;
  ctx.fillRect(x + 16, y + 16, w - 32, h - 32);

  ctx.fillStyle = inner;
  const corners = [
    [x + 24, y + 24],
    [x + w - 28, y + 24],
    [x + 24, y + h - 28],
    [x + w - 28, y + h - 28],
  ];
  for (const [cx, cy] of corners) {
    ctx.fillRect(cx, cy - 3, 4, 9);
    ctx.fillRect(cx - 3, cy, 10, 3);
  }
}

function drawRedBrickRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  // Mortar base
  ctx.fillStyle = '#d4c3b0';
  ctx.fillRect(x, y, w, h);
  const tones = ['#9d4332', '#b34f3c', '#883728', '#a84936', '#793023', '#b95843'];
  const brickH = 6;
  const brickW = 12;
  let row = 0;
  for (let by = y; by < y + h; by += brickH) {
    const bh = Math.min(brickH - 1, y + h - by);
    const stagger = (row % 2) * 6;
    let col = 0;
    for (let bx = x - stagger; bx < x + w; bx += brickW) {
      const px = Math.max(x, bx);
      const pw = Math.min(x + w, bx + brickW - 1) - px;
      if (pw > 0 && bh > 0) {
        const hash = (row * 17 + col * 31) % 19;
        ctx.fillStyle = tones[(row * 5 + col * 3 + (hash % 3)) % tones.length];
        ctx.fillRect(px, by, pw, bh);
        // Subtle weathered brick highlight or mossy shadow variation
        if (hash === 2 || hash === 11) {
          ctx.fillStyle = 'rgba(255, 224, 194, 0.12)';
          ctx.fillRect(px, by, pw, 1);
        } else if (hash === 7 || hash === 15) {
          ctx.fillStyle = 'rgba(34, 48, 28, 0.22)';
          ctx.fillRect(px, by + bh - 2, Math.min(pw, 5), 2);
        }
      }
      col++;
    }
    row++;
  }
}

function drawFrontBayWindow(ctx: CanvasRenderingContext2D, x: number, w: number): void {
  // White-framed front bay window set into the red-brick south elevation (y = 326..344)
  ctx.fillStyle = '#241812';
  ctx.fillRect(x - 2, 326, w + 4, 18);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(x, 328, w, 14);
  const paneW = Math.floor((w - 10) / 3);
  for (let i = 0; i < 3; i++) {
    const px = x + 3 + i * (paneW + 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(px, 330, paneW, 9);
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(px + 2, 331, Math.max(4, paneW - 8), 3);
  }
  // Stone sill
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(x - 3, 342, w + 6, 3);
}

function drawHouseInteriorDecor(ctx: CanvasRenderingContext2D, bank: ReturnType<typeof getSpriteBank>): void {
  // --- TINY OFFICE NORTH WALL ART (no windows!) ---
  // Framed pixel World of Warcraft sword/crest banner + drop shadow
  ctx.fillStyle = 'rgba(20, 14, 10, 0.22)';
  ctx.fillRect(80, 23, 27, 18);
  drawSpriteCentered(ctx, bank.props.wowBanner, 92, 29);

  // Mini walnut shelf with a boxed Anker GaN charger + spare brick
  ctx.fillStyle = 'rgba(20, 14, 10, 0.2)';
  ctx.fillRect(247, 23, 27, 16);
  drawSpriteCentered(ctx, bank.props.ankerShelf, 259, 29);

  // --- LIVING ROOM DECOR (non-blocking) ---
  // Warm corner floor lamp (x: 352, y: 46)
  ctx.fillStyle = 'rgba(251, 191, 36, 0.16)';
  ctx.beginPath();
  ctx.arc(360, 56, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#78350f';
  ctx.fillRect(357, 46, 6, 16);
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(351, 40, 18, 10);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(351, 48, 18, 2);

  // Plush sage & terracotta L-shaped sofa (x: 356, y: 66)
  ctx.fillStyle = 'rgba(20, 14, 10, 0.24)';
  ctx.fillRect(359, 71, 93, 36);
  ctx.fillRect(359, 71, 39, 74);
  // Crisp baseboard AO under sofa front edge
  ctx.fillStyle = 'rgba(20, 14, 10, 0.14)';
  ctx.fillRect(356, 102, 92, 5);
  ctx.fillRect(356, 140, 38, 5);
  // Sofa dark outline & sage upholstery
  ctx.fillStyle = '#21332b';
  ctx.fillRect(356, 66, 92, 36);
  ctx.fillRect(356, 66, 38, 74);
  // Top back cushion & seats
  ctx.fillStyle = '#4f7766';
  ctx.fillRect(359, 69, 86, 10);
  ctx.fillRect(359, 69, 10, 68);
  ctx.fillStyle = '#64927e';
  ctx.fillRect(369, 79, 25, 20);
  ctx.fillRect(396, 79, 24, 20);
  ctx.fillRect(422, 79, 23, 20);
  ctx.fillRect(369, 101, 22, 36);
  // Terracotta throw pillows
  ctx.fillStyle = '#c85a3c';
  ctx.fillRect(371, 80, 11, 10);
  ctx.fillRect(431, 80, 11, 10);

  // Low wooden coffee table with ceramic mug (x: 472, y: 88)
  ctx.fillStyle = 'rgba(20, 14, 10, 0.2)';
  ctx.fillRect(475, 92, 54, 29);
  ctx.fillStyle = '#3b2416';
  ctx.fillRect(472, 88, 54, 28);
  ctx.fillStyle = '#b68458';
  ctx.fillRect(475, 91, 48, 20);
  ctx.fillStyle = '#6b4226';
  ctx.fillRect(475, 111, 48, 3);
  // Mug & open book on table
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(482, 95, 9, 9);
  ctx.fillStyle = '#451a03';
  ctx.fillRect(485, 97, 4, 4);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(500, 96, 14, 10);

  // Framed family picture on north wall (x: 422, y: 23)
  ctx.fillStyle = '#78350f';
  ctx.fillRect(422, 23, 24, 12);
  ctx.fillStyle = '#fde68a';
  ctx.fillRect(424, 25, 20, 8);
  ctx.fillStyle = '#e11d48';
  ctx.fillRect(428, 27, 4, 4);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(435, 27, 4, 4);

  // Wall-mounted TV & low media console on north living wall (x: 492..598, y: 36..62)
  ctx.fillStyle = '#09090b';
  ctx.fillRect(504, 24, 82, 13);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(507, 26, 76, 9);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(512, 28, 18, 4);

  // Framed sunny coastal Antibes blue sea & palm postcard right beside the TV
  ctx.fillStyle = 'rgba(20, 14, 10, 0.22)';
  ctx.fillRect(597, 23, 30, 15);
  drawSpriteCentered(ctx, bank.props.antibesPostcard, 610, 29);

  // Media console underneath + subtle AO shadow strip
  ctx.fillStyle = 'rgba(20, 14, 10, 0.18)';
  ctx.fillRect(492, 60, 106, 5);
  ctx.fillStyle = '#3b2416';
  ctx.fillRect(492, 38, 106, 22);
  ctx.fillStyle = '#8b5e3c';
  ctx.fillRect(495, 41, 100, 14);
  ctx.fillStyle = '#5c3d28';
  ctx.fillRect(495, 55, 100, 3);

  // Milo's cosy round dark-blue dog bed (x: 422, y: 204)
  ctx.fillStyle = 'rgba(20, 14, 10, 0.2)';
  ctx.fillRect(398, 186, 50, 38);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(396, 182, 52, 40);
  ctx.fillStyle = '#1e3a5f';
  ctx.fillRect(399, 185, 46, 34);
  ctx.fillStyle = '#2c5282';
  ctx.fillRect(402, 187, 40, 28);
  // Plush cream-slate cushion inside
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(406, 192, 32, 20);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(409, 194, 26, 14);

  // Wooden staircase section on left hallway wall (x: 346..390, y: 256..324)
  ctx.fillStyle = '#2d1c12';
  ctx.fillRect(344, 254, 46, 72);
  for (let sy = 257; sy < 322; sy += 11) {
    ctx.fillStyle = '#b68458';
    ctx.fillRect(347, sy, 38, 7);
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(347, sy + 7, 38, 3);
  }
  // Bannister rail along right edge of stairs
  ctx.fillStyle = '#4a2e1b';
  ctx.fillRect(383, 254, 6, 72);
  ctx.fillStyle = '#8b5e3c';
  ctx.fillRect(384, 255, 4, 70);

  // Bookshelf against bottom-right living wall (x: 626..704, y: 294..324)
  ctx.fillStyle = 'rgba(20, 14, 10, 0.22)';
  ctx.fillRect(625, 291, 80, 34);
  ctx.fillStyle = '#3b2416';
  ctx.fillRect(626, 294, 78, 30);
  ctx.fillStyle = '#784c2e';
  ctx.fillRect(629, 297, 72, 22);
  const bookColors = ['#ef4444', '#38bdf8', '#f59e0b', '#10b981', '#a855f7', '#e2e8f0'];
  for (let bx = 633, i = 0; bx < 694; bx += 7, i++) {
    ctx.fillStyle = bookColors[i % bookColors.length];
    ctx.fillRect(bx, 300, 5, 16);
  }

  // Nursery corner mat & wooden cot (x: 624..706, y: 46..122)
  ctx.fillStyle = '#e7f0ea';
  ctx.fillRect(624, 48, 82, 74);
  ctx.fillStyle = '#b9d4c4';
  ctx.fillRect(627, 51, 76, 68);
  ctx.fillStyle = '#f5faf7';
  ctx.fillRect(631, 55, 68, 60);
  // Wooden cot always visible in the nursery corner
  ctx.fillStyle = 'rgba(28, 19, 12, 0.16)';
  ctx.fillRect(638, 66, 60, 32);
  drawSpriteCentered(ctx, bank.props.cot, 666, 76);

  // --- KITCHEN CERAMIC BACKSPLASH, UPPER SPICE SHELF & MUG RAIL ---
  ctx.fillStyle = '#f7f3eb';
  ctx.fillRect(722, 24, 206, 12);
  ctx.fillStyle = '#ded6c8';
  for (let tx = 722; tx < 928; tx += 12) {
    ctx.fillRect(tx, 24, 1, 12);
  }
  ctx.fillRect(722, 29, 206, 1);
  // Subtle ceramic tile specular highlights on backsplash
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  for (let hx = 726; hx < 922; hx += 24) {
    ctx.fillRect(hx, 25, 4, 2);
    ctx.fillRect(hx + 12, 31, 4, 2);
  }

  // Upper spice shelf above sink & mug rail above hob
  ctx.fillStyle = 'rgba(20, 14, 10, 0.2)';
  ctx.fillRect(739, 23, 39, 15);
  drawSpriteCentered(ctx, bank.props.spiceShelf, 758, 29);
  ctx.fillStyle = 'rgba(20, 14, 10, 0.16)';
  ctx.fillRect(803, 23, 45, 13);
  drawSpriteCentered(ctx, bank.props.mugRail, 825, 29);

  // --- KITCHEN L-SHAPED WORKTOP, SINK, HOB/OVEN, KETTLE & FRIDGE ---
  // Crisp ambient occlusion & drop shadow under L-counter + peninsula
  ctx.fillStyle = 'rgba(20, 14, 10, 0.24)';
  ctx.fillRect(724, 42, 206, 56);
  ctx.fillRect(876, 42, 54, 188);
  ctx.fillRect(800, 96, 84, 54);
  ctx.fillStyle = 'rgba(20, 14, 10, 0.13)';
  ctx.fillRect(722, 94, 154, 6);
  ctx.fillRect(798, 146, 84, 6);
  ctx.fillRect(869, 148, 6, 82);

  // Dark walnut frame
  ctx.fillStyle = '#3b2416';
  ctx.fillRect(722, 38, 206, 56);
  ctx.fillRect(874, 38, 54, 188);
  ctx.fillRect(798, 92, 84, 54);

  // Warm timber butcher-block worktop surfaces
  ctx.fillStyle = '#c89666';
  ctx.fillRect(725, 41, 200, 42);
  ctx.fillRect(877, 41, 48, 180);
  ctx.fillRect(801, 95, 78, 42);
  // Subtle wood grain & top highlight
  ctx.fillStyle = '#dfb284';
  ctx.fillRect(725, 41, 200, 4);
  ctx.fillStyle = '#b47f50';
  ctx.fillRect(725, 60, 150, 2);
  ctx.fillRect(801, 114, 78, 2);

  // Cream Shaker cabinet front aprons
  ctx.fillStyle = '#e7e0d3';
  ctx.fillRect(725, 83, 200, 9);
  ctx.fillRect(801, 137, 78, 7);
  ctx.fillStyle = '#b6ada0';
  for (let kx = 732; kx < 918; kx += 24) {
    ctx.fillRect(kx, 86, 4, 3);
  }

  // Recessed stainless sink + chrome tap (top-left of kitchen counter)
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(736, 48, 44, 28);
  ctx.fillStyle = '#475569';
  ctx.fillRect(740, 52, 36, 20);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(756, 43, 5, 11);

  // 4-ring hob & oven (top-middle of kitchen counter)
  ctx.fillStyle = '#18181b';
  ctx.fillRect(796, 46, 54, 32);
  ctx.fillStyle = '#52525b';
  ctx.fillRect(803, 50, 14, 10);
  ctx.fillRect(829, 50, 14, 10);
  ctx.fillRect(803, 64, 14, 10);
  ctx.fillRect(829, 64, 14, 10);
  // Oven door handle on front apron
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(804, 86, 38, 3);

  // Chrome kettle on right counter
  ctx.fillStyle = '#18181b';
  ctx.fillRect(892, 64, 22, 22);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(895, 67, 16, 16);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(895, 77, 16, 6);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(901, 79, 4, 3);

  // Retro sage-cream Fridge-Freezer in bottom-right corner (x: 880..926, y: 230..308)
  ctx.fillStyle = 'rgba(20, 14, 10, 0.24)';
  ctx.fillRect(883, 234, 46, 78);
  ctx.fillStyle = 'rgba(20, 14, 10, 0.14)';
  ctx.fillRect(876, 232, 4, 78);
  ctx.fillStyle = '#24352d';
  ctx.fillRect(880, 230, 46, 78);
  ctx.fillStyle = '#cfe0d6';
  ctx.fillRect(883, 233, 40, 46);
  ctx.fillStyle = '#b9d1c3';
  ctx.fillRect(883, 281, 40, 24);
  // Chrome fridge handles & magnets
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(886, 250, 4, 18);
  ctx.fillRect(886, 286, 4, 12);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(906, 242, 5, 5);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(913, 248, 5, 5);

  // Potted plants inside the house
  drawSpriteCentered(ctx, bank.props.plant, 316, 54);
  drawSpriteCentered(ctx, bank.props.plant, 696, 274);
}

function buildStaticWorldCanvas(): HTMLCanvasElement | null {
  const canvas = createPixelCanvas(WORLD_WIDTH, WORLD_HEIGHT);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;

  const bank = getSpriteBank();

  // 1. Exterior Garden Grass & Street Pavement Base
  ctx.fillStyle = '#34633a';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // Grass tufts across lawn & borders
  for (let gy = 346; gy < 524; gy += 12) {
    for (let gx = 12; gx < 410; gx += 15) {
      const hash = (gx * 7 + gy * 13) % 5;
      ctx.fillStyle = hash === 0 ? '#48824e' : hash === 1 ? '#29502e' : '#3d7042';
      ctx.fillRect(snap2(gx), snap2(gy), 6, 3);
      ctx.fillRect(snap2(gx + 3), snap2(gy - 3), 3, 3);
    }
  }

  // 2. Front Lawn, Porch Path & Brick-Paved Driveway
  const por = ROOMS.porch;
  const drv = ROOMS.driveway;

  // Stone Front Garden Path leading from Front Door (x: 512, y: 344) -> Porch Drop Mat (204, 426)
  const pathStones: [number, number, number, number][] = [
    [456, 354, 48, 28],
    [406, 366, 54, 28],
    [354, 378, 56, 30],
    [302, 390, 56, 30],
    [250, 404, 56, 30],
  ];
  for (const [sx, sy, sw, sh] of pathStones) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
    ctx.fillRect(sx + 2, sy + 3, sw, sh);
    ctx.fillStyle = '#8b8378';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = '#d6cfc2';
    ctx.fillRect(sx + 3, sy + 3, sw - 6, sh - 6);
    ctx.fillStyle = '#c4bcb0';
    ctx.fillRect(sx + 3, sy + sh - 7, sw - 6, 4);
  }

  // Front Porch / HotUKDeals Drop Mat pad at (204, 426)
  const matCx = FIXED_STATIONS.porchParcel.x;
  const matCy = FIXED_STATIONS.porchParcel.y;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
  ctx.fillRect(matCx - 52, matCy - 28, 108, 62);
  ctx.fillStyle = '#78716c';
  ctx.fillRect(matCx - 54, matCy - 30, 108, 62);
  ctx.fillStyle = '#d6d3d1';
  ctx.fillRect(matCx - 50, matCy - 26, 100, 54);
  // Coir doormat centered on porch stoop with subtle fiery-red HUKD woven corner tab
  ctx.fillStyle = '#5c3c20';
  ctx.fillRect(matCx - 42, matCy - 20, 84, 42);
  ctx.fillStyle = '#b98b56';
  ctx.fillRect(matCx - 38, matCy - 16, 76, 34);
  for (let my = matCy - 14; my < matCy + 16; my += 4) {
    for (let mx = matCx - 36; mx < matCx + 36; mx += 6) {
      ctx.fillStyle = ((mx + my) / 2) % 2 === 0 ? '#a67947' : '#ca9c66';
      ctx.fillRect(mx, my, 4, 2);
    }
  }
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(matCx + 20, matCy + 10, 16, 6);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(matCx + 22, matCy + 12, 4, 2);

  // Brick-Paved Driveway (x: 408..656, y: 344..526)
  const drvX = drv.x >= 380 ? drv.x : 408;
  const drvY = drv.y >= 340 ? drv.y : 344;
  const drvW = drv.x >= 380 ? drv.w : 248;
  const drvH = drv.y >= 340 ? drv.h : 182;
  ctx.fillStyle = '#bda99b';
  ctx.fillRect(drvX, drvY, drvW, drvH);
  const drvTones = ['#8f5246', '#7e463b', '#9e5f52', '#703f36'];
  let bRow = 0;
  for (let by = drvY; by < drvY + drvH; by += 10) {
    const bh = Math.min(8, drvY + drvH - by);
    const offset = (bRow % 2) * 9;
    let bCol = 0;
    for (let bx = drvX - offset; bx < drvX + drvW; bx += 18) {
      const px = Math.max(drvX + 4, bx);
      const pw = Math.min(drvX + drvW - 4, bx + 16) - px;
      if (pw > 0 && bh > 0) {
        ctx.fillStyle = drvTones[(bRow * 3 + bCol * 5) % drvTones.length];
        ctx.fillRect(px, by, pw, bh);
      }
      bCol++;
    }
    bRow++;
  }

  // Mossy cobblestone kerbs along both edges of the driveway
  const kerbXs = [drvX - 1, drvX + drvW - 6];
  for (let kSide = 0; kSide < kerbXs.length; kSide++) {
    const kx = kerbXs[kSide];
    ctx.fillStyle = '#334155';
    ctx.fillRect(kx, drvY, 7, drvH);
    let kIdx = 0;
    for (let ky = drvY; ky < drvY + drvH; ky += 14) {
      const kh = Math.min(12, drvY + drvH - ky);
      ctx.fillStyle = kIdx % 2 === 0 ? '#94a3b8' : '#7c8b9e';
      ctx.fillRect(kx + 1, ky + 1, 5, Math.max(2, kh - 1));
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(kx + 1, ky + 1, 4, 2);
      // Tiny moss patches tucked into cobblestone joints
      if ((kIdx + kSide) % 3 === 0) {
        ctx.fillStyle = '#3f7345';
        ctx.fillRect(kx, ky + kh - 2, 4, 3);
        ctx.fillStyle = '#59945d';
        ctx.fillRect(kx + 1, ky + kh - 2, 2, 2);
      } else if ((kIdx + kSide * 2) % 4 === 1) {
        ctx.fillStyle = '#2f5936';
        ctx.fillRect(kx + 3, ky, 4, 3);
      }
      kIdx++;
    }
  }

  // Grey stone High Street pavement between driveway and Apple Store & sleek street curb along bottom edge
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(656, 344, 26, 178);
  for (let py = 346; py < 522; py += 22) {
    ctx.fillStyle = py % 44 === 0 ? '#cbd5e1' : '#b6c2d1';
    ctx.fillRect(658, py, 22, 20);
  }
  // Sleek bevelled street pavement slabs + granite curb + road gutter along bottom edge (y: 520..540)
  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, 520, WORLD_WIDTH, 2);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(0, 522, WORLD_WIDTH, 13);
  for (let px = 0; px < WORLD_WIDTH; px += 30) {
    ctx.fillStyle = (px / 30) % 2 === 0 ? '#cbd5e1' : '#b6c2d1';
    ctx.fillRect(px + 1, 523, 28, 10);
    // Crisp top bevel highlight on each pavement slab
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(px + 1, 522, 28, 2);
  }
  // Curb drop face & sleek street gutter
  ctx.fillStyle = '#475569';
  ctx.fillRect(0, 534, WORLD_WIDTH, 3);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 537, WORLD_WIDTH, 3);

  // 3. High Street Glass-Fronted Apple Store (x: 680..940, y: 354..520)
  const storeX = 680;
  const storeY = 354;
  const storeW = 260;
  const storeH = 166;
  // Store drop shadow onto pavement
  ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
  ctx.fillRect(storeX + 4, storeY + 4, storeW, storeH);

  // Warm light-blonde Apple Store oak flooring inside
  drawPixelPlankFloor(
    ctx,
    { x: storeX + 4, y: storeY + 24, w: storeW - 8, h: storeH - 28 },
    ['#efe0c9', '#e6d4b8', '#f5e8d4'],
    '#cbb698',
    14,
    true,
  );

  // Minimalist back display wall inside store (y: 378..396)
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(storeX + 6, storeY + 24, storeW - 12, 16);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(storeX + 6, storeY + 38, storeW - 12, 3);
  // Subtle framed product displays on back wall
  const displayColors = ['#0284c7', '#7c3aed', '#059669'];
  for (let i = 0; i < 3; i++) {
    const dx = storeX + 42 + i * 68;
    ctx.fillStyle = '#09090b';
    ctx.fillRect(dx, storeY + 26, 26, 11);
    ctx.fillStyle = displayColors[i];
    ctx.fillRect(dx + 2, storeY + 28, 22, 7);
  }

  // Architectural dark-aluminium overhanging fascia roof (y: 354..378)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(storeX - 4, storeY - 2, storeW + 8, 26);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(storeX - 2, storeY, storeW + 4, 22);
  ctx.fillStyle = '#475569';
  ctx.fillRect(storeX - 2, storeY, storeW + 4, 3);
  ctx.fillStyle = '#334155';
  ctx.fillRect(storeX - 2, storeY + 19, storeW + 4, 3);

  // Crisp minimal Apple emblem + "APPLE STORE" signage on fascia
  ctx.save();
  const signCx = storeX + storeW / 2;
  const signCy = storeY + 11;
  // Tiny crisp pixel apple silhouette
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(signCx - 66, signCy - 4, 8, 8);
  ctx.fillRect(signCx - 64, signCy - 7, 3, 2);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 11px Inter, system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('APPLE STORE', signCx + 8, signCy + 0.5);
  ctx.restore();

  // Floor-to-ceiling tinted glass storefront mullions & open double doors on left (x: 680)
  // Top-left & bottom-left glass wall segments around open double doors (y: 416..480)
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(storeX, storeY + 24, 6, 38); // top-left pillar
  ctx.fillRect(storeX, storeY + 126, 6, 40); // bottom-left pillar
  ctx.fillRect(storeX + storeW - 6, storeY + 24, 6, storeH - 24); // right glass frame
  ctx.fillRect(storeX, storeY + storeH - 6, storeW, 6); // bottom glass rail

  // Tinted glass sheen along bottom window panes
  ctx.fillStyle = 'rgba(186, 230, 253, 0.24)';
  ctx.fillRect(storeX + 6, storeY + storeH - 8, storeW - 12, 4);
  // Open glass double door welcome mat on left entrance
  ctx.fillStyle = '#334155';
  ctx.fillRect(storeX + 4, 422, 22, 52);
  ctx.fillStyle = '#475569';
  ctx.fillRect(storeX + 6, 424, 18, 48);
  // Swung-open glass door leaves
  ctx.fillStyle = 'rgba(125, 211, 252, 0.35)';
  ctx.fillRect(storeX - 18, 412, 22, 5);
  ctx.fillRect(storeX - 18, 478, 22, 5);
  ctx.fillStyle = '#334155';
  ctx.fillRect(storeX - 18, 412, 22, 2);
  ctx.fillRect(storeX - 18, 481, 22, 2);

  // 4. House Interior Floors (Office, Living Room, Kitchen — y: 36..332)
  const off = ROOMS.office.w <= 330 ? ROOMS.office : { x: 28, y: 36, w: 312, h: 296 };
  const liv = ROOMS.living.w <= 400 ? ROOMS.living : { x: 340, y: 36, w: 376, h: 296 };
  const kit: Rect = (ROOMS as Record<string, Rect>).kitchen ?? {
    x: 716,
    y: 36,
    w: 216,
    h: 296,
  };
  void por;

  // Office oak floorboards
  drawPixelPlankFloor(
    ctx,
    off,
    ['#b68458', '#a8784e', '#be8d61'],
    '#835a38',
    15,
    true,
  );
  drawWovenRug(ctx, 112, 126, 142, 102, '#39424e', '#262d36', '#64748b', '#cbd5e1');

  // Living Room honey birch floor
  drawPixelPlankFloor(
    ctx,
    liv,
    ['#dfc299', '#d5b78c', '#e6cba4'],
    '#b89668',
    18,
    false,
  );
  drawWovenRug(ctx, 454, 114, 210, 132, '#b5cebd', '#88a893', '#e4efe7', '#f5efe4');

  // Kitchen cream & terracotta checkered stone floor with subtle ceramic tile highlights
  ctx.fillStyle = '#c4b5a3';
  ctx.fillRect(kit.x, kit.y, kit.w, kit.h);
  const tileSz = 18;
  for (let ty = kit.y; ty < kit.y + kit.h; ty += tileSz) {
    for (let tx = kit.x; tx < kit.x + kit.w; tx += tileSz) {
      const colIdx = Math.floor((tx - kit.x) / tileSz);
      const rowIdx = Math.floor((ty - kit.y) / tileSz);
      const even = (colIdx + rowIdx) % 2 === 0;
      const tw = Math.min(tileSz - 1, kit.x + kit.w - tx);
      const th = Math.min(tileSz - 1, kit.y + kit.h - ty);
      ctx.fillStyle = even ? '#efe4d2' : '#c97859';
      ctx.fillRect(tx, ty, tw, th);
      if (tw >= 8 && th >= 8 && (colIdx + rowIdx * 2) % 3 === 0) {
        ctx.fillStyle = even ? 'rgba(255, 255, 255, 0.36)' : 'rgba(255, 232, 214, 0.16)';
        ctx.fillRect(tx + 2, ty + 2, 5, 2);
        ctx.fillRect(tx + 2, ty + 4, 2, 3);
      }
    }
  }

  // 5. Pitched Dark-Slate Roof Overhang (y: 0..24)
  ctx.fillStyle = '#181c24';
  ctx.fillRect(10, 0, 940, 24);
  // Staggered slate tile courses
  const slateTones = ['#28303d', '#313b4b', '#222833'];
  for (let ry = 2; ry < 20; ry += 6) {
    const offset = ((ry / 6) % 2) * 8;
    for (let rx = 12 - offset; rx < 944; rx += 16) {
      const px = Math.max(12, rx);
      const pw = Math.min(948, rx + 15) - px;
      ctx.fillStyle = slateTones[((rx + ry) / 2) % slateTones.length];
      ctx.fillRect(px, ry, pw, 5);
    }
  }
  // Roof ridge & overhanging eaves fascia
  ctx.fillStyle = '#475569';
  ctx.fillRect(12, 0, 936, 3);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(14, 21, 932, 3);

  // North inner plaster wall (y: 24..36) + walnut skirting + layered baseboard AO
  ctx.fillStyle = '#f2e9d8';
  ctx.fillRect(28, 24, 904, 10);
  ctx.fillStyle = '#dfd2bc';
  ctx.fillRect(28, 24, 904, 3);
  ctx.fillStyle = '#4a3222';
  ctx.fillRect(28, 34, 904, 3);
  ctx.fillStyle = 'rgba(20, 14, 10, 0.18)';
  ctx.fillRect(28, 37, 904, 3);
  ctx.fillStyle = 'rgba(20, 14, 10, 0.08)';
  ctx.fillRect(28, 40, 904, 4);

  // Perimeter interior baseboard ambient-occlusion shadow strips (left, right, south walls)
  ctx.fillStyle = 'rgba(20, 14, 10, 0.14)';
  ctx.fillRect(28, 37, 3, 289);
  ctx.fillRect(929, 37, 3, 289);
  ctx.fillRect(28, 323, 434, 3);
  ctx.fillRect(562, 323, 370, 3);
  ctx.fillStyle = 'rgba(20, 14, 10, 0.07)';
  ctx.fillRect(31, 40, 3, 283);
  ctx.fillRect(926, 40, 3, 283);
  ctx.fillRect(31, 319, 431, 4);
  ctx.fillRect(562, 319, 364, 4);

  // 6. Red-Brick Exterior House Walls (Left, Right & South Front Elevation)
  ctx.fillStyle = '#261411';
  ctx.fillRect(15, 22, 13, 324);
  ctx.fillRect(932, 22, 13, 324);
  drawRedBrickRect(ctx, 16, 24, 12, 320);
  drawRedBrickRect(ctx, 932, 24, 12, 320);

  // South front red-brick exterior wall (y: 326..344), leaving Front Door open at x: 462..562
  // Wall top cap (y: 326..330)
  ctx.fillStyle = '#2a1813';
  ctx.fillRect(16, 326, 446, 18);
  ctx.fillRect(562, 326, 382, 18);
  drawRedBrickRect(ctx, 16, 330, 446, 14);
  drawRedBrickRect(ctx, 562, 330, 382, 14);
  // Subtle brick wall shadow onto garden & driveway
  ctx.fillStyle = 'rgba(20, 14, 10, 0.22)';
  ctx.fillRect(16, 344, 446, 4);
  ctx.fillRect(562, 344, 382, 4);

  // Bay & front cottage windows on south brick wall
  drawFrontBayWindow(ctx, 118, 96);
  drawFrontBayWindow(ctx, 586, 96);
  drawFrontBayWindow(ctx, 782, 84);

  // Wooden Front Door (x: 462..562, y: 326..344) with brass handle & stone threshold
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(460, 326, 8, 18);
  ctx.fillRect(556, 326, 8, 18);
  // Warm oak door threshold
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(468, 330, 88, 14);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(468, 344, 88, 10);
  // Slightly ajar oak front door leaf on the left side + brass handle
  ctx.fillStyle = '#4a2e1b';
  ctx.fillRect(468, 322, 10, 22);
  ctx.fillStyle = '#8b5e3c';
  ctx.fillRect(470, 324, 6, 18);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(474, 333, 3, 3);

  // 7. Interior Divider Walls with Wide Doorways / Archway + Baseboard AO on both sides
  // Office / Living divider (x: 336..344, doorway East at y: 152..240)
  ctx.fillStyle = '#231914';
  ctx.fillRect(336, 34, 8, 118);
  ctx.fillRect(336, 240, 8, 90);
  ctx.fillStyle = '#4a3222';
  ctx.fillRect(338, 34, 4, 116);
  ctx.fillRect(338, 242, 4, 86);
  ctx.fillStyle = 'rgba(20, 14, 10, 0.14)';
  ctx.fillRect(332, 38, 4, 114);
  ctx.fillRect(332, 240, 4, 86);
  ctx.fillRect(344, 38, 4, 114);
  ctx.fillRect(344, 240, 4, 86);
  // Oak doorway threshold
  ctx.fillStyle = '#9c6e46';
  ctx.fillRect(336, 152, 8, 88);

  // Living / Kitchen open archway wall (x: 712..720, archway y: 142..252)
  ctx.fillStyle = '#231914';
  ctx.fillRect(712, 34, 8, 108);
  ctx.fillRect(712, 252, 8, 78);
  ctx.fillStyle = '#5c3d28';
  ctx.fillRect(714, 34, 4, 106);
  ctx.fillRect(714, 254, 4, 74);
  ctx.fillStyle = 'rgba(20, 14, 10, 0.13)';
  ctx.fillRect(708, 38, 4, 102);
  ctx.fillRect(708, 254, 4, 72);
  ctx.fillRect(720, 38, 4, 102);
  ctx.fillRect(720, 254, 4, 72);
  // Archway timber pillar trim
  ctx.fillStyle = '#b68458';
  ctx.fillRect(711, 138, 10, 6);
  ctx.fillRect(711, 250, 10, 6);

  // 8. Rich House Interior Furniture & Props
  drawHouseInteriorDecor(ctx, bank);

  // 9. Front Garden Hedge Foundations & Flower/Bush Ground Shadows (top foliage sways dynamically!)
  ctx.fillStyle = '#17311d';
  ctx.fillRect(0, 340, 18, 182);
  ctx.fillRect(0, 506, 404, 16);
  ctx.fillStyle = '#2b5934';
  ctx.fillRect(2, 342, 13, 176);
  ctx.fillRect(2, 508, 398, 11);

  for (const [fx, fy] of FLOWER_SPOTS) {
    ctx.fillStyle = 'rgba(20, 34, 18, 0.28)';
    ctx.fillRect(fx - 12, fy + 6, 24, 6);
  }
  for (const [bx, by] of BUSH_SPOTS) {
    ctx.fillStyle = 'rgba(16, 28, 16, 0.32)';
    ctx.fillRect(bx - 18, by + 10, 36, 7);
  }

  return canvas;
}

const FLOWER_SPOTS: [number, number][] = [
  [48, 362],
  [82, 364],
  [252, 362],
  [292, 364],
  [342, 362],
  [66, 480],
  [130, 486],
  [320, 482],
];

const BUSH_SPOTS: [number, number][] = [
  [36, 428],
  [36, 486],
  [382, 488],
  [382, 366],
  [946, 336],
];

function getStaticWorldCanvas(): HTMLCanvasElement | null {
  if (!cachedStaticWorld) {
    cachedStaticWorld = buildStaticWorldCanvas();
  }
  return cachedStaticWorld;
}

// -----------------------------------------------------------------------------
// ROOM LIGHTING, ANIMATED ATMOSPHERE & DYNAMIC FLOOR PROPS
// -----------------------------------------------------------------------------

function drawAnimatedGarden(ctx: CanvasRenderingContext2D, elapsed: number): void {
  const bank = getSpriteBank();
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Clipped left & bottom garden hedge top leaf clusters gently swaying ±1px
  ctx.fillStyle = '#3f7b49';
  let hIdx = 0;
  for (let hy = 346; hy < 508; hy += 14) {
    const sway = Math.round(Math.sin(elapsed * 1.8 + hIdx * 0.7));
    ctx.fillRect(4 + sway, hy, 8, 6);
    hIdx++;
  }
  for (let hx = 10; hx < 394; hx += 16) {
    const sway = Math.round(Math.sin(elapsed * 1.8 + hIdx * 0.65));
    ctx.fillRect(hx + sway, 509, 10, 5);
    hIdx++;
  }

  // Front-lawn pixel flowers swaying ±1px in a calm rhythmic sine wave
  for (let i = 0; i < FLOWER_SPOTS.length; i++) {
    const [fx, fy] = FLOWER_SPOTS[i];
    const sway = Math.round(Math.sin(elapsed * 2.1 + i * 0.9));
    if (bank.props.flower) {
      ctx.drawImage(
        bank.props.flower,
        snap2(fx - bank.props.flower.width / 2) + sway,
        snap2(fy - bank.props.flower.height / 2),
      );
    }
  }

  // Clipped garden bushes swaying ±1px
  for (let i = 0; i < BUSH_SPOTS.length; i++) {
    const [bx, by] = BUSH_SPOTS[i];
    const sway = Math.round(Math.sin(elapsed * 1.6 + i * 1.15));
    if (bank.props.bush) {
      ctx.drawImage(
        bank.props.bush,
        snap2(bx - bank.props.bush.width / 2) + sway,
        snap2(by - bank.props.bush.height / 2),
      );
    }
  }
  ctx.restore();
}

function drawKettleSteam(ctx: CanvasRenderingContext2D, elapsed: number): void {
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const cycle = (elapsed * 0.62 + i * 0.25) % 1;
    const alpha = Math.sin(cycle * Math.PI) * 0.44;
    if (alpha <= 0.02) continue;
    const sx = snap2(901 + Math.sin(elapsed * 3.1 + i * 1.8) * 3);
    const sy = snap2(62 - cycle * 24);
    ctx.fillStyle = `rgba(248, 250, 252, ${alpha.toFixed(3)})`;
    ctx.fillRect(sx, sy, PX, PX);
    if (cycle > 0.35) {
      ctx.fillStyle = `rgba(226, 232, 240, ${(alpha * 0.7).toFixed(3)})`;
      ctx.fillRect(sx + PX, sy - PX, PX, PX);
    }
  }
  ctx.restore();
}

function drawIndoorDustMotes(ctx: CanvasRenderingContext2D, elapsed: number): void {
  const motes: [number, number, number, number][] = [
    [94, 148, 0.4, 0.0],
    [186, 198, 0.35, 1.4],
    [274, 128, 0.45, 2.7],
    [412, 142, 0.38, 0.8],
    [516, 174, 0.42, 2.1],
    [594, 126, 0.36, 3.5],
    [664, 214, 0.4, 4.2],
    [774, 186, 0.34, 1.9],
    [846, 244, 0.44, 3.1],
  ];
  ctx.save();
  for (let i = 0; i < motes.length; i++) {
    const [bx, by, speed, phase] = motes[i];
    const mx = snap2(bx + Math.sin(elapsed * speed + phase) * 14);
    const my = snap2(by + Math.cos(elapsed * speed * 0.8 + phase * 1.3) * 9);
    const alpha = 0.16 + (Math.sin(elapsed * 1.3 + phase) * 0.5 + 0.5) * 0.22;
    ctx.fillStyle = `rgba(254, 240, 138, ${alpha.toFixed(3)})`;
    ctx.fillRect(mx, my, PX, PX);
  }
  ctx.restore();
}

function drawRoomsAndLighting(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.imageSmoothingEnabled = false;
  const staticWorld = getStaticWorldCanvas();
  if (staticWorld) {
    ctx.drawImage(staticWorld, 0, 0);
  } else {
    ctx.fillStyle = '#34633a';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  // Living Room corner floor lamp: soft pulsing warm golden light pool over sofa & rug
  ctx.save();
  const lampPulse = 0.85 + Math.sin(state.elapsed * 2.6) * 0.15;
  const lampPool = ctx.createRadialGradient(368, 72, 6, 384, 86, 94);
  lampPool.addColorStop(0, `rgba(254, 240, 138, ${(0.24 * lampPulse).toFixed(3)})`);
  lampPool.addColorStop(0.45, `rgba(251, 191, 36, ${(0.14 * lampPulse).toFixed(3)})`);
  lampPool.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = lampPool;
  ctx.beginPath();
  ctx.arc(384, 86, 94, 0, Math.PI * 2);
  ctx.fill();

  // Warm bulb bloom right at the lampshade
  const shadeGlow = ctx.createRadialGradient(360, 46, 2, 360, 46, 22);
  shadeGlow.addColorStop(0, `rgba(254, 249, 195, ${(0.42 * lampPulse).toFixed(3)})`);
  shadeGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = shadeGlow;
  ctx.beginPath();
  ctx.arc(360, 46, 22, 0, Math.PI * 2);
  ctx.fill();

  // Apple Store architectural ceiling spotlight pools
  const spots = [
    [756, 434],
    [830, 438],
    [892, 466],
  ];
  for (let i = 0; i < spots.length; i++) {
    const [sx, sy] = spots[i];
    const spotPulse = 0.9 + Math.sin(state.elapsed * 2.2 + i * 1.1) * 0.1;
    const spotGrad = ctx.createRadialGradient(sx, sy, 4, sx, sy, 48);
    spotGrad.addColorStop(0, `rgba(255, 252, 240, ${(0.25 * spotPulse).toFixed(3)})`);
    spotGrad.addColorStop(1, 'rgba(255, 252, 240, 0)');
    ctx.fillStyle = spotGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, 48, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Breeze-swaying garden & rising kitchen kettle steam
  drawAnimatedGarden(ctx, state.elapsed);
  drawKettleSteam(ctx, state.elapsed);

  // Extra nursery baby gear appears in the nursery corner as Hin's quests get funded
  const bank = getSpriteBank();
  if (state.stats.babyItemsFunded >= 1) {
    ctx.fillStyle = 'rgba(28, 19, 12, 0.16)';
    ctx.fillRect(634, 114, 42, 16);
    drawSpriteCentered(ctx, bank.props.pram, 654, 114);
  }
  if (state.stats.babyItemsFunded >= 2) {
    ctx.fillStyle = '#fbcfe8';
    ctx.fillRect(690, 96, 12, 12);
    ctx.fillStyle = '#f472b6';
    ctx.fillRect(693, 99, 6, 6);
  }
}

// -----------------------------------------------------------------------------
// PIXEL QUEST BADGES & ZELDA RETICLE
// -----------------------------------------------------------------------------

function drawQuestBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  iconOrLabel: HTMLCanvasElement | null | string,
  color: string,
): void {
  const bob = snap2(Math.sin(time * 5.5) * 2);
  const cx = snap2(x);
  const cy = snap2(y + bob);
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = '#1f1610';
  ctx.fillRect(cx - 10, cy - 10, 20, 20);
  ctx.fillStyle = color;
  ctx.fillRect(cx - 8, cy - 8, 16, 16);
  ctx.fillStyle = 'rgba(255,255,255,0.24)';
  ctx.fillRect(cx - 8, cy - 8, 16, 2);

  if (typeof iconOrLabel === 'string') {
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(iconOrLabel, cx, cy + 0.5);
  } else if (iconOrLabel) {
    ctx.drawImage(
      iconOrLabel,
      cx - Math.floor(iconOrLabel.width / 2),
      cy - Math.floor(iconOrLabel.height / 2),
    );
  }
  ctx.restore();
}

function getNearestStationTooltip(state: GameState, station: StationId): string {
  switch (station) {
    case 'desk':
      return 'Desk';
    case 'rotate_office':
      return 'Rotate Office';
    case 'bike_trainer':
      return 'Turbo Trainer';
    case 'anker_corner':
      return `${state.stats.ankerWattsHoarded}W GaN`;
    case 'kettlebell_corner':
      return `${state.stats.kettlebellKgHoarded}kg Iron`;
    case 'hin':
      return state.activeHinQuest ? state.activeHinQuest.title : 'Hin';
    case 'milo':
      return state.milo.moodState === 'chewing' ? 'Save Cable!' : 'Pat Milo';
    case 'biscuits':
      return 'Digestives';
    case 'porch_parcel':
      return state.activeParcel ? `Parcel (-£${state.activeParcel.cost})` : 'Doormat';
    case 'whatsapp_desk':
      return 'WhatsApp';
    case 'driveway_car':
      return state.activeTravel
        ? state.activeTravel.kind === 'antibes'
          ? 'Antibes (£0!)'
          : 'Ormskirk'
        : 'Car';
    case 'apple_pedestal':
      return getCurrentTier(state).chip;
  }
}

function drawRpgTooltip(ctx: CanvasRenderingContext2D, cx: number, y: number, text: string): void {
  ctx.save();
  ctx.font = '700 13px Inter, system-ui, -apple-system, sans-serif';
  const metrics = ctx.measureText(text);
  const w = snap2(metrics.width + 20);
  const h = 24;
  const rx = snap2(Math.max(8, Math.min(WORLD_WIDTH - w - 8, cx - w / 2)));
  const ry = snap2(Math.max(8, y - h));

  // Pixel drop shadow
  ctx.fillStyle = 'rgba(20, 14, 10, 0.42)';
  ctx.fillRect(rx + 3, ry + 3, w, h);
  // Warm walnut border + parchment fill
  ctx.fillStyle = '#231b15';
  ctx.fillRect(rx, ry, w, h);
  ctx.fillStyle = '#fffdf7';
  ctx.fillRect(rx + 3, ry + 3, w - 6, h - 6);

  ctx.fillStyle = '#231b15';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, rx + w / 2, ry + h / 2 + 0.5);
  ctx.restore();
}

function drawNearestStationReticle(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (!state.nearestStation || state.status !== 'playing') return;
  const station = state.nearestStation;
  const layout = getCurrentOfficeLayout(state);

  let box: Rect;
  if (station === 'desk') box = layout.desk;
  else if (station === 'bike_trainer') box = layout.bikeTrainer;
  else if (station === 'anker_corner') box = layout.ankerStation;
  else if (station === 'kettlebell_corner') box = layout.kettlebells;
  else {
    const pos = getStationPosition(state, station);
    if (station === 'driveway_car') {
      box = { x: pos.x - 48, y: pos.y - 26, w: 96, h: 52 };
    } else if (station === 'apple_pedestal') {
      box = { x: pos.x - 44, y: pos.y - 30, w: 88, h: 60 };
    } else if (station === 'hin') {
      box = { x: pos.x - 24, y: pos.y - 36, w: 48, h: 72 };
    } else {
      box = { x: pos.x - 32, y: pos.y - 28, w: 64, h: 56 };
    }
  }

  const pulse = snap2(Math.sin(state.elapsed * 7) * 3);
  const x1 = snap2(box.x - 6 - pulse);
  const y1 = snap2(box.y - 6 - pulse);
  const x2 = snap2(box.x + box.w + 6 + pulse);
  const y2 = snap2(box.y + box.h + 6 + pulse);
  const arm = 12;

  ctx.save();
  const drawBracketSet = (color: string, offset: number) => {
    ctx.fillStyle = color;
    // Top-left
    ctx.fillRect(x1 + offset, y1 + offset, arm, PX);
    ctx.fillRect(x1 + offset, y1 + offset, PX, arm);
    // Top-right
    ctx.fillRect(x2 - arm + offset, y1 + offset, arm, PX);
    ctx.fillRect(x2 - PX + offset, y1 + offset, PX, arm);
    // Bottom-left
    ctx.fillRect(x1 + offset, y2 - PX + offset, arm, PX);
    ctx.fillRect(x1 + offset, y2 - arm + offset, PX, arm);
    // Bottom-right
    ctx.fillRect(x2 - arm + offset, y2 - PX + offset, arm, PX);
    ctx.fillRect(x2 - PX + offset, y2 - arm + offset, PX, arm);
  };

  drawBracketSet('#451a03', 2);
  drawBracketSet('#fbbf24', 0);
  ctx.restore();

  const tooltip = getNearestStationTooltip(state, station);
  drawRpgTooltip(ctx, box.x + box.w / 2, y1 - 4, tooltip);
}

// -----------------------------------------------------------------------------
// 3/4 PIXEL FURNITURE & STATIONS (SCALED FOR PX = 3)
// -----------------------------------------------------------------------------

function drawDesk(ctx: CanvasRenderingContext2D, r: Rect, state: GameState): void {
  const provider = AI_PROVIDERS[state.activeAiProvider];
  const horizontal = r.w >= r.h;
  const x = snap2(r.x);
  const y = snap2(r.y);
  const w = snap2(r.w);
  const h = snap2(r.h);
  const cx = snap2(x + w / 2);
  const cy = snap2(y + h / 2);
  const aiColor =
    state.wowLockRemaining > 0 || state.wowAlertActive ? '#8b5cf6' : provider.accentColor;

  const glowAlpha = 0.11 + Math.sin(state.elapsed * 3.1) * 0.045;
  const flickerOn = Math.sin(state.elapsed * 13.5) > 0.25;
  const activeCodeLine = Math.floor(state.elapsed * 3.8) % 3;

  ctx.save();
  // Animated subtle monitor glow pool
  ctx.fillStyle = `rgba(56, 189, 248, ${glowAlpha.toFixed(3)})`;
  ctx.fillRect(x - 6, y - 6, w + 12, h + 15);

  // Drop shadow
  ctx.fillStyle = 'rgba(24, 16, 10, 0.25)';
  ctx.fillRect(x + 4, y + 6, w, h);

  // Desk outer walnut outline & oak surface
  ctx.fillStyle = '#332014';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#9e6840';
  ctx.fillRect(x + 3, y + 3, w - 6, h - 12);
  ctx.fillStyle = '#b88258';
  ctx.fillRect(x + 3, y + 3, w - 6, 4);
  ctx.fillStyle = '#855331';
  ctx.fillRect(x + 9, y + 12, Math.max(12, w - 24), 3);
  // 3/4 front vertical apron
  ctx.fillStyle = '#6b4226';
  ctx.fillRect(x + 3, y + h - 9, w - 6, 6);

  if (horizontal) {
    // Monitor 1 (WordPress)
    ctx.fillStyle = '#18181b';
    ctx.fillRect(cx - 48, y + 3, 42, 21);
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(cx - 45, y + 6, 36, 15);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(cx - 42, y + 9, 15, 4);
    ctx.fillRect(cx - 42, y + 15, 27, 3);
    if (flickerOn) {
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(cx - 18, y + 9, 3, 3);
    }
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(cx - 30, y + 24, 9, 3);

    // Monitor 2 (AI / WoW) with blue code-line flicker
    ctx.fillStyle = '#18181b';
    ctx.fillRect(cx + 6, y + 3, 42, 21);
    ctx.fillStyle = aiColor;
    ctx.fillRect(cx + 9, y + 6, 36, 15);
    ctx.fillStyle = 'rgba(255,255,255,0.48)';
    ctx.fillRect(cx + 12, y + 8, 18, 3);
    ctx.fillRect(cx + 12, y + 13, 24, 3);
    // Occasional crisp blue code-line flicker
    if (flickerOn) {
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(cx + 12, y + 8 + activeCodeLine * 4, 21, 3);
    }
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(cx + 24, y + 24, 9, 3);

    // Desk mat + mechanical keyboard + mouse + mug
    ctx.fillStyle = '#27272a';
    ctx.fillRect(cx - 27, y + 27, 54, 14);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(cx - 24, y + 30, 39, 8);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(cx - 21, y + 32, 33, 3);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(cx + 18, y + 30, 6, 8);
    // Coffee mug
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cx + 48, y + 15, 10, 10);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(cx + 51, y + 18, 4, 4);
  } else {
    // Vertical desk orientation
    ctx.fillStyle = '#18181b';
    ctx.fillRect(cx - 18, cy - 44, 21, 38);
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(cx - 15, cy - 41, 15, 32);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(cx - 12, cy - 36, 9, 12);

    ctx.fillStyle = '#18181b';
    ctx.fillRect(cx - 18, cy + 4, 21, 38);
    ctx.fillStyle = aiColor;
    ctx.fillRect(cx - 15, cy + 7, 15, 32);
    ctx.fillStyle = 'rgba(255,255,255,0.48)';
    ctx.fillRect(cx - 12, cy + 12, 8, 16);
    if (flickerOn) {
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(cx - 12, cy + 11 + activeCodeLine * 6, 9, 3);
    }

    ctx.fillStyle = '#27272a';
    ctx.fillRect(cx + 6, cy - 24, 14, 48);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(cx + 9, cy - 20, 8, 38);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cx + 6, cy + 30, 10, 10);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(cx + 9, cy + 33, 4, 4);
  }
  ctx.restore();

  if (state.wowAlertActive) {
    const bank = getSpriteBank();
    drawQuestBadge(ctx, r.x + r.w - 4, r.y + 4, state.elapsed, bank.icons.sword, '#7c3aed');
  }
  if (state.activeAiProvider !== state.leadingAiProvider) {
    drawQuestBadge(
      ctx,
      r.x + 4,
      r.y + 4,
      state.elapsed + 1,
      'AI',
      AI_PROVIDERS[state.leadingAiProvider].accentColor,
    );
  }
}

function drawBikeTrainer(ctx: CanvasRenderingContext2D, r: Rect, state: GameState): void {
  const x = snap2(r.x);
  const y = snap2(r.y);
  const w = snap2(r.w);
  const h = snap2(r.h);
  const horizontal = w >= h;
  const cx = snap2(x + w / 2);
  const cy = snap2(y + h / 2);

  ctx.save();
  // Drop shadow & dark rubber trainer mat
  ctx.fillStyle = 'rgba(20, 14, 10, 0.24)';
  ctx.fillRect(x + 3, y + 6, w, h);
  ctx.fillStyle = '#111827';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  ctx.fillStyle = '#334155';
  ctx.fillRect(x + 3, y + 3, w - 6, 3);

  ctx.translate(cx, cy);
  if (!horizontal) ctx.rotate(Math.PI / 2);

  // Wahoo-style turbo unit & metallic flywheel
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-42, -16, 26, 32);
  ctx.fillStyle = '#475569';
  ctx.fillRect(-39, -13, 20, 26);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-36, -9, 14, 18);
  const spinFlash = state.bikeSpinCooldown > 0 && Math.floor(state.elapsed * 18) % 2 === 0;
  ctx.fillStyle = spinFlash ? '#7dd3fc' : '#0ea5e9';
  ctx.fillRect(-33, -5, 9, 10);

  // Front wheel riser block & tyre
  ctx.fillStyle = '#334155';
  ctx.fillRect(26, -8, 14, 16);
  ctx.fillStyle = '#09090b';
  ctx.fillRect(24, -5, 20, 10);

  // Gravel bike frame (teal-slate)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-28, -5, 56, 10);
  ctx.fillStyle = '#0f766e';
  ctx.fillRect(-25, -3, 50, 6);
  ctx.fillStyle = '#2dd4bf';
  ctx.fillRect(-12, -3, 26, 3);

  // Saddle
  ctx.fillStyle = '#09090b';
  ctx.fillRect(-20, -8, 16, 16);
  ctx.fillStyle = '#292524';
  ctx.fillRect(-17, -5, 10, 10);

  // Flared gravel drop handlebars
  ctx.fillStyle = '#09090b';
  ctx.fillRect(20, -21, 7, 42);
  ctx.fillRect(24, -21, 9, 5);
  ctx.fillRect(24, 16, 9, 5);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(22, -16, 3, 32);

  ctx.restore();

  if (state.officeRotateAnim > 0) {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
    ctx.restore();
  }
}

function drawAnkerStation(ctx: CanvasRenderingContext2D, r: Rect, state: GameState): void {
  const bank = getSpriteBank();
  const x = snap2(r.x);
  const y = snap2(r.y);
  const w = snap2(r.w);
  const h = snap2(r.h);

  ctx.save();
  ctx.fillStyle = 'rgba(20, 14, 10, 0.24)';
  ctx.fillRect(x + 3, y + 6, w, h);
  ctx.fillStyle = '#09090b';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#27272a';
  ctx.fillRect(x + 3, y + 3, w - 6, h - 9);
  ctx.fillStyle = '#18181b';
  ctx.fillRect(x + 3, y + h - 6, w - 6, 3);

  // Coiled cyan braided cable along bottom edge with travelling pulse
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(x + 6, y + h - 9, w - 12, 3);
  const cableSpan = Math.max(6, w - 18);
  const pulseX = snap2(x + 6 + ((state.elapsed * 28) % cableSpan));
  ctx.fillStyle = '#7dd3fc';
  ctx.fillRect(pulseX, y + h - 9, 6, 3);

  const cols = Math.max(2, Math.floor((w - 10) / 22));
  const bricks = Math.min(cols * 2, Math.max(2, Math.floor(state.stats.ankerWattsHoarded / 220) + 1));
  for (let i = 0; i < bricks; i++) {
    const bx = x + 6 + (i % cols) * 22;
    const by = y + 4 + Math.floor(i / cols) * 16;
    if (by + 16 <= y + h) {
      drawSpriteAt(ctx, bank.props.ankerBrick, bx, by);
      // Twinkling cyan status LEDs on each Anker GaN brick
      const ledPhase = Math.sin(state.elapsed * 5.4 + i * 1.9);
      ctx.fillStyle = ledPhase > 0.35 ? '#e0f2fe' : ledPhase > -0.25 ? '#38bdf8' : '#0369a1';
      ctx.fillRect(snap2(bx) + 6, snap2(by) + 6, 3, 3);
      if (ledPhase < -0.1) {
        ctx.fillStyle = '#7dd3fc';
        ctx.fillRect(snap2(bx) + 9, snap2(by) + 6, 3, 3);
      }
    }
  }
  ctx.restore();
}

function drawKettlebells(ctx: CanvasRenderingContext2D, r: Rect, state: GameState): void {
  const bank = getSpriteBank();
  const x = snap2(r.x);
  const y = snap2(r.y);
  const w = snap2(r.w);
  const h = snap2(r.h);

  ctx.save();
  if (state.stats.kettlebellKgHoarded >= 40) {
    ctx.fillStyle = 'rgba(72, 42, 20, 0.55)';
    ctx.fillRect(x - 12, y + 18, 14, 3);
    ctx.fillRect(x + 2, y + 21, 18, 3);
    ctx.fillRect(x + 20, y + 24, 20, 3);
    ctx.fillRect(x + w - 9, y + 15, 18, 3);
  }
  if (state.stats.kettlebellKgHoarded >= 96) {
    ctx.fillStyle = 'rgba(56, 30, 12, 0.65)';
    ctx.fillRect(x + 8, y + h - 3, 24, 3);
    ctx.fillRect(x + 32, y + h, 16, 3);
    ctx.fillRect(x + 48, y + h + 3, 20, 3);
  }

  // Rubber gym mat strip
  ctx.fillStyle = '#18181b';
  ctx.fillRect(x + 3, y + 4, w - 6, h - 8);
  ctx.fillStyle = '#27272a';
  ctx.fillRect(x + 6, y + 7, w - 12, h - 14);

  const cols = Math.max(2, Math.floor((w - 12) / 28));
  const count = Math.min(cols * 2, Math.max(2, Math.floor(state.stats.kettlebellKgHoarded / 24) + 1));
  for (let i = 0; i < count; i++) {
    const kx = x + 18 + (i % cols) * 28;
    const ky = y + 20 + Math.floor(i / cols) * 22;
    if (ky + 10 <= y + h + 4) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(kx - 10, ky + 9, 20, 5);
      drawSpriteCentered(ctx, bank.props.kettlebell, kx, ky);
    }
  }
  ctx.restore();
}

function drawRotateOfficeSpot(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const bank = getSpriteBank();
  ctx.save();
  drawSpriteCentered(ctx, bank.props.rotateTile, x, y);
  const angle = time * 2.4;
  const gx = snap2(x + Math.cos(angle) * 16);
  const gy = snap2(y + Math.sin(angle) * 16);
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(gx, gy, PX, PX);
  ctx.restore();
}

function drawBiscuitTin(ctx: CanvasRenderingContext2D, state: GameState): void {
  const pos = FIXED_STATIONS.biscuits;
  const bank = getSpriteBank();
  ctx.fillStyle = 'rgba(20, 14, 10, 0.24)';
  ctx.fillRect(snap2(pos.x - 27), snap2(pos.y + 12), 56, 8);
  drawSpriteCentered(ctx, bank.props.biscuitTin, pos.x, pos.y);

  if (state.aiBurn >= 60 || state.joshVibe < 45) {
    drawQuestBadge(ctx, pos.x + 28, pos.y - 20, state.elapsed, bank.icons.biscuit, '#b45309');
  }
}

function drawPorchParcel(ctx: CanvasRenderingContext2D, state: GameState): void {
  const pos = FIXED_STATIONS.porchParcel;
  if (!state.activeParcel) return;

  const bank = getSpriteBank();
  const glowPulse = 0.72 + Math.sin(state.elapsed * 5.2) * 0.28;

  ctx.save();
  // Pulsing warm orange deal-glow on the doorstep parcel
  const dealGlow = ctx.createRadialGradient(pos.x, pos.y, 4, pos.x, pos.y, 54);
  dealGlow.addColorStop(0, `rgba(249, 115, 22, ${(0.34 * glowPulse).toFixed(3)})`);
  dealGlow.addColorStop(0.55, `rgba(239, 68, 68, ${(0.14 * glowPulse).toFixed(3)})`);
  dealGlow.addColorStop(1, 'rgba(249, 115, 22, 0)');
  ctx.fillStyle = dealGlow;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 54, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(20, 14, 10, 0.28)';
  ctx.fillRect(snap2(pos.x - 27), snap2(pos.y + 12), 56, 8);
  drawSpriteCentered(ctx, bank.props.parcel, pos.x, pos.y);

  // Crisp fiery-red HOTUKDEALS & HUKD 1420° deal tag on the doorstep drop
  const tagW = 86;
  const tagH = 26;
  const tagX = snap2(pos.x - tagW / 2);
  const tagY = snap2(pos.y + 20);
  ctx.fillStyle = 'rgba(20, 10, 6, 0.45)';
  ctx.fillRect(tagX + 2, tagY + 2, tagW, tagH);
  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(tagX, tagY, tagW, tagH);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(tagX + 2, tagY + 2, tagW - 4, tagH - 4);
  ctx.fillStyle = '#fb923c';
  ctx.fillRect(tagX + 2, tagY + 2, tagW - 4, 2);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 9px Inter, system-ui, sans-serif';
  ctx.fillText('HOTUKDEALS', pos.x, tagY + 9.5);
  ctx.fillStyle = '#fef08a';
  ctx.font = '800 8px Inter, system-ui, sans-serif';
  ctx.fillText('HUKD 1420\u00B0', pos.x, tagY + 19.5);
  ctx.restore();

  drawQuestBadge(ctx, pos.x + 30, pos.y - 22, state.elapsed, bank.icons.exclamation, '#ea580c');
}

function drawWhatsappDesk(ctx: CanvasRenderingContext2D, state: GameState): void {
  const pos = FIXED_STATIONS.whatsappDesk;
  const bank = getSpriteBank();
  ctx.fillStyle = 'rgba(20, 14, 10, 0.24)';
  ctx.fillRect(snap2(pos.x - 30), snap2(pos.y + 12), 62, 8);
  drawSpriteCentered(ctx, bank.props.consoleTable, pos.x, pos.y);

  if (Math.sin(state.elapsed * 4) > 0) {
    ctx.fillStyle = 'rgba(74, 222, 128, 0.45)';
    ctx.fillRect(snap2(pos.x - 18), snap2(pos.y - 10), 14, 10);
  }
}

function drawDrivewayCar(ctx: CanvasRenderingContext2D, state: GameState): void {
  const pos = FIXED_STATIONS.drivewayCar;
  const bank = getSpriteBank();
  ctx.fillStyle = 'rgba(9, 13, 22, 0.36)';
  ctx.fillRect(snap2(pos.x - 42), snap2(pos.y + 18), 86, 10);
  drawSpriteCentered(ctx, bank.props.car, pos.x, pos.y);

  if (state.activeTravel) {
    const trip = state.activeTravel;
    const isAntibes = trip.kind === 'antibes';
    ctx.fillStyle = 'rgba(254, 240, 138, 0.24)';
    ctx.fillRect(snap2(pos.x + 48), snap2(pos.y - 15), 20, 9);
    ctx.fillRect(snap2(pos.x + 48), snap2(pos.y + 3), 20, 9);

    drawQuestBadge(
      ctx,
      pos.x + 42,
      pos.y - 28,
      state.elapsed,
      isAntibes ? bank.icons.plane : bank.icons.car,
      isAntibes ? '#059669' : '#0284c7',
    );
  }
}

function drawApplePedestal(ctx: CanvasRenderingContext2D, state: GameState): void {
  const x = snap2(state.pedestal.x);
  const y = snap2(state.pedestal.y);
  const tier = getCurrentTier(state);
  const eff = getEffectivePrice(state);
  const pulse = 0.72 + Math.sin(state.elapsed * 3.4) * 0.24;
  const bank = getSpriteBank();

  ctx.save();
  // Soft pulsing showroom spotlight halo around the MacBook Pro display table
  const outerHalo = ctx.createRadialGradient(x, y - 4, 12, x, y - 4, 82);
  outerHalo.addColorStop(0, `rgba(255, 252, 240, ${(0.24 * pulse).toFixed(3)})`);
  outerHalo.addColorStop(0.55, `rgba(56, 189, 248, ${(0.22 * pulse).toFixed(3)})`);
  outerHalo.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = outerHalo;
  ctx.beginPath();
  ctx.arc(x, y - 4, 82, 0, Math.PI * 2);
  ctx.fill();

  // Sleek oak Apple Display Table shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.26)';
  ctx.fillRect(x - 40, y - 22, 86, 60);

  // Sleek blonde-oak Apple Display Table (3/4 pixel)
  ctx.fillStyle = '#332418';
  ctx.fillRect(x - 44, y - 28, 88, 56);
  ctx.fillStyle = '#e5c99f';
  ctx.fillRect(x - 41, y - 25, 82, 42);
  ctx.fillStyle = '#f3dfc0';
  ctx.fillRect(x - 41, y - 25, 82, 5);
  // Chamfered oak table apron & brushed steel legs
  ctx.fillStyle = '#b99364';
  ctx.fillRect(x - 41, y + 17, 82, 8);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(x - 36, y + 25, 6, 4);
  ctx.fillRect(x + 30, y + 25, 6, 4);

  // Big glowing Space-Black MacBook Pro sprite (60x36 at PX=3)
  drawSpriteCentered(ctx, bank.props.macbook, x, y - 6);
  ctx.restore();

  // Crisp price tag directly beneath the display table
  ctx.save();
  const hasCoupons = state.stackedCoupons.length > 0;
  const label = hasCoupons
    ? `${tier.chip} • £${eff.toLocaleString()} (${state.stackedCoupons.length})`
    : `${tier.chip} • £${tier.rrp.toLocaleString()}`;
  ctx.font = '700 12px Inter, system-ui, sans-serif';
  const tw = snap2(ctx.measureText(label).width + 18);
  const tx = snap2(x - tw / 2);
  const ty = snap2(y + 32);
  ctx.fillStyle = 'rgba(9, 9, 11, 0.45)';
  ctx.fillRect(tx + 3, ty + 3, tw, 22);
  ctx.fillStyle = hasCoupons ? '#065f46' : '#18181b';
  ctx.fillRect(tx, ty, tw, 22);
  ctx.strokeStyle = hasCoupons ? '#34d399' : '#52525b';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(tx + 0.5, ty + 0.5, tw - 1, 21);
  ctx.fillStyle = hasCoupons ? '#ecfdf5' : '#f4f4f5';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, ty + 11.5);
  ctx.restore();
}

function drawAppleStoreGlamour(ctx: CanvasRenderingContext2D, elapsed: number): void {
  // Periodic sleek diagonal white glass reflection shimmer sweeping across storefront
  const cycle = (elapsed % 4.6) / 1.25;
  if (cycle > 1) return;

  const storeX = 684;
  const storeY = 378;
  const storeW = 250;
  const storeH = 136;
  const sweepX = storeX - 70 + cycle * (storeW + 140);

  ctx.save();
  ctx.beginPath();
  ctx.rect(storeX, storeY, storeW, storeH);
  ctx.clip();

  // Primary sleek white diagonal reflection band
  ctx.fillStyle = 'rgba(255, 255, 255, 0.19)';
  ctx.beginPath();
  ctx.moveTo(sweepX, storeY);
  ctx.lineTo(sweepX + 24, storeY);
  ctx.lineTo(sweepX - 36, storeY + storeH);
  ctx.lineTo(sweepX - 60, storeY + storeH);
  ctx.closePath();
  ctx.fill();

  // Secondary thin ice-blue trailing glass glint
  ctx.fillStyle = 'rgba(224, 242, 254, 0.12)';
  ctx.beginPath();
  ctx.moveTo(sweepX + 32, storeY);
  ctx.lineTo(sweepX + 42, storeY);
  ctx.lineTo(sweepX - 18, storeY + storeH);
  ctx.lineTo(sweepX - 28, storeY + storeH);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// -----------------------------------------------------------------------------
// CHARACTER SPRITES (16-BIT PIXEL ART AT PX = 3)
// -----------------------------------------------------------------------------

function drawHinSprite(ctx: CanvasRenderingContext2D, state: GameState): void {
  const x = snap2(state.hin.x);
  const y = snap2(state.hin.y);
  const bank = getSpriteBank();
  const isPacing = Math.abs(state.hin.patrolPhase - lastHinPatrolPhase) > 0.001;
  lastHinPatrolPhase = state.hin.patrolPhase;
  const frameIdx = isPacing ? Math.floor(state.hin.patrolPhase * 3) % 2 : 0;
  const breathY = !isPacing && Math.sin(state.elapsed * 2.4 + 1.1) > 0.35 ? -1 : 0;

  ctx.save();
  // Ground shadow for 48x72 sprite
  ctx.fillStyle = 'rgba(20, 14, 10, 0.24)';
  ctx.fillRect(x - 15, y + 27, 30, 8);
  drawSpriteCentered(ctx, bank.hin[frameIdx], x, y + breathY);
  ctx.restore();

  if (state.activeHinQuest) {
    drawQuestBadge(
      ctx,
      x + 24,
      y - 32,
      state.elapsed,
      bank.icons.heart,
      '#e11d48',
    );
  }
}

function drawMiloSprite(ctx: CanvasRenderingContext2D, state: GameState): void {
  const x = snap2(state.milo.x);
  const y = snap2(state.milo.y);
  const { moodState, needsPat } = state.milo;
  const bank = getSpriteBank();

  ctx.save();
  // Ground shadow for 42x36 sprite
  ctx.fillStyle = 'rgba(20, 14, 10, 0.22)';
  ctx.fillRect(x - 15, y + 12, 30, 8);

  let sprite: HTMLCanvasElement | null;
  if (moodState === 'chewing') {
    sprite = bank.milo.chewing;
  } else if (moodState === 'antibes') {
    sprite = bank.milo.antibes;
  } else if (moodState === 'stare') {
    sprite = bank.milo.stare;
  } else {
    const blinkCycle = state.elapsed % 4.2;
    if (blinkCycle > 4.05) {
      sprite = bank.milo.blink;
    } else {
      const wagFrame = Math.floor(state.elapsed * 7) % 2;
      sprite = bank.milo.happy[wagFrame];
    }
  }

  drawSpriteCentered(ctx, sprite, x, y);

  // Expressive animated wagging tail tuft
  if (moodState !== 'chewing') {
    const wagRate = needsPat ? 16 : 9;
    const wagStep = Math.sin(state.elapsed * wagRate) > 0 ? -PX : 0;
    ctx.fillStyle = '#1f232b';
    ctx.fillRect(x - 21, y - 3 + wagStep, PX, PX);
    ctx.fillStyle = '#525966';
    ctx.fillRect(x - 18, y - 3 + wagStep, PX, PX);
  }

  // Tiny animated "WOOF" pixel sound-wave lines arcing beside Milo's snout when needsPat is true
  if (needsPat) {
    const barkPulse = (state.elapsed * 2.4) % 1;
    const waveAlpha = barkPulse < 0.8 ? 1 - barkPulse * 0.45 : 0.2;
    const snoutX = snap2(x + 21);
    const snoutY = snap2(y - 3);
    ctx.globalAlpha = waveAlpha;
    // Inner pixel sound-wave arc
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(snoutX + 3, snoutY - 6, PX, PX);
    ctx.fillRect(snoutX + 6, snoutY - 3, PX, PX);
    ctx.fillRect(snoutX + 3, snoutY, PX, PX);
    // Outer pixel sound-wave arc
    if (barkPulse > 0.25) {
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(snoutX + 9, snoutY - 9, PX, PX);
      ctx.fillRect(snoutX + 12, snoutY - 6, PX, PX);
      ctx.fillRect(snoutX + 12, snoutY - 3, PX, PX);
      ctx.fillRect(snoutX + 9, snoutY, PX, PX);
    }
    // Crisp mini "WOOF" label
    ctx.font = '800 8px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#1b1615';
    ctx.lineWidth = 3;
    const woofY = snoutY - 12 - Math.round(barkPulse * 3);
    ctx.strokeText('WOOF', snoutX + 6, woofY);
    ctx.fillStyle = '#fef3c7';
    ctx.fillText('WOOF', snoutX + 6, woofY);
  }
  ctx.restore();

  if (needsPat || moodState === 'chewing') {
    drawQuestBadge(
      ctx,
      x + 22,
      y - 22,
      state.elapsed,
      moodState === 'chewing' ? bank.icons.bolt : bank.icons.paw,
      moodState === 'chewing' ? '#ef4444' : '#f59e0b',
    );
  }
}

function drawJoshSprite(ctx: CanvasRenderingContext2D, state: GameState): void {
  const x = snap2(state.josh.x);
  const y = snap2(state.josh.y);
  const { walkPhase, facing } = state.josh;
  const bank = getSpriteBank();

  const isWalking = Math.abs(walkPhase - lastJoshWalkPhase) > 0.001;
  lastJoshWalkPhase = walkPhase;
  const frameIdx = isWalking ? Math.floor(walkPhase) % 4 : 0;
  const breathY = !isWalking && Math.sin(state.elapsed * 2.8) > 0.35 ? -1 : 0;

  ctx.save();
  // Pixel purple WoW rune circle glow on floor when raid-locked
  if (state.wowLockRemaining > 0) {
    const rad = snap2(28 + Math.sin(state.elapsed * 12) * 3);
    ctx.fillStyle = 'rgba(139, 92, 246, 0.22)';
    ctx.beginPath();
    ctx.arc(x, y + 18, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#ddd6fe';
    ctx.fillRect(x - 3, y + 18 - rad, 6, 6);
    ctx.fillRect(x - 3, y + 18 + rad - 6, 6, 6);
    ctx.fillRect(x - rad, y + 15, 6, 6);
    ctx.fillRect(x + rad - 6, y + 15, 6, 6);
  }

  // Ground shadow for 48x72 sprite
  ctx.fillStyle = 'rgba(20, 14, 10, 0.26)';
  ctx.fillRect(x - 15, y + 27, 30, 8);

  const dirFrames = bank.josh[facing];
  drawSpriteCentered(ctx, dirFrames[frameIdx], x, y + breathY);
  ctx.restore();
}

// -----------------------------------------------------------------------------
// ZELDA / EASTWARD DIALOGUE BOXES, PARTICLES & OVERLAYS
// -----------------------------------------------------------------------------

function drawSpeechBubbles(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const bubble of state.speechBubbles) {
    let anchor = { x: state.josh.x, y: state.josh.y - 50 };
    if (bubble.speaker === 'hin') {
      anchor = { x: state.hin.x, y: state.hin.y - (state.activeHinQuest ? 68 : 50) };
    }
    if (bubble.speaker === 'milo') anchor = { x: state.milo.x, y: state.milo.y - 36 };
    if (bubble.speaker === 'pedestal') anchor = { x: state.pedestal.x, y: state.pedestal.y - 54 };

    ctx.save();
    const cleanText = stripEmojis(bubble.text);
    ctx.font = '700 13px Inter, system-ui, sans-serif';
    const textW = snap2(Math.min(300, ctx.measureText(cleanText).width + 26));
    const boxH = 28;
    const bx = snap2(Math.max(textW / 2 + 10, Math.min(WORLD_WIDTH - textW / 2 - 10, anchor.x)));
    const by = snap2(Math.max(26, anchor.y));
    const left = snap2(bx - textW / 2);
    const top = snap2(by - 16);

    ctx.fillStyle = 'rgba(24, 18, 12, 0.34)';
    ctx.fillRect(left + 3, top + 3, textW, boxH);
    ctx.fillStyle = '#231b15';
    ctx.fillRect(left, top, textW, boxH);
    ctx.fillStyle = '#fffdf7';
    ctx.fillRect(left + 3, top + 3, textW - 6, boxH - 6);

    // Pixel tail pointing toward speaker
    const tailX = snap2(Math.max(left + 10, Math.min(left + textW - 14, anchor.x - 3)));
    ctx.fillStyle = '#231b15';
    ctx.fillRect(tailX - 3, top + boxH, 10, 5);
    ctx.fillStyle = '#fffdf7';
    ctx.fillRect(tailX, top + boxH - 3, 4, 5);

    ctx.fillStyle = '#1c1510';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cleanText, bx, top + boxH / 2 + 0.5, textW - 18);
    ctx.restore();
  }
}

function drawWalkTarget(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (!state.josh.target) return;
  const x = snap2(state.josh.target.x);
  const y = snap2(state.josh.target.y);
  const spread = snap2(8 + Math.sin(state.elapsed * 10) * 3);
  ctx.save();
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(x - spread, y - 3, 5, 5);
  ctx.fillRect(x + spread - 5, y - 3, 5, 5);
  ctx.fillRect(x - 3, y - spread, 5, 5);
  ctx.fillRect(x - 3, y + spread - 5, 5, 5);
  ctx.restore();
}

function drawParticlesAndFloats(ctx: CanvasRenderingContext2D, state: GameState): void {
  const bank = getSpriteBank();
  for (const p of state.particles) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    if (p.kind === 'heart') {
      const sprite = bank.particles.heart;
      if (sprite) {
        ctx.drawImage(
          sprite,
          Math.round(p.x - sprite.width / 2),
          Math.round(p.y - sprite.height / 2),
        );
      }
    } else if (p.kind === 'sword') {
      const sprite = bank.particles.sword;
      if (sprite) {
        ctx.drawImage(
          sprite,
          Math.round(p.x - sprite.width / 2),
          Math.round(p.y - sprite.height / 2),
        );
      }
    } else if (p.kind === 'coin') {
      const sz = Math.max(6, snap2(p.size));
      const px = snap2(p.x);
      const py = snap2(p.y);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(px, py, sz, sz);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(px + 1, py + 1, Math.max(2, sz - 3), Math.max(2, sz - 3));
    } else if (p.kind === 'crumb') {
      const sz = Math.max(PX, snap2(p.size));
      ctx.fillStyle = '#92400e';
      ctx.fillRect(snap2(p.x), snap2(p.y), sz, sz);
    } else if (p.kind === 'spark') {
      const sz = Math.max(PX, snap2(p.size));
      ctx.fillStyle = p.color || '#38bdf8';
      ctx.fillRect(snap2(p.x), snap2(p.y), sz, sz);
    } else {
      ctx.fillStyle = p.color;
      const sz = Math.max(PX, snap2(p.size));
      ctx.fillRect(snap2(p.x), snap2(p.y), sz, sz);
    }
    ctx.restore();
  }

  for (const ft of state.floatingTexts) {
    const cleanText = stripEmojis(ft.text);
    if (!cleanText) continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, ft.life / ft.maxLife + 0.25));
    ctx.font = '800 14px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#18120e';
    ctx.lineWidth = 4.5;
    ctx.strokeText(cleanText, ft.x, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(cleanText, ft.x, ft.y);
    ctx.restore();
  }
}

function drawKeynoteOverlay(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.status !== 'keynote' || !state.keynoteOverlay) return;
  const { tier, remaining, duration } = state.keynoteOverlay;
  const elapsedInKeynote = duration - remaining;
  const progress = Math.max(0, Math.min(1, remaining / Math.max(0.01, duration)));
  const cx = WORLD_WIDTH * 0.41;

  ctx.save();
  // Deep pitch-black cinema fade
  ctx.fillStyle = 'rgba(4, 5, 9, 0.94)';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // Subtle radial metallic sheen
  const grad = ctx.createRadialGradient(
    cx,
    180,
    18,
    cx,
    210,
    360,
  );
  grad.addColorStop(0, 'rgba(56, 189, 248, 0.24)');
  grad.addColorStop(0.5, 'rgba(30, 58, 138, 0.12)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // Crisp Space-Black MacBook Pro hero silhouette
  const heroY = 114;
  roundRectPath(ctx, cx - 72, heroY - 46, 144, 88, 6);
  ctx.fillStyle = '#18181b';
  ctx.fill();
  ctx.strokeStyle = '#52525b';
  ctx.lineWidth = 2;
  ctx.stroke();

  const screenGrad = ctx.createLinearGradient(cx - 64, heroY - 40, cx + 64, heroY + 36);
  screenGrad.addColorStop(0, '#0c4a6e');
  screenGrad.addColorStop(0.5, '#0284c7');
  screenGrad.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = screenGrad;
  ctx.fillRect(cx - 65, heroY - 39, 130, 74);

  // Notch
  ctx.fillStyle = '#09090b';
  ctx.fillRect(cx - 12, heroY - 39, 24, 5);
  // Chip emblem
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(cx - 28, heroY - 14, 56, 24);
  ctx.strokeStyle = 'rgba(186,230,253,0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - 28, heroY - 14, 56, 24);
  ctx.fillStyle = '#e0f2fe';
  ctx.font = '700 11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(tier.chip.toUpperCase(), cx, heroY + 2);

  // Unibody base
  roundRectPath(ctx, cx - 88, heroY + 42, 176, 10, 4);
  ctx.fillStyle = '#27272a';
  ctx.fill();
  ctx.strokeStyle = '#52525b';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Typography
  ctx.textAlign = 'center';
  ctx.fillStyle = '#a1a1aa';
  ctx.font = '700 12px Inter, system-ui, sans-serif';
  ctx.fillText('APPLE SPECIAL EVENT  •  ONE MORE THING', cx, 198);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 38px Inter, system-ui, sans-serif';
  ctx.fillText(tier.name, cx, 246, WORLD_WIDTH * 0.64);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '700 24px Inter, system-ui, sans-serif';
  ctx.fillText(`Starting at £${tier.rrp.toLocaleString()}`, cx, 288);

  ctx.fillStyle = '#d4d4d8';
  ctx.font = '500 15px Inter, system-ui, sans-serif';
  ctx.fillText(tier.tagline, cx, 324, WORLD_WIDTH * 0.62);

  // Sleek high-contrast pill button once duration - remaining >= 0.5
  if (elapsedInKeynote >= 0.5) {
    const pulse = 0.88 + Math.sin(elapsedInKeynote * 4.5) * 0.12;
    const btnW = 290;
    const btnH = 38;
    const btnX = cx - btnW / 2;
    const btnY = 380;

    roundRectPath(ctx, btnX, btnY, btnW, btnH, 19);
    ctx.fillStyle = `rgba(248, 250, 252, ${pulse.toFixed(2)})`;
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#09090b';
    ctx.font = '700 14px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Click or press Space to continue', cx, btnY + btnH / 2 + 0.5);
  }

  // Smooth 12s countdown bar underneath the pill button
  const barW = 280;
  const barX = cx - barW / 2;
  const barY = 436;
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRectPath(ctx, barX, barY, barW, 5, 2.5);
  ctx.fill();
  ctx.fillStyle = '#38bdf8';
  roundRectPath(ctx, barX, barY, Math.max(0, barW * progress), 5, 2.5);
  ctx.fill();

  ctx.restore();
}

function drawCheckoutVetoOverlay(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.status !== 'checkout_trap') return;
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  roundRectPath(ctx, WORLD_WIDTH / 2 - 260, WORLD_HEIGHT / 2 - 110, 520, 220, 18);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#dc2626';
  ctx.font = '800 24px Inter, system-ui, sans-serif';
  ctx.fillText('APPLE PAY DECLINED', WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 42);

  ctx.fillStyle = '#09090b';
  ctx.font = '700 17px Inter, system-ui, sans-serif';
  ctx.fillText('Hin enabled Joint Account Veto on MacBooks.', WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 4);

  ctx.fillStyle = '#e11d48';
  ctx.font = '600 15px Inter, system-ui, sans-serif';
  ctx.fillText(
    'UPDATE: Hin’s waters just broke — redirecting to John Lewis!',
    WORLD_WIDTH / 2,
    WORLD_HEIGHT / 2 + 48,
  );
  ctx.restore();
}

function drawInCanvasBanners(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.collapseBanner) {
    const lines = state.collapseBanner.lines;
    const h = 42 + lines.length * 20;
    ctx.save();
    roundRectPath(ctx, WORLD_WIDTH / 2 - 250, 16, 500, h, 10);
    ctx.fillStyle = 'rgba(127, 29, 29, 0.96)';
    ctx.fill();
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fecaca';
    ctx.font = '800 14px Inter, system-ui, sans-serif';
    ctx.fillText('JOSH MATH COLLAPSED — VOUCHERS REJECTED', WORLD_WIDTH / 2, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 13px Inter, system-ui, sans-serif';
    lines.forEach((line, idx) => {
      ctx.fillText(stripEmojis(line), WORLD_WIDTH / 2, 58 + idx * 19);
    });
    ctx.restore();
  } else if (state.vignetteBanner) {
    const b = state.vignetteBanner;
    const bg = b.kind === 'antibes' ? 'rgba(6, 78, 59, 0.96)' : 'rgba(15, 23, 42, 0.95)';
    ctx.save();
    roundRectPath(ctx, WORLD_WIDTH / 2 - 275, 16, 550, 64, 10);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 14px Inter, system-ui, sans-serif';
    ctx.fillText(stripEmojis(b.title), WORLD_WIDTH / 2, 39);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 13px Inter, system-ui, sans-serif';
    ctx.fillText(stripEmojis(b.subtitle), WORLD_WIDTH / 2, 61, 524);
    ctx.restore();
  }
}

function drawTrimesterSunset(ctx: CanvasRenderingContext2D, timeRemaining: number): void {
  if (timeRemaining >= 35) return;
  const progress = Math.max(0, Math.min(1, (35 - timeRemaining) / 35));
  const washAlpha = 0.14 * progress;
  if (washAlpha <= 0.001) return;

  ctx.save();
  // Warm golden-hour sunset wash over outdoor garden, driveway, street & Apple Store storefront
  ctx.fillStyle = `rgba(234, 88, 12, ${washAlpha.toFixed(4)})`;
  ctx.fillRect(0, 344, WORLD_WIDTH, WORLD_HEIGHT - 344);
  ctx.fillRect(0, 0, 16, 344);
  ctx.fillRect(944, 0, 16, 344);
  ctx.fillRect(16, 0, 928, 24);
  ctx.restore();
}

// -----------------------------------------------------------------------------
// PUBLIC EXPORTS
// -----------------------------------------------------------------------------

export function renderWorld(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  if (state.screenShake > 0) {
    const mag = state.screenShake * 10;
    const ox = Math.sin(state.elapsed * 65) * mag;
    const oy = Math.cos(state.elapsed * 55) * mag;
    ctx.translate(snap2(ox), snap2(oy));
  }

  drawRoomsAndLighting(ctx, state);
  drawWalkTarget(ctx, state);

  // Tiny Rectangular Office dynamic furniture
  const layout = getCurrentOfficeLayout(state);
  drawRotateOfficeSpot(ctx, layout.rotateSpot.x, layout.rotateSpot.y, state.elapsed);
  drawDesk(ctx, layout.desk, state);
  drawBikeTrainer(ctx, layout.bikeTrainer, state);
  drawAnkerStation(ctx, layout.ankerStation, state);
  drawKettlebells(ctx, layout.kettlebells, state);

  // Fixed & Dynamic World Stations
  drawBiscuitTin(ctx, state);
  drawPorchParcel(ctx, state);
  drawWhatsappDesk(ctx, state);
  drawDrivewayCar(ctx, state);
  drawApplePedestal(ctx, state);

  // Characters sorted by Y for crisp 3/4 RPG depth
  const chars = [
    { y: state.hin.y, draw: () => drawHinSprite(ctx, state) },
    { y: state.milo.y, draw: () => drawMiloSprite(ctx, state) },
    { y: state.josh.y, draw: () => drawJoshSprite(ctx, state) },
  ].sort((a, b) => a.y - b.y);
  for (const c of chars) c.draw();

  // Atmospheric layers: drifting indoor dust motes, Apple Store glass shimmer, Trimester 3 sunset
  drawIndoorDustMotes(ctx, state.elapsed);
  drawAppleStoreGlamour(ctx, state.elapsed);
  drawTrimesterSunset(ctx, state.timeRemaining);

  // Golden Zelda reticle + single tooltip above nearest station
  drawNearestStationReticle(ctx, state);

  drawSpeechBubbles(ctx, state);
  drawParticlesAndFloats(ctx, state);
  drawInCanvasBanners(ctx, state);
  drawKeynoteOverlay(ctx, state);
  drawCheckoutVetoOverlay(ctx, state);

  ctx.restore();
}

export function hitTestWorldStation(
  state: GameState,
  worldX: number,
  worldY: number,
): StationId | null {
  const layout = getCurrentOfficeLayout(state);
  const candidates: StationId[] = [
    'desk',
    'rotate_office',
    'bike_trainer',
    'anker_corner',
    'kettlebell_corner',
    'hin',
    'milo',
    'biscuits',
    'porch_parcel',
    'whatsapp_desk',
    'driveway_car',
    'apple_pedestal',
  ];

  const rectMap: Partial<Record<StationId, Rect>> = {
    desk: layout.desk,
    bike_trainer: layout.bikeTrainer,
    anker_corner: layout.ankerStation,
    kettlebell_corner: layout.kettlebells,
  };

  let best: StationId | null = null;
  let bestDist = 56;
  for (const id of candidates) {
    const rect = rectMap[id];
    let d: number;
    if (rect) {
      const clampedX = Math.max(rect.x, Math.min(worldX, rect.x + rect.w));
      const clampedY = Math.max(rect.y, Math.min(worldY, rect.y + rect.h));
      d = Math.hypot(worldX - clampedX, worldY - clampedY);
    } else {
      const pos = getStationPosition(state, id);
      d = Math.hypot(worldX - pos.x, worldY - pos.y);
    }
    if (d < bestDist) {
      bestDist = d;
      best = id;
    }
  }
  return best;
}
