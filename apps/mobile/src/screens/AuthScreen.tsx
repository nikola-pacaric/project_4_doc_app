import type { UserRole } from '@project4/contracts';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { signInForRole, signUpPatient, type AppSupabaseClient } from '@project4/supabase-client';
import { spacing } from '@project4/ui-tokens';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FormField } from '../components/FormField';
import { PasswordField } from '../components/PasswordField';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, sharedStyles } from '../theme';

type AuthMode = 'patient-signup' | 'patient-login' | 'doctor-login';

interface AuthScreenProps {
  client: AppSupabaseClient;
}

function expectedRole(mode: AuthMode): UserRole {
  return mode === 'doctor-login' ? 'doctor' : 'patient';
}

export function AuthScreen({ client }: AuthScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [mode, setMode] = useState<AuthMode>('patient-login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordHidden, setPasswordHidden] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setMessage(null);

    if (!email.trim() || !password || (mode === 'patient-signup' && !displayName.trim())) {
      setError(t(locale, 'auth.unexpectedError'));
      return;
    }

    setBusy(true);

    try {
      if (mode === 'patient-signup') {
        const result = await signUpPatient(client, { email, password, displayName });

        if (result.error) {
          throw result.error;
        }

        if (!result.data.session) {
          setMessage(t(locale, 'auth.checkEmail'));
        }
      } else {
        const result = await signInForRole(client, email, password, expectedRole(mode));

        if (result.error) {
          throw result.error;
        }
      }
    } catch (caught) {
      const caughtMessage = caught instanceof Error ? caught.message : '';

      if (caughtMessage === 'AUTH_ROLE_MISMATCH') {
        setError(t(locale, 'auth.roleMismatch'));
      } else if (/invalid login credentials/i.test(caughtMessage)) {
        setError(t(locale, 'auth.invalidCredentials'));
      } else {
        setError(t(locale, 'auth.unexpectedError'));
      }
    } finally {
      setBusy(false);
    }
  }

  const modes: Array<{ value: AuthMode; label: string }> = [
    { value: 'patient-login', label: t(locale, 'auth.patientLogin') },
    { value: 'patient-signup', label: t(locale, 'auth.patientSignup') },
    { value: 'doctor-login', label: t(locale, 'auth.doctorLogin') },
  ];

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={sharedStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader
            eyebrow={t(locale, 'phase.patientSlice')}
            title={t(locale, mode === 'patient-signup' ? 'auth.patientSignup' : 'auth.signIn')}
            subtitle={t(locale, 'app.subtitle')}
          />

          <View accessibilityRole="tablist" style={styles.tabs}>
            {modes.map((item) => {
              const selected = mode === item.value;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  key={item.value}
                  onPress={() => {
                    setMode(item.value);
                    setPasswordHidden(true);
                    setError(null);
                    setMessage(null);
                  }}
                  style={[styles.tab, selected && styles.selectedTab]}
                >
                  <Text style={[styles.tabLabel, selected && styles.selectedTabLabel]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.form}>
            {mode === 'patient-signup' ? (
              <FormField
                autoCapitalize="words"
                label={t(locale, 'auth.displayName')}
                onChangeText={setDisplayName}
                textContentType="name"
                value={displayName}
              />
            ) : null}
            <FormField
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label={t(locale, 'auth.email')}
              onChangeText={setEmail}
              textContentType="emailAddress"
              value={email}
            />
            <PasswordField
              hidden={passwordHidden}
              label={t(locale, 'auth.password')}
              onChangeText={setPassword}
              onToggleVisibility={() => setPasswordHidden((current) => !current)}
              textContentType={mode === 'patient-signup' ? 'newPassword' : 'password'}
              toggleLabel={t(locale, passwordHidden ? 'auth.showPassword' : 'auth.hidePassword')}
              value={password}
            />
            {error ? <Text style={sharedStyles.error}>{error}</Text> : null}
            {message ? <Text style={sharedStyles.success}>{message}</Text> : null}
            <PrimaryButton
              busy={busy}
              label={t(locale, mode === 'patient-signup' ? 'auth.signUp' : 'auth.signIn')}
              onPress={() => void submit()}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tab: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectedTab: {
    borderColor: colors.accent,
    backgroundColor: '#fff0f3',
  },
  tabLabel: {
    color: colors.mutedText,
    fontSize: 15,
    fontWeight: '700',
  },
  selectedTabLabel: {
    color: colors.accent,
  },
  form: {
    gap: spacing.md,
  },
});
