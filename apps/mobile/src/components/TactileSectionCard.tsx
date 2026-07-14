import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import {
  tactileFormLayout as layout,
  type TactilePalette,
} from '../theme/tactileForm';

interface TactileSectionCardProps {
  palette: TactilePalette;
  title: string;
  icon?: string;
  children: ReactNode;
}

/** White tactile card with optional icon bubble + section title (Baseline style). */
export function TactileSectionCard({
  palette,
  title,
  icon,
  children,
}: TactileSectionCardProps) {
  return (
    <View
      style={[
        layout.card,
        {
          backgroundColor: palette.surface,
          shadowColor: palette.shadow,
        },
      ]}
    >
      <View style={layout.cardHeader}>
        {icon ? (
          <View style={[layout.sectionIcon, { backgroundColor: palette.secondaryContainer }]}>
            <Text style={[layout.sectionIconGlyph, { color: palette.primary }]}>{icon}</Text>
          </View>
        ) : null}
        <Text style={[layout.sectionTitle, { color: palette.onSurface }]}>{title}</Text>
      </View>
      <View style={layout.fieldGap}>{children}</View>
    </View>
  );
}
