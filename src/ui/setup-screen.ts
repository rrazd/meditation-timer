// src/ui/setup-screen.ts
import type { SceneName } from '../scenes/scene.interface.js';

const SCENE_NAMES: SceneName[] = ['rain', 'forest', 'ocean'];

const SCENE_LABEL_BG: Record<SceneName, string> = {
  rain:   'rgba(6,2,18,0.68)',
  forest: 'rgba(3,10,4,0.65)',
  ocean:  'rgba(2,12,20,0.72)',
};
const ACTIVE_LABEL_BG = 'rgba(42,65,145,0.55)';

const SCENE_CARD_STYLES: Record<SceneName, { bg: string; border: string; shadow: string }> = {
  rain:   {
    bg:     'rgba(55,20,105,0.16)',
    border: 'rgba(140,100,220,0.06)',
    shadow: '0 0 50px 16px rgba(80,30,160,0.18), 0 0 100px 50px rgba(60,20,130,0.12), 0 0 180px 90px rgba(40,10,100,0.08)',
  },
  forest: {
    bg:     'rgba(0,52,26,0.28)',
    border: 'rgba(30,110,60,0.07)',
    shadow: '0 0 50px 16px rgba(0,82,38,0.22), 0 0 110px 55px rgba(0,58,28,0.15), 0 0 200px 100px rgba(0,38,18,0.09)',
  },
  ocean:  {
    bg:     'rgba(0,100,100,0.17)',
    border: 'rgba(40,200,190,0.06)',
    shadow: '0 0 50px 16px rgba(0,150,140,0.18), 0 0 100px 50px rgba(0,110,105,0.12), 0 0 180px 90px rgba(0,75,70,0.08)',
  },
};

export function initSetupScreen(onStart: (durationMs: number, sceneName: SceneName) => void): void {
  const container = document.querySelector<HTMLElement>('#setup-screen')!;
  const durationInput = container.querySelector<HTMLInputElement>('#duration-input')!;
  const startButton = container.querySelector<HTMLButtonElement>('#start-button')!;
  const errorMsg = container.querySelector<HTMLElement>('#duration-error')!;
  const tabPreset = container.querySelector<HTMLButtonElement>('#tab-preset')!;
  const tabCustom = container.querySelector<HTMLButtonElement>('#tab-custom')!;
  const panelPreset = container.querySelector<HTMLElement>('#panel-preset')!;
  const panelCustom = container.querySelector<HTMLElement>('#panel-custom')!;

  const presetMinutes = [10, 15, 20];
  let selectedScene: SceneName = 'rain';

  // Apply initial card hue for default scene (rain) — no transition on first paint
  const card = container.querySelector<HTMLElement>('#setup-card');
  if (card) {
    const s = SCENE_CARD_STYLES.rain;
    card.style.background = s.bg;
    card.style.borderColor = s.border;
    card.style.boxShadow = s.shadow;
  }

  // --- Sliding pill for segmented control ---
  const segPill  = container.querySelector<HTMLElement>('#seg-pill')!;
  const segHover = container.querySelector<HTMLElement>('#seg-hover')!;
  const segControl = container.querySelector<HTMLElement>('#seg-control')!;

  const EASE = 'cubic-bezier(0,0,0.2,1)'; // pure ease-out: starts at full speed, lands softly

  // Move an indicator element to sit exactly under the given button
  function syncIndicator(el: HTMLElement, btn: HTMLButtonElement): void {
    el.style.width     = btn.offsetWidth + 'px';
    el.style.transform = `translateX(${btn.offsetLeft - tabPreset.offsetLeft}px)`;
  }

  // Set initial position without transition, then enable it after the first paint
  segPill.style.transition  = 'none';
  segHover.style.transition = 'none';
  syncIndicator(segPill, tabPreset);
  requestAnimationFrame(() => {
    segPill.style.transition  = `transform 100ms cubic-bezier(0,0,0.15,1), width 100ms cubic-bezier(0,0,0.15,1)`;
    segHover.style.transition = 'opacity 100ms ease';
  });

  // Hover ghost — appears instantly, fades out on leave
  [tabPreset, tabCustom].forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      segHover.style.transition = 'none';
      syncIndicator(segHover, btn);
      segHover.style.opacity = '1';
    });
  });
  segControl.addEventListener('mouseleave', () => {
    segHover.style.transition = 'opacity 100ms ease';
    segHover.style.opacity = '0';
  });

  // --- Tab toggle ---
  tabPreset.addEventListener('click', () => switchTab('preset'));
  tabCustom.addEventListener('click', () => switchTab('custom'));

  function switchTab(tab: 'preset' | 'custom'): void {
    if (tab === 'preset') {
      // Panel switches instantly — pill slides after via CSS transition
      panelPreset.style.display = 'flex';
      panelCustom.style.display = 'none';
      syncIndicator(segPill, tabPreset);
      tabPreset.style.color = 'rgba(255,255,255,0.90)';
      tabPreset.style.fontWeight = '500';
      tabCustom.style.color = 'rgba(155,178,255,0.68)';
      tabCustom.style.fontWeight = '400';
    } else {
      panelPreset.style.display = 'none';
      panelCustom.style.display = 'flex';
      syncIndicator(segPill, tabCustom);
      tabCustom.style.color = 'rgba(255,255,255,0.90)';
      tabCustom.style.fontWeight = '500';
      tabPreset.style.color = 'rgba(155,178,255,0.68)';
      tabPreset.style.fontWeight = '400';
      durationInput.focus();
    }
    clearError();
  }

  // --- Preset pill hover ghost ---
  const presetHover = container.querySelector<HTMLElement>('#preset-hover')!;
  const firstPresetBtn = container.querySelector<HTMLButtonElement>('[data-preset]')!;

  presetMinutes.forEach((minutes) => {
    const btn = container.querySelector<HTMLButtonElement>(`[data-preset="${minutes}"]`);
    if (!btn) return;
    btn.addEventListener('mouseenter', () => {
      presetHover.style.transition = 'none';
      presetHover.style.width     = btn.offsetWidth + 'px';
      presetHover.style.transform = `translateX(${btn.offsetLeft - firstPresetBtn.offsetLeft}px)`;
      presetHover.style.opacity   = '1';
    });
  });
  panelPreset.addEventListener('mouseleave', () => {
    presetHover.style.transition = 'opacity 100ms ease';
    presetHover.style.opacity = '0';
  });

  // --- Duration preset buttons ---
  presetMinutes.forEach((minutes) => {
    const btn = container.querySelector<HTMLButtonElement>(`[data-preset="${minutes}"]`);
    if (!btn) return;
    btn.addEventListener('click', () => {
      durationInput.value = String(minutes);
      clearError();
      setActivePreset(btn);
    });
  });

  durationInput.addEventListener('input', () => {
    clearError();
  });

  // --- Scene selector buttons ---
  SCENE_NAMES.forEach((sceneName) => {
    const btn = container.querySelector<HTMLButtonElement>(`[data-scene="${sceneName}"]`);
    if (!btn) return;
    btn.addEventListener('click', () => {
      selectedScene = sceneName;
      setActiveScene(btn);
    });
    // Hover brightness handled entirely by CSS [data-scene]:hover svg rule — no JS needed
  });

  // --- Start button ---
  startButton.addEventListener('click', () => {
    const parsed = parseFloat(durationInput.value);
    const raw = Math.round(parsed);
    // Reject non-integers (e.g. 1.5) but allow x.0 values (e.g. 10.0)
    if (isNaN(parsed) || !Number.isInteger(parsed) || raw < 1 || raw > 60) {
      showError();
      return;
    }
    clearError();
    onStart(raw * 60 * 1000, selectedScene);
  });

  // --- Helpers ---

  function setActivePreset(activeBtn: HTMLButtonElement): void {
    clearActivePresets();
    activeBtn.style.background   = 'rgba(42,65,145,0.55)';
    activeBtn.style.color        = 'rgba(255,255,255,0.90)';
    activeBtn.style.borderColor  = 'rgba(70,100,185,0.50)';
  }

  function clearActivePresets(): void {
    presetMinutes.forEach((minutes) => {
      const btn = container.querySelector<HTMLButtonElement>(`[data-preset="${minutes}"]`);
      if (btn) {
        btn.style.background = 'transparent';
        btn.style.color = 'rgba(255,255,255,0.70)';
        btn.style.borderColor = 'rgba(255,255,255,0.22)';
      }
    });
  }

  function sceneLabel(btn: HTMLButtonElement): HTMLElement | null {
    return btn.querySelector<HTMLElement>('.scene-label');
  }

  function setActiveScene(activeBtn: HTMLButtonElement): void {
    const sceneName = activeBtn.getAttribute('data-scene') as SceneName;

    SCENE_NAMES.forEach((name) => {
      const btn = container.querySelector<HTMLButtonElement>(`[data-scene="${name}"]`);
      if (btn) {
        btn.removeAttribute('data-active'); // CSS [data-scene] rule → brightness(0.72)
        btn.style.borderColor = 'rgba(255,255,255,0.12)';
        btn.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.06)';
        const label = sceneLabel(btn);
        if (label) label.style.background = SCENE_LABEL_BG[name];
      }
    });
    activeBtn.setAttribute('data-active', ''); // CSS [data-scene][data-active] → brightness(0.88)
    activeBtn.style.borderColor = 'rgba(88,118,228,0.95)';
    activeBtn.style.boxShadow = '0 0 0 1px rgba(88,118,228,0.45), 0 0 22px rgba(98,120,255,0.50), inset 0 1px 0 rgba(255,255,255,0.14)';
    const activeLabel = sceneLabel(activeBtn);
    if (activeLabel) activeLabel.style.background = ACTIVE_LABEL_BG;

    if (card && sceneName) {
      const s = SCENE_CARD_STYLES[sceneName];
      card.style.background = s.bg;
      card.style.borderColor = s.border;
      card.style.boxShadow = s.shadow;
    }
  }

  // Apply initial scene button states — CSS rules handle brightness via data-active
  const defaultSceneBtn = container.querySelector<HTMLButtonElement>('[data-scene="rain"]');
  if (defaultSceneBtn) {
    defaultSceneBtn.setAttribute('data-active', '');
    defaultSceneBtn.style.borderColor = 'rgba(88,118,228,0.95)';
    defaultSceneBtn.style.boxShadow = '0 0 0 1px rgba(88,118,228,0.45), 0 0 22px rgba(98,120,255,0.50), inset 0 1px 0 rgba(255,255,255,0.14)';
    const label = sceneLabel(defaultSceneBtn);
    if (label) label.style.background = ACTIVE_LABEL_BG;
  }

  const floatField = container.querySelector<HTMLElement>('.float-field');

  function showError(): void {
    errorMsg.style.display = 'block';
    if (floatField) floatField.style.borderColor = '#f87171';
  }

  function clearError(): void {
    errorMsg.style.display = 'none';
    if (floatField) floatField.style.borderColor = '';
  }
}
