import {
  AI_PROVIDERS,
  FIXED_STATIONS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  getGameOverCopy,
  getRoastRank,
} from '../engine/content';
import {
  attemptBuyMacbook,
  eatDigestives,
  getCurrentTier,
  getEffectivePrice,
  getPregnancyWeek,
  getStationPosition,
  patMilo,
  playWowRaid,
  resolveHinQuest,
  resolveParcel,
  rideTurboTrainer,
  rotateOfficeLayout,
  shipWordPressTicket,
  stackCoupon,
  switchAiProvider,
  takeTravelOffer,
  vibeCodeModularMail,
} from '../engine/gameEngine';
import type { AiProviderId, ChatMessage, GameState } from '../engine/types';
import {
  ICONS,
  type IconName,
  circularTimerSvg,
  updateCircularTimerRing,
} from './icons';

export interface HudElements {
  clock: HTMLElement;
  tier: HTMLElement;
  rrp: HTMLElement;
  effective: HTMLElement;
  fund: HTMLElement;
  fundBar: HTMLElement;
  valHin: HTMLElement;
  barHin: HTMLElement;
  valMilo: HTMLElement;
  barMilo: HTMLElement;
  valVibe: HTMLElement;
  barVibe: HTMLElement;
  aiStatus: HTMLElement;
  aiActiveLabel: HTMLElement;
  aiSubsBadge: HTMLElement;
  btnCoupon: HTMLButtonElement;
  btnMute: HTMLButtonElement;
  icoMute: HTMLElement;
  worldUiLayer: HTMLElement;
  iphoneWidget: HTMLElement;
  introDialog: HTMLDialogElement;
  receiptDialog: HTMLDialogElement;
  receiptTitle: HTMLElement;
  receiptDetail: HTMLElement;
  receiptRankTitle: HTMLElement;
  receiptRankSub: HTMLElement;
  receiptLines: HTMLElement;
  btnPlayAgain: HTMLButtonElement;
  btnStartGame: HTMLButtonElement;
}

function hydrateStaticIcons(): void {
  const nodes = document.querySelectorAll<HTMLElement>('[data-icon]');
  for (const node of nodes) {
    const key = node.dataset.icon as IconName | undefined;
    if (key && key in ICONS) {
      node.innerHTML = ICONS[key];
    }
  }
}

export function setMuteButtonIcon(el: HudElements, muted: boolean): void {
  el.icoMute.innerHTML = muted ? ICONS.soundOff : ICONS.soundOn;
  el.btnMute.setAttribute('aria-pressed', muted ? 'true' : 'false');
}

export function queryHudElements(): HudElements {
  const byId = <T extends HTMLElement>(id: string): T => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing element #${id}`);
    return el as T;
  };
  hydrateStaticIcons();
  return {
    clock: byId('hud-clock'),
    tier: byId('hud-tier'),
    rrp: byId('hud-rrp'),
    effective: byId('hud-effective'),
    fund: byId('hud-fund'),
    fundBar: byId('hud-fund-bar'),
    valHin: byId('val-hin'),
    barHin: byId('bar-hin'),
    valMilo: byId('val-milo'),
    barMilo: byId('bar-milo'),
    valVibe: byId('val-vibe'),
    barVibe: byId('bar-vibe'),
    aiStatus: byId('ai-status'),
    aiActiveLabel: byId('ai-active-label'),
    aiSubsBadge: byId('ai-subs-badge'),
    btnCoupon: byId<HTMLButtonElement>('btn-coupon'),
    btnMute: byId<HTMLButtonElement>('btn-mute'),
    icoMute: byId('ico-mute'),
    worldUiLayer: byId('world-ui-layer'),
    iphoneWidget: byId('iphone-widget'),
    introDialog: byId<HTMLDialogElement>('intro-dialog'),
    receiptDialog: byId<HTMLDialogElement>('receipt-dialog'),
    receiptTitle: byId('receipt-title'),
    receiptDetail: byId('receipt-detail'),
    receiptRankTitle: byId('receipt-rank-title'),
    receiptRankSub: byId('receipt-rank-sub'),
    receiptLines: byId('receipt-lines'),
    btnPlayAgain: byId<HTMLButtonElement>('btn-play-again'),
    btnStartGame: byId<HTMLButtonElement>('btn-start-game'),
  };
}

interface WorldButtonSpec {
  id: string;
  kbd?: string;
  icon?: IconName;
  label: string;
  title?: string;
  variant: 'emerald' | 'amber' | 'violet' | 'rose' | 'slate' | 'dark';
  disabled?: boolean;
  onClick: () => void;
}

interface WorldPromptSpec {
  key: string;
  worldX: number;
  worldY: number;
  below?: boolean;
  isEvent?: boolean;
  timer?: {
    progress: number;
    color: string;
  };
  buttons: WorldButtonSpec[];
}

function getAiShortSwitchName(id: AiProviderId): string {
  switch (id) {
    case 'google':
      return 'Gemini';
    case 'openai':
      return 'OpenAI';
    case 'claude':
      return 'Claude';
  }
}

function shortHinTitle(title: string): string {
  if (title.includes('Bugaboo')) return 'Bugaboo Pram';
  if (title.includes('Nursery Cot')) return 'Nursery Cot';
  if (title.includes('Car Seat')) return 'Car Seat';
  if (title.includes('NCT')) return 'NCT & Blinds';
  return title.split(' ').slice(0, 2).join(' ');
}

function worldToSafePct(worldX: number, worldY: number): { leftPct: number; topPct: number } {
  const leftPct = Math.max(8, Math.min(88, (worldX / WORLD_WIDTH) * 100));
  let topPct = Math.max(10, Math.min(84, (worldY / WORLD_HEIGHT) * 100));
  // Avoid overlapping the bottom-right iPhone widget
  if (leftPct > 68 && topPct > 70) {
    topPct = 68;
  }
  return { leftPct, topPct };
}

function buildWorldPrompts(state: GameState): WorldPromptSpec[] {
  const prompts: WorldPromptSpec[] = [];
  const locked = state.wowLockRemaining > 0;
  const deskPos = getStationPosition(state, 'desk');

  // 1. Always-visible Event: AI Model Overtake
  if (state.activeAiProvider !== state.leadingAiProvider) {
    const leader = AI_PROVIDERS[state.leadingAiProvider];
    const aiX = Math.max(122, Math.min(256, deskPos.x + 12));
    const aiY = 58;
    prompts.push({
      key: 'event-ai',
      worldX: aiX,
      worldY: aiY,
      below: true,
      isEvent: true,
      timer: {
        progress: state.aiSwitchCountdown / 13.5,
        color: '#fbbf24',
      },
      buttons: [
        {
          id: 'ai-switch',
          icon: 'swap',
          label: `Switch to ${getAiShortSwitchName(state.leadingAiProvider)} (-£${leader.switchCost})`,
          variant: 'amber',
          onClick: () => switchAiProvider(state),
        },
      ],
    });
  }

  // 2. Always-visible Event: HotUKDeals Drop on Front Lawn
  if (state.activeParcel) {
    const p = state.activeParcel;
    prompts.push({
      key: 'event-parcel',
      worldX: 204,
      worldY: 382,
      isEvent: true,
      timer: {
        progress: p.fuseRemaining / p.fuseDuration,
        color: '#f59e0b',
      },
      buttons: [
        {
          id: 'parcel-buy',
          icon: 'box',
          label: `Buy (-£${p.cost})`,
          title: `HotUKDeals: ${p.title}`,
          variant: 'emerald',
          onClick: () => resolveParcel(state, true),
        },
        {
          id: 'parcel-return',
          label: 'Pass',
          title: 'Pass on HotUKDeals drop',
          variant: 'slate',
          onClick: () => resolveParcel(state, false),
        },
      ],
    });
  }

  // 3. Always-visible Event: Hin Baby Prep Quest
  if (state.activeHinQuest) {
    const q = state.activeHinQuest;
    prompts.push({
      key: 'event-hin',
      worldX: state.hin.x,
      worldY: state.hin.y + 44,
      below: true,
      isEvent: true,
      timer: {
        progress: q.fuseRemaining / q.fuseDuration,
        color: '#f43f5e',
      },
      buttons: [
        {
          id: 'hin-fund',
          icon: 'baby',
          label: `Fund ${shortHinTitle(q.title)} (-£${q.cost})`,
          variant: 'rose',
          onClick: () => resolveHinQuest(state, true),
        },
        {
          id: 'hin-later',
          label: 'Later',
          variant: 'slate',
          onClick: () => resolveHinQuest(state, false),
        },
      ],
    });
  }

  // 4. Always-visible Event: Car Travel Offer
  if (state.activeTravel) {
    const t = state.activeTravel;
    prompts.push({
      key: 'event-travel',
      worldX: 516,
      worldY: 396,
      isEvent: true,
      timer: {
        progress: t.fuseRemaining / t.fuseDuration,
        color: t.kind === 'antibes' ? '#10b981' : '#38bdf8',
      },
      buttons: [
        t.kind === 'antibes'
          ? {
              id: 'travel-antibes',
              icon: 'plane',
              label: '£0 Antibes',
              variant: 'emerald',
              onClick: () => takeTravelOffer(state),
            }
          : {
              id: 'travel-ormskirk',
              icon: 'car',
              label: 'Ormskirk (-£78)',
              variant: 'slate',
              onClick: () => takeTravelOffer(state),
            },
      ],
    });
  }

  // 5. Contextual Station Prompts (only when standing next to station)
  switch (state.nearestStation) {
    case 'desk': {
      const belowDesk = deskPos.y < 150;
      prompts.push({
        key: 'station-desk',
        worldX: Math.max(165, Math.min(245, deskPos.x)),
        worldY: belowDesk ? deskPos.y + 42 : deskPos.y - 34,
        below: belowDesk,
        buttons: [
          {
            id: 'desk-wp',
            kbd: 'E',
            icon: 'briefcase',
            label: 'WP +£95',
            variant: 'emerald',
            disabled: locked,
            onClick: () => shipWordPressTicket(state),
          },
          {
            id: 'desk-vibe',
            kbd: '2',
            icon: 'code',
            label: state.aiCooldown > 0 ? `${state.aiCooldown.toFixed(1)}s` : 'Vibe £0',
            variant: 'dark',
            disabled: locked || state.aiCooldown > 0,
            onClick: () => vibeCodeModularMail(state),
          },
          {
            id: 'desk-wow',
            kbd: '3',
            icon: 'sword',
            label: locked ? `${state.wowLockRemaining.toFixed(1)}s` : 'WoW',
            variant: 'violet',
            disabled: locked,
            onClick: () => playWowRaid(state),
          },
          {
            id: 'desk-rotate',
            kbd: 'R',
            icon: 'rotate',
            label: 'Rotate',
            variant: 'slate',
            disabled: locked,
            onClick: () => rotateOfficeLayout(state),
          },
        ],
      });
      break;
    }

    case 'rotate_office': {
      const pos = getStationPosition(state, 'rotate_office');
      prompts.push({
        key: 'station-rotate',
        worldX: pos.x,
        worldY: pos.y - 24,
        buttons: [
          {
            id: 'rotate-room',
            kbd: 'R',
            icon: 'rotate',
            label: 'Rotate Room',
            variant: 'slate',
            disabled: locked,
            onClick: () => rotateOfficeLayout(state),
          },
        ],
      });
      break;
    }

    case 'bike_trainer': {
      const pos = getStationPosition(state, 'bike_trainer');
      prompts.push({
        key: 'station-bike',
        worldX: pos.x,
        worldY: pos.y - 34,
        buttons: [
          {
            id: 'bike-spin',
            kbd: 'E',
            icon: 'bike',
            label: state.bikeSpinCooldown > 0 ? `${state.bikeSpinCooldown.toFixed(1)}s` : 'Turbo Spin',
            variant: 'dark',
            disabled: locked || state.bikeSpinCooldown > 0,
            onClick: () => rideTurboTrainer(state),
          },
          {
            id: 'bike-rotate',
            kbd: 'R',
            icon: 'rotate',
            label: 'Rotate',
            variant: 'slate',
            disabled: locked,
            onClick: () => rotateOfficeLayout(state),
          },
        ],
      });
      break;
    }

    case 'milo': {
      prompts.push({
        key: 'station-milo',
        worldX: state.milo.x + 12,
        worldY: state.milo.y - 24,
        buttons: [
          {
            id: 'milo-pat',
            kbd: 'E',
            icon: 'paw',
            label: 'Pat Milo',
            variant: 'amber',
            disabled: locked,
            onClick: () => patMilo(state),
          },
        ],
      });
      break;
    }

    case 'biscuits': {
      prompts.push({
        key: 'station-biscuits',
        worldX: FIXED_STATIONS.biscuits.x,
        worldY: FIXED_STATIONS.biscuits.y - 26,
        buttons: [
          {
            id: 'biscuits-eat',
            kbd: 'E',
            icon: 'biscuit',
            label: 'Digestives -£4.50',
            variant: 'amber',
            disabled: locked,
            onClick: () => eatDigestives(state),
          },
        ],
      });
      break;
    }

    case 'whatsapp_desk': {
      prompts.push({
        key: 'station-whatsapp',
        worldX: FIXED_STATIONS.whatsappDesk.x,
        worldY: FIXED_STATIONS.whatsappDesk.y - 28,
        buttons: [
          {
            id: 'wa-coupon',
            kbd: 'C',
            icon: 'coupon',
            label: 'Stack Coupon',
            variant: 'emerald',
            onClick: () => stackCoupon(state),
          },
        ],
      });
      break;
    }

    case 'apple_pedestal': {
      prompts.push({
        key: 'station-apple',
        worldX: state.pedestal.x,
        worldY: state.pedestal.y - 40,
        buttons: [
          {
            id: 'apple-buy',
            kbd: 'E',
            icon: 'laptop',
            label: `Buy ${getCurrentTier(state).chip}`,
            variant: 'dark',
            onClick: () => attemptBuyMacbook(state),
          },
        ],
      });
      break;
    }

    default:
      break;
  }

  // Always show "Pat Milo" beside Milo whenever he needs attention (unless already covered by nearestStation === 'milo')
  if (state.milo.needsPat && state.nearestStation !== 'milo') {
    prompts.push({
      key: 'alert-milo',
      worldX: state.milo.x + 12,
      worldY: state.milo.y - 24,
      isEvent: true,
      buttons: [
        {
          id: 'milo-alert-pat',
          icon: 'paw',
          label: 'Pat Milo',
          variant: 'amber',
          disabled: locked,
          onClick: () => patMilo(state),
        },
      ],
    });
  }

  return prompts;
}

function getLatestNotificationMessage(chatLog: ChatMessage[]): ChatMessage | null {
  for (let i = chatLog.length - 1; i >= 0; i--) {
    const msg = chatLog[i];
    if (msg.sender === 'gaurav' || msg.sender === 'hin') {
      return msg;
    }
  }
  return chatLog[chatLog.length - 1] ?? null;
}

function senderDisplayName(sender: ChatMessage['sender']): string {
  if (sender === 'josh') return 'Josh';
  if (sender === 'gaurav') return 'Gaurav';
  return 'Hin';
}

type PhoneApp = 'messages' | 'modular';
type KeynoteStage = 'none' | 'stage1' | 'stage2' | 'stage3';

function createModularMailChartSvg(): string {
  return `<svg class="mm-chart-svg" viewBox="0 0 220 54" aria-label="Modular Mail MRR flatline chart stuck at zero pounds">
    <line x1="8" y1="12" x2="212" y2="12" stroke="#1b2333" stroke-width="1" stroke-dasharray="3 3"/>
    <line x1="8" y1="28" x2="212" y2="28" stroke="#1b2333" stroke-width="1" stroke-dasharray="3 3"/>
    <line x1="8" y1="44" x2="212" y2="44" stroke="#253047" stroke-width="1"/>
    <text x="10" y="10" fill="#6f778c" font-family="JetBrains Mono, monospace" font-size="7">£1k</text>
    <text x="10" y="26" fill="#6f778c" font-family="JetBrains Mono, monospace" font-size="7">£500</text>
    <text x="10" y="41" fill="#6f778c" font-family="JetBrains Mono, monospace" font-size="7">£0</text>
    <line x1="26" y1="44" x2="210" y2="44" stroke="#10b981" stroke-width="2"/>
    <circle cx="210" cy="44" r="2.5" fill="#10b981"/>
  </svg>`;
}

export class HudController {
  private receiptShown = false;
  private lastWorldSignature = '';
  private promptElements = new Map<string, HTMLElement>();

  private phoneExpanded = false;
  private activeApp: PhoneApp = 'messages';
  private inKeynote = false;
  private preKeynoteExpanded = false;
  private userInteractedInKeynote = false;
  private lastChatId = 0;
  private unreadCount = 0;
  private lastPhoneSignature = '';

  constructor(private readonly el: HudElements) {
    this.el.worldUiLayer.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
    });
    this.el.iphoneWidget.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (this.inKeynote) {
        this.userInteractedInKeynote = true;
      }
    });
  }

  public resetForNewRun(state?: GameState): void {
    this.receiptShown = false;
    this.lastWorldSignature = '';
    this.promptElements.clear();
    this.el.worldUiLayer.innerHTML = '';

    this.phoneExpanded = false;
    this.activeApp = 'messages';
    this.inKeynote = false;
    this.preKeynoteExpanded = false;
    this.userInteractedInKeynote = false;
    this.unreadCount = 0;
    this.lastChatId = state?.chatLog[state.chatLog.length - 1]?.id ?? 0;
    this.lastPhoneSignature = '';
    this.el.iphoneWidget.dataset.expanded = 'false';
    this.el.iphoneWidget.dataset.keynote = 'false';

    if (this.el.receiptDialog.open) {
      this.el.receiptDialog.close();
    }
    if (this.el.introDialog.open) {
      this.el.introDialog.close();
    }
  }

  public sync(state: GameState): void {
    this.syncTopHud(state);
    this.syncWorldUi(state);
    this.syncIphone(state);

    if (state.status === 'gameover' && !this.receiptShown) {
      this.receiptShown = true;
      this.populateReceipt(state);
      if (!this.el.receiptDialog.open) {
        this.el.receiptDialog.showModal();
      }
    }
  }

  private syncTopHud(state: GameState): void {
    const week = getPregnancyWeek(state);
    this.el.clock.textContent = `Wk ${week} • ${state.timeRemaining.toFixed(1)}s`;
    this.el.clock.classList.toggle('urgent', state.timeRemaining < 18);

    const tier = getCurrentTier(state);
    const effective = getEffectivePrice(state);
    const couponCount = state.stackedCoupons.length;
    this.el.tier.textContent = tier.chip;
    this.el.rrp.textContent = `£${tier.rrp.toLocaleString()}`;
    this.el.rrp.hidden = couponCount === 0;
    this.el.effective.textContent =
      couponCount > 0
        ? `£${effective.toLocaleString()} (${couponCount})`
        : `£${tier.rrp.toLocaleString()}`;

    const fundRounded = Math.round(state.fund);
    this.el.fund.textContent = `Fund ${
      fundRounded < 0
        ? `-£${Math.abs(fundRounded).toLocaleString()}`
        : `£${fundRounded.toLocaleString()}`
    }`;
    const pct = Math.max(0, Math.min(100, (state.fund / effective) * 100));
    this.el.fundBar.style.width = `${pct.toFixed(1)}%`;

    const hin = Math.round(state.hinPatience);
    const milo = Math.round(state.miloMood);
    const vibe = Math.round(state.joshVibe);
    this.el.valHin.textContent = `${hin}%`;
    this.el.barHin.style.width = `${hin}%`;
    this.el.valMilo.textContent = `${milo}%`;
    this.el.barMilo.style.width = `${milo}%`;
    this.el.valVibe.textContent = `${vibe}%`;
    this.el.barVibe.style.width = `${vibe}%`;

    const activeAi = AI_PROVIDERS[state.activeAiProvider];
    const needsSwitch = state.activeAiProvider !== state.leadingAiProvider;
    const extraSubs = state.stats.uncanceledAiSubs > 1;
    this.el.aiStatus.classList.toggle('overtaken', needsSwitch);
    this.el.aiActiveLabel.textContent = `AI: ${activeAi.shortLabel}`;
    this.el.aiSubsBadge.hidden = !extraSubs;
    if (extraSubs) {
      this.el.aiSubsBadge.textContent = `${state.stats.uncanceledAiSubs} subs`;
    }
  }

  private syncWorldUi(state: GameState): void {
    const isPlaying = state.status === 'playing';
    this.el.worldUiLayer.hidden = !isPlaying;
    if (!isPlaying) return;

    const prompts = buildWorldPrompts(state);
    const signature = prompts
      .map((p) => {
        const btns = p.buttons
          .map((b) => `${b.id}:${b.kbd ?? ''}:${b.icon ?? ''}:${b.label}:${b.title ?? ''}:${b.variant}:${Boolean(b.disabled)}`)
          .join(',');
        return `${p.key}|${Boolean(p.below)}|${Boolean(p.isEvent)}|${p.timer ? p.timer.color : 'none'}|${btns}`;
      })
      .join('||');

    if (signature !== this.lastWorldSignature) {
      this.lastWorldSignature = signature;
      this.el.worldUiLayer.innerHTML = '';
      this.promptElements.clear();

      for (const p of prompts) {
        const group = document.createElement('div');
        group.className = 'world-prompt';
        if (p.below) group.classList.add('below');
        if (p.isEvent) group.classList.add('event-prompt');
        group.dataset.promptKey = p.key;

        const row = document.createElement('div');
        row.className = 'world-prompt-row';

        if (p.timer) {
          const timerChip = document.createElement('span');
          timerChip.className = 'timer-chip';
          timerChip.innerHTML = circularTimerSvg(p.timer.progress, p.timer.color);
          row.appendChild(timerChip);
        }

        for (const spec of p.buttons) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `gbtn gbtn-${spec.variant} gbtn-xs`;
          btn.disabled = Boolean(spec.disabled);
          if (spec.title) {
            btn.title = spec.title;
          }

          if (spec.kbd) {
            const kbd = document.createElement('kbd');
            kbd.className = 'keycap';
            kbd.textContent = spec.kbd;
            btn.appendChild(kbd);
          }

          if (spec.icon) {
            const ico = document.createElement('span');
            ico.className = 'gbtn-ico';
            ico.innerHTML = ICONS[spec.icon];
            btn.appendChild(ico);
          }

          const txt = document.createElement('span');
          txt.textContent = spec.label;
          btn.appendChild(txt);

          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            spec.onClick();
          });
          row.appendChild(btn);
        }

        group.appendChild(row);
        this.el.worldUiLayer.appendChild(group);
        this.promptElements.set(p.key, group);
      }
    }

    // Update positions and circular countdown rings smoothly without destroying DOM
    for (const p of prompts) {
      const group = this.promptElements.get(p.key);
      if (!group) continue;
      const { leftPct, topPct } = worldToSafePct(p.worldX, p.worldY);
      const leftStr = `${leftPct.toFixed(2)}%`;
      const topStr = `${topPct.toFixed(2)}%`;
      if (group.style.left !== leftStr) group.style.left = leftStr;
      if (group.style.top !== topStr) group.style.top = topStr;

      if (p.timer) {
        const ringEl = group.querySelector('[data-timer-ring]');
        if (ringEl) {
          updateCircularTimerRing(ringEl, p.timer.progress);
        }
      }
    }
  }

  private syncIphone(state: GameState): void {
    const isVisible = state.status === 'playing' || state.status === 'keynote';
    this.el.iphoneWidget.hidden = !isVisible;
    if (!isVisible) return;

    const isKeynote = state.status === 'keynote' && state.keynoteOverlay !== null;
    if (isKeynote && !this.inKeynote) {
      this.inKeynote = true;
      this.preKeynoteExpanded = this.phoneExpanded;
      this.userInteractedInKeynote = false;
      this.phoneExpanded = true;
      this.activeApp = 'messages';
      this.unreadCount = 0;
    } else if (!isKeynote && this.inKeynote) {
      this.inKeynote = false;
      if (!this.userInteractedInKeynote) {
        this.phoneExpanded = this.preKeynoteExpanded;
      }
      this.lastPhoneSignature = '';
    }

    const latest = state.chatLog[state.chatLog.length - 1];
    const latestId = latest?.id ?? 0;

    if (latestId > this.lastChatId) {
      const newCount = state.chatLog.filter((m) => m.id > this.lastChatId).length;
      this.lastChatId = latestId;
      if (!this.phoneExpanded || this.activeApp !== 'messages') {
        this.unreadCount += newCount;
      }
    }

    const keynoteElapsed = isKeynote
      ? Math.max(0, state.keynoteOverlay!.duration - state.keynoteOverlay!.remaining)
      : 0;
    let keynoteStage: KeynoteStage = 'none';
    if (isKeynote && state.chatLog.length >= 2) {
      if (keynoteElapsed < 1.3) {
        keynoteStage = 'stage1';
      } else if (keynoteElapsed < 2.6) {
        keynoteStage = 'stage2';
      } else {
        keynoteStage = 'stage3';
      }
    }

    const mmFlashActive = state.modularMailFakeFlash > 0;
    const deploys = state.stats.modularMailDeploys;
    const aiSpend = Math.round(state.stats.aiTotalSpend);
    const phoneSig = `${isKeynote}|${this.phoneExpanded}|${this.activeApp}|${keynoteStage}|${latestId}|${this.unreadCount}|${mmFlashActive}|${deploys}|${aiSpend}`;

    if (phoneSig !== this.lastPhoneSignature) {
      this.lastPhoneSignature = phoneSig;

      this.el.iphoneWidget.dataset.expanded = this.phoneExpanded ? 'true' : 'false';
      this.el.iphoneWidget.dataset.keynote = isKeynote ? 'true' : 'false';
      this.el.iphoneWidget.innerHTML = '';

      const screen = document.createElement('div');
      screen.className = 'iphone-screen';

      // Top iPhone status bar with Dynamic Island
      const statusbar = document.createElement('div');
      statusbar.className = 'iphone-statusbar';

      const timeSpan = document.createElement('span');
      timeSpan.textContent = '9:41';

      const island = document.createElement('span');
      island.className = 'iphone-island';
      island.setAttribute('aria-hidden', 'true');

      const unreadBadge = document.createElement('span');
      unreadBadge.className = 'iphone-unread tabular';
      unreadBadge.hidden = this.phoneExpanded || this.unreadCount <= 0;
      unreadBadge.textContent = `${this.unreadCount}`;

      statusbar.append(timeSpan, island, unreadBadge);
      screen.appendChild(statusbar);

      if (!this.phoneExpanded) {
        this.el.iphoneWidget.setAttribute('aria-label', "Josh's iPhone");
        const peek = document.createElement('div');
        peek.className = 'iphone-peek';

        const msg = getLatestNotificationMessage(state.chatLog);
        const senderRow = document.createElement('div');
        senderRow.className = 'iphone-peek-sender';

        const senderLeft = document.createElement('span');
        senderLeft.className = 'iphone-peek-sender-left';

        const dot = document.createElement('span');
        dot.className = 'wa-dot';
        dot.setAttribute('aria-hidden', 'true');

        const phoneIco = document.createElement('span');
        phoneIco.className = 'gbtn-ico';
        phoneIco.innerHTML = ICONS.phone;

        const senderName = document.createElement('span');
        senderName.textContent = msg ? senderDisplayName(msg.sender) : 'Gaurav';

        senderLeft.append(dot, phoneIco, senderName);

        const hint = document.createElement('span');
        hint.className = 'iphone-peek-hint';
        hint.textContent = '2 APPS • OPEN';

        senderRow.append(senderLeft, hint);

        const preview = document.createElement('p');
        preview.className = 'iphone-peek-text';
        preview.textContent = msg ? msg.text : 'No messages yet.';

        peek.append(senderRow, preview);
        screen.appendChild(peek);

        this.el.iphoneWidget.onclick = (e) => {
          e.stopPropagation();
          this.phoneExpanded = true;
          if (this.activeApp === 'messages') {
            this.unreadCount = 0;
          }
          this.lastPhoneSignature = '';
          this.syncIphone(state);
        };
      } else {
        this.el.iphoneWidget.onclick = null;
        this.el.iphoneWidget.setAttribute(
          'aria-label',
          this.activeApp === 'messages' ? "Josh's iPhone — Gaurav Messages" : "Josh's iPhone — Modular Mail",
        );

        screen.appendChild(this.renderPhoneHeader(state, keynoteStage));

        if (this.activeApp === 'messages') {
          this.renderMessagesApp(screen, state, keynoteStage);
        } else {
          this.renderModularMailApp(screen, deploys, aiSpend, mmFlashActive);
        }

        screen.appendChild(this.renderPhoneDock(state, mmFlashActive));
      }

      this.el.iphoneWidget.appendChild(screen);
    }

    // Smoothly stream Josh's character-by-character typing in Stage 1 without rebuilding the DOM
    if (this.phoneExpanded && this.activeApp === 'messages' && keynoteStage === 'stage1') {
      const joshMsg = state.chatLog[state.chatLog.length - 2];
      const fullText = joshMsg?.text ?? state.keynoteOverlay?.tier.joshTextToGaurav ?? '';
      const charCount = Math.max(
        0,
        Math.min(fullText.length, Math.ceil((keynoteElapsed / 1.05) * fullText.length)),
      );
      const composerTextEl = document.getElementById('iphone-composer-text');
      if (composerTextEl) {
        composerTextEl.textContent = fullText.slice(0, charCount);
      }
      const sendBadgeEl = this.el.iphoneWidget.querySelector('.iphone-send-badge');
      if (sendBadgeEl) {
        sendBadgeEl.classList.toggle('ready', charCount >= fullText.length);
      }
    }
  }

  private renderPhoneHeader(state: GameState, keynoteStage: KeynoteStage): HTMLElement {
    const header = document.createElement('div');
    header.className = 'iphone-header';

    const contact = document.createElement('div');
    contact.className = 'iphone-contact';

    if (this.activeApp === 'messages') {
      const dot = document.createElement('span');
      dot.className = 'wa-dot';
      dot.setAttribute('aria-hidden', 'true');

      const meta = document.createElement('div');
      meta.className = 'iphone-contact-meta';

      const name = document.createElement('span');
      name.className = 'iphone-contact-name';
      name.textContent = 'Gaurav';

      const sub = document.createElement('span');
      sub.className = 'iphone-contact-status';
      sub.textContent = keynoteStage === 'stage2' ? 'typing...' : 'online';

      meta.append(name, sub);
      contact.append(dot, meta);
    } else {
      const chartIco = document.createElement('span');
      chartIco.className = 'gbtn-ico mm-live-ico';
      chartIco.innerHTML = ICONS.chart;

      const meta = document.createElement('div');
      meta.className = 'iphone-contact-meta';

      const name = document.createElement('span');
      name.className = 'iphone-contact-name';
      name.textContent = 'Modular Mail';

      const sub = document.createElement('span');
      sub.className = 'iphone-contact-status';
      const liveDot = document.createElement('span');
      liveDot.className = 'mm-live-dot';
      liveDot.setAttribute('aria-hidden', 'true');
      sub.append(liveDot, document.createTextNode('LIVE'));

      meta.append(name, sub);
      contact.append(chartIco, meta);
    }

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'gbtn gbtn-slate gbtn-icon';
    closeBtn.setAttribute('aria-label', 'Close iPhone');
    closeBtn.innerHTML = `<span class="gbtn-ico">${ICONS.close}</span>`;
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.phoneExpanded = false;
      this.lastPhoneSignature = '';
      this.syncIphone(state);
    });

    header.append(contact, closeBtn);
    return header;
  }

  private renderMessagesApp(
    screen: HTMLElement,
    state: GameState,
    keynoteStage: KeynoteStage,
  ): void {
    const thread = document.createElement('div');
    thread.className = 'iphone-thread';

    let visibleMessages = state.chatLog;
    if (keynoteStage === 'stage1') {
      visibleMessages = state.chatLog.slice(0, -2);
    } else if (keynoteStage === 'stage2') {
      visibleMessages = state.chatLog.slice(0, -1);
    }

    visibleMessages.forEach((msg, idx) => {
      const bubble = document.createElement('div');
      bubble.className = `iphone-bubble ${msg.sender}`;

      const isPopIn =
        (keynoteStage === 'stage2' && idx === visibleMessages.length - 1) ||
        (keynoteStage === 'stage3' && idx === visibleMessages.length - 1);
      if (isPopIn) {
        bubble.classList.add('msg-pop-in');
      }

      const senderTag = document.createElement('span');
      senderTag.className = 'iphone-bubble-sender';
      senderTag.textContent = `${senderDisplayName(msg.sender)} • ${msg.timeLabel}`;

      bubble.append(senderTag, document.createTextNode(msg.text));

      const showDelivered =
        (keynoteStage === 'stage2' && idx === visibleMessages.length - 1) ||
        (keynoteStage === 'stage3' && idx === visibleMessages.length - 2);
      if (showDelivered && msg.sender === 'josh') {
        const delivered = document.createElement('span');
        delivered.className = 'iphone-delivered';
        delivered.textContent = 'Delivered';
        bubble.appendChild(delivered);
      }

      thread.appendChild(bubble);
    });

    if (keynoteStage === 'stage2') {
      const typingBubble = document.createElement('div');
      typingBubble.className = 'iphone-bubble gaurav typing-bubble msg-pop-in';

      const senderTag = document.createElement('span');
      senderTag.className = 'iphone-bubble-sender';
      senderTag.textContent = 'Gaurav';

      const dots = document.createElement('span');
      dots.className = 'typing-dots';
      dots.setAttribute('aria-label', 'Gaurav is typing');
      dots.append(
        document.createElement('span'),
        document.createElement('span'),
        document.createElement('span'),
      );

      typingBubble.append(senderTag, dots);
      thread.appendChild(typingBubble);
    }

    screen.appendChild(thread);

    if (keynoteStage === 'stage1') {
      const composer = document.createElement('div');
      composer.id = 'iphone-composer';
      composer.className = 'iphone-composer';

      const field = document.createElement('div');
      field.className = 'iphone-composer-field';

      const typedSpan = document.createElement('span');
      typedSpan.id = 'iphone-composer-text';

      const cursor = document.createElement('span');
      cursor.className = 'composer-cursor';
      cursor.setAttribute('aria-hidden', 'true');

      field.append(typedSpan, cursor);

      const sendBadge = document.createElement('span');
      sendBadge.className = 'iphone-send-badge';
      sendBadge.textContent = 'SEND';

      composer.append(field, sendBadge);
      screen.appendChild(composer);
    }

    const footer = document.createElement('div');
    footer.className = 'iphone-footer';

    const couponBtn = document.createElement('button');
    couponBtn.type = 'button';
    couponBtn.className = 'gbtn gbtn-emerald gbtn-sm';
    couponBtn.disabled = state.status !== 'playing';
    couponBtn.innerHTML = `<span class="gbtn-ico">${ICONS.coupon}</span><span>Stack Coupon &amp; Text Lad</span><kbd class="keycap">C</kbd>`;
    couponBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      stackCoupon(state);
    });

    footer.appendChild(couponBtn);
    screen.appendChild(footer);

    requestAnimationFrame(() => {
      thread.scrollTop = thread.scrollHeight;
    });
  }

  private renderModularMailApp(
    screen: HTMLElement,
    deploys: number,
    aiSpend: number,
    mmFlashActive: boolean,
  ): void {
    const dash = document.createElement('div');
    dash.className = 'mm-dashboard';

    const grid = document.createElement('div');
    grid.className = 'mm-kpi-grid';

    const customersCard = document.createElement('div');
    customersCard.className = mmFlashActive ? 'mm-kpi-card flash' : 'mm-kpi-card';
    const cLabel = document.createElement('span');
    cLabel.className = 'mm-kpi-label';
    cLabel.textContent = 'CUSTOMERS';
    const cVal = document.createElement('span');
    cVal.className = 'mm-kpi-val tabular';
    cVal.textContent = mmFlashActive ? '1?!' : '0';
    customersCard.append(cLabel, cVal);
    if (mmFlashActive) {
      const cNote = document.createElement('span');
      cNote.className = 'mm-kpi-note';
      cNote.textContent = 'False alarm: Mum (Ormskirk)';
      customersCard.appendChild(cNote);
    }

    const mrrCard = document.createElement('div');
    mrrCard.className = 'mm-kpi-card';
    const mLabel = document.createElement('span');
    mLabel.className = 'mm-kpi-label';
    mLabel.textContent = 'MRR';
    const mVal = document.createElement('span');
    mVal.className = 'mm-kpi-val tabular';
    mVal.textContent = '£0.00';
    mrrCard.append(mLabel, mVal);

    const deploysCard = document.createElement('div');
    deploysCard.className = 'mm-kpi-card';
    const dLabel = document.createElement('span');
    dLabel.className = 'mm-kpi-label';
    dLabel.textContent = 'DEPLOYS';
    const dVal = document.createElement('span');
    dVal.className = 'mm-kpi-val tabular';
    dVal.textContent = `${deploys}`;
    deploysCard.append(dLabel, dVal);

    const spendCard = document.createElement('div');
    spendCard.className = 'mm-kpi-card';
    const sLabel = document.createElement('span');
    sLabel.className = 'mm-kpi-label';
    sLabel.textContent = 'AI SPEND';
    const sVal = document.createElement('span');
    sVal.className = 'mm-kpi-val mm-kpi-rose tabular';
    sVal.textContent = `-£${aiSpend.toLocaleString()}`;
    spendCard.append(sLabel, sVal);

    grid.append(customersCard, mrrCard, deploysCard, spendCard);

    const chartCard = document.createElement('div');
    chartCard.className = 'mm-chart-card';
    chartCard.innerHTML = createModularMailChartSvg();

    const chartLabel = document.createElement('div');
    chartLabel.className = 'mm-chart-label tabular';
    chartLabel.textContent = '£0.00 MRR • 0.00% CONVERSION';
    chartCard.appendChild(chartLabel);

    dash.append(grid, chartCard);
    screen.appendChild(dash);
  }

  private renderPhoneDock(state: GameState, mmFlashActive: boolean): HTMLElement {
    const dock = document.createElement('div');
    dock.className = 'iphone-dock';
    dock.setAttribute('role', 'tablist');
    dock.setAttribute('aria-label', 'iPhone apps');

    const msgTab = document.createElement('button');
    msgTab.type = 'button';
    msgTab.role = 'tab';
    msgTab.className = this.activeApp === 'messages' ? 'iphone-dock-tab active' : 'iphone-dock-tab';
    msgTab.setAttribute('aria-selected', this.activeApp === 'messages' ? 'true' : 'false');
    msgTab.innerHTML = `<span class="dock-ico">${ICONS.chat}</span><span>Messages</span>`;
    if (this.unreadCount > 0) {
      const badge = document.createElement('span');
      badge.className = 'dock-badge tabular';
      badge.textContent = `${this.unreadCount}`;
      msgTab.appendChild(badge);
    }
    msgTab.addEventListener('click', (e) => {
      e.stopPropagation();
      this.activeApp = 'messages';
      this.unreadCount = 0;
      this.lastPhoneSignature = '';
      this.syncIphone(state);
    });

    const mmTab = document.createElement('button');
    mmTab.type = 'button';
    mmTab.role = 'tab';
    mmTab.className = this.activeApp === 'modular' ? 'iphone-dock-tab active' : 'iphone-dock-tab';
    mmTab.setAttribute('aria-selected', this.activeApp === 'modular' ? 'true' : 'false');
    mmTab.innerHTML = `<span class="dock-ico">${ICONS.chart}</span><span>Modular Mail</span>`;
    if (mmFlashActive) {
      const amberDot = document.createElement('span');
      amberDot.className = 'dock-amber-dot';
      amberDot.setAttribute('aria-hidden', 'true');
      mmTab.appendChild(amberDot);
    }
    mmTab.addEventListener('click', (e) => {
      e.stopPropagation();
      this.activeApp = 'modular';
      this.lastPhoneSignature = '';
      this.syncIphone(state);
    });

    dock.append(msgTab, mmTab);
    return dock;
  }

  private populateReceipt(state: GameState): void {
    const tier = getCurrentTier(state);
    const reason = state.gameOverReason ?? 'baby_arrived';
    const copy = getGameOverCopy(reason, tier.name);
    const rank = getRoastRank(state);
    const s = state.stats;

    this.el.receiptTitle.textContent = copy.headline;
    this.el.receiptDetail.textContent = copy.detail;
    this.el.receiptRankTitle.textContent = rank.title;
    this.el.receiptRankSub.textContent = rank.subtitle;

    const rows: Array<[string, string]> = [
      ['PEAK MACBOOK FUND', `£${Math.round(s.peakFund).toLocaleString()} (Target: ${tier.chip} £${tier.rrp.toLocaleString()})`],
      ['APPLE KEYNOTES SURVIVED', `${s.keynotesSurvived}`],
      ['MODULAR MAIL CUSTOMERS', '0 (£0.00 MRR)'],
      ['AI SWITCHES / ACTIVE SUBS', `${s.aiProviderSwitches} switches • ${s.uncanceledAiSubs} uncanceled (£${Math.round(s.aiTotalSpend)})`],
      ['TEXTS TO GAURAV ("LAD"/"KID")', `${s.messagesToGaurav} • £${s.fakeSavingsClaimed.toLocaleString()} fake coupons (£0 honoured)`],
      ['WORDPRESS TICKETS SHIPPED', `${s.wordpressTicketsShipped}`],
      ['WOW RAIDS / OFFICE ROTATIONS', `${s.wowRaidsPlayed} raids • ${s.officeRotations} room layouts`],
      ['ANKER GaN / KETTLEBELLS', `${s.ankerWattsHoarded.toLocaleString()}W • ${s.kettlebellKgHoarded}kg iron`],
      ['DIGESTIVES / MILO PATS', `${s.digestivesEaten} biscuits • ${s.miloPats} pats`],
      ['"£0 FREE" ANTIBES / ORMSKIRK', `£${s.antibesActualSpend} Antibes • ${s.ormskirkTrips} Ormskirk runs`],
    ];

    this.el.receiptLines.innerHTML = '';
    for (const [k, v] of rows) {
      const row = document.createElement('div');
      row.className = 'receipt-row';
      const label = document.createElement('span');
      label.textContent = k;
      const val = document.createElement('span');
      val.textContent = v;
      row.append(label, val);
      this.el.receiptLines.appendChild(row);
    }
  }
}

export function wireGlobalHudButtons(el: HudElements, getState: () => GameState, onStart: () => void): void {
  el.btnCoupon.addEventListener('click', () => stackCoupon(getState()));
  el.btnStartGame.addEventListener('click', onStart);
  el.btnPlayAgain.addEventListener('click', onStart);

  // Guard closedby="none" via cancel event for browsers without closedby (e.g. Safari)
  el.introDialog.addEventListener('cancel', (e) => e.preventDefault());
  el.receiptDialog.addEventListener('cancel', (e) => e.preventDefault());

  // Reset returnValue on close per modern-web-guidance dialog best practice
  el.introDialog.addEventListener('close', () => {
    el.introDialog.returnValue = '';
  });
  el.receiptDialog.addEventListener('close', () => {
    el.receiptDialog.returnValue = '';
  });
}
