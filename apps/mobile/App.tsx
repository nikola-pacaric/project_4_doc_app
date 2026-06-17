import { APP_NAME } from '@project4/contracts';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { lightTheme, spacing } from '@project4/ui-tokens';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>{t(DEFAULT_LOCALE, 'phase.foundation')}</Text>
        <Text style={styles.title}>{APP_NAME}</Text>
        <Text style={styles.summary}>{t(DEFAULT_LOCALE, 'app.subtitle')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: lightTheme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  eyebrow: {
    color: lightTheme.colors.mutedText,
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    color: lightTheme.colors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  summary: {
    color: lightTheme.colors.mutedText,
    fontSize: 17,
    lineHeight: 26,
  },
});
