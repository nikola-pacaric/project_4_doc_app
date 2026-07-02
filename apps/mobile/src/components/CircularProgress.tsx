import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

interface CircularProgressProps {
  size: number;
  strokeWidth: number;
  progress: number;
  children?: ReactNode;
}

const WEB_RING_ACCENT = '#f45b7a';
const WEB_RING_TRACK = '#f4e7ea';
const WEB_RING_INSET = 'rgba(244, 91, 122, 0.08)';

export function CircularProgress({ size, strokeWidth, progress, children }: CircularProgressProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const radius = size / 2;

  const topColor = clampedProgress > 0 ? WEB_RING_ACCENT : WEB_RING_TRACK;
  const rightColor = clampedProgress > 25 ? WEB_RING_ACCENT : WEB_RING_TRACK;
  const bottomColor = clampedProgress > 50 ? WEB_RING_ACCENT : WEB_RING_TRACK;
  const leftColor = clampedProgress > 75 ? WEB_RING_ACCENT : WEB_RING_TRACK;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.glow, { width: size, height: size, borderRadius: radius }]} />
      <View style={[styles.face, { width: size, height: size, borderRadius: radius }]} />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          borderWidth: strokeWidth,
          borderTopColor: topColor,
          borderRightColor: rightColor,
          borderBottomColor: bottomColor,
          borderLeftColor: leftColor,
          position: 'absolute',
        }}
      />
      <View style={[styles.inset, { width: size, height: size, borderRadius: radius }]} />
      <View style={styles.childrenContainer}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glow: {
    backgroundColor: '#ffffff',
    elevation: 3,
    position: 'absolute',
    shadowColor: WEB_RING_ACCENT,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  face: {
    backgroundColor: '#ffffff',
    position: 'absolute',
  },
  inset: {
    borderColor: WEB_RING_INSET,
    borderWidth: 1,
    position: 'absolute',
  },
  childrenContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
