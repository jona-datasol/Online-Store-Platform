/**
 * Online Store Platform — Dynamic Theme & WCAG 2.2 AA Contrast Unit Tests
 * Author: JoNa (https://github.com/jona-datasol)
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyDynamicTheme,
  DARK_ON_COLOR_HEX,
  DEFAULT_BRAND_PALETTE,
  deriveAccessibleTextColor,
  getContrastRatio,
  getRelativeLuminance,
  isValidHexColor,
  LIGHT_ON_COLOR_HEX,
  LIGHT_SURFACE_HEX,
  resetDynamicTheme,
  resolveDynamicTheme,
  sanitizeHexColor,
  selectAccessibleOnColor,
  WCAG_AA_NORMAL_TEXT_RATIO,
} from '@/lib/theme';

describe('theme sanitization and anti-CSS-injection', () => {
  it('accepts strict 6-digit HEX colors and normalizes to uppercase', () => {
    expect(isValidHexColor('#0f766e')).toBe(true);
    expect(isValidHexColor('#18181B')).toBe(true);
    expect(sanitizeHexColor('  #0f766e  ', DEFAULT_BRAND_PALETTE.primaryColor)).toBe('#0F766E');
  });

  it('rejects malformed HEX values and CSS injection payloads', () => {
    const maliciousInputs = [
      '#fff',
      '18181B',
      '#18181BG',
      '#18181B; background: url(https://evil.example/x)',
      'rgb(0, 0, 0)',
      'var(--color-error)',
      '#111111} body { display: none; }',
      'expression(alert(1))',
      '',
      '   ',
    ];

    for (const candidate of maliciousInputs) {
      expect(isValidHexColor(candidate)).toBe(false);
      expect(sanitizeHexColor(candidate, DEFAULT_BRAND_PALETTE.primaryColor)).toBe(
        DEFAULT_BRAND_PALETTE.primaryColor
      );
    }

    expect(sanitizeHexColor(null, DEFAULT_BRAND_PALETTE.accentColor)).toBe(
      DEFAULT_BRAND_PALETTE.accentColor
    );
    expect(sanitizeHexColor(undefined, DEFAULT_BRAND_PALETTE.secondaryColor)).toBe(
      DEFAULT_BRAND_PALETTE.secondaryColor
    );
  });
});

describe('WCAG 2.2 AA luminance and contrast calculations', () => {
  it('computes deterministic relative luminance and reference contrast ratios', () => {
    expect(getRelativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(getRelativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
    expect(getContrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 2);
    expect(getContrastRatio('#18181B', '#FFFFFF')).toBeGreaterThan(17);
    expect(getContrastRatio('#0F766E', '#FFFFFF')).toBeGreaterThan(5.4);
  });

  it('uses the WCAG 2.1/2.2 sRGB linearization threshold (0.04045) at channel boundaries 10 and 11', () => {
    // Channel 10/255 = 0.0392157 <= 0.04045 -> linear segment (srgb / 12.92)
    expect(getRelativeLuminance('#0A0A0A')).toBeCloseTo(10 / 255 / 12.92, 6);
    // Channel 11/255 = 0.0431373 > 0.04045 -> gamma segment (((srgb + 0.055) / 1.055) ** 2.4)
    const expectedGamma = ((11 / 255 + 0.055) / 1.055) ** 2.4;
    expect(getRelativeLuminance('#0B0B0B')).toBeCloseTo(expectedGamma, 6);
  });

  it('selects #FFFFFF on dark brand colors and #111827 on light brand colors with >= 4.5:1 contrast', () => {
    const darkColors = ['#18181B', '#1D4ED8', '#0F766E', '#7C2D12', '#111827'];
    for (const hex of darkColors) {
      const onColor = selectAccessibleOnColor(hex);
      expect(onColor).toBe(LIGHT_ON_COLOR_HEX);
      expect(getContrastRatio(hex, onColor)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT_RATIO);
    }

    const lightColors = ['#FFFFFF', '#FACC15', '#38BDF8', '#A3E635', '#FDE68A', '#E5E7EB'];
    for (const hex of lightColors) {
      const onColor = selectAccessibleOnColor(hex);
      expect(onColor).toBe(DARK_ON_COLOR_HEX);
      expect(getContrastRatio(hex, onColor)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT_RATIO);
    }
  });

  it('derives darkened --color-primary-text with >= 4.5:1 contrast on #FFFFFF for low-contrast colors', () => {
    const lowContrastBrandColors = [
      '#EAB308',
      '#38BDF8',
      '#FACC15',
      '#A3E635',
      '#FFFFFF',
      '#F472B6',
    ];

    for (const hex of lowContrastBrandColors) {
      const { color, adjusted } = deriveAccessibleTextColor(hex, LIGHT_SURFACE_HEX);
      expect(adjusted).toBe(true);
      expect(isValidHexColor(color)).toBe(true);
      expect(getContrastRatio(color, LIGHT_SURFACE_HEX)).toBeGreaterThanOrEqual(
        WCAG_AA_NORMAL_TEXT_RATIO
      );
    }
  });

  it('keeps already accessible dark brand colors unadjusted for --color-primary-text', () => {
    const { color, adjusted } = deriveAccessibleTextColor('#0F766E', LIGHT_SURFACE_HEX);
    expect(adjusted).toBe(false);
    expect(color).toBe('#0F766E');
  });

  it('lightens low-contrast brand colors when deriving accessible text on dark surfaces', () => {
    const darkSurfaces = ['#000000', '#18181B', '#0F172A'];
    const lowContrastOnDark = ['#1E293B', '#0F766E', '#1D4ED8', '#7C2D12', '#111827'];

    for (const surface of darkSurfaces) {
      for (const brandHex of lowContrastOnDark) {
        const { color, adjusted } = deriveAccessibleTextColor(brandHex, surface);
        expect(adjusted).toBe(true);
        expect(isValidHexColor(color)).toBe(true);
        expect(getContrastRatio(color, surface)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT_RATIO);
      }
    }

    const alreadyAccessibleOnDark = deriveAccessibleTextColor('#FACC15', '#18181B');
    expect(alreadyAccessibleOnDark.adjusted).toBe(false);
    expect(alreadyAccessibleOnDark.color).toBe('#FACC15');
  });

  it('applies a visible accessible border token when primary brand color is ultra-light', () => {
    const resolved = resolveDynamicTheme({ primaryColor: '#FFFFFF' });
    expect(resolved.tokens['--color-on-primary']).toBe(DARK_ON_COLOR_HEX);
    expect(resolved.tokens['--color-primary-border']).not.toBe('transparent');
    expect(
      getContrastRatio(resolved.tokens['--color-primary-border'], LIGHT_SURFACE_HEX)
    ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT_RATIO);
  });
});

describe('applyDynamicTheme DOM integration', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style');
  });

  it('applies validated brand tokens to document.documentElement.style', () => {
    const resolved = applyDynamicTheme({
      primaryColor: '#eab308',
      secondaryColor: '#1e293b',
      accentColor: '#38bdf8',
    });

    const rootStyle = document.documentElement.style;
    expect(rootStyle.getPropertyValue('--color-primary')).toBe('#EAB308');
    expect(rootStyle.getPropertyValue('--color-on-primary')).toBe(DARK_ON_COLOR_HEX);
    expect(resolved.primaryTextWasAdjusted).toBe(true);
    expect(resolved.primaryTextContrastOnSurface).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT_RATIO);
    expect(rootStyle.getPropertyValue('--color-primary-text')).toBe(
      resolved.tokens['--color-primary-text']
    );

    expect(rootStyle.getPropertyValue('--color-secondary')).toBe('#1E293B');
    expect(rootStyle.getPropertyValue('--color-on-secondary')).toBe(LIGHT_ON_COLOR_HEX);

    expect(rootStyle.getPropertyValue('--color-accent')).toBe('#38BDF8');
    expect(rootStyle.getPropertyValue('--color-on-accent')).toBe(DARK_ON_COLOR_HEX);
    expect(resolved.accentTextContrastOnSurface).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT_RATIO);

    // Protected surface and feedback tokens must never be mutated by dynamic brand theming
    expect(rootStyle.getPropertyValue('--color-background')).toBe('');
    expect(rootStyle.getPropertyValue('--color-surface')).toBe('');
    expect(rootStyle.getPropertyValue('--color-error')).toBe('');
  });

  it('falls back safely to Precision Retail defaults on invalid or injected inputs', () => {
    const resolved = applyDynamicTheme({
      primaryColor: '#123456; background-image: url(javascript:alert(1))',
      secondaryColor: 'not-a-color',
      accentColor: null,
    });

    const rootStyle = document.documentElement.style;
    expect(resolved.tokens['--color-primary']).toBe(DEFAULT_BRAND_PALETTE.primaryColor);
    expect(resolved.tokens['--color-secondary']).toBe(DEFAULT_BRAND_PALETTE.secondaryColor);
    expect(resolved.tokens['--color-accent']).toBe(DEFAULT_BRAND_PALETTE.accentColor);
    expect(rootStyle.getPropertyValue('--color-primary')).toBe(DEFAULT_BRAND_PALETTE.primaryColor);
    expect(rootStyle.getPropertyValue('--color-on-primary')).toBe(LIGHT_ON_COLOR_HEX);
  });

  it('resets back to Precision Retail defaults via resetDynamicTheme', () => {
    applyDynamicTheme({ primaryColor: '#2563EB' });
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#2563EB');

    resetDynamicTheme();
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe(
      DEFAULT_BRAND_PALETTE.primaryColor
    );
  });
});
