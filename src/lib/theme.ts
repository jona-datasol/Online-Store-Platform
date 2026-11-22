/**
 * Online Store Platform — Dynamic Brand Theming & WCAG 2.2 AA Contrast Engine
 * Author: JoNa (https://github.com/jona-datasol)
 *
 * Implements deterministic contrast calculation, strict HEX sanitization,
 * and safe runtime application of brand tokens per docs/design/COLOR_TOKENS.md.
 */

export const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export const LIGHT_SURFACE_HEX = '#FFFFFF';
export const DARK_ON_COLOR_HEX = '#111827';
export const LIGHT_ON_COLOR_HEX = '#FFFFFF';
export const WCAG_AA_NORMAL_TEXT_RATIO = 4.5;
export const WCAG_SRGB_LINEAR_THRESHOLD = 0.04045;
export const WCAG_SURFACE_LUMINANCE_MIDPOINT = 0.1791287847;

export const DEFAULT_BRAND_PALETTE = {
  primaryColor: '#18181B',
  secondaryColor: '#3F3F46',
  accentColor: '#0F766E',
} as const;

export interface DynamicThemeInput {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HslColor {
  h: number;
  s: number;
  l: number;
}

export interface ResolvedBrandTokens {
  '--color-primary': string;
  '--color-primary-hover': string;
  '--color-primary-active': string;
  '--color-primary-soft': string;
  '--color-primary-text': string;
  '--color-on-primary': '#FFFFFF' | '#111827';
  '--color-primary-border': string;
  '--color-secondary': string;
  '--color-secondary-hover': string;
  '--color-secondary-active': string;
  '--color-secondary-soft': string;
  '--color-on-secondary': '#FFFFFF' | '#111827';
  '--color-accent': string;
  '--color-accent-hover': string;
  '--color-accent-soft': string;
  '--color-accent-text': string;
  '--color-on-accent': '#FFFFFF' | '#111827';
}

export interface ResolvedDynamicTheme {
  tokens: ResolvedBrandTokens;
  primaryContrastOnButton: number;
  primaryTextContrastOnSurface: number;
  primaryTextWasAdjusted: boolean;
  accentContrastOnButton: number;
  accentTextContrastOnSurface: number;
  accentTextWasAdjusted: boolean;
}

export function isValidHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_REGEX.test(value.trim());
}

export function sanitizeHexColor(value: string | null | undefined, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback.toUpperCase();
  }
  const trimmed = value.trim();
  if (!HEX_COLOR_REGEX.test(trimmed)) {
    return fallback.toUpperCase();
  }
  return trimmed.toUpperCase();
}

export function hexToRgb(hex: string): RgbColor {
  const normalized = sanitizeHexColor(hex, DEFAULT_BRAND_PALETTE.primaryColor);
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function rgbToHex({ r, g, b }: RgbColor): string {
  const toHex = (channel: number) => clampChannel(channel).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function rgbToHsl({ r, g, b }: RgbColor): HslColor {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) {
    return { h: 0, s: 0, l };
  }

  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let h = 0;
  if (max === rn) {
    h = (gn - bn) / delta + (gn < bn ? 6 : 0);
  } else if (max === gn) {
    h = (bn - rn) / delta + 2;
  } else {
    h = (rn - gn) / delta + 4;
  }
  h /= 6;

  return { h, s, l };
}

function hueToRgb(p: number, q: number, t: number): number {
  let normalizedT = t;
  if (normalizedT < 0) normalizedT += 1;
  if (normalizedT > 1) normalizedT -= 1;
  if (normalizedT < 1 / 6) return p + (q - p) * 6 * normalizedT;
  if (normalizedT < 1 / 2) return q;
  if (normalizedT < 2 / 3) return p + (q - p) * (2 / 3 - normalizedT) * 6;
  return p;
}

export function hslToRgb({ h, s, l }: HslColor): RgbColor {
  const clampedL = Math.max(0, Math.min(1, l));
  const clampedS = Math.max(0, Math.min(1, s));

  if (clampedS === 0) {
    const gray = clampChannel(clampedL * 255);
    return { r: gray, g: gray, b: gray };
  }

  const q = clampedL < 0.5 ? clampedL * (1 + clampedS) : clampedL + clampedS - clampedL * clampedS;
  const p = 2 * clampedL - q;

  return {
    r: clampChannel(hueToRgb(p, q, h + 1 / 3) * 255),
    g: clampChannel(hueToRgb(p, q, h) * 255),
    b: clampChannel(hueToRgb(p, q, h - 1 / 3) * 255),
  };
}

function adjustLightness(hex: string, deltaLightness: number): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  const nextL = Math.max(0, Math.min(1, hsl.l + deltaLightness));
  return rgbToHex(hslToRgb({ ...hsl, l: nextL }));
}

function mixWithWhite(hex: string, brandWeight: number): string {
  const { r, g, b } = hexToRgb(hex);
  const whiteWeight = 1 - brandWeight;
  return rgbToHex({
    r: r * brandWeight + 255 * whiteWeight,
    g: g * brandWeight + 255 * whiteWeight,
    b: b * brandWeight + 255 * whiteWeight,
  });
}

function linearizeChannel(channel255: number): number {
  const srgb = channel255 / 255;
  return srgb <= WCAG_SRGB_LINEAR_THRESHOLD ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const rLin = linearizeChannel(r);
  const gLin = linearizeChannel(g);
  const bLin = linearizeChannel(b);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

export function getContrastRatio(hexA: string, hexB: string): number {
  const lumA = getRelativeLuminance(hexA);
  const lumB = getRelativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function selectAccessibleOnColor(backgroundHex: string): '#FFFFFF' | '#111827' {
  const whiteRatio = getContrastRatio(backgroundHex, LIGHT_ON_COLOR_HEX);
  const darkRatio = getContrastRatio(backgroundHex, DARK_ON_COLOR_HEX);
  return whiteRatio >= darkRatio ? LIGHT_ON_COLOR_HEX : DARK_ON_COLOR_HEX;
}

export function deriveAccessibleTextColor(
  brandHex: string,
  surfaceHex: string = LIGHT_SURFACE_HEX,
  minContrast: number = WCAG_AA_NORMAL_TEXT_RATIO
): { color: string; adjusted: boolean } {
  const normalized = sanitizeHexColor(brandHex, DEFAULT_BRAND_PALETTE.primaryColor);
  const normalizedSurface = sanitizeHexColor(surfaceHex, LIGHT_SURFACE_HEX);

  if (getContrastRatio(normalized, normalizedSurface) >= minContrast) {
    return { color: normalized, adjusted: false };
  }

  const surfaceLuminance = getRelativeLuminance(normalizedSurface);
  const shouldDarken = surfaceLuminance >= WCAG_SURFACE_LUMINANCE_MIDPOINT;
  const step = shouldDarken ? -0.02 : 0.02;
  const fallbackColor = shouldDarken ? DARK_ON_COLOR_HEX : LIGHT_ON_COLOR_HEX;

  const baseHsl = rgbToHsl(hexToRgb(normalized));
  let currentL = baseHsl.l;

  while (shouldDarken ? currentL > 0 : currentL < 1) {
    currentL = Math.max(0, Math.min(1, Number((currentL + step).toFixed(4))));
    const candidate = rgbToHex(hslToRgb({ ...baseHsl, l: currentL }));
    if (getContrastRatio(candidate, normalizedSurface) >= minContrast) {
      return { color: candidate, adjusted: true };
    }
  }

  return { color: fallbackColor, adjusted: true };
}

function deriveInteractiveStates(hex: string): {
  hover: string;
  active: string;
  soft: string;
} {
  const luminance = getRelativeLuminance(hex);
  const hover = luminance < 0.08 ? adjustLightness(hex, 0.06) : adjustLightness(hex, -0.08);
  const active = luminance < 0.08 ? adjustLightness(hex, -0.04) : adjustLightness(hex, -0.14);
  const soft = mixWithWhite(hex, 0.1);
  return { hover, active, soft };
}

export function resolveDynamicTheme(input: DynamicThemeInput = {}): ResolvedDynamicTheme {
  const primary = sanitizeHexColor(input.primaryColor, DEFAULT_BRAND_PALETTE.primaryColor);
  const secondary = sanitizeHexColor(input.secondaryColor, DEFAULT_BRAND_PALETTE.secondaryColor);
  const accent = sanitizeHexColor(input.accentColor, DEFAULT_BRAND_PALETTE.accentColor);

  const primaryStates = deriveInteractiveStates(primary);
  const secondaryStates = deriveInteractiveStates(secondary);
  const accentStates = deriveInteractiveStates(accent);

  const onPrimary = selectAccessibleOnColor(primary);
  const onSecondary = selectAccessibleOnColor(secondary);
  const onAccent = selectAccessibleOnColor(accent);

  const primaryTextResult = deriveAccessibleTextColor(primary, LIGHT_SURFACE_HEX);
  const accentTextResult = deriveAccessibleTextColor(accent, LIGHT_SURFACE_HEX);

  // Ultra-light brand buttons on white surface require a >= 3:1 visible border (WCAG 1.4.11)
  const primaryBorder =
    getRelativeLuminance(primary) > 0.85 ? primaryTextResult.color : 'transparent';

  const tokens: ResolvedBrandTokens = {
    '--color-primary': primary,
    '--color-primary-hover': primaryStates.hover,
    '--color-primary-active': primaryStates.active,
    '--color-primary-soft': primaryStates.soft,
    '--color-primary-text': primaryTextResult.color,
    '--color-on-primary': onPrimary,
    '--color-primary-border': primaryBorder,

    '--color-secondary': secondary,
    '--color-secondary-hover': secondaryStates.hover,
    '--color-secondary-active': secondaryStates.active,
    '--color-secondary-soft': secondaryStates.soft,
    '--color-on-secondary': onSecondary,

    '--color-accent': accent,
    '--color-accent-hover': accentStates.hover,
    '--color-accent-soft': accentStates.soft,
    '--color-accent-text': accentTextResult.color,
    '--color-on-accent': onAccent,
  };

  return {
    tokens,
    primaryContrastOnButton: getContrastRatio(primary, onPrimary),
    primaryTextContrastOnSurface: getContrastRatio(primaryTextResult.color, LIGHT_SURFACE_HEX),
    primaryTextWasAdjusted: primaryTextResult.adjusted,
    accentContrastOnButton: getContrastRatio(accent, onAccent),
    accentTextContrastOnSurface: getContrastRatio(accentTextResult.color, LIGHT_SURFACE_HEX),
    accentTextWasAdjusted: accentTextResult.adjusted,
  };
}

export function applyDynamicTheme(
  input: DynamicThemeInput = {},
  target?: HTMLElement
): ResolvedDynamicTheme {
  const resolved = resolveDynamicTheme(input);
  const rootElement =
    target ?? (typeof document !== 'undefined' ? document.documentElement : undefined);

  if (rootElement) {
    const entries = Object.entries(resolved.tokens) as Array<[keyof ResolvedBrandTokens, string]>;
    for (const [tokenName, tokenValue] of entries) {
      rootElement.style.setProperty(tokenName, tokenValue);
    }
  }

  return resolved;
}

export function resetDynamicTheme(target?: HTMLElement): ResolvedDynamicTheme {
  return applyDynamicTheme({}, target);
}
