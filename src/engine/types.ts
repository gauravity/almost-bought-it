export type GameStatus = 'intro' | 'playing' | 'keynote' | 'checkout_trap' | 'gameover';

export type GameOverReason =
  | 'baby_arrived'
  | 'hin_patience'
  | 'milo_mood'
  | 'josh_vibe'
  | 'bankrupt'
  | 'checkout_veto';

export type AiProviderId = 'claude' | 'openai' | 'google';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MacBookTier {
  id: string;
  name: string;
  chip: string;
  rrp: number;
  tagline: string;
  joshTextToGaurav: string;
  gauravReply: string;
}

export interface AiProviderInfo {
  id: AiProviderId;
  company: string;
  productName: string;
  shortLabel: string;
  accentColor: string;
  switchCost: number;
  benchmarkHeadline: string;
  joshMigrationText: string;
  gauravReply: string;
}

export interface Coupon {
  id: string;
  label: string;
  fakeDiscount: number;
  collapseReason: string;
  joshPitch: string;
  gauravRoast: string;
}

export interface ChatMessage {
  id: number;
  sender: 'josh' | 'gaurav' | 'hin';
  text: string;
  timeLabel: string;
}

export type StationId =
  | 'desk'
  | 'rotate_office'
  | 'bike_trainer'
  | 'anker_corner'
  | 'kettlebell_corner'
  | 'hin'
  | 'milo'
  | 'biscuits'
  | 'porch_parcel'
  | 'whatsapp_desk'
  | 'driveway_car'
  | 'apple_pedestal';

export type ParcelCategory =
  | 'anker'
  | 'kettlebell'
  | 'cycling'
  | 'modular_mail'
  | 'ai_sub'
  | 'milo_treat';

export interface ParcelDrop {
  id: number;
  templateId: string;
  title: string;
  subtitle: string;
  category: ParcelCategory;
  cost: number;
  vibeDelta: number;
  hinDelta: number;
  miloDelta: number;
  resistHinDelta: number;
  resistVibeDelta: number;
  ankerWatts?: number;
  kettlebellKg?: number;
  fuseRemaining: number;
  fuseDuration: number;
  acceptLabel: string;
  resistLabel: string;
  acceptToast: string;
}

export interface HinQuest {
  id: number;
  title: string;
  subtitle: string;
  cost: number;
  hinReward: number;
  ignorePenalty: number;
  fuseRemaining: number;
  fuseDuration: number;
  hinQuote: string;
}

export interface TravelOffer {
  id: number;
  kind: 'antibes' | 'ormskirk';
  title: string;
  advertisedCost: number;
  actualCost: number;
  breakdown: string;
  hinDelta: number;
  miloDelta: number;
  vibeDelta: number;
  fuseRemaining: number;
  fuseDuration: number;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  kind: 'crumb' | 'spark' | 'heart' | 'sword' | 'coin' | 'sweat';
  life: number;
  maxLife: number;
}

export interface SpeechBubble {
  speaker: 'josh' | 'hin' | 'milo' | 'pedestal';
  text: string;
  remaining: number;
}

export interface OfficeFurnitureLayout {
  index: number;
  name: string;
  hinComplaint: string;
  desk: Rect;
  bikeTrainer: Rect;
  ankerStation: Rect;
  kettlebells: Rect;
  rotateSpot: Vec2;
  blocksDoorway: boolean;
}

export interface KeynoteOverlay {
  tier: MacBookTier;
  remaining: number;
  duration: number;
}

export interface CollapseBanner {
  lines: string[];
  remaining: number;
}

export interface VignetteBanner {
  kind: 'antibes' | 'ormskirk' | 'mom_signup';
  title: string;
  subtitle: string;
  remaining: number;
}

export interface RunStats {
  peakFund: number;
  closestToFakePrice: number;
  closestToRealPrice: number;
  keynotesSurvived: number;
  couponsStacked: number;
  couponsCollapsed: number;
  fakeSavingsClaimed: number;
  messagesToGaurav: number;
  wordpressTicketsShipped: number;
  modularMailDeploys: number;
  modularMailCustomers: 0;
  modularMailMrr: 0;
  aiProviderSwitches: number;
  uncanceledAiSubs: number;
  aiTotalSpend: number;
  wowRaidsPlayed: number;
  officeRotations: number;
  ankerWattsHoarded: number;
  kettlebellKgHoarded: number;
  digestivesEaten: number;
  antibesTrips: number;
  antibesActualSpend: number;
  ormskirkTrips: number;
  cyclingGearBought: number;
  babyItemsFunded: number;
  miloPats: number;
  pedestalDodges: number;
}

export interface GameEvent {
  type:
    | 'wp_ship'
    | 'vibe_code'
    | 'wow_raid'
    | 'office_rotate'
    | 'biscuit'
    | 'milo_pat'
    | 'milo_woof'
    | 'milo_chew'
    | 'coupon_stack'
    | 'coupon_collapse'
    | 'keynote'
    | 'ai_alert'
    | 'ai_switch'
    | 'ai_overage'
    | 'hotukdeals_drop'
    | 'buy_parcel'
    | 'resist_parcel'
    | 'hin_alert'
    | 'hin_quest_paid'
    | 'travel_alert'
    | 'antibes_trap'
    | 'ormskirk_trip'
    | 'pedestal_dodge'
    | 'checkout_veto'
    | 'footstep'
    | 'phone_ping'
    | 'gameover';
}

export interface GameState {
  status: GameStatus;
  gameOverReason: GameOverReason | null;
  timeRemaining: number;
  totalDuration: number;
  elapsed: number;

  // Economy
  fund: number;
  macbookTierIndex: number;
  stackedCoupons: Coupon[];
  nextKeynoteTimer: number;

  // Life meters (0..100)
  hinPatience: number;
  miloMood: number;
  joshVibe: number;

  // Desk & AI Model-Chasing
  activeAiProvider: AiProviderId;
  leadingAiProvider: AiProviderId;
  aiSwitchCountdown: number;
  aiBurn: number; // 0..100
  aiCooldown: number;
  wowLockRemaining: number;
  bikeSpinCooldown: number;
  modularMailFakeFlash: number;
  modularMailFakeLabel: string;

  // RPG World Entities
  josh: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    facing: 'up' | 'down' | 'left' | 'right';
    walkPhase: number;
    stepTimer: number;
    target: Vec2 | null;
    targetStation: StationId | null;
  };
  hin: {
    x: number;
    y: number;
    patrolPhase: number;
  };
  milo: {
    x: number;
    y: number;
    target: Vec2;
    moodState: 'happy' | 'stare' | 'antibes' | 'chewing';
    walkPhase: number;
    needsPat: boolean;
    patCooldown: number;
    woofCooldown: number;
  };
  pedestal: {
    x: number;
    y: number;
    dodgeCount: number;
    taunt: string;
  };

  // Tiny Rectangular Office state
  officeLayoutIndex: number;
  officeRotateAnim: number;

  // Dynamic World Events
  activeParcel: ParcelDrop | null;
  parcelSpawnTimer: number;
  activeHinQuest: HinQuest | null;
  hinQuestSpawnTimer: number;
  activeTravel: TravelOffer | null;
  travelSpawnTimer: number;
  wowAlertTimer: number;
  wowAlertActive: boolean;
  fakeSignupTimer: number;

  // UI feedback
  nearestStation: StationId | null;
  chatLog: ChatMessage[];
  speechBubbles: SpeechBubble[];
  floatingTexts: FloatingText[];
  particles: Particle[];
  keynoteOverlay: KeynoteOverlay | null;
  collapseBanner: CollapseBanner | null;
  vignetteBanner: VignetteBanner | null;
  checkoutVetoTimer: number;
  screenShake: number;

  // Counters
  nextId: number;
  stats: RunStats;
  events: GameEvent[];
}
