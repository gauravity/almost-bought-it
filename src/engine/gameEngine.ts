import {
  AI_PROVIDERS,
  COUPON_POOL,
  FIXED_STATIONS,
  HIN_QUEST_POOL,
  MACBOOK_TIERS,
  OFFICE_LAYOUTS,
  PARCEL_POOL,
  PEDESTAL_SPOTS,
  PEDESTAL_TAUNTS,
  ROOMS,
  TOTAL_DURATION_SECONDS,
  VIBE_CODE_ACTIONS,
  WP_TICKETS,
} from './content';
import type {
  AiProviderId,
  GameEvent,
  GameOverReason,
  GameState,
  OfficeFurnitureLayout,
  Rect,
  StationId,
  Vec2,
} from './types';

const JOSH_SPEED = 240;
const MILO_SPEED = 78;
const OVERDRAFT_LIMIT = -350;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function rectCenter(r: Rect): Vec2 {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

export function getCurrentTier(state: GameState) {
  return MACBOOK_TIERS[state.macbookTierIndex];
}

export function getCurrentOfficeLayout(state: GameState): OfficeFurnitureLayout {
  return OFFICE_LAYOUTS[state.officeLayoutIndex];
}

export function getEffectivePrice(state: GameState): number {
  const tier = getCurrentTier(state);
  const totalDiscount = state.stackedCoupons.reduce((sum, c) => sum + c.fakeDiscount, 0);
  // Josh Math can never drop below £199 ("basically free, lad")
  return Math.max(199, tier.rrp - totalDiscount);
}

export function getPregnancyWeek(state: GameState): number {
  const progress = clamp(state.elapsed / state.totalDuration, 0, 1);
  return Math.min(40, Math.floor(4 + progress * 36));
}

export function getStationPosition(state: GameState, station: StationId): Vec2 {
  const layout = getCurrentOfficeLayout(state);
  switch (station) {
    case 'desk':
      return rectCenter(layout.desk);
    case 'rotate_office':
      return layout.rotateSpot;
    case 'bike_trainer':
      return rectCenter(layout.bikeTrainer);
    case 'anker_corner':
      return rectCenter(layout.ankerStation);
    case 'kettlebell_corner':
      return rectCenter(layout.kettlebells);
    case 'hin':
      return { x: state.hin.x, y: state.hin.y };
    case 'milo':
      return { x: state.milo.x, y: state.milo.y };
    case 'biscuits':
      return FIXED_STATIONS.biscuits;
    case 'porch_parcel':
      return FIXED_STATIONS.porchParcel;
    case 'whatsapp_desk':
      return FIXED_STATIONS.whatsappDesk;
    case 'driveway_car':
      return FIXED_STATIONS.drivewayCar;
    case 'apple_pedestal':
      return { x: state.pedestal.x, y: state.pedestal.y };
  }
}

function formatClockLabel(state: GameState): string {
  const w = getPregnancyWeek(state);
  return `Wk ${w}`;
}

function pushEvent(state: GameState, type: GameEvent['type']): void {
  state.events.push({ type });
}

function addChat(state: GameState, sender: 'josh' | 'gaurav' | 'hin', text: string): void {
  state.chatLog.push({
    id: state.nextId++,
    sender,
    text,
    timeLabel: formatClockLabel(state),
  });
  if (state.chatLog.length > 18) {
    state.chatLog.shift();
  }
  if (state.status === 'playing' || state.status === 'keynote') {
    pushEvent(state, 'phone_ping');
  }
}

function addFloatingText(state: GameState, x: number, y: number, text: string, color: string): void {
  // Stagger vertically if another toast is nearby so 4.6s notifications stay legible
  let targetY = y;
  for (const existing of state.floatingTexts) {
    if (Math.abs(existing.x - x) < 110 && Math.abs(existing.y - targetY) < 20) {
      targetY = Math.max(26, existing.y - 20);
    }
  }
  // Cap simultaneous toasts near the same spot to prevent clutter
  if (state.floatingTexts.length >= 6) {
    state.floatingTexts.shift();
  }
  state.floatingTexts.push({
    id: state.nextId++,
    x,
    y: targetY,
    text,
    color,
    life: 4.6,
    maxLife: 4.6,
  });
}

function setSpeech(
  state: GameState,
  speaker: 'josh' | 'hin' | 'milo' | 'pedestal',
  text: string,
  duration = 7.5,
): void {
  state.speechBubbles = state.speechBubbles.filter((b) => b.speaker !== speaker);
  state.speechBubbles.push({ speaker, text, remaining: duration });
}

function spawnParticles(
  state: GameState,
  x: number,
  y: number,
  kind: 'crumb' | 'spark' | 'heart' | 'sword' | 'coin' | 'sweat',
  count: number,
  color: string,
): void {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (state.nextId % 7) * 0.17;
    const speed = 35 + ((state.nextId * 19 + i * 13) % 55);
    state.particles.push({
      id: state.nextId++,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 22,
      size: kind === 'heart' || kind === 'sword' ? 8 : 4,
      color,
      kind,
      life: 0.75,
      maxLife: 0.75,
    });
  }
}

export function createInitialState(): GameState {
  const initialPedestal = PEDESTAL_SPOTS[0];
  return {
    status: 'intro',
    gameOverReason: null,
    timeRemaining: TOTAL_DURATION_SECONDS,
    totalDuration: TOTAL_DURATION_SECONDS,
    elapsed: 0,

    fund: 650,
    macbookTierIndex: 0,
    stackedCoupons: [],
    nextKeynoteTimer: 21,

    hinPatience: 84,
    miloMood: 82,
    joshVibe: 78,

    activeAiProvider: 'claude',
    leadingAiProvider: 'claude',
    aiSwitchCountdown: 11,
    aiBurn: 18,
    aiCooldown: 0,
    wowLockRemaining: 0,
    bikeSpinCooldown: 0,
    modularMailFakeFlash: 0,
    modularMailFakeLabel: '',

    josh: {
      x: 196,
      y: 176,
      vx: 0,
      vy: 0,
      facing: 'down',
      walkPhase: 0,
      stepTimer: 0,
      target: null,
      targetStation: null,
    },
    hin: {
      x: 560,
      y: 138,
      patrolPhase: 0,
    },
    milo: {
      x: 466,
      y: 212,
      target: { x: 460, y: 210 },
      moodState: 'happy',
      walkPhase: 0,
      needsPat: false,
      patCooldown: 0,
      woofCooldown: 0,
    },
    pedestal: {
      x: initialPedestal.x,
      y: initialPedestal.y,
      dodgeCount: 0,
      taunt: '',
    },

    officeLayoutIndex: 0,
    officeRotateAnim: 0,

    activeParcel: null,
    parcelSpawnTimer: 3.2,
    activeHinQuest: null,
    hinQuestSpawnTimer: 6.5,
    activeTravel: null,
    travelSpawnTimer: 10,
    wowAlertTimer: 8,
    wowAlertActive: true,
    fakeSignupTimer: 17,

    nearestStation: 'desk',
    chatLog: [
      {
        id: 1,
        sender: 'josh',
        text: 'Oh man lad, Apple have the M4 Pro out — I am 100% getting one before the baby arrives.',
        timeLabel: 'Wk 4',
      },
      {
        id: 2,
        sender: 'gaurav',
        text: 'Kid, you say this every six weeks. What about Modular Mail?',
        timeLabel: 'Wk 4',
      },
      {
        id: 3,
        sender: 'josh',
        text: '0 customers so far lad, just need a quicker MacBook for Claude Code Max.',
        timeLabel: 'Wk 4',
      },
    ],
    speechBubbles: [
      { speaker: 'josh', text: 'Right, quick WP ticket then MacBook!', remaining: 7.5 },
    ],
    floatingTexts: [],
    particles: [],
    keynoteOverlay: null,
    collapseBanner: null,
    vignetteBanner: null,
    checkoutVetoTimer: 0,
    screenShake: 0,

    nextId: 100,
    stats: {
      peakFund: 650,
      closestToFakePrice: MACBOOK_TIERS[0].rrp - 650,
      closestToRealPrice: MACBOOK_TIERS[0].rrp - 650,
      keynotesSurvived: 0,
      couponsStacked: 0,
      couponsCollapsed: 0,
      fakeSavingsClaimed: 0,
      messagesToGaurav: 2,
      wordpressTicketsShipped: 0,
      modularMailDeploys: 0,
      modularMailCustomers: 0,
      modularMailMrr: 0,
      aiProviderSwitches: 0,
      uncanceledAiSubs: 1,
      aiTotalSpend: 200,
      wowRaidsPlayed: 0,
      officeRotations: 0,
      ankerWattsHoarded: 240,
      kettlebellKgHoarded: 24,
      digestivesEaten: 0,
      antibesTrips: 0,
      antibesActualSpend: 0,
      ormskirkTrips: 0,
      cyclingGearBought: 0,
      babyItemsFunded: 0,
      miloPats: 0,
      pedestalDodges: 0,
    },
    events: [],
  };
}

export function startGame(state: GameState): void {
  const fresh = createInitialState();
  Object.assign(state, fresh);
  state.status = 'playing';
}

function endGame(state: GameState, reason: GameOverReason): void {
  if (state.status === 'gameover') return;
  state.status = 'gameover';
  state.gameOverReason = reason;
  state.keynoteOverlay = null;
  state.josh.target = null;
  state.josh.targetStation = null;
  pushEvent(state, 'gameover');
}

function updateProximityStats(state: GameState): void {
  if (state.fund > state.stats.peakFund) {
    state.stats.peakFund = state.fund;
  }
  const realGap = Math.max(0, getCurrentTier(state).rrp - state.fund);
  const fakeGap = Math.max(0, getEffectivePrice(state) - state.fund);
  if (realGap < state.stats.closestToRealPrice) {
    state.stats.closestToRealPrice = realGap;
  }
  if (fakeGap < state.stats.closestToFakePrice) {
    state.stats.closestToFakePrice = fakeGap;
  }
}

export function triggerCouponCollapse(state: GameState, reasonPrefix?: string): boolean {
  if (state.stackedCoupons.length === 0) return false;
  const lines = state.stackedCoupons.map((c) => c.collapseReason);
  if (reasonPrefix) {
    lines.unshift(reasonPrefix);
  }
  const tier = getCurrentTier(state);
  addChat(state, 'gaurav', `Kid, every voucher bounced — it is still £${tier.rrp.toLocaleString()}.`);
  state.stats.couponsCollapsed += state.stackedCoupons.length;
  state.stackedCoupons = [];
  state.collapseBanner = {
    lines: lines.slice(0, 4),
    remaining: 10.5,
  };
  state.screenShake = 0.45;
  addFloatingText(state, state.josh.x, state.josh.y - 34, 'COUPONS REJECTED!', '#dc2626');
  setSpeech(state, 'josh', 'NOOO my TopCashback!!', 7.2);
  pushEvent(state, 'coupon_collapse');
  return true;
}

export function triggerKeynote(state: GameState): boolean {
  if (state.macbookTierIndex >= MACBOOK_TIERS.length - 1) return false;
  if (state.stackedCoupons.length > 0) {
    state.stats.couponsCollapsed += state.stackedCoupons.length;
    state.stackedCoupons = [];
  }
  state.macbookTierIndex += 1;
  state.stats.keynotesSurvived += 1;
  const tier = getCurrentTier(state);
  state.status = 'keynote';
  state.keynoteOverlay = {
    tier,
    remaining: 12.0,
    duration: 12.0,
  };
  state.nextKeynoteTimer = 19;
  state.screenShake = 0.35;
  addChat(state, 'josh', tier.joshTextToGaurav);
  addChat(state, 'gaurav', tier.gauravReply);
  state.stats.messagesToGaurav += 1;
  setSpeech(state, 'josh', `OH MAN LAD ${tier.chip}!!`, 8.4);
  pushEvent(state, 'keynote');
  return true;
}

export function dismissKeynote(state: GameState): boolean {
  if (state.status !== 'keynote' || state.keynoteOverlay === null) {
    return false;
  }
  const elapsed = state.keynoteOverlay.duration - state.keynoteOverlay.remaining;
  if (elapsed < 0.5) {
    return false;
  }
  state.keynoteOverlay = null;
  state.status = 'playing';
  return true;
}

export function triggerCheckoutVeto(state: GameState): void {
  if (state.status === 'gameover') return;
  state.status = 'checkout_trap';
  state.checkoutVetoTimer = 5.5;
  state.screenShake = 0.5;
  addChat(state, 'hin', 'Joint Account Veto activated. Also my waters just broke — get the car!');
  setSpeech(state, 'hin', 'DECLINED! Baby time!', 7.8);
  pushEvent(state, 'checkout_veto');
}

export function dodgePedestal(state: GameState): void {
  state.pedestal.dodgeCount += 1;
  state.stats.pedestalDodges += 1;
  const nextSpot = PEDESTAL_SPOTS[state.pedestal.dodgeCount % PEDESTAL_SPOTS.length];
  state.pedestal.x = nextSpot.x;
  state.pedestal.y = nextSpot.y;
  state.pedestal.taunt =
    PEDESTAL_TAUNTS[(state.pedestal.dodgeCount - 1) % PEDESTAL_TAUNTS.length];
  setSpeech(state, 'pedestal', state.pedestal.taunt, 6.9);
  addFloatingText(state, nextSpot.x, nextSpot.y - 36, state.pedestal.taunt, '#111827');
  spawnParticles(state, nextSpot.x, nextSpot.y, 'spark', 8, '#3b82f6');
  pushEvent(state, 'pedestal_dodge');
}

export function attemptBuyMacbook(state: GameState): void {
  if (state.status !== 'playing') return;
  const tier = getCurrentTier(state);
  const effective = getEffectivePrice(state);

  // Layer 1: If relying on stacked coupons, detonate them immediately!
  if (state.stackedCoupons.length > 0 && state.fund >= effective && state.fund < tier.rrp) {
    triggerCouponCollapse(state, 'CHECKOUT ERROR — Vouchers invalidated:');
    return;
  }

  // Layer 2: If near or above RRP and another Apple Keynote exists, Tim Cook strikes!
  if (state.macbookTierIndex < MACBOOK_TIERS.length - 1 && state.fund >= tier.rrp * 0.78) {
    triggerKeynote(state);
    return;
  }

  // Not enough cash yet
  if (state.fund < effective) {
    const shortBy = Math.ceil(effective - state.fund);
    addFloatingText(state, state.pedestal.x, state.pedestal.y - 30, `Need £${shortBy} more!`, '#ef4444');
    setSpeech(state, 'josh', `Need £${shortBy} (or 2 more coupons lad)`, 6.0);
    return;
  }

  // Layer 3: On final tier with enough cash, pedestal physically dodges 3 times!
  if (state.pedestal.dodgeCount < 3) {
    dodgePedestal(state);
    return;
  }

  // Layer 4: Hard unwinnable checkout veto!
  triggerCheckoutVeto(state);
}

export function stackCoupon(state: GameState): boolean {
  if (state.status !== 'playing') return false;
  const usedIds = new Set(state.stackedCoupons.map((c) => c.id));
  const nextCoupon = COUPON_POOL.find((c) => !usedIds.has(c.id));
  if (!nextCoupon) {
    // Already stacked every coupon in existence -> they collapse under their own absurdity!
    triggerCouponCollapse(state, 'BASKET OVERFLOW — Too many imaginary vouchers:');
    return false;
  }

  state.stackedCoupons.push(nextCoupon);
  state.stats.couponsStacked += 1;
  state.stats.fakeSavingsClaimed += nextCoupon.fakeDiscount;
  state.stats.messagesToGaurav += 1;
  state.joshVibe = clamp(state.joshVibe + 4, 0, 100);

  addChat(state, 'josh', nextCoupon.joshPitch);
  addChat(state, 'gaurav', nextCoupon.gauravRoast);
  addFloatingText(
    state,
    state.josh.x,
    state.josh.y - 28,
    `-£${nextCoupon.fakeDiscount} "${nextCoupon.label.split(' ')[0]}"`,
    '#059669',
  );
  setSpeech(state, 'josh', `Basically £${getEffectivePrice(state)} now lad!`, 6.3);
  pushEvent(state, 'coupon_stack');
  updateProximityStats(state);

  // If stacking a coupon makes Josh think he can afford it right now -> dramatic collapse check!
  if (state.fund >= getEffectivePrice(state) * 0.96 && state.stackedCoupons.length >= 3) {
    triggerCouponCollapse(state, 'REALITY CHECK — Apple checkout rejected vouchers:');
  }
  return true;
}

export function shipWordPressTicket(state: GameState): boolean {
  if (state.status !== 'playing' || state.wowLockRemaining > 0) return false;
  const reward = 85 + ((state.stats.wordpressTicketsShipped * 13) % 35);
  const ticket = WP_TICKETS[state.stats.wordpressTicketsShipped % WP_TICKETS.length];
  state.fund += reward;
  state.joshVibe = clamp(state.joshVibe - 6.5, 0, 100);
  state.stats.wordpressTicketsShipped += 1;
  addFloatingText(state, state.josh.x, state.josh.y - 28, `+£${reward} WP Ticket`, '#059669');
  setSpeech(state, 'josh', ticket, 6.3);
  spawnParticles(state, state.josh.x, state.josh.y - 10, 'coin', 6, '#10b981');
  pushEvent(state, 'wp_ship');
  updateProximityStats(state);
  checkKeynoteThreshold(state);
  return true;
}

export function vibeCodeModularMail(state: GameState): boolean {
  if (state.status !== 'playing' || state.wowLockRemaining > 0 || state.aiCooldown > 0) {
    return false;
  }
  const provider = AI_PROVIDERS[state.activeAiProvider];
  const isOutdated = state.activeAiProvider !== state.leadingAiProvider;
  const vibeGain = isOutdated ? 5 : 11;
  const action = VIBE_CODE_ACTIONS[state.stats.modularMailDeploys % VIBE_CODE_ACTIONS.length];

  state.joshVibe = clamp(state.joshVibe + vibeGain, 0, 100);
  state.hinPatience = clamp(state.hinPatience - 2.2, 0, 100);
  state.aiBurn = clamp(state.aiBurn + 25, 0, 100);
  state.stats.modularMailDeploys += 1;
  // Invariant: Modular Mail NEVER earns customers or MRR!
  state.stats.modularMailCustomers = 0;
  state.stats.modularMailMrr = 0;

  addFloatingText(state, state.josh.x, state.josh.y - 30, '£0 MRR • +Vibe', provider.accentColor);
  setSpeech(state, 'josh', action, 6.6);
  spawnParticles(state, state.josh.x, state.josh.y - 10, 'spark', 7, provider.accentColor);
  pushEvent(state, 'vibe_code');

  if (state.aiBurn >= 100) {
    state.aiBurn = 0;
    state.aiCooldown = 3.0;
    state.fund -= 180;
    state.stats.aiTotalSpend += 180;
    state.hinPatience = clamp(state.hinPatience - 6, 0, 100);
    state.screenShake = 0.25;
    addFloatingText(state, state.josh.x, state.josh.y - 46, `-£180 ${provider.shortLabel} Overage!`, '#dc2626');
    addChat(state, 'josh', `Hit my ${provider.productName} limit at 10am lad, topped up £180.`);
    addChat(state, 'gaurav', 'Kid, you are funding Silicon Valley out of the pram budget.');
    state.stats.messagesToGaurav += 1;
    pushEvent(state, 'ai_overage');
  }
  return true;
}

export function playWowRaid(state: GameState): boolean {
  if (state.status !== 'playing' || state.wowLockRemaining > 0) return false;
  state.wowLockRemaining = 2.0;
  state.wowAlertActive = false;
  state.wowAlertTimer = 14;
  state.joshVibe = clamp(state.joshVibe + 24, 0, 100);
  state.hinPatience = clamp(state.hinPatience - 6.5, 0, 100);
  state.miloMood = clamp(state.miloMood - 4, 0, 100);
  state.stats.wowRaidsPlayed += 1;

  addFloatingText(state, state.josh.x, state.josh.y - 34, 'FOR AZEROTH! +24 Vibe', '#7c3aed');
  setSpeech(state, 'josh', "Can't pause WoW, Hin! Pull in 3...", 6.6);
  setSpeech(state, 'hin', 'Josh, we have a baby coming!!', 6.6);
  spawnParticles(state, state.josh.x, state.josh.y - 12, 'sword', 8, '#8b5cf6');
  pushEvent(state, 'wow_raid');
  return true;
}

export function switchAiProvider(state: GameState): boolean {
  if (state.status !== 'playing') return false;
  if (state.activeAiProvider === state.leadingAiProvider) return false;
  const target = AI_PROVIDERS[state.leadingAiProvider];
  state.activeAiProvider = state.leadingAiProvider;
  state.fund -= target.switchCost;
  state.aiBurn = 12;
  state.aiCooldown = 0;
  state.joshVibe = clamp(state.joshVibe + 16, 0, 100);
  state.hinPatience = clamp(state.hinPatience - 5, 0, 100);

  state.stats.aiProviderSwitches += 1;
  state.stats.uncanceledAiSubs += 1; // Always forgets to cancel the old one!
  state.stats.aiTotalSpend += target.switchCost;
  state.stats.messagesToGaurav += 1;

  addChat(state, 'josh', target.joshMigrationText);
  addChat(state, 'gaurav', target.gauravReply);
  addFloatingText(
    state,
    state.josh.x,
    state.josh.y - 34,
    `Switched → ${target.shortLabel} (-£${target.switchCost})`,
    target.accentColor,
  );
  setSpeech(state, 'josh', `Migrated to ${target.shortLabel} lad!`, 6.9);
  spawnParticles(state, state.josh.x, state.josh.y - 10, 'spark', 10, target.accentColor);
  pushEvent(state, 'ai_switch');
  return true;
}

export function rotateOfficeLayout(state: GameState): boolean {
  if (state.status !== 'playing' || state.wowLockRemaining > 0) return false;
  state.officeLayoutIndex = (state.officeLayoutIndex + 1) % OFFICE_LAYOUTS.length;
  state.officeRotateAnim = 0.55;
  state.stats.officeRotations += 1;
  const layout = getCurrentOfficeLayout(state);

  state.joshVibe = clamp(state.joshVibe + 12, 0, 100);
  if (layout.blocksDoorway) {
    state.hinPatience = clamp(state.hinPatience - 6, 0, 100);
  }
  addFloatingText(state, 200, 140, `LAYOUT: ${layout.name}`, '#0f172a');
  setSpeech(state, 'josh', 'Way better airflow for the turbo trainer!', 6.6);
  setSpeech(state, 'hin', layout.hinComplaint, 7.5);
  spawnParticles(state, 200, 150, 'spark', 10, '#64748b');
  pushEvent(state, 'office_rotate');
  return true;
}

export function rideTurboTrainer(state: GameState): boolean {
  if (state.status !== 'playing' || state.wowLockRemaining > 0 || state.bikeSpinCooldown > 0) {
    return false;
  }
  state.bikeSpinCooldown = 4.0;
  state.joshVibe = clamp(state.joshVibe + 15, 0, 100);
  state.hinPatience = clamp(state.hinPatience - 2, 0, 100);
  addFloatingText(state, state.josh.x, state.josh.y - 30, '290W FTP Spin! +15 Vibe', '#0284c7');
  setSpeech(state, 'josh', 'Might need carbon bottle cages...', 6.3);
  spawnParticles(state, state.josh.x, state.josh.y - 8, 'sweat', 7, '#38bdf8');
  return true;
}

export function eatDigestives(state: GameState): boolean {
  if (state.status !== 'playing' || state.wowLockRemaining > 0) return false;
  const cost = 4.5;
  state.fund -= cost;
  state.joshVibe = clamp(state.joshVibe + 18, 0, 100);
  state.aiBurn = clamp(state.aiBurn - 38, 0, 100);
  state.aiCooldown = Math.max(0, state.aiCooldown - 1.5);
  state.stats.digestivesEaten += 6;

  addFloatingText(state, state.josh.x, state.josh.y - 30, '-£4.50 Digestives • +18 Vibe', '#b45309');
  if (state.stats.digestivesEaten >= 18) {
    setSpeech(state, 'josh', 'Crumbs in the spacebar again...', 6.0);
  } else {
    setSpeech(state, 'josh', 'Dark chocolate digestives = fuel.', 6.0);
  }
  spawnParticles(state, state.josh.x, state.josh.y - 8, 'crumb', 10, '#92400e');
  pushEvent(state, 'biscuit');
  return true;
}

export function patMilo(state: GameState): boolean {
  if (state.status !== 'playing' || state.wowLockRemaining > 0) return false;
  state.miloMood = clamp(state.miloMood + 28, 0, 100);
  state.hinPatience = clamp(state.hinPatience + 5, 0, 100);
  state.joshVibe = clamp(state.joshVibe + 6, 0, 100);
  state.milo.needsPat = false;
  state.milo.moodState = 'happy';
  state.milo.patCooldown = 3.5;
  state.stats.miloPats += 1;

  addFloatingText(state, state.milo.x, state.milo.y - 26, 'Good boy Milo! +28', '#059669');
  setSpeech(state, 'milo', '*happy fluffy tail wag*', 6.0);
  spawnParticles(state, state.milo.x, state.milo.y - 10, 'heart', 7, '#ec4899');
  pushEvent(state, 'milo_pat');
  return true;
}

export function resolveParcel(state: GameState, accept: boolean): boolean {
  if (state.status !== 'playing' || !state.activeParcel) return false;
  const p = state.activeParcel;
  state.activeParcel = null;
  state.parcelSpawnTimer = 5.0;

  if (accept) {
    state.fund -= p.cost;
    state.joshVibe = clamp(state.joshVibe + p.vibeDelta, 0, 100);
    state.hinPatience = clamp(state.hinPatience + p.hinDelta, 0, 100);
    state.miloMood = clamp(state.miloMood + p.miloDelta, 0, 100);

    if (p.ankerWatts) state.stats.ankerWattsHoarded += p.ankerWatts;
    if (p.kettlebellKg) state.stats.kettlebellKgHoarded += p.kettlebellKg;
    if (p.category === 'cycling') state.stats.cyclingGearBought += 1;
    if (p.category === 'ai_sub') {
      state.stats.uncanceledAiSubs += 1;
      state.stats.aiTotalSpend += p.cost;
    }

    addFloatingText(state, FIXED_STATIONS.porchParcel.x, FIXED_STATIONS.porchParcel.y - 32, `-£${p.cost} ${p.acceptToast}`, '#dc2626');
    setSpeech(state, 'josh', p.acceptToast, 6.9);
    if (p.hinDelta < 0) {
      setSpeech(state, 'hin', 'Another "bargain" from HotUKDeals?!', 6.6);
    }
    pushEvent(state, 'buy_parcel');
  } else {
    state.hinPatience = clamp(state.hinPatience + p.resistHinDelta, 0, 100);
    state.joshVibe = clamp(state.joshVibe + p.resistVibeDelta, 0, 100);
    addFloatingText(state, FIXED_STATIONS.porchParcel.x, FIXED_STATIONS.porchParcel.y - 32, 'Returned to Sender! +Hin', '#059669');
    setSpeech(state, 'josh', 'Painful... saving for MacBook.', 6.0);
    pushEvent(state, 'resist_parcel');
  }
  return true;
}

export function resolveHinQuest(state: GameState, fundIt: boolean): boolean {
  if (state.status !== 'playing' || !state.activeHinQuest) return false;
  const q = state.activeHinQuest;
  state.activeHinQuest = null;
  state.hinQuestSpawnTimer = 10.5;

  if (fundIt) {
    state.fund -= q.cost;
    state.hinPatience = clamp(state.hinPatience + q.hinReward, 0, 100);
    state.stats.babyItemsFunded += 1;
    addFloatingText(state, state.hin.x, state.hin.y - 32, `Funded ${q.title} (-£${q.cost})`, '#059669');
    setSpeech(state, 'hin', 'Thank you! One step closer for baby.', 6.6);
    spawnParticles(state, state.hin.x, state.hin.y - 10, 'heart', 8, '#f43f5e');
    pushEvent(state, 'hin_quest_paid');
  } else {
    state.hinPatience = clamp(state.hinPatience - q.ignorePenalty, 0, 100);
    addFloatingText(state, state.hin.x, state.hin.y - 32, `Hin Patience -${q.ignorePenalty}!`, '#dc2626');
    setSpeech(state, 'hin', q.hinQuote, 7.8);
  }
  return true;
}

export function takeTravelOffer(state: GameState): boolean {
  if (state.status !== 'playing' || !state.activeTravel) return false;
  const trip = state.activeTravel;
  state.activeTravel = null;
  state.travelSpawnTimer = 13;

  state.fund -= trip.actualCost;
  state.hinPatience = clamp(state.hinPatience + trip.hinDelta, 0, 100);
  state.miloMood = clamp(state.miloMood + trip.miloDelta, 0, 100);
  state.joshVibe = clamp(state.joshVibe + trip.vibeDelta, 0, 100);

  if (trip.kind === 'antibes') {
    state.stats.antibesTrips += 1;
    state.stats.antibesActualSpend += trip.actualCost;
    state.milo.moodState = 'antibes';
    state.vignetteBanner = {
      kind: 'antibes',
      title: `"£0 FREE" ANTIBES FLAT → ACTUAL COST: £${trip.actualCost}`,
      subtitle: trip.breakdown,
      remaining: 10.5,
    };
    addChat(state, 'josh', 'Off to Dad’s flat in Antibes lad — accommodation is literally £0!');
    addChat(state, 'gaurav', `EasyJet + Nice taxi + rosé = £${trip.actualCost}, kid.`);
    state.stats.messagesToGaurav += 1;
    addFloatingText(state, FIXED_STATIONS.drivewayCar.x, FIXED_STATIONS.drivewayCar.y - 36, `"-£0" → ACTUALLY -£${trip.actualCost}!`, '#dc2626');
    pushEvent(state, 'antibes_trap');
  } else {
    state.stats.ormskirkTrips += 1;
    state.vignetteBanner = {
      kind: 'ormskirk',
      title: `ORMSKIRK SUNDAY ROAST RUN (-£${trip.actualCost})`,
      subtitle: trip.breakdown,
      remaining: 10.5,
    };
    addFloatingText(state, FIXED_STATIONS.drivewayCar.x, FIXED_STATIONS.drivewayCar.y - 36, `Ormskirk Roast! -£${trip.actualCost}`, '#0284c7');
    setSpeech(state, 'milo', 'Ormskirk garden!!', 7.2);
    pushEvent(state, 'ormskirk_trip');
  }
  return true;
}

function checkKeynoteThreshold(state: GameState): void {
  const tier = getCurrentTier(state);
  if (state.macbookTierIndex < MACBOOK_TIERS.length - 1 && state.fund >= tier.rrp * 0.82) {
    triggerKeynote(state);
  }
}

function spawnNextParcel(state: GameState): void {
  const idx = (state.nextId + state.stats.wordpressTicketsShipped + state.stats.officeRotations) % PARCEL_POOL.length;
  const tpl = PARCEL_POOL[idx];
  const trimester = state.timeRemaining < 30 ? 3 : state.timeRemaining < 60 ? 2 : 1;
  const fuse = trimester === 3 ? 6.8 : trimester === 2 ? 7.8 : 9.0;
  const hotDegrees = 680 + ((idx * 173 + state.nextId * 41) % 940);
  state.activeParcel = {
    id: state.nextId++,
    ...tpl,
    fuseRemaining: fuse,
    fuseDuration: fuse,
  };
  addFloatingText(state, FIXED_STATIONS.porchParcel.x, FIXED_STATIONS.porchParcel.y - 26, 'Trending on HotUKDeals!', '#ea580c');
  if (!state.speechBubbles.some((b) => b.speaker === 'josh' && b.remaining > 0)) {
    setSpeech(state, 'josh', `${hotDegrees} deg HOT on HotUKDeals!`, 4.8);
  }
  pushEvent(state, 'hotukdeals_drop');
}

function spawnNextHinQuest(state: GameState): void {
  const idx = state.stats.babyItemsFunded % HIN_QUEST_POOL.length;
  const tpl = HIN_QUEST_POOL[idx];
  const fuse = state.timeRemaining < 30 ? 9.5 : 11.5;
  state.activeHinQuest = {
    id: state.nextId++,
    ...tpl,
    fuseRemaining: fuse,
    fuseDuration: fuse,
  };
  setSpeech(state, 'hin', tpl.hinQuote, 8.4);
  pushEvent(state, 'hin_alert');
}

function spawnNextTravel(state: GameState): void {
  const isAntibes = (state.stats.antibesTrips + state.stats.ormskirkTrips) % 2 === 0;
  if (isAntibes) {
    const cost = state.stats.antibesTrips === 0 ? 685 : 540;
    state.activeTravel = {
      id: state.nextId++,
      kind: 'antibes',
      title: 'Dad’s Flat in Antibes (£0 FREE!)',
      advertisedCost: 0,
      actualCost: cost,
      breakdown: 'EasyJet Speedy + Nice Taxi + €180 Rosé + 14 Croissants + Panic Decathlon',
      hinDelta: 20,
      miloDelta: 8,
      vibeDelta: 24,
      fuseRemaining: 11,
      fuseDuration: 11,
    };
  } else {
    state.activeTravel = {
      id: state.nextId++,
      kind: 'ormskirk',
      title: 'Drive to Ormskirk (Parents’ Roast)',
      advertisedCost: 78,
      actualCost: 78,
      breakdown: 'M6 Petrol + £24 Keele Services Waitrose Flat Whites & Sausage Rolls',
      hinDelta: 16,
      miloDelta: 22,
      vibeDelta: 12,
      fuseRemaining: 11,
      fuseDuration: 11,
    };
  }
  pushEvent(state, 'travel_alert');
}

export function setJoshWalkTarget(state: GameState, target: Vec2, station: StationId | null = null): void {
  if (state.status !== 'playing') return;
  state.josh.target = {
    x: clamp(target.x, 42, 918),
    y: clamp(target.y, 52, 504),
  };
  state.josh.targetStation = station;
}

function resolveDoorwayWaypoint(from: Vec2, to: Vec2): Vec2 {
  const officeWallX = ROOMS.office.x + ROOMS.office.w; // 340
  const kitchenWallX = ROOMS.kitchen.x; // 716
  const frontWallY = 336;

  const fromInHouse = from.y < frontWallY;
  const toInHouse = to.y < frontWallY;
  const fromInOffice = fromInHouse && from.x < officeWallX;
  const toInOffice = toInHouse && to.x < officeWallX;
  const fromInKitchen = fromInHouse && from.x > kitchenWallX;
  const toInKitchen = toInHouse && to.x > kitchenWallX;

  // 1. Inside Office -> anything outside Office routes through Office doorway (340, 196)
  if (fromInOffice && !toInOffice) {
    if (from.y < 160 || from.y > 232) {
      return { x: officeWallX - 14, y: 196 };
    }
    return { x: officeWallX + 16, y: 196 };
  }

  // 2. Inside Kitchen -> anything outside Kitchen routes through Kitchen archway (716, 197)
  if (fromInKitchen && !toInKitchen) {
    if (from.y < 150 || from.y > 244) {
      return { x: kitchenWallX + 14, y: 197 };
    }
    return { x: kitchenWallX - 14, y: 197 };
  }

  // 3. Inside House (Living/Office/Kitchen) -> Outside (y >= 336) routes through Front Door (512, 336)
  if (fromInHouse && !toInHouse) {
    if (from.x < 470 || from.x > 554) {
      return { x: 512, y: 320 };
    }
    return { x: 512, y: 360 };
  }

  // 3b. Finish stepping cleanly past the front wall threshold before turning laterally outside
  if (!fromInHouse && !toInHouse && from.y < 356 && (to.x < 462 || to.x > 562)) {
    return { x: 512, y: 360 };
  }

  // 4. Outside -> Inside House routes through Front Door (512, 336)
  if (!fromInHouse && toInHouse) {
    if (from.x < 470 || from.x > 554) {
      return { x: 512, y: 360 };
    }
    return { x: 512, y: 320 };
  }

  // 5. Inside Living Room -> Office routes through Office doorway (340, 196)
  if (fromInHouse && !fromInOffice && toInOffice) {
    if (from.y < 160 || from.y > 232) {
      return { x: officeWallX + 16, y: 196 };
    }
    return { x: officeWallX - 14, y: 196 };
  }

  // 6. Inside Living Room -> Kitchen routes through Kitchen archway (716, 197)
  if (fromInHouse && !fromInKitchen && toInKitchen) {
    if (from.y < 150 || from.y > 244) {
      return { x: kitchenWallX - 14, y: 197 };
    }
    return { x: kitchenWallX + 14, y: 197 };
  }

  return to;
}

function clampToHouseWalls(prev: Vec2, next: Vec2): Vec2 {
  const officeWallX = ROOMS.office.x + ROOMS.office.w; // 340
  const kitchenWallX = ROOMS.kitchen.x; // 716
  const frontWallY = 336;

  let x = clamp(next.x, 42, 918);
  let y = clamp(next.y, 52, 504);

  // Exterior Front House Wall at y = 336 (Front Door gap: x 462..562)
  const inFrontDoor = x >= 462 && x <= 562;
  if (prev.y > 326 && prev.y < 356 && !inFrontDoor) {
    x = clamp(x, 462, 562);
  } else if (!inFrontDoor) {
    if (prev.y < frontWallY && y > 326) {
      y = 326;
    } else if (prev.y >= frontWallY && y < 356) {
      y = 356;
    }
  }

  // Interior Wall between Tiny Office & Living Room at x = 340, y < 336 (doorway y 152..240)
  if (y < frontWallY) {
    const inOfficeDoor = y >= 152 && y <= 240;
    if (prev.x > officeWallX - 10 && prev.x < officeWallX + 10 && prev.y < frontWallY && !inOfficeDoor) {
      y = clamp(y, 152, 240);
    } else if (!inOfficeDoor) {
      if (prev.x < officeWallX && x > officeWallX - 10) {
        x = officeWallX - 10;
      } else if (prev.x >= officeWallX && x < officeWallX + 10) {
        x = officeWallX + 10;
      }
    }
  }

  // Interior Kitchen Archway between Living Room & Kitchen at x = 716, y < 336 (archway y 142..252)
  if (y < frontWallY) {
    const inKitchenArch = y >= 142 && y <= 252;
    if (prev.x > kitchenWallX - 10 && prev.x < kitchenWallX + 10 && prev.y < frontWallY && !inKitchenArch) {
      y = clamp(y, 142, 252);
    } else if (!inKitchenArch) {
      if (prev.x < kitchenWallX && x > kitchenWallX - 10) {
        x = kitchenWallX - 10;
      } else if (prev.x >= kitchenWallX && x < kitchenWallX + 10) {
        x = kitchenWallX + 10;
      }
    }
  }

  return { x, y };
}

export function findNearestStation(state: GameState): StationId | null {
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

  let best: StationId | null = null;
  let bestDist = 92;
  for (const id of candidates) {
    const pos = getStationPosition(state, id);
    const d = dist(state.josh, pos);
    if (d < bestDist) {
      bestDist = d;
      best = id;
    }
  }
  return best;
}

export function interactAtNearestStation(state: GameState): void {
  if (state.status !== 'playing') return;
  const station = state.nearestStation;
  if (!station) return;

  switch (station) {
    case 'desk':
      shipWordPressTicket(state);
      break;
    case 'rotate_office':
      rotateOfficeLayout(state);
      break;
    case 'bike_trainer':
      rideTurboTrainer(state);
      break;
    case 'anker_corner':
      setSpeech(state, 'josh', `${state.stats.ankerWattsHoarded}W of pure GaN power.`, 6.0);
      break;
    case 'kettlebell_corner':
      setSpeech(state, 'josh', `${state.stats.kettlebellKgHoarded}kg cast iron. Floor's fine.`, 6.0);
      break;
    case 'hin':
      if (state.activeHinQuest) {
        resolveHinQuest(state, true);
      } else {
        state.hinPatience = clamp(state.hinPatience + 4, 0, 100);
        setSpeech(state, 'hin', 'Check the pram spreadsheet please!', 6.0);
      }
      break;
    case 'milo':
      patMilo(state);
      break;
    case 'biscuits':
      eatDigestives(state);
      break;
    case 'porch_parcel':
      if (state.activeParcel) {
        resolveParcel(state, true);
      } else {
        setSpeech(state, 'josh', 'Checking HotUKDeals for deals...', 6.0);
      }
      break;
    case 'whatsapp_desk':
      stackCoupon(state);
      break;
    case 'driveway_car':
      if (state.activeTravel) {
        takeTravelOffer(state);
      } else {
        setSpeech(state, 'josh', 'Waiting on cheap EasyJet flights to Antibes...', 6.0);
      }
      break;
    case 'apple_pedestal':
      attemptBuyMacbook(state);
      break;
  }
}

export interface InputAxes {
  dx: number;
  dy: number;
}

export function tick(state: GameState, dtSeconds: number, input: InputAxes = { dx: 0, dy: 0 }): void {
  const dt = clamp(dtSeconds, 0, 0.1);
  state.events = [];

  if (state.status === 'intro' || state.status === 'gameover') return;

  // Update visual timers even during overlays
  state.screenShake = Math.max(0, state.screenShake - dt);
  state.officeRotateAnim = Math.max(0, state.officeRotateAnim - dt);
  if (state.collapseBanner) {
    state.collapseBanner.remaining -= dt;
    if (state.collapseBanner.remaining <= 0) state.collapseBanner = null;
  }
  if (state.vignetteBanner) {
    state.vignetteBanner.remaining -= dt;
    if (state.vignetteBanner.remaining <= 0) {
      state.vignetteBanner = null;
      if (state.milo.moodState === 'antibes') state.milo.moodState = 'happy';
    }
  }
  if (state.modularMailFakeFlash > 0) {
    state.modularMailFakeFlash = Math.max(0, state.modularMailFakeFlash - dt);
  }

  // Handle Keynote Blackout pause
  if (state.status === 'keynote' && state.keynoteOverlay) {
    state.keynoteOverlay.remaining -= dt;
    if (state.keynoteOverlay.remaining <= 0) {
      state.keynoteOverlay = null;
      state.status = 'playing';
    }
    return;
  }

  // Handle Checkout Veto transition to GameOver
  if (state.status === 'checkout_trap') {
    state.checkoutVetoTimer -= dt;
    if (state.checkoutVetoTimer <= 0) {
      endGame(state, 'checkout_veto');
    }
    return;
  }

  // Main countdown timer
  state.elapsed += dt;
  state.timeRemaining = Math.max(0, state.totalDuration - state.elapsed);
  if (state.timeRemaining <= 0) {
    endGame(state, 'baby_arrived');
    return;
  }

  const trimesterMult = state.timeRemaining < 30 ? 1.3 : state.timeRemaining < 60 ? 1.12 : 1.0;

  // Cooldowns
  state.aiCooldown = Math.max(0, state.aiCooldown - dt);
  state.wowLockRemaining = Math.max(0, state.wowLockRemaining - dt);
  state.bikeSpinCooldown = Math.max(0, state.bikeSpinCooldown - dt);
  state.milo.patCooldown = Math.max(0, state.milo.patCooldown - dt);
  state.milo.woofCooldown = Math.max(0, state.milo.woofCooldown - dt);
  state.aiBurn = Math.max(0, state.aiBurn - dt * 2.5);

  // Passive recurring bleed from forgotten uncanceled AI subscriptions!
  const extraSubs = Math.max(0, state.stats.uncanceledAiSubs - 1);
  if (extraSubs > 0) {
    const subDrain = extraSubs * 3.4 * dt;
    state.fund -= subDrain;
    state.stats.aiTotalSpend += subDrain;
  }

  // Life meter passive decay
  const aiFomoDecay = state.activeAiProvider !== state.leadingAiProvider ? 2.4 : 0;
  state.hinPatience = clamp(state.hinPatience - 1.05 * trimesterMult * dt, 0, 100);
  state.miloMood = clamp(state.miloMood - 1.45 * trimesterMult * dt, 0, 100);
  state.joshVibe = clamp(state.joshVibe - (1.15 * trimesterMult + aiFomoDecay) * dt, 0, 100);

  // AI Benchmark Chasing cycle
  state.aiSwitchCountdown -= dt;
  if (state.aiSwitchCountdown <= 0) {
    const order: AiProviderId[] = ['claude', 'openai', 'google'];
    const currentIdx = order.indexOf(state.leadingAiProvider);
    const nextProvider = order[(currentIdx + 1) % order.length];
    state.leadingAiProvider = nextProvider;
    state.aiSwitchCountdown = 13.5;
    const info = AI_PROVIDERS[nextProvider];
    addFloatingText(state, 200, 56, `NEW #1: ${info.shortLabel} (+0.4%)!`, info.accentColor);
    pushEvent(state, 'ai_alert');
  }

  // Scheduled Apple Keynote escalation
  state.nextKeynoteTimer -= dt;
  if (state.nextKeynoteTimer <= 0 && state.macbookTierIndex < MACBOOK_TIERS.length - 1) {
    triggerKeynote(state);
    return;
  }

  // Fake Modular Mail "1 Customer!" gag
  state.fakeSignupTimer -= dt;
  if (state.fakeSignupTimer <= 0) {
    state.fakeSignupTimer = 22;
    state.modularMailFakeFlash = 8.5;
    state.modularMailFakeLabel = '1 Customer?! → No, Josh’s Mum in Ormskirk';
    state.vignetteBanner = {
      kind: 'mom_signup',
      title: 'MODULAR MAIL ALERT: 1 NEW SIGNUP!!',
      subtitle: 'False alarm — it is Josh’s Mum in Ormskirk asking about Sunday roast. Still 0 paying customers.',
      remaining: 10.5,
    };
  }

  // WoW Raid alert
  if (!state.wowAlertActive) {
    state.wowAlertTimer -= dt;
    if (state.wowAlertTimer <= 0) {
      state.wowAlertActive = true;
    }
  }

  // Spawners: Parcel, Hin Quest, Travel
  if (!state.activeParcel) {
    state.parcelSpawnTimer -= dt;
    if (state.parcelSpawnTimer <= 0) spawnNextParcel(state);
  } else {
    state.activeParcel.fuseRemaining -= dt;
    if (state.activeParcel.fuseRemaining <= 0) {
      // 1-Click Auto-Buy triggers if ignored!
      resolveParcel(state, true);
    }
  }

  if (!state.activeHinQuest) {
    state.hinQuestSpawnTimer -= dt;
    if (state.hinQuestSpawnTimer <= 0) spawnNextHinQuest(state);
  } else {
    state.activeHinQuest.fuseRemaining -= dt;
    if (state.activeHinQuest.fuseRemaining <= 0) {
      resolveHinQuest(state, false);
    }
  }

  if (!state.activeTravel) {
    state.travelSpawnTimer -= dt;
    if (state.travelSpawnTimer <= 0) spawnNextTravel(state);
  } else {
    state.activeTravel.fuseRemaining -= dt;
    if (state.activeTravel.fuseRemaining <= 0) {
      state.activeTravel = null;
      state.travelSpawnTimer = 9;
    }
  }

  // Josh Movement (Keyboard overrides click target)
  let moveX = input.dx;
  let moveY = input.dy;

  if (state.wowLockRemaining > 0) {
    moveX = 0;
    moveY = 0;
    state.josh.target = null;
  } else if (moveX !== 0 || moveY !== 0) {
    state.josh.target = null;
    state.josh.targetStation = null;
    const len = Math.hypot(moveX, moveY);
    moveX /= len;
    moveY /= len;
  } else if (state.josh.target) {
    const waypoint = resolveDoorwayWaypoint(state.josh, state.josh.target);
    const dx = waypoint.x - state.josh.x;
    const dy = waypoint.y - state.josh.y;
    const d = Math.hypot(dx, dy);
    const finalDist = dist(state.josh, state.josh.target);

    if (finalDist < 22) {
      const arrivedStation = state.josh.targetStation;
      state.josh.target = null;
      state.josh.targetStation = null;
      if (arrivedStation) {
        state.nearestStation = arrivedStation;
        interactAtNearestStation(state);
      }
    } else if (d > 2) {
      moveX = dx / d;
      moveY = dy / d;
    }
  }

  if (moveX !== 0 || moveY !== 0) {
    const prev = { x: state.josh.x, y: state.josh.y };
    const next = {
      x: state.josh.x + moveX * JOSH_SPEED * dt,
      y: state.josh.y + moveY * JOSH_SPEED * dt,
    };
    const clamped = clampToHouseWalls(prev, next);
    state.josh.x = clamped.x;
    state.josh.y = clamped.y;
    state.josh.walkPhase += dt * 11;
    if (Math.abs(moveX) > Math.abs(moveY)) {
      state.josh.facing = moveX > 0 ? 'right' : 'left';
    } else {
      state.josh.facing = moveY > 0 ? 'down' : 'up';
    }

    state.josh.stepTimer -= dt;
    if (state.josh.stepTimer <= 0) {
      pushEvent(state, 'footstep');
      state.josh.stepTimer = 0.24;
      state.particles.push({
        id: state.nextId++,
        x: state.josh.x - moveX * 6,
        y: state.josh.y + 14 - moveY * 4,
        vx: -moveX * 14,
        vy: -10 - moveY * 8,
        size: 2,
        color: '#a8a29e',
        kind: 'crumb',
        life: 0.35,
        maxLife: 0.35,
      });
    }
  }

  // Hin gentle pacing in Living Room / Nursery
  state.hin.patrolPhase += dt * 1.1;
  state.hin.x = 560 + Math.sin(state.hin.patrolPhase) * 44;
  state.hin.y = 138 + Math.cos(state.hin.patrolPhase * 0.7) * 16;

  // Milo roaming AI (dark grey, small, fluffy)
  state.milo.needsPat = state.miloMood < 58;
  if (state.milo.needsPat && state.milo.woofCooldown <= 0) {
    pushEvent(state, 'milo_woof');
    state.milo.woofCooldown = 7.5;
    if (!state.speechBubbles.some((b) => b.speaker === 'milo' && b.remaining > 0)) {
      setSpeech(state, 'milo', 'Woof! Pats please!', 4.5);
    }
  }
  if (state.milo.moodState !== 'antibes') {
    if (state.miloMood < 28) {
      state.milo.moodState = 'chewing';
      const ankerPos = getStationPosition(state, 'anker_corner');
      state.milo.target = ankerPos;
    } else if (state.milo.needsPat) {
      state.milo.moodState = 'stare';
      state.milo.target = { x: clamp(state.josh.x + 36, 64, 880), y: clamp(state.josh.y + 18, 64, 310) };
    } else {
      state.milo.moodState = 'happy';
      if (dist(state.milo, state.milo.target) < 16) {
        const roamSpots: Vec2[] = [
          { x: 460, y: 210 },
          { x: 630, y: 216 },
          { x: 520, y: 184 },
          { x: 778, y: 210 },
          { x: 256, y: 180 },
        ];
        state.milo.target = roamSpots[Math.floor(state.elapsed * 3) % roamSpots.length];
      }
    }
  }
  const mdx = state.milo.target.x - state.milo.x;
  const mdy = state.milo.target.y - state.milo.y;
  const md = Math.hypot(mdx, mdy);
  if (md > 6) {
    state.milo.x += (mdx / md) * MILO_SPEED * dt;
    state.milo.y += (mdy / md) * MILO_SPEED * dt;
    state.milo.walkPhase += dt * 10;
  }

  // Evasive Apple Pedestal auto-dodge when Josh walks right up to it on the final tier with cash!
  const tier = getCurrentTier(state);
  if (
    state.macbookTierIndex === MACBOOK_TIERS.length - 1 &&
    state.fund >= tier.rrp &&
    state.pedestal.dodgeCount < 3 &&
    dist(state.josh, state.pedestal) < 70
  ) {
    dodgePedestal(state);
  }

  // Update nearest station
  state.nearestStation = findNearestStation(state);

  // Update speech bubbles, floating texts & particles
  for (const b of state.speechBubbles) b.remaining -= dt;
  state.speechBubbles = state.speechBubbles.filter((b) => b.remaining > 0);

  for (const ft of state.floatingTexts) {
    ft.life -= dt;
    ft.y -= 9 * dt;
  }
  state.floatingTexts = state.floatingTexts.filter((ft) => ft.life > 0);

  for (const p of state.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 120 * dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);

  updateProximityStats(state);

  // Check failure conditions (never a win condition!)
  if (state.hinPatience <= 0) {
    endGame(state, 'hin_patience');
  } else if (state.miloMood <= 0) {
    pushEvent(state, 'milo_chew');
    endGame(state, 'milo_mood');
  } else if (state.joshVibe <= 0) {
    endGame(state, 'josh_vibe');
  } else if (state.fund <= OVERDRAFT_LIMIT) {
    endGame(state, 'bankrupt');
  }
}
