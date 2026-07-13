import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, createThemedStyles } from '../theme';

interface CircularProgressProps {
  size: number;
  strokeWidth: number;
  progress: number;
  trackColor?: string;
  progressColor?: string;
  children?: ReactNode;
}

export function CircularProgress({
  size,
  strokeWidth,
  progress,
  trackColor,
  progressColor,
  children,
}: CircularProgressProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const radius = size / 2;
  const segmentCount = 120;
  const activeSegments = Math.round((clampedProgress / 100) * segmentCount);
  const segmentWidth = Math.max(2.5, strokeWidth * 0.55);
  const fill = progressColor ?? colors.accentStrong;
  const track = trackColor ?? colors.surfaceAlt;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View
        style={[
          styles.face,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: colors.surface,
          },
        ]}
      />
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
                backgroundColor: index < activeSegments ? fill : track,
                borderRadius: segmentWidth / 2,
                height: strokeWidth,
                left: radius - segmentWidth / 2,
                width: segmentWidth,
              },
            ]}
          />
        </View>
      ))}
      <View
        style={[
          styles.inset,
          {
            width: size - strokeWidth * 2.2,
            height: size - strokeWidth * 2.2,
            borderRadius: (size - strokeWidth * 2.2) / 2,
            backgroundColor: colors.surface,
          },
        ]}
      />
      <View style={styles.childrenContainer}>{children}</View>
    </View>
  );
}

const styles = createThemedStyles(() =>
  StyleSheet.create({
    container: {
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    face: {
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
      position: 'absolute',
    },
    childrenContainer: {
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
    },
  }),
);
