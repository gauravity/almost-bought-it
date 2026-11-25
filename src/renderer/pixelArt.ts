// 16-bit Pixel Art Sprite Compiler, Palette & Cached Sprite Bank
// World coordinates are 960x540; every pixel-art cell renders at 3x3 world pixels (320x180 native RPG grid).

export const PX = 3;

export function snap2(v: number): number {
  return Math.round(v / PX) * PX;
}

export function createPixelCanvas(w: number, h: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
  }
  return canvas;
}

export function compilePixelSprite(
  rows: string[],
  palette: Record<string, string>,
  scale = PX,
): HTMLCanvasElement | null {
  const h = rows.length;
  const w = rows.reduce((max, r) => Math.max(max, r.length), 0);
  const canvas = createPixelCanvas(w * scale, h * scale);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return canvas;
}

export function mirrorRows(rows: string[]): string[] {
  return rows.map((row) => row.split('').reverse().join(''));
}

export function drawSpriteCentered(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement | null,
  cx: number,
  cy: number,
): void {
  if (!sprite) return;
  ctx.imageSmoothingEnabled = false;
  const x = snap2(cx - sprite.width / 2);
  const y = snap2(cy - sprite.height / 2);
  ctx.drawImage(sprite, x, y);
}

export function drawSpriteAt(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement | null,
  x: number,
  y: number,
): void {
  if (!sprite) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, snap2(x), snap2(y));
}

// -----------------------------------------------------------------------------
// CHARACTER SPRITES (16x24 -> 48x72 world px)
// -----------------------------------------------------------------------------

const JOSH_PALETTE: Record<string, string> = {
  o: '#1b1615', // warm dark outline
  h: '#2a201c', // espresso hair
  H: '#44352f', // hair highlight
  b: '#3b4252', // headphone band / earcup
  c: '#38bdf8', // studio headphone cyan ring
  s: '#f1c29b', // skin base
  S: '#d49a70', // skin shade
  e: '#161211', // eyes
  k: '#272a33', // charcoal hoodie
  K: '#3b404d', // hoodie shoulder highlight
  d: '#181a20', // hoodie fold / shadow
  w: '#cbd5e1', // hoodie drawstrings
  j: '#1e293b', // dark jeans
  J: '#334155', // jeans highlight
  f: '#e2e8f0', // sneaker sole / toe
  F: '#475569', // sneaker upper
};

const JOSH_DOWN_IDLE = [
  '.....oooooo.....',
  '....oHHHHHHo....',
  '...oHHhhhhHHo...',
  '..obhHHHHHHhbo..',
  '..obhhhhhhhhbo..',
  '..cbohhhhhhobc..',
  '..cbossssssobc..',
  '..oboseSSesobo..',
  '...oossssssoo...',
  '....ooSSSSoo....',
  '...ooKKKKKKoo...',
  '..oKKkkkkkkKKo..',
  '..oKkkwkkwkKko..',
  '..oKkkkkkkkkko..',
  '..odkddddddkdo..',
  '..osodddddodos..',
  '...oookkkkooo...',
  '....ojjoojjo....',
  '....oJJooJJo....',
  '....ojjoojjo....',
  '....oFFooFFo....',
  '....offooffo....',
  '.....oooooo.....',
  '................',
];

const JOSH_DOWN_STEP_L = [
  '................',
  '.....oooooo.....',
  '....oHHHHHHo....',
  '...oHHhhhhHHo...',
  '..obhHHHHHHhbo..',
  '..obhhhhhhhhbo..',
  '..cbohhhhhhobc..',
  '..cbossssssobc..',
  '..oboseSSesobo..',
  '...oossssssoo...',
  '....ooSSSSoo....',
  '...ooKKKKKKoo...',
  '..oKKkkkkkkKKo..',
  '..oKkkwkkwkKko..',
  '..oKkkkkkkkkko..',
  '..odkddddddkdo..',
  '..osodddddodos..',
  '...oookkkkooo...',
  '....ojjoojjo....',
  '....oFFooJJo....',
  '....offoojjo....',
  '.....ooooFFo....',
  '........offo....',
  '................',
];

const JOSH_DOWN_STEP_R = mirrorRows(JOSH_DOWN_STEP_L);

const JOSH_UP_IDLE = [
  '.....oooooo.....',
  '....oHHHHHHo....',
  '...oHHhhhhHHo...',
  '..obHHHHHHHHbo..',
  '..obhhhhhhhhbo..',
  '..cbhhhhhhhhbc..',
  '..cbhhhhhhhhbc..',
  '..obhhhhhhhhbo..',
  '...oohhhhhhoo...',
  '....oKKKKKKo....',
  '...oKKKKKKKKo...',
  '..oKKkkkkkkKKo..',
  '..oKkkkkkkkkKo..',
  '..okkkkkkkkkko..',
  '..okddddddddko..',
  '..osodddddodos..',
  '...oookkkkooo...',
  '....ojjoojjo....',
  '....oJJooJJo....',
  '....ojjoojjo....',
  '....oFFooFFo....',
  '....offooffo....',
  '.....oooooo.....',
  '................',
];

const JOSH_UP_STEP_L = [
  '................',
  '.....oooooo.....',
  '....oHHHHHHo....',
  '...oHHhhhhHHo...',
  '..obHHHHHHHHbo..',
  '..obhhhhhhhhbo..',
  '..cbhhhhhhhhbc..',
  '..cbhhhhhhhhbc..',
  '..obhhhhhhhhbo..',
  '...oohhhhhhoo...',
  '....oKKKKKKo....',
  '...oKKKKKKKKo...',
  '..oKKkkkkkkKKo..',
  '..oKkkkkkkkkKo..',
  '..okkkkkkkkkko..',
  '..okddddddddko..',
  '..osodddddodos..',
  '...oookkkkooo...',
  '....ojjoojjo....',
  '....oFFooJJo....',
  '....offoojjo....',
  '.....ooooFFo....',
  '........offo....',
  '................',
];

const JOSH_UP_STEP_R = mirrorRows(JOSH_UP_STEP_L);

const JOSH_LEFT_IDLE = [
  '.....oooooo.....',
  '....oHHHHHHo....',
  '...oHHhhhhhHo...',
  '...ohhhhhbbbo...',
  '...ohhhbbcbbo...',
  '...ohhhbbcbbo...',
  '...osssobbboo...',
  '...oesSsssooo...',
  '...ossssssso....',
  '....ooSSSSo.....',
  '...ooKKKKKoo....',
  '...oKKkkkkKko...',
  '...oKkkkkkkko...',
  '...oKkkKKkkko...',
  '...odkkssdddo...',
  '....okkoosdo....',
  '....oookkkoo....',
  '.....ojjJjo.....',
  '.....ojjJjo.....',
  '.....ojjjjo.....',
  '.....oFFFFo.....',
  '.....offffo.....',
  '......oooo......',
  '................',
];

const JOSH_LEFT_STEP_A = [
  '................',
  '.....oooooo.....',
  '....oHHHHHHo....',
  '...oHHhhhhhHo...',
  '...ohhhhhbbbo...',
  '...ohhhbbcbbo...',
  '...ohhhbbcbbo...',
  '...osssobbboo...',
  '...oesSsssooo...',
  '...ossssssso....',
  '....ooSSSSo.....',
  '...ooKKKKKoo....',
  '...oKKkkkkKko...',
  '...oKkkkkkkko...',
  '...oKkksskkko...',
  '...odkkddkddo...',
  '....oookkkoo....',
  '....ojjooJjo....',
  '...ojjooojjjo...',
  '...oFFoo..oFFo..',
  '...offo...offo..',
  '....oo.....oo...',
  '................',
  '................',
];

const JOSH_LEFT_STEP_B = [
  '................',
  '.....oooooo.....',
  '....oHHHHHHo....',
  '...oHHhhhhhHo...',
  '...ohhhhhbbbo...',
  '...ohhhbbcbbo...',
  '...ohhhbbcbbo...',
  '...osssobbboo...',
  '...oesSsssooo...',
  '...ossssssso....',
  '....ooSSSSo.....',
  '...ooKKKKKoo....',
  '...oKKkkkkKko...',
  '...oKkkkkkkko...',
  '...oKkkkkssko...',
  '...odkddddddo...',
  '....oookkkoo....',
  '.....oJjojjoo...',
  '....oJjo.ojjo...',
  '....oFFo..oFFo..',
  '....offo..offo..',
  '.....oo....oo...',
  '................',
  '................',
];

// Hin (16x24 -> 48x72)
const HIN_PALETTE: Record<string, string> = {
  o: '#231716',
  h: '#241a18', // dark hair
  H: '#473129', // warm chestnut hair highlight
  s: '#e5b085', // skin
  S: '#c98e63', // skin shade
  e: '#181211', // eyes
  c: '#b91c42', // burgundy cardigan
  C: '#e11d48', // cardigan highlight
  d: '#881337', // cardigan shadow
  b: '#fef3c7', // cream inner blouse
  p: '#27272a', // dark trousers
  t: '#78350f', // warm ankle boots
};

const HIN_IDLE_A = [
  '.....oooooo.....',
  '....oHHHHHHo....',
  '...oHHhhhhHHo...',
  '..ohhHHHHHHhho..',
  '..ohhhhhhhhhho..',
  '..ohhossssohho..',
  '..ohhosSSsohho..',
  '..ohhoseesohho..',
  '..ohhossssohho..',
  '...ohoSSSSoho...',
  '...oCCbbbbCCo...',
  '..oCCccbbccCCo..',
  '..oCccdbbdsCCo..',
  '..occcbbbbccco..',
  '..osocddddcoso..',
  '...ooccccccCo...',
  '....oCCCCCCo....',
  '....oppppppo....',
  '....oppooppo....',
  '....oppooppo....',
  '....ottootto....',
  '....ottootto....',
  '.....oooooo.....',
  '................',
];

const HIN_IDLE_B = [
  '................',
  '.....oooooo.....',
  '....oHHHHHHo....',
  '...oHHhhhhHHo...',
  '..ohhHHHHHHhho..',
  '..ohhhhhhhhhho..',
  '..ohhossssohho..',
  '..ohhosSSsohho..',
  '..ohhoseesohho..',
  '..ohhossssohho..',
  '...ohoSSSSoho...',
  '...oCCbbbbCCo...',
  '..oCCccbbccCCo..',
  '..oCccdbbdsCCo..',
  '..occcbbbbccco..',
  '..osocddddcoso..',
  '...ooccccccCo...',
  '....oCCCCCCo....',
  '....oppppppo....',
  '....oppooppo....',
  '....ottooppo....',
  '.....ooootto....',
  '........oooo....',
  '................',
];

// Milo (14x12 -> 42x36) — adorable small dark-grey fluffy dog
const MILO_PALETTE: Record<string, string> = {
  o: '#1f232b', // soft charcoal outline
  d: '#2c303a', // deep floppy ear / paw
  c: '#3a3f49', // dark charcoal fluff
  m: '#525966', // mid-slate fluff
  h: '#6d7585', // fluffy highlight tuft
  e: '#09090b', // eyes / nose / shades
  g: '#64748b', // sunglasses glint
  t: '#f472b6', // pink happy tongue
  u: '#38bdf8', // glowing cyan Anker USB-C cable
  U: '#0284c7', // cable shade
};

const MILO_HAPPY_A = [
  '......oooo....',
  '..oo.ohmmho...',
  '.ommoohmmhdo..',
  '..oohmmememo..',
  '...ommmmeemo..',
  '.oohmmmmtmo...',
  'omhmmmmmmmo...',
  'ocmmmmmmmmo...',
  'oocccccccco...',
  '..oddo..oddo..',
  '..oooo..oooo..',
  '..............',
];

const MILO_HAPPY_B = [
  '......oooo....',
  '.....ohmmho...',
  '.ooooohmmhdo..',
  'ommooohmmememo',
  '..oohmmmmmeemo',
  '...ommmmtmmo..',
  '..ohmmmmmmmo..',
  '.ocmmmmmmmmo..',
  '.oocccccccco..',
  '..oddo..oddo..',
  '..oooo..oooo..',
  '..............',
];

const MILO_BLINK = [
  '......oooo....',
  '..oo.ohmmho...',
  '.ommoohmmhdo..',
  '..oohmmmmmmo..',
  '...ommdddeeo..',
  '.oohmmmmtmo...',
  'omhmmmmmmmo...',
  'ocmmmmmmmmo...',
  'oocccccccco...',
  '..oddo..oddo..',
  '..oooo..oooo..',
  '..............',
];

const MILO_STARE = [
  '......oooo....',
  '.....ohmmho...',
  '....oohmmhdo..',
  '..ooohmmeeeo..',
  '.ommoommmeeo..',
  '..oohmmmmmmo..',
  '..ohmmmmmmmo..',
  '.ocmmmmmmmmo..',
  '.oocccccccco..',
  '..oddo..oddo..',
  '..oooo..oooo..',
  '..............',
];

const MILO_ANTIBES = [
  '......oooo....',
  '..oo.ohmmho...',
  '.ommoohmmhdo..',
  '..oohmgegeeo..',
  '...ommeeemo...',
  '.oohmmmmtmo...',
  'omhmmmmmmmo...',
  'ocmmmmmmmmo...',
  'oocccccccco...',
  '..oddo..oddo..',
  '..oooo..oooo..',
  '..............',
];

const MILO_CHEWING = [
  '......oooo....',
  '.....ohmmho...',
  '....oohmmhdo..',
  '..ooohmmememo.',
  '.ommoommmeemo.',
  '..oohmmmuUuo..',
  '..ohmmmmmoUUu.',
  '.ocmmmmmmmoUUu',
  '.oocccccccco..',
  '..oddo..oddo..',
  '..oooo..oooo..',
  '..............',
];

// -----------------------------------------------------------------------------
// FURNITURE & WORLD PROPS
// -----------------------------------------------------------------------------

const ANKER_BRICK_ROWS = [
  'ooooooo',
  'oBBbBBo',
  'oBccBBo',
  'obbbbbo',
  'odddddo',
  'ooooooo',
];
const ANKER_BRICK_PALETTE: Record<string, string> = {
  o: '#09090b',
  B: '#3f3f46',
  b: '#27272a',
  d: '#18181b',
  c: '#38bdf8',
};

const KETTLEBELL_ROWS = [
  '...oooo...',
  '..oGGGGoo.',
  '..oG..GGo.',
  '.ooGGGGoo.',
  'oGGHHHHGGo',
  'oGHHHHhhGo',
  'oGhhhhddGo',
  'oGddddddGo',
  '.oddddddo.',
  '..oooooo..',
];
const KETTLEBELL_PALETTE: Record<string, string> = {
  o: '#09090b',
  G: '#3f3f46',
  H: '#71717a',
  h: '#52525b',
  d: '#27272a',
};

const ROTATE_TILE_ROWS = [
  '....oooooooo....',
  '..oobbbbbbbboo..',
  '.obbbWWWWWWbbbo.',
  '.obbWbbbbbbWbbo.',
  'obbWbbWWWWbbWbbo',
  'obWbbWbbbbWbbWbo',
  'obWbbWboobWbbWbo',
  'obWbbWbbbbWbbWbo',
  'obWbbbWWWWbbbWbo',
  'obbWbbbbbbbbWbbo',
  '.obbWWWWWWWWbbo.',
  '.obbbbbbbbbbbbo.',
  '..oobbbbbbbboo..',
  '....oooooooo....',
];
const ROTATE_TILE_PALETTE: Record<string, string> = {
  o: '#5c4028',
  b: '#a67b54',
  W: '#f5e6c8',
};

const BISCUIT_TIN_ROWS = [
  '..oooooooooooooooo..',
  '.oRRRRRRRRRRRRRRRRo.',
  'oRGGGGGGGGGGGGGGGGRo',
  'oRGrrrrrBBBBrrrrrGRo',
  'oRGrrrrBddddBrrrrGRo',
  'oRGrrrrBdCCdBrrrrGRo',
  'oRGrrrrBddddBrrrrGRo',
  'oRGrrrrrBBBBrrrrrGRo',
  'oRGGGGGGGGGGGGGGGGRo',
  'orrrrrrrrrrrrrrrrrro',
  'oddddddddddddddddddo',
  '.oooooooooooooooooo.',
];
const BISCUIT_TIN_PALETTE: Record<string, string> = {
  o: '#29120b',
  R: '#dc2626',
  r: '#991b1b',
  d: '#7f1d1d',
  G: '#fbbf24',
  B: '#d97706',
  C: '#451a03',
};

const PARCEL_ROWS = [
  '.oooooooooooooooooo.',
  'oBBBBBBBBttBBBBBBBBo',
  'oBbbbbbbbTTbbRRRRRBo',
  'oBbbbbbbbTTbbROOORBo',
  'oBbbbbbbbTTbbRRRRRBo',
  'oBbbbbdssssssdbbbbBo',
  'oBbbbbbbddddbbbbbbBo',
  'obbbbbbbbbbbbbbbbbbo',
  'oDDDDDDDDDDDDDDDDDDo',
  'oDDDDDDDDDDDDDDDDDDo',
  '.oooooooooooooooooo.',
];
const PARCEL_PALETTE: Record<string, string> = {
  o: '#3d2410',
  B: '#e6ae6a',
  b: '#d3924c',
  D: '#a66d32',
  t: '#fef3c7',
  T: '#fde68a',
  s: '#1e293b',
  d: '#0f172a',
  R: '#dc2626',
  O: '#fb923c',
};

const COT_ROWS = [
  'oooooooooooooooooooo',
  'oWWwwwwwwwwwwwwwwWWo',
  'oWbbbbbbbbbbbbbbbbWo',
  'oWbbPPPPPqqqqqqqbbWo',
  'oWbbPpppPqqQQqqqbbWo',
  'oWbbPPPPPqqqqqqqbbWo',
  'oWbbQQQQQqqqqqqqbbWo',
  'oWbbbbbbbbbbbbbbbbWo',
  'oWWwWwwWwwWwwWwwWWWo',
  'oddddddddddddddddddo',
  'oooooooooooooooooooo',
];
const COT_PALETTE: Record<string, string> = {
  o: '#3f2a1a',
  W: '#f5e6cc',
  w: '#d9bc94',
  d: '#a68256',
  b: '#fffbeb',
  P: '#ffffff',
  p: '#e2e8f0',
  q: '#a7cbb8',
  Q: '#84b099',
};

const PRAM_ROWS = [
  '....oooooooo....',
  '..ooSSSSSSSSoo..',
  '.oSSssssssssSSo.',
  '.oSssddddddssSo.',
  '.oSsddddddddsSo.',
  '.oSSsccccccsSSo.',
  '..oSSccccccSSo..',
  '..ooMMMMMMMMoo..',
  '.owwo......owwo.',
  '.owwo......owwo.',
  '..oo........oo..',
];
const PRAM_PALETTE: Record<string, string> = {
  o: '#09090b',
  S: '#334155',
  s: '#1e293b',
  d: '#0f172a',
  c: '#475569',
  M: '#94a3b8',
  w: '#18181b',
};

const CONSOLE_TABLE_ROWS = [
  '.oooooooooooooooooooo.',
  'oWWWWWWWWWWWWWWWWWWWWo',
  'oWwwppppppwwwwGGGwwwWo',
  'oWwwpggggpwwwwGggGwwWo',
  'oWwwpggggpwwwwGGGGwwWo',
  'oWwwpggggpwwwwwwwwwwWo',
  'oWwwppppppwwwwBBwwwwWo',
  'oWWWWWWWWWWWWWWWWWWWWo',
  'oddddddddddddddddddddo',
  'odd..dddddddddddd..ddo',
  '.oo................oo.',
];
const CONSOLE_TABLE_PALETTE: Record<string, string> = {
  o: '#23160f',
  W: '#7c4d32',
  w: '#5c3621',
  d: '#3d2214',
  p: '#09090b',
  g: '#22c55e',
  G: '#15803d',
  B: '#fbbf24',
};

const CAR_ROWS = [
  '....oooooooooooooooooooooooo....',
  '..ooSSSSSSSSSSSSSSSSSSSSSSSSoo..',
  '.oSSssssssssssssssssssssssssSSo.',
  'oSSssGGGGGGssRRRRRRssGGssssssSSo',
  'oSssGggggggGsRrrrrRssGgGssssssHo',
  'oSssGggggggGsRrrrrRssGgGssssssHo',
  'oSssGggggggGsRrrrrRssGgGssssssHo',
  'oTssGggggggGsRrrrrRssGgGssssssHo',
  'oTssGggggggGsRrrrrRssGgGssssssHo',
  'oSssGggggggGsRrrrrRssGgGssssssHo',
  'oSssGggggggGsRrrrrRssGgGssssssHo',
  'oSssGggggggGsRrrrrRssGgGssssssHo',
  'oSSssGGGGGGssRRRRRRssGGssssssSSo',
  '.oSSssssssssssssssssssssssssSSo.',
  '..ooSSSSSSSSSSSSSSSSSSSSSSSSoo..',
  '....oooBBBBooooooooooBBBBooo....',
];
const CAR_PALETTE: Record<string, string> = {
  o: '#09090b',
  S: '#475569',
  s: '#334155',
  R: '#64748b',
  r: '#475569',
  G: '#94a3b8',
  g: '#cbd5e1',
  H: '#fef08a',
  T: '#ef4444',
  B: '#1e293b',
};

const MACBOOK_ROWS = [
  '.oooooooooooooooooo.',
  'oAAAAAAAAAAAAAAAAAAo',
  'oASSSSSSSnnSSSSSSSAo',
  'oASccccccnnccccccSAo',
  'oASccCCCCccCCCCccSAo',
  'oASccccccccccccccSAo',
  'oASSSSSSSSSSSSSSSSAo',
  'oAAAAAAAAAAAAAAAAAAo',
  'oKKKKKKKKKKKKKKKKKKo',
  'oKkkkkkkkkkkkkkkkkKo',
  'oKkkkkkddddddkkkkkKo',
  '.oooooooooooooooooo.',
];
const MACBOOK_PALETTE: Record<string, string> = {
  o: '#09090b',
  A: '#3f3f46',
  S: '#18181b',
  n: '#000000',
  c: '#0ea5e9',
  C: '#7dd3fc',
  K: '#27272a',
  k: '#18181b',
  d: '#3f3f46',
};

const BUSH_ROWS = [
  '....oooooo....',
  '..ooLLLLLLoo..',
  '.oLLllllllLLo.',
  'oLLllMMMMllLLo',
  'oLllMMmmMMllLo',
  'oLlmMmmmmmllLo',
  'oLmmMMMMmmmddo',
  'oDmmmmmmdddddo',
  '.oDddddddddDo.',
  '..ooDDDDDDoo..',
  '....oooooo....',
];
const BUSH_PALETTE: Record<string, string> = {
  o: '#132418',
  L: '#59945d',
  l: '#3f7345',
  M: '#68a66a',
  m: '#2f5936',
  d: '#203f26',
  D: '#19321f',
};

const PLANT_ROWS = [
  '..oo..oo..',
  '.oLLooLLo.',
  'oLllLLllLo',
  '.oLllllLo.',
  '..oLllLo..',
  '..oGGGGoo.',
  '.oTTTTTTTo',
  '.oTttttTTo',
  '..oTttTTo.',
  '..oTttTTo.',
  '...ooooo..',
];
const PLANT_PALETTE: Record<string, string> = {
  o: '#1b1615',
  L: '#68a66a',
  l: '#3f7345',
  G: '#2f5936',
  T: '#c26d4a',
  t: '#9a4f32',
};

const FLOWER_ROWS = [
  '..oo..oo..',
  '.oYYooPPo.',
  'oYccYoPwwP',
  '.oYYooPPo.',
  '..oGo..oGo',
  '..oGo..oGo',
  '.oLLo.oLLo',
  '..oo...oo.',
];
const FLOWER_PALETTE: Record<string, string> = {
  o: '#1b2e1e',
  Y: '#facc15',
  c: '#fef08a',
  P: '#fb7185',
  w: '#fff1f2',
  G: '#3f7345',
  L: '#59945d',
};

// North-wall pixel art & shelves (compiled at PX = 3)
const WOW_BANNER_ROWS = [
  'oGGGGGGGo',
  'oBbbSbbBo',
  'oBbsSsbBo',
  'oBbgGgbBo',
  '.oBbgbBo.',
  '..ooGoo..',
];
const WOW_BANNER_PALETTE: Record<string, string> = {
  o: '#1b1615',
  G: '#fbbf24',
  g: '#d97706',
  B: '#1d4ed8',
  b: '#1e3a8a',
  S: '#f8fafc',
  s: '#94a3b8',
};

const ANKER_SHELF_ROWS = [
  '.oooooo..',
  'oWWCCWWo.',
  'oWCcCCWoo',
  'oWWWWWWco',
  'TTTTTTTTT',
  '.d.....d.',
];
const ANKER_SHELF_PALETTE: Record<string, string> = {
  o: '#18181b',
  W: '#f8fafc',
  C: '#0284c7',
  c: '#38bdf8',
  T: '#8b5e3c',
  d: '#4a2e1b',
};

const ANTIBES_POSTCARD_ROWS = [
  'ffffffffff',
  'fkykkkPPpf',
  'fbbbttbwbf',
  'fsssssswsf',
  'ffffffffff',
];
const ANTIBES_POSTCARD_PALETTE: Record<string, string> = {
  f: '#78350f',
  k: '#bae6fd',
  y: '#fde047',
  b: '#0284c7',
  t: '#38bdf8',
  s: '#fde68a',
  P: '#22c55e',
  p: '#15803d',
  w: '#713f12',
};

const SPICE_SHELF_ROWS = [
  '.oo.oo.oo.oo.',
  '.RR.YY.GG.WW.',
  '.rr.yy.gg.ss.',
  'TTTTTTTTTTTTT',
  '.d.........d.',
];
const SPICE_SHELF_PALETTE: Record<string, string> = {
  o: '#94a3b8',
  R: '#ef4444',
  r: '#b91c1c',
  Y: '#facc15',
  y: '#ca8a04',
  G: '#22c55e',
  g: '#15803d',
  W: '#f8fafc',
  s: '#cbd5e1',
  T: '#8b5e3c',
  d: '#4a2e1b',
};

const MUG_RAIL_ROWS = [
  'mmmmmmmmmmmmmmm',
  '.hh.hh.hh.hh.c.',
  '.RR.BB.WW.TT.c.',
  '.rr.bb.ss.tt.C.',
  '...............',
];
const MUG_RAIL_PALETTE: Record<string, string> = {
  m: '#64748b',
  h: '#cbd5e1',
  R: '#dc2626',
  r: '#991b1b',
  B: '#38bdf8',
  b: '#0284c7',
  W: '#fef3c7',
  s: '#d97706',
  T: '#10b981',
  t: '#047857',
  c: '#94a3b8',
  C: '#475569',
};

// -----------------------------------------------------------------------------
// PARTICLES (5x5 HEART, 6x6 SWORD) & MINIMAL PIXEL BADGE ICONS
// -----------------------------------------------------------------------------

const PARTICLE_HEART_ROWS = [
  '.r.r.',
  'rRpRr',
  'rRRRr',
  '.rRr.',
  '..r..',
];
const PARTICLE_HEART_PALETTE: Record<string, string> = {
  r: '#e11d48',
  R: '#fb7185',
  p: '#fecdd3',
};

const PARTICLE_SWORD_ROWS = [
  '....sS',
  '...sSs',
  '.vsSs.',
  '..Vv..',
  '.h.v..',
  'V.....',
];
const PARTICLE_SWORD_PALETTE: Record<string, string> = {
  S: '#f8fafc',
  s: '#cbd5e1',
  V: '#8b5cf6',
  v: '#a78bfa',
  h: '#6d28d9',
};

const ICON_PALETTE: Record<string, string> = {
  W: '#ffffff',
  s: '#cbd5e1',
  g: '#fecdd3',
  b: '#bae6fd',
  h: '#fef08a',
  c: '#78350f',
  k: '#fde68a',
  d: '#0f172a',
};

const BADGE_EXCLAMATION_ROWS = [
  '..WW..',
  '..WW..',
  '..WW..',
  '..Ws..',
  '......',
  '..WW..',
];

const BADGE_HEART_ROWS = [
  '.WW.WW.',
  'WgWWWWW',
  'WWWWWWW',
  'WWWWWWW',
  '.WWWWW.',
  '..WWW..',
  '...W...',
];

const BADGE_SWORD_ROWS = [
  '....WW',
  '...WWW',
  '.sWWs.',
  '..sW..',
  '.W.s..',
  'W.....',
];

const BADGE_PAW_ROWS = [
  '..W.W..',
  'W.....W',
  '..WWW..',
  '.WWWWW.',
  '.WWWWW.',
  '.WW.WW.',
  '.......',
];

const BADGE_BOLT_ROWS = [
  '...WW..',
  '..WW...',
  '.WWWW..',
  '...WW..',
  '..WW...',
  '.W.....',
  '.......',
];

const BADGE_BISCUIT_ROWS = [
  '..kkk..',
  '.kkckk.',
  'kckkkkc',
  'kkkkckk',
  'kkckkkk',
  '.kkkkk.',
  '..kkk..',
];

const BADGE_PLANE_ROWS = [
  '...W...',
  '...W...',
  '.WWWWW.',
  'WWWWWWW',
  '...W...',
  '..WWW..',
  '.......',
];

const BADGE_CAR_ROWS = [
  '.......',
  '..WWW..',
  '.WbbbW.',
  'WWWWWWW',
  'WhWWWhW',
  '.d...d.',
  '.......',
];

// -----------------------------------------------------------------------------
// SPRITE BANK CACHE
// -----------------------------------------------------------------------------

export interface SpriteBank {
  josh: {
    down: (HTMLCanvasElement | null)[];
    up: (HTMLCanvasElement | null)[];
    left: (HTMLCanvasElement | null)[];
    right: (HTMLCanvasElement | null)[];
  };
  hin: (HTMLCanvasElement | null)[];
  milo: {
    happy: (HTMLCanvasElement | null)[];
    blink: HTMLCanvasElement | null;
    stare: HTMLCanvasElement | null;
    antibes: HTMLCanvasElement | null;
    chewing: HTMLCanvasElement | null;
  };
  props: {
    ankerBrick: HTMLCanvasElement | null;
    kettlebell: HTMLCanvasElement | null;
    rotateTile: HTMLCanvasElement | null;
    biscuitTin: HTMLCanvasElement | null;
    parcel: HTMLCanvasElement | null;
    cot: HTMLCanvasElement | null;
    pram: HTMLCanvasElement | null;
    consoleTable: HTMLCanvasElement | null;
    car: HTMLCanvasElement | null;
    macbook: HTMLCanvasElement | null;
    bush: HTMLCanvasElement | null;
    plant: HTMLCanvasElement | null;
    flower: HTMLCanvasElement | null;
    wowBanner: HTMLCanvasElement | null;
    ankerShelf: HTMLCanvasElement | null;
    antibesPostcard: HTMLCanvasElement | null;
    spiceShelf: HTMLCanvasElement | null;
    mugRail: HTMLCanvasElement | null;
  };
  particles: {
    heart: HTMLCanvasElement | null;
    sword: HTMLCanvasElement | null;
  };
  icons: {
    exclamation: HTMLCanvasElement | null;
    heart: HTMLCanvasElement | null;
    sword: HTMLCanvasElement | null;
    paw: HTMLCanvasElement | null;
    bolt: HTMLCanvasElement | null;
    biscuit: HTMLCanvasElement | null;
    plane: HTMLCanvasElement | null;
    car: HTMLCanvasElement | null;
  };
}

let cachedBank: SpriteBank | null = null;

export function getSpriteBank(): SpriteBank {
  if (cachedBank) return cachedBank;

  const joshLeftIdle = compilePixelSprite(JOSH_LEFT_IDLE, JOSH_PALETTE);
  const joshLeftA = compilePixelSprite(JOSH_LEFT_STEP_A, JOSH_PALETTE);
  const joshLeftB = compilePixelSprite(JOSH_LEFT_STEP_B, JOSH_PALETTE);

  const joshRightIdle = compilePixelSprite(mirrorRows(JOSH_LEFT_IDLE), JOSH_PALETTE);
  const joshRightA = compilePixelSprite(mirrorRows(JOSH_LEFT_STEP_A), JOSH_PALETTE);
  const joshRightB = compilePixelSprite(mirrorRows(JOSH_LEFT_STEP_B), JOSH_PALETTE);

  const joshDownIdle = compilePixelSprite(JOSH_DOWN_IDLE, JOSH_PALETTE);
  const joshDownL = compilePixelSprite(JOSH_DOWN_STEP_L, JOSH_PALETTE);
  const joshDownR = compilePixelSprite(JOSH_DOWN_STEP_R, JOSH_PALETTE);

  const joshUpIdle = compilePixelSprite(JOSH_UP_IDLE, JOSH_PALETTE);
  const joshUpL = compilePixelSprite(JOSH_UP_STEP_L, JOSH_PALETTE);
  const joshUpR = compilePixelSprite(JOSH_UP_STEP_R, JOSH_PALETTE);

  cachedBank = {
    josh: {
      down: [joshDownIdle, joshDownL, joshDownIdle, joshDownR],
      up: [joshUpIdle, joshUpL, joshUpIdle, joshUpR],
      left: [joshLeftIdle, joshLeftA, joshLeftIdle, joshLeftB],
      right: [joshRightIdle, joshRightA, joshRightIdle, joshRightB],
    },
    hin: [
      compilePixelSprite(HIN_IDLE_A, HIN_PALETTE),
      compilePixelSprite(HIN_IDLE_B, HIN_PALETTE),
    ],
    milo: {
      happy: [
        compilePixelSprite(MILO_HAPPY_A, MILO_PALETTE),
        compilePixelSprite(MILO_HAPPY_B, MILO_PALETTE),
      ],
      blink: compilePixelSprite(MILO_BLINK, MILO_PALETTE),
      stare: compilePixelSprite(MILO_STARE, MILO_PALETTE),
      antibes: compilePixelSprite(MILO_ANTIBES, MILO_PALETTE),
      chewing: compilePixelSprite(MILO_CHEWING, MILO_PALETTE),
    },
    props: {
      ankerBrick: compilePixelSprite(ANKER_BRICK_ROWS, ANKER_BRICK_PALETTE),
      kettlebell: compilePixelSprite(KETTLEBELL_ROWS, KETTLEBELL_PALETTE),
      rotateTile: compilePixelSprite(ROTATE_TILE_ROWS, ROTATE_TILE_PALETTE),
      biscuitTin: compilePixelSprite(BISCUIT_TIN_ROWS, BISCUIT_TIN_PALETTE),
      parcel: compilePixelSprite(PARCEL_ROWS, PARCEL_PALETTE),
      cot: compilePixelSprite(COT_ROWS, COT_PALETTE),
      pram: compilePixelSprite(PRAM_ROWS, PRAM_PALETTE),
      consoleTable: compilePixelSprite(CONSOLE_TABLE_ROWS, CONSOLE_TABLE_PALETTE),
      car: compilePixelSprite(CAR_ROWS, CAR_PALETTE),
      macbook: compilePixelSprite(MACBOOK_ROWS, MACBOOK_PALETTE),
      bush: compilePixelSprite(BUSH_ROWS, BUSH_PALETTE),
      plant: compilePixelSprite(PLANT_ROWS, PLANT_PALETTE),
      flower: compilePixelSprite(FLOWER_ROWS, FLOWER_PALETTE),
      wowBanner: compilePixelSprite(WOW_BANNER_ROWS, WOW_BANNER_PALETTE),
      ankerShelf: compilePixelSprite(ANKER_SHELF_ROWS, ANKER_SHELF_PALETTE),
      antibesPostcard: compilePixelSprite(ANTIBES_POSTCARD_ROWS, ANTIBES_POSTCARD_PALETTE),
      spiceShelf: compilePixelSprite(SPICE_SHELF_ROWS, SPICE_SHELF_PALETTE),
      mugRail: compilePixelSprite(MUG_RAIL_ROWS, MUG_RAIL_PALETTE),
    },
    particles: {
      heart: compilePixelSprite(PARTICLE_HEART_ROWS, PARTICLE_HEART_PALETTE, 2),
      sword: compilePixelSprite(PARTICLE_SWORD_ROWS, PARTICLE_SWORD_PALETTE, 2),
    },
    icons: {
      exclamation: compilePixelSprite(BADGE_EXCLAMATION_ROWS, ICON_PALETTE, 2),
      heart: compilePixelSprite(BADGE_HEART_ROWS, ICON_PALETTE, 2),
      sword: compilePixelSprite(BADGE_SWORD_ROWS, ICON_PALETTE, 2),
      paw: compilePixelSprite(BADGE_PAW_ROWS, ICON_PALETTE, 2),
      bolt: compilePixelSprite(BADGE_BOLT_ROWS, ICON_PALETTE, 2),
      biscuit: compilePixelSprite(BADGE_BISCUIT_ROWS, ICON_PALETTE, 2),
      plane: compilePixelSprite(BADGE_PLANE_ROWS, ICON_PALETTE, 2),
      car: compilePixelSprite(BADGE_CAR_ROWS, ICON_PALETTE, 2),
    },
  };

  return cachedBank;
}
