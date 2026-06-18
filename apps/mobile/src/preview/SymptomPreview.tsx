import { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { DEFAULT_LOCALE, t } from '@project4/i18n';

import { SymptomFormScreen } from '../screens/SymptomFormScreen';
import { colors } from '../theme';

export function SymptomPreview() {
  const locale = DEFAULT_LOCALE;
  const { height, width } = useWindowDimensions();
  const [saved, setSaved] = useState(false);
  const deviceWidth = Math.min(412, width - 32);
  const deviceHeight = Math.min(860, height - 32);

  return (
    <View style={styles.stage}>
      <View style={[styles.device, { width: deviceWidth, height: deviceHeight }]}>
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>9:41</Text>
          <View style={styles.camera} />
          <Text style={styles.statusText}>▮ ))) ▰</Text>
        </View>
        <View style={styles.appViewport}>
          <SymptomFormScreen onBack={() => setSaved(false)} onSave={() => setSaved(true)} />
          {saved ? (
            <View style={styles.previewNotice}>
              <Text style={styles.previewNoticeText}>{t(locale, 'symptom.previewValidated')}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.navigationBar}>
          <View style={styles.navigationPill} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8edf2',
    padding: 16,
  },
  device: {
    overflow: 'hidden',
    borderWidth: 9,
    borderColor: '#20252a',
    borderRadius: 44,
    backgroundColor: colors.background,
  },
  statusBar: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    paddingHorizontal: 18,
  },
  statusText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  camera: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#20252a',
  },
  appViewport: {
    flex: 1,
  },
  previewNotice: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    left: 16,
    borderRadius: 12,
    backgroundColor: '#236b55',
    padding: 12,
  },
  previewNoticeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  navigationBar: {
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  navigationPill: {
    width: 108,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.text,
  },
});
