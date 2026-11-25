import type {
  AiProviderId,
  AiProviderInfo,
  Coupon,
  GameOverReason,
  GameState,
  MacBookTier,
  OfficeFurnitureLayout,
  ParcelCategory,
  Rect,
} from './types';

export const WORLD_WIDTH = 960;
export const WORLD_HEIGHT = 540;
export const TOTAL_DURATION_SECONDS = 90;

export const ROOMS = {
  office: { x: 28, y: 36, w: 312, h: 296 } as Rect,
  living: { x: 340, y: 36, w: 376, h: 296 } as Rect,
  kitchen: { x: 716, y: 36, w: 216, h: 296 } as Rect,
  porch: { x: 28, y: 344, w: 380, h: 176 } as Rect,
  driveway: { x: 408, y: 344, w: 524, h: 176 } as Rect,
};

export const FIXED_STATIONS = {
  biscuits: { x: 842, y: 126 },
  porchParcel: { x: 204, y: 426 },
  whatsappDesk: { x: 406, y: 274 },
  drivewayCar: { x: 516, y: 446 },
};

export const PEDESTAL_SPOTS = [
  { x: 826, y: 438 },
  { x: 744, y: 458 },
  { x: 856, y: 394 },
  { x: 646, y: 446 },
  { x: 826, y: 472 },
];

export const OFFICE_LAYOUTS: OfficeFurnitureLayout[] = [
  {
    index: 0,
    name: 'Window Desk (Classic)',
    hinComplaint: 'Josh, I can literally hear the turbo trainer from downstairs.',
    desk: { x: 96, y: 54, w: 144, h: 54 },
    bikeTrainer: { x: 42, y: 124, w: 66, h: 108 },
    ankerStation: { x: 42, y: 258, w: 90, h: 42 },
    kettlebells: { x: 222, y: 248, w: 98, h: 54 },
    rotateSpot: { x: 286, y: 84 },
    blocksDoorway: false,
  },
  {
    index: 1,
    name: 'Turbo Blocking Door',
    hinComplaint: 'JOSH! Your turbo trainer is blocking the doorway AGAIN!',
    desk: { x: 42, y: 78, w: 58, h: 142 },
    bikeTrainer: { x: 214, y: 144, w: 112, h: 64 },
    ankerStation: { x: 118, y: 54, w: 90, h: 42 },
    kettlebells: { x: 224, y: 54, w: 98, h: 52 },
    rotateSpot: { x: 168, y: 266 },
    blocksDoorway: true,
  },
  {
    index: 2,
    name: 'Aero Feng Shui',
    hinComplaint: 'Why is the desk facing the radiator now, Josh?',
    desk: { x: 46, y: 238, w: 144, h: 56 },
    bikeTrainer: { x: 120, y: 56, w: 118, h: 58 },
    ankerStation: { x: 226, y: 248, w: 90, h: 42 },
    kettlebells: { x: 42, y: 66, w: 66, h: 92 },
    rotateSpot: { x: 286, y: 88 },
    blocksDoorway: false,
  },
  {
    index: 3,
    name: 'Cast-Iron Foundry',
    hinComplaint: 'The ceiling plaster downstairs just cracked from your kettlebells!',
    desk: { x: 266, y: 58, w: 58, h: 136 },
    bikeTrainer: { x: 122, y: 244, w: 116, h: 58 },
    ankerStation: { x: 44, y: 56, w: 90, h: 42 },
    kettlebells: { x: 44, y: 126, w: 98, h: 78 },
    rotateSpot: { x: 184, y: 88 },
    blocksDoorway: false,
  },
];

export const MACBOOK_TIERS: MacBookTier[] = [
  {
    id: 'm4-pro',
    name: 'MacBook Pro 14" M4 Pro',
    chip: 'M4 Pro',
    rrp: 2199,
    tagline: 'Surely this one is fast enough for WordPress & WoW.',
    joshTextToGaurav: 'Oh man lad, Apple have the M4 Pro out, I am 100% getting one.',
    gauravReply: 'Kid, your current MacBook works fine.',
  },
  {
    id: 'm5-max',
    name: 'MacBook Pro 16" M5 Pro Max',
    chip: 'M5 Pro Max',
    rrp: 3199,
    tagline: '14% faster at vibe coding £0 MRR SaaS apps.',
    joshTextToGaurav: 'OH MAN LAD Apple just dropped the M5 Pro Max! Getting it with vouchers.',
    gauravReply: 'Lad, you literally said this 18 seconds ago about the M4.',
  },
  {
    id: 'm6-ultra',
    name: 'MacBook Pro M6 Ultra Void-Black',
    chip: 'M6 Ultra',
    rrp: 4699,
    tagline: '0.3mm thinner. Requires two 300W Anker GaN bricks.',
    joshTextToGaurav: 'Kid stop everything — M6 Ultra just dropped. With coupons it is basically £400.',
    gauravReply: 'That is not how maths or VAT works, kid.',
  },
  {
    id: 'm7-neural',
    name: 'MacBook Pro M7 Claude-Ready Edition',
    chip: 'M7 Neural',
    rrp: 6999,
    tagline: 'Pre-installed with 0 Modular Mail customers.',
    joshTextToGaurav: 'Lad M7 Neural is a game changer for Modular Mail, I HAVE to upgrade.',
    gauravReply: 'Lad, Modular Mail still has zero customers.',
  },
  {
    id: 'm8-quantum',
    name: 'MacBook Pro M8 Quantum Biscuit-Proof',
    chip: 'M8 Quantum',
    rrp: 14999,
    tagline: 'Tim Cook personally dared Josh to find another voucher.',
    joshTextToGaurav: 'KID! M8 QUANTUM! Hear me out on this Amex-Nectar-Trade-in combo...',
    gauravReply: 'Read',
  },
];

export const AI_PROVIDERS: Record<AiProviderId, AiProviderInfo> = {
  claude: {
    id: 'claude',
    company: 'Anthropic',
    productName: 'Claude Code Max 20x',
    shortLabel: 'Claude Max',
    accentColor: '#d97706',
    switchCost: 200,
    benchmarkHeadline: 'Anthropic dropped Claude Opus 5.5 — beats rival by 0.6% on SWE-bench!',
    joshMigrationText: 'Lad I am back on Claude Code Max 20x, OpenAI & Google are washed.',
    gauravReply: 'Did you cancel the other two subs, kid?',
  },
  openai: {
    id: 'openai',
    company: 'OpenAI',
    productName: 'ChatGPT Pro Codex Ultra',
    shortLabel: 'OpenAI Pro',
    accentColor: '#10a37f',
    switchCost: 200,
    benchmarkHeadline: 'OpenAI dropped GPT-6.2 Codex Pro — 0.4% higher coding vibes!',
    joshMigrationText: 'Kid OpenAI just cooked Claude, moving all of Modular Mail over now.',
    gauravReply: 'Lad you switched to Claude 14 seconds ago.',
  },
  google: {
    id: 'google',
    company: 'Google',
    productName: 'Gemini 3.5 Ultra Deep Vibe',
    shortLabel: 'Gemini Ultra',
    accentColor: '#2563eb',
    switchCost: 200,
    benchmarkHeadline: 'Google dropped Gemini 3.5 Ultra — 10M context window, #1 on Arena!',
    joshMigrationText: 'Oh man lad Gemini Ultra is insane, Claude is literally unusable now.',
    gauravReply: 'You are now paying £600/mo to build an app with 0 users, kid.',
  },
};

export const COUPON_POOL: Coupon[] = [
  {
    id: 'modular-biz',
    label: 'Modular Mail "Business Expense"',
    fakeDiscount: 720,
    collapseReason: 'HMRC: Modular Mail has £0.00 revenue',
    joshPitch: 'Kid I can expense it through Modular Mail Ltd — knocks £720 straight off!',
    gauravRoast: 'Lad, you need actual customers to have a business.',
  },
  {
    id: 'trade-in',
    label: '2018 MacBook Trade-In (Josh Val.)',
    fakeDiscount: 950,
    collapseReason: 'Apple Trade-In Offer: £25 (40% digestive crumbs)',
    joshPitch: 'Trade-in on my old MacBook is easily £950 lad, mint condition.',
    gauravRoast: 'The spacebar has half a McVitie’s lodged under it, kid.',
  },
  {
    id: 'unidays',
    label: 'UniDAYS Student Card (2014)',
    fakeDiscount: 280,
    collapseReason: 'UniDAYS: You graduated 12 years ago',
    joshPitch: 'Still got my old student email kid, instant £280 off!',
    gauravRoast: 'Lad, you are about to be a dad.',
  },
  {
    id: 'topcashback',
    label: 'TopCashback 1.4% Loop',
    fakeDiscount: 145,
    collapseReason: 'TopCashback: Declined (AdBlocker enabled)',
    joshPitch: 'Stacking TopCashback through Apple Refurb lad, free money.',
    gauravRoast: 'Your 2022 cashback is still "pending", kid.',
  },
  {
    id: 'amex-nectar',
    label: 'Amex → Avios → Nectar Hack',
    fakeDiscount: 315,
    collapseReason: 'Nectar Conversion: Actually worth £4.12',
    joshPitch: 'Converted Amex points to Nectar to Currys vouchers kid, basically free.',
    gauravRoast: 'Lad you spent £800 on Anker bricks to earn those points.',
  },
  {
    id: 'hmrc-rd',
    label: 'HMRC R&D Tax Credit',
    fakeDiscount: 540,
    collapseReason: 'HMRC: Vibe coding landing pages ≠ R&D',
    joshPitch: 'Modular Mail qualifies for R&D credits lad, Trust Me.',
    gauravRoast: 'Do not tell Hin you called HMRC about Modular Mail, kid.',
  },
  {
    id: 'currys-code',
    label: 'Forum Code "SAVE10NOW"',
    fakeDiscount: 320,
    collapseReason: 'Code SAVE10NOW expired 2,411 days ago',
    joshPitch: 'Found a secret 10% voucher on HotUKDeals lad, checking out now!',
    gauravRoast: 'That thread is from 2019, kid.',
  },
  {
    id: 'amortised',
    label: '"Keep It 14 Years = 19p/day"',
    fakeDiscount: 480,
    collapseReason: 'Apple Store does not accept "19p/day" vibes',
    joshPitch: 'Over 14 years it is literally 19p a day lad, cheaper than digestives!',
    gauravRoast: 'You will want the M9 next Tuesday, kid.',
  },
];

export interface ParcelTemplate {
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
  acceptLabel: string;
  resistLabel: string;
  acceptToast: string;
}

export const PARCEL_POOL: ParcelTemplate[] = [
  {
    templateId: 'anker-1200w',
    title: 'Anker 1,200W 18-Port Reactor GaN',
    subtitle: '1,420 deg HOT on HotUKDeals — charges 11 MacBooks',
    category: 'anker',
    cost: 189,
    vibeDelta: 14,
    hinDelta: -11,
    miloDelta: 0,
    resistHinDelta: 6,
    resistVibeDelta: -6,
    ankerWatts: 1200,
    acceptLabel: 'Buy (-£189)',
    resistLabel: 'Return (+Hin)',
    acceptToast: '+1,200W GaN added to substation!',
  },
  {
    templateId: 'anker-pocket',
    title: 'Anker Tactical Pocket 300W GaN',
    subtitle: 'Backup charger in case the other 8 fail',
    category: 'anker',
    cost: 119,
    vibeDelta: 10,
    hinDelta: -8,
    miloDelta: 0,
    resistHinDelta: 5,
    resistVibeDelta: -4,
    ankerWatts: 300,
    acceptLabel: 'Buy (-£119)',
    resistLabel: 'Return (+Hin)',
    acceptToast: '+300W backup GaN secured!',
  },
  {
    templateId: 'kettlebell-48kg',
    title: 'Matching 48kg Cast-Iron Kettlebells',
    subtitle: 'Includes £65 forklift delivery to the porch',
    category: 'kettlebell',
    cost: 265,
    vibeDelta: 16,
    hinDelta: -14,
    miloDelta: 0,
    resistHinDelta: 7,
    resistVibeDelta: -7,
    kettlebellKg: 96,
    acceptLabel: 'Lift (-£265)',
    resistLabel: 'Refuse (+Hin)',
    acceptToast: '+96kg iron! Floor joists groaning.',
  },
  {
    templateId: 'kettlebell-travel',
    title: '16kg "Travel" Bikepacking Kettlebell',
    subtitle: 'Straps onto gravel handlebars (allegedly)',
    category: 'kettlebell',
    cost: 84,
    vibeDelta: 12,
    hinDelta: -7,
    miloDelta: 0,
    resistHinDelta: 4,
    resistVibeDelta: -5,
    kettlebellKg: 16,
    acceptLabel: 'Buy (-£84)',
    resistLabel: 'Skip',
    acceptToast: '+16kg aero kettlebell acquired!',
  },
  {
    templateId: 'carbon-cage',
    title: 'NASA Carbon Bottle Cage (Saves 3.2g)',
    subtitle: 'Essential upgrade before next bikepacking trip',
    category: 'cycling',
    cost: 145,
    vibeDelta: 15,
    hinDelta: -9,
    miloDelta: 0,
    resistHinDelta: 5,
    resistVibeDelta: -6,
    acceptLabel: 'Buy (-£145)',
    resistLabel: 'Skip',
    acceptToast: 'Saved 3.2 grams! (-£145)',
  },
  {
    templateId: 'arctic-tent',
    title: '4-Season Arctic Bikepacking Tent',
    subtitle: 'For 1 mild night camping in the Peak District',
    category: 'cycling',
    cost: 340,
    vibeDelta: 20,
    hinDelta: -14,
    miloDelta: 0,
    resistHinDelta: 8,
    resistVibeDelta: -8,
    acceptLabel: 'Buy (-£340)',
    resistLabel: 'Return (+Hin)',
    acceptToast: 'Peak District expedition ready!',
  },
  {
    templateId: 'espresso-bivvy',
    title: 'Ultralight Titanium Bivvy Espresso Press',
    subtitle: 'Because instant coffee on a camp is illegal',
    category: 'cycling',
    cost: 165,
    vibeDelta: 14,
    hinDelta: -8,
    miloDelta: 0,
    resistHinDelta: 5,
    resistVibeDelta: -5,
    acceptLabel: 'Buy (-£165)',
    resistLabel: 'Skip',
    acceptToast: 'Titanium camp espresso acquired!',
  },
  {
    templateId: 'modular-ph',
    title: 'Modular Mail Product Hunt Launch Pack',
    subtitle: '4 AI logos + .ai domain (Guaranteed 0 customers)',
    category: 'modular_mail',
    cost: 145,
    vibeDelta: 15,
    hinDelta: -9,
    miloDelta: 0,
    resistHinDelta: 5,
    resistVibeDelta: -6,
    acceptLabel: 'Launch (-£145)',
    resistLabel: 'Skip',
    acceptToast: 'Launched! 3 bot upvotes, 0 customers.',
  },
  {
    templateId: 'claude-2nd-seat',
    title: 'Emergency 2nd Claude Code Max Seat',
    subtitle: 'Hit 20x limit at 10:14am refactoring footer',
    category: 'ai_sub',
    cost: 200,
    vibeDelta: 16,
    hinDelta: -12,
    miloDelta: 0,
    resistHinDelta: 6,
    resistVibeDelta: -7,
    acceptLabel: 'Subscribe (-£200)',
    resistLabel: 'Wait',
    acceptToast: 'Another £200/mo AI seat activated!',
  },
  {
    templateId: 'milo-spa',
    title: 'Milo Luxury Dark-Grey Fluff Blow-Dry',
    subtitle: 'Includes organic puppuccino & ear trim',
    category: 'milo_treat',
    cost: 68,
    vibeDelta: 8,
    hinDelta: 10,
    miloDelta: 34,
    resistHinDelta: -5,
    resistVibeDelta: -4,
    acceptLabel: 'Pamper (-£68)',
    resistLabel: 'Brush at home',
    acceptToast: 'Milo is 300% fluffier! (+Hin +Milo)',
  },
];

export const HIN_QUEST_POOL = [
  {
    title: 'All-Terrain Bugaboo Pram',
    subtitle: 'Better suspension than Josh’s gravel bike',
    cost: 590,
    hinReward: 28,
    ignorePenalty: 22,
    hinQuote: 'Josh, the pram is non-negotiable. Stop looking at MacBooks.',
  },
  {
    title: 'Evict Kettlebells + Nursery Cot',
    subtitle: 'The baby cannot sleep on 48kg cast iron',
    cost: 380,
    hinReward: 24,
    ignorePenalty: 18,
    hinQuote: 'We need a cot, not another Anker brick!',
  },
  {
    title: 'Isofix Spaceship Car Seat + 1,400 Nappies',
    subtitle: 'Hospital bag readiness checklist',
    cost: 310,
    hinReward: 22,
    ignorePenalty: 17,
    hinQuote: 'Close WoW and approve the John Lewis basket, please.',
  },
  {
    title: 'NCT Classes & Nursery Blackout Blinds',
    subtitle: 'Hin’s master spreadsheet item #47',
    cost: 240,
    hinReward: 20,
    ignorePenalty: 15,
    hinQuote: 'Gaurav just texted asking if you’re really buying an M7...',
  },
];

export const WP_TICKETS = [
  'Updated 47 WordPress plugins without exploding checkout',
  'Moved Elementor hero CTA 3px left for client',
  'Talked client out of Comic Sans on WooCommerce',
  'Cleared WP Rocket cache (charged 2h consultancy)',
  'Fixed staging site before Friday 4:59pm',
];

export const VIBE_CODE_ACTIONS = [
  'Rebuilt Modular Mail hero gradient (v43) — 0 customers',
  'Added AI dark-mode toggle to Modular Mail — £0 MRR',
  'Posted "Building in public" on LinkedIn — 0 signups',
  'Refactored Modular Mail pricing page for nobody',
  'Shipped waitlist animation — still 0 paying users',
];

export const PEDESTAL_TAUNTS = [
  'Wait for M9 leaks, lad!',
  'Did you check TopCashback?',
  'Ask Hin first!',
  'M8 Ultra Pro just leaked!',
  '0% APR requires Modular Mail revenue!',
];

export function getRoastRank(state: GameState): { title: string; subtitle: string } {
  const s = state.stats;
  if (s.aiProviderSwitches >= 3) {
    return {
      title: 'Serial AI Provider Hopper',
      subtitle: `Switched AI labs ${s.aiProviderSwitches} times without cancelling a single subscription.`,
    };
  }
  if (s.couponsStacked >= 5) {
    return {
      title: 'Chief Coupon Delusion Officer',
      subtitle: `Claimed £${s.fakeSavingsClaimed.toLocaleString()} in imaginary discounts to Gaurav. Honoured: £0.`,
    };
  }
  if (s.ankerWattsHoarded >= 1200) {
    return {
      title: 'National Grid GaN Substation',
      subtitle: `Hoarded ${s.ankerWattsHoarded.toLocaleString()}W of Anker bricks — enough to power Ormskirk.`,
    };
  }
  if (s.kettlebellKgHoarded >= 96) {
    return {
      title: 'Structural Joist Hazard',
      subtitle: `Stored ${s.kettlebellKgHoarded}kg of cast iron directly above the living room ceiling.`,
    };
  }
  if (s.antibesTrips >= 1) {
    return {
      title: 'Antibes "Free Flat" Economist',
      subtitle: `Spent £${s.antibesActualSpend.toLocaleString()} on £0 "free" trips to Dad's flat in France.`,
    };
  }
  if (s.wowRaidsPlayed >= 3) {
    return {
      title: 'Eternal Azeroth Raid Leader',
      subtitle: `Ran ${s.wowRaidsPlayed} WoW pulls while Hin waited by the pram spreadsheet.`,
    };
  }
  if (s.officeRotations >= 3) {
    return {
      title: 'Tiny-Room Feng Shui Grandmaster',
      subtitle: `Rotated desk & turbo trainer ${s.officeRotations} times instead of shipping WordPress tickets.`,
    };
  }
  return {
    title: 'Pre-Revenue Vibe Coder',
    subtitle: 'WordPress PM by day, £0 MRR Modular Mail founder by night.',
  };
}

export function getGameOverCopy(reason: GameOverReason, tierName: string): {
  headline: string;
  detail: string;
} {
  switch (reason) {
    case 'baby_arrived':
      return {
        headline: 'Baby Arrived! Congratulations!',
        detail: `Week 40 reached. You are officially a dad — and still on the crumb-filled 2018 MacBook instead of the ${tierName}.`,
      };
    case 'hin_patience':
      return {
        headline: 'Hin Confiscated the Joint Amex',
        detail: `"The baby cannot sleep in an Anker box, Josh." Checkout access permanently revoked.`,
      };
    case 'milo_mood':
      return {
        headline: 'Milo Chewed the 240W Anker Cable',
        detail: 'Small dark-grey fluffy vengeance. Office power tripped mid-WoW raid and voided your AppleCare.',
      };
    case 'josh_vibe':
      return {
        headline: 'Josh’s Vibe Hit Zero',
        detail: 'Too many WordPress Elementor emergencies, zero digestive biscuits, and running yesterday’s AI model.',
      };
    case 'bankrupt':
      return {
        headline: 'Monzo Overdraft Maxed Out',
        detail: 'Combination of uncanceled AI subscriptions, kettlebell forklift fees, and a "£0 free" Antibes weekend.',
      };
    case 'checkout_veto':
      return {
        headline: 'Apple Pay Declined — Hin Vetoed!',
        detail: 'Joint Account Approval blocked the MacBook Pro — and Hin’s waters just broke. Redirecting to John Lewis!',
      };
  }
}

export function buildWhatsappScorecard(state: GameState): string {
  const tier = MACBOOK_TIERS[state.macbookTierIndex];
  const rank = getRoastRank(state);
  const s = state.stats;
  const weeks = Math.min(40, Math.floor(4 + (state.elapsed / state.totalDuration) * 36));

  return [
    `ALMOST BOUGHT IT — Josh's MacBook Pro Audit`,
    `Rank: ${rank.title}`,
    `Reached Week ${weeks}/40 • Peak Fund: £${Math.round(s.peakFund).toLocaleString()} (Target jumped to ${tier.chip} £${tier.rrp.toLocaleString()})`,
    `Modular Mail: 0 Paying Customers (£0.00 MRR) | ${s.aiProviderSwitches} AI switches (${s.uncanceledAiSubs} active subs!)`,
    `Texts to Gaurav: ${s.messagesToGaurav} ("lad"/"kid") | Fake Coupons: £${s.fakeSavingsClaimed.toLocaleString()} (£0 honoured)`,
    `Office Rotated: ${s.officeRotations}x | WoW Raids: ${s.wowRaidsPlayed} | WP Tickets: ${s.wordpressTicketsShipped}`,
    `Anker GaN: ${s.ankerWattsHoarded}W | Kettlebells: ${s.kettlebellKgHoarded}kg | Digestives: ${s.digestivesEaten}`,
    `"£0 Free" Antibes Spend: £${s.antibesActualSpend} | Ormskirk Runs: ${s.ormskirkTrips}`,
    `MacBooks Purchased: 0`,
  ].join('\n');
}
