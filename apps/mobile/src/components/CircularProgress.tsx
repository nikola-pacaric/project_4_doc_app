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
  const segmentCount = 96;
  const activeSegments = Math.round((clampedProgress / 100) * segmentCount);
  const segmentWidth = Math.max(2, strokeWidth * 0.42);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.glow, { width: size, height: size, borderRadius: radius }]} />
      <View style={[styles.face, { width: size, height: size, borderRadius: radius }]} />
      {Array.from({ length: segmentCount }, (_, index) => (
        <View
          key={index}
          style={[
            styles.segmentLayer,
            {
              width: size,
              height: size,
              transform: [{ rotate: `${(index / segmentCount) * 360}deg` }],
            },
          ]}
        >
          <View
            style={[
              styles.segment,
              {
                backgroundColor: index < activeSegments ? WEB_RING_ACCENT : WEB_RING_TRACK,
                borderRadius: segmentWidth / 2,
                height: strokeWidth,
                left: radius - segmentWidth / 2,
                width: segmentWidth,
              },
            ]}
          />
        </View>
      ))}
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
  segmentLayer: {
    position: 'absolute',
  },
  segment: {
    position: 'absolute',
    top: 0,
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
