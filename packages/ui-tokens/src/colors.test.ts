import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { darkTheme, lightTheme } from './colors';

function channelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => channelToLinear(Number.parseInt(channel, 16)));

  if (!channels || channels.length !== 3) throw new Error(`Invalid color: ${hex}`);

  const [red, green, blue] = channels;
  if (red === undefined || green === undefined || blue === undefined) {
    throw new Error(`Invalid color: ${hex}`);
  }

  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe('light theme accessibility', () => {
  it('meets WCAG AA contrast for normal primary-button text', () => {
    expect(
      contrastRatio(lightTheme.colors.onAccent, lightTheme.colors.accent),
    ).toBeGreaterThanOrEqual(4.5);
  });
});

const webThemeVariableNames = {
  text: '--app-text',
  background: '--app-background',
  surface: '--app-surface',
  surfaceAlt: '--app-surface-alt',
  mutedText: '--app-muted',
  border: '--app-border',
  accent: '--app-accent',
  accentStrong: '--app-accent-strong',
  onAccent: '--app-on-accent',
  danger: '--app-danger',
} as const;

function cssVariables(block: string): Record<string, string> {
  const variables: Record<string, string> = {};

  for (const [, name, value] of block.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    if (name && value) variables[name] = value.trim();
  }

  return variables;
}

function webThemeValues(
  variables: Record<string, string>,
): Record<keyof typeof webThemeVariableNames, string | undefined> {
  return Object.fromEntries(
    Object.entries(webThemeVariableNames).map(([token, variable]) => [token, variables[variable]]),
  ) as Record<keyof typeof webThemeVariableNames, string | undefined>;
}

describe('web theme parity', () => {
  it('keeps companion-web light and dark CSS values aligned with shared tokens', () => {
    const css = readFileSync(new URL('../../../apps/web/src/styles.css', import.meta.url), 'utf8');
    const rootBlock = css.match(/:root\s*\{([\s\S]*?)\}/)?.[1];
    const darkBlock = css.match(/\.web-app-shell\[data-theme='dark'\]\s*\{([\s\S]*?)\}/)?.[1];

    expect(rootBlock).toBeDefined();
    expect(darkBlock).toBeDefined();
    expect(webThemeValues(cssVariables(rootBlock ?? ''))).toEqual(lightTheme.colors);
    expect(webThemeValues(cssVariables(darkBlock ?? ''))).toEqual(darkTheme.colors);
  });
});
