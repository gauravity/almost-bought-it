import { describe, expect, it } from 'vitest';
import { MACBOOK_TIERS, OFFICE_LAYOUTS } from '../src/engine/content';
import {
  attemptBuyMacbook,
  createInitialState,
  dismissKeynote,
  eatDigestives,
  getCurrentOfficeLayout,
  getEffectivePrice,
  patMilo,
  playWowRaid,
  rotateOfficeLayout,
  setJoshWalkTarget,
  shipWordPressTicket,
  stackCoupon,
  startGame,
  switchAiProvider,
  takeTravelOffer,
  tick,
  triggerKeynote,
  vibeCodeModularMail,
} from '../src/engine/gameEngine';

describe('One More Keynote — RPG Game Engine', () => {
  it('starts cleanly, counts down the 90s timer, and ends on Week 40 baby arrival', () => {
    const state = createInitialState();
    startGame(state);
    expect(state.status).toBe('playing');
    expect(state.timeRemaining).toBe(90);

    // Keep meters topped up while advancing 150s of wall time (90s active + 4 × 12s Keynote pauses)
    for (let i = 0; i < 1500; i++) {
      if (state.status === 'playing') {
        state.hinPatience = 80;
        state.miloMood = 80;
        state.joshVibe = 80;
        state.fund = 500;
        state.activeParcel = null;
        state.activeHinQuest = null;
      }
      tick(state, 0.1);
    }

    expect(state.stats.keynotesSurvived).toBe(4);
    expect(state.status).toBe('gameover');
    expect(state.gameOverReason).toBe('baby_arrived');
  });

  it('rotates Josh’s tiny rectangular office through all 4 furniture layouts', () => {
    const state = createInitialState();
    startGame(state);

    const seenNames = new Set<string>([getCurrentOfficeLayout(state).name]);
    for (let i = 0; i < OFFICE_LAYOUTS.length - 1; i++) {
      expect(rotateOfficeLayout(state)).toBe(true);
      seenNames.add(getCurrentOfficeLayout(state).name);
    }
    expect(seenNames.size).toBe(4);
    expect(state.stats.officeRotations).toBe(3);
  });

  it('pays real cash on WordPress tickets while Modular Mail stays at 0 customers & £0 MRR', () => {
    const state = createInitialState();
    startGame(state);

    const beforeFund = state.fund;
    shipWordPressTicket(state);
    expect(state.fund).toBeGreaterThan(beforeFund);
    expect(state.stats.wordpressTicketsShipped).toBe(1);

    const fundBeforeVibe = state.fund;
    vibeCodeModularMail(state);
    vibeCodeModularMail(state);
    expect(state.fund).toBe(fundBeforeVibe);
    expect(state.stats.modularMailCustomers).toBe(0);
    expect(state.stats.modularMailMrr).toBe(0);
    expect(state.stats.modularMailDeploys).toBe(2);

    // Digestives cool AI burn and boost Vibe
    const burnBefore = state.aiBurn;
    eatDigestives(state);
    expect(state.aiBurn).toBeLessThan(burnBefore);
    expect(state.stats.digestivesEaten).toBe(6);
  });

  it('handles WoW raid lockouts and Milo pats', () => {
    const state = createInitialState();
    startGame(state);
    state.joshVibe = 40;

    expect(playWowRaid(state)).toBe(true);
    expect(state.wowLockRemaining).toBe(2.0);
    expect(state.joshVibe).toBeGreaterThan(60);
    // Cannot ship WP tickets while locked in a WoW raid pull
    expect(shipWordPressTicket(state)).toBe(false);

    // After 2.1s raid ends, Josh can pat Milo
    for (let i = 0; i < 22; i++) tick(state, 0.1);
    state.miloMood = 40;
    expect(patMilo(state)).toBe(true);
    expect(state.miloMood).toBeGreaterThan(60);
  });

  it('cycles AI benchmark leaders and stacks uncanceled subscriptions when switching providers', () => {
    const state = createInitialState();
    startGame(state);
    expect(state.activeAiProvider).toBe('claude');
    expect(state.stats.uncanceledAiSubs).toBe(1);

    // Advance past first benchmark alert
    state.aiSwitchCountdown = 0.05;
    tick(state, 0.1);
    expect(state.leadingAiProvider).toBe('openai');

    const fundBefore = state.fund;
    expect(switchAiProvider(state)).toBe(true);
    expect(state.activeAiProvider).toBe('openai');
    expect(state.stats.aiProviderSwitches).toBe(1);
    expect(state.stats.uncanceledAiSubs).toBe(2);
    expect(state.fund).toBe(fundBefore - 200);

    // Verify banter uses lad/kid rather than first-name Gaurav in message text
    const lastTwo = state.chatLog.slice(-2);
    expect(lastTwo.some((m) => /\b(lad|kid)\b/i.test(m.text))).toBe(true);
  });

  it('reveals hidden £685 cost on the "£0 FREE" Antibes flat trip', () => {
    const state = createInitialState();
    startGame(state);
    state.activeTravel = {
      id: 99,
      kind: 'antibes',
      title: 'Dad’s Flat in Antibes (£0 FREE!)',
      advertisedCost: 0,
      actualCost: 685,
      breakdown: 'EasyJet + Nice Taxi + Rosé + Decathlon',
      hinDelta: 20,
      miloDelta: 8,
      vibeDelta: 24,
      fuseRemaining: 10,
      fuseDuration: 10,
    };

    const before = state.fund;
    expect(takeTravelOffer(state)).toBe(true);
    expect(state.fund).toBe(before - 685);
    expect(state.stats.antibesTrips).toBe(1);
    expect(state.stats.antibesActualSpend).toBe(685);
    expect(state.milo.moodState).toBe('antibes');
  });

  it('routes Josh via click-to-walk across rooms cleanly', () => {
    const state = createInitialState();
    startGame(state);
    setJoshWalkTarget(state, { x: 600, y: 150 }, null);
    for (let i = 0; i < 40; i++) tick(state, 0.1);
    expect(state.josh.x).toBeGreaterThan(380);
  });

  it('enforces the unwinnable invariant: coupons collapse, keynotes jump, pedestal dodges, and checkout vetoes', () => {
    const state = createInitialState();
    startGame(state);

    // 1. Stack coupons to create fake cheap price, then attempt checkout -> coupons collapse!
    stackCoupon(state);
    stackCoupon(state);
    expect(getEffectivePrice(state)).toBeLessThan(MACBOOK_TIERS[0].rrp);
    state.fund = getEffectivePrice(state) + 50;
    attemptBuyMacbook(state);
    expect(state.stackedCoupons.length).toBe(0);
    expect(state.stats.couponsCollapsed).toBeGreaterThanOrEqual(2);

    // 2. Give Josh massive money on Tier 0..3 -> Keynotes escalate every single time!
    for (let tierIdx = 0; tierIdx < MACBOOK_TIERS.length - 1; tierIdx++) {
      state.status = 'playing';
      state.keynoteOverlay = null;
      state.fund = MACBOOK_TIERS[tierIdx].rrp + 500;
      attemptBuyMacbook(state);
      expect(state.status).toBe('keynote');
      expect(state.macbookTierIndex).toBe(tierIdx + 1);
    }

    // 3. Final tier (M8 Quantum): even with £50,000, pedestal dodges 3x then Hin vetoes checkout!
    state.status = 'playing';
    state.keynoteOverlay = null;
    state.fund = 50000;
    attemptBuyMacbook(state);
    attemptBuyMacbook(state);
    attemptBuyMacbook(state);
    expect(state.pedestal.dodgeCount).toBe(3);
    expect(state.status).toBe('playing');

    // 4th attempt -> Checkout Trap -> Game Over (never won!)
    attemptBuyMacbook(state);
    expect(state.status).toBe('checkout_trap');
    for (let i = 0; i < 60; i++) tick(state, 0.1);
    expect(state.status).toBe('gameover');
    expect(state.gameOverReason).toBe('checkout_veto');
    expect(state.stats.modularMailCustomers).toBe(0);
  });

  it('sets a 12s keynote duration and only allows dismissKeynote after 0.5s elapsed', () => {
    const state = createInitialState();
    startGame(state);

    // Not in keynote state yet
    expect(dismissKeynote(state)).toBe(false);

    expect(triggerKeynote(state)).toBe(true);
    expect(state.status).toBe('keynote');
    expect(state.keynoteOverlay?.remaining).toBe(12);
    expect(state.keynoteOverlay?.duration).toBe(12);

    // Immediately and before 0.5s elapsed -> cannot dismiss
    expect(dismissKeynote(state)).toBe(false);
    for (let i = 0; i < 4; i++) tick(state, 0.1);
    expect(state.status).toBe('keynote');
    expect(dismissKeynote(state)).toBe(false);

    // After >= 0.5s elapsed -> dismisses cleanly and restores playing status
    tick(state, 0.1);
    tick(state, 0.1);
    expect(dismissKeynote(state)).toBe(true);
    expect(state.keynoteOverlay).toBeNull();
    expect(state.status).toBe('playing');
  });

  it('emits milo_woof when Milo needs pats and hotukdeals_drop on parcel spawn', () => {
    const state = createInitialState();
    startGame(state);

    // Trigger HotUKDeals parcel spawn
    state.parcelSpawnTimer = 0.05;
    tick(state, 0.1);
    expect(state.activeParcel).not.toBeNull();
    expect(state.events.some((e) => e.type === 'hotukdeals_drop')).toBe(true);
    expect(state.floatingTexts.some((ft) => ft.text === 'Trending on HotUKDeals!')).toBe(true);

    // Trigger Milo woof when mood drops below 58
    state.miloMood = 50;
    tick(state, 0.1);
    expect(state.milo.needsPat).toBe(true);
    expect(state.events.some((e) => e.type === 'milo_woof')).toBe(true);
    expect(state.milo.woofCooldown).toBeGreaterThan(7);

    // Next tick immediately does not re-emit milo_woof while on cooldown
    tick(state, 0.1);
    expect(state.events.some((e) => e.type === 'milo_woof')).toBe(false);
  });
});
