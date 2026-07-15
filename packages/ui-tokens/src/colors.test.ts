import { describe, expect, it } from 'vitest';

import { lightTheme } from './colors';

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
