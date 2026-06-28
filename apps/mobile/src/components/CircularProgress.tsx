import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

interface CircularProgressProps {
  size: number;
  strokeWidth: number;
  progress: number;
  children?: ReactNode;
}

export function CircularProgress({ size, strokeWidth, progress, children }: CircularProgressProps) {
  const radius = size / 2;

  // Quadrant-based progress indicator:
  // Colors the top, right, bottom, and left borders step-by-step
  // to represent progress quadrants (0%, 25%, 50%, 75%, 100%)
  const topColor = progress > 0 ? colors.accent : colors.border;
  const rightColor = progress > 25 ? colors.accent : colors.border;
  const bottomColor = progress > 50 ? colors.accent : colors.border;
  const leftColor = progress > 75 ? colors.accent : colors.border;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
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
  childrenContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
