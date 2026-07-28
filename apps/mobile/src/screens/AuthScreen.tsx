import type { UserRole } from '@project4/contracts';
import { getLoginValidationError, getPatientSignupValidationError } from '@project4/forms';
import { t, type Locale } from '@project4/i18n';
import { signInForRole, signUpPatient, type AppSupabaseClient } from '@project4/supabase-client';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FormField } from '../components/FormField';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { PasswordField } from '../components/PasswordField';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusMessage } from '../components/StatusMessage';
import { colors, createThemedStyles } from '../theme';

type AuthMode = 'patient-signup' | 'patient-login' | 'doctor-login';

interface AuthScreenProps {
  client: AppSupabaseClient;
  locale: Locale;
  onChangeLocale: (locale: Locale) => void;
}

function expectedRole(mode: AuthMode): UserRole {
  return mode === 'doctor-login' ? 'doctor' : 'patient';
}

export function AuthScreen({ client, locale, onChangeLocale }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('patient-login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordHidden, setPasswordHidden] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const doctorMode = mode === 'doctor-login';

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setPasswordHidden(true);
    setError(null);
    setMessage(null);
  }

  async function submit() {
    setError(null);
    setMessage(null);

    if (mode === 'patient-signup') {
      const validationError = getPatientSignupValidationError({ displayName, email, password });
      if (validationError) {
        setError(t(locale, validationError));
        return;
      }
    } else {
      const validationError = getLoginValidationError({ email, password });
      if (validationError) {
        setError(t(locale, validationError));
        return;
      }
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

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <KeyboardAwareScrollView
          contentContainerStyle={styles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.intro}>
            <Text style={styles.title}>
              {t(locale, doctorMode ? 'auth.doctorSignIn' : 'auth.welcome')}
            </Text>
            <Text style={styles.subtitle}>
              {t(locale, doctorMode ? 'auth.doctorCredentials' : 'auth.welcomeCopy')}
            </Text>
          </View>

          <View style={styles.choiceSection}>
            <Text style={styles.choiceLabel}>{t(locale, 'auth.rolePrompt')}</Text>
            <View accessibilityRole="tablist" style={styles.segmentedControl}>
              <SegmentButton
                icon="♡"
                label={t(locale, 'auth.rolePatient')}
                onPress={() => changeMode('patient-login')}
                selected={!doctorMode}
              />
              <SegmentButton
                icon="⚕"
                label={t(locale, 'auth.roleDoctor')}
                onPress={() => changeMode('doctor-login')}
                selected={doctorMode}
              />
            </View>

            {!doctorMode ? (
              <View accessibilityRole="tablist" style={styles.segmentedControl}>
                <SegmentButton
                  label={t(locale, 'auth.signIn')}
                  onPress={() => changeMode('patient-login')}
                  selected={mode === 'patient-login'}
                />
                <SegmentButton
                  label={t(locale, 'auth.signUp')}
                  onPress={() => changeMode('patient-signup')}
                  selected={mode === 'patient-signup'}
                />
              </View>
            ) : null}
          </View>

          <View style={[styles.form, doctorMode && styles.doctorForm]}>
            {mode === 'patient-signup' ? (
              <FormField
                autoCapitalize="words"
                autoComplete="name"
                label={t(locale, 'auth.displayName')}
                labelStyle={styles.fieldLabel}
                leadingIcon={<AuthGlyph type="user" />}
                onChangeText={setDisplayName}
                placeholder={t(locale, 'auth.namePlaceholder')}
                style={styles.authInput}
                textContentType="name"
                value={displayName}
              />
            ) : null}
            <FormField
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label={t(locale, 'auth.email')}
              labelStyle={styles.fieldLabel}
              leadingIcon={<AuthGlyph type="email" />}
              onChangeText={setEmail}
              placeholder={t(locale, 'auth.emailPlaceholder')}
              style={styles.authInput}
              textContentType="emailAddress"
              value={email}
            />
            <PasswordField
              hidden={passwordHidden}
              inputStyle={styles.authInput}
              label={t(locale, 'auth.password')}
              labelStyle={styles.fieldLabel}
              leadingIcon={<AuthGlyph type="lock" />}
              onChangeText={setPassword}
              onToggleVisibility={() => setPasswordHidden((current) => !current)}
              textContentType={mode === 'patient-signup' ? 'newPassword' : 'password'}
              toggleLabel={t(locale, passwordHidden ? 'auth.showPassword' : 'auth.hidePassword')}
              value={password}
            />
            {error ? <StatusMessage message={error} style={styles.error} tone="error" /> : null}
            {message ? (
              <StatusMessage message={message} style={styles.success} tone="success" />
            ) : null}
            <PrimaryButton
              busy={busy}
              label={t(locale, mode === 'patient-signup' ? 'auth.signUp' : 'auth.signIn')}
              onPress={() => void submit()}
              variant="auth"
            />
            {doctorMode ? (
              <Text style={styles.doctorInfo}>{t(locale, 'auth.doctorInfo')}</Text>
            ) : null}
          </View>

          <View style={styles.footer}>
            <View style={styles.researchLabel}>
              <Text style={styles.infoIcon}>i</Text>
              <Text style={styles.researchText}>{t(locale, 'auth.privateResearchCompanion')}</Text>
            </View>
            <View style={styles.languageRow}>
              <LanguageButton
                label="EN"
                onPress={() => onChangeLocale('en')}
                selected={locale === 'en'}
              />
              <View style={styles.languageDivider} />
              <LanguageButton
                label="SR"
                onPress={() => onChangeLocale('sr')}
                selected={locale === 'sr'}
              />
            </View>
          </View>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface SegmentButtonProps {
  icon?: string;
  label: string;
  onPress: () => void;
  selected: boolean;
}

function SegmentButton({ icon, label, onPress, selected }: SegmentButtonProps) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.segmentButton,
        selected && styles.selectedSegmentButton,
        pressed && styles.pressed,
      ]}
    >
      {icon ? (
        <Text style={[styles.segmentIcon, selected && styles.selectedText]}>{icon}</Text>
      ) : null}
      <Text style={[styles.segmentLabel, selected && styles.selectedText]}>{label}</Text>
    </Pressable>
  );
}

type AuthGlyphType = 'email' | 'lock' | 'user';

function AuthGlyph({ type }: { type: AuthGlyphType }) {
  if (type === 'email') {
    return (
      <View style={styles.emailGlyph}>
        <View style={styles.emailGlyphLeft} />
        <View style={styles.emailGlyphRight} />
      </View>
    );
  }

  if (type === 'user') {
    return (
      <View style={styles.userGlyph}>
        <View style={styles.userGlyphHead} />
        <View style={styles.userGlyphShoulders} />
      </View>
    );
  }

  return (
    <View style={styles.lockGlyph}>
      <View style={styles.lockGlyphShackle} />
      <View style={styles.lockGlyphBody} />
    </View>
  );
}

interface LanguageButtonProps {
  label: string;
  onPress: () => void;
  selected: boolean;
}

function LanguageButton({ label, onPress, selected }: LanguageButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.languageButton, pressed && styles.pressed]}
    >
      <Text style={[styles.languageLabel, selected && styles.selectedLanguageLabel]}>{label}</Text>
      <View style={[styles.languageUnderline, selected && styles.selectedLanguageUnderline]} />
    </Pressable>
  );
}

const styles = createThemedStyles(() =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: 22,
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 18 : 18,
      paddingBottom: 20,
    },
    intro: {
      gap: 6,
    },
    title: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    subtitle: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 23,
    },
    choiceSection: {
      gap: 14,
      marginTop: 28,
    },
    choiceLabel: {
      color: colors.text,
      fontSize: 15,
    },
    segmentedControl: {
      flexDirection: 'row',
      padding: 4,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
    },
    segmentButton: {
      minHeight: 44,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 7,
      borderRadius: 999,
      paddingHorizontal: 8,
    },
    selectedSegmentButton: {
      backgroundColor: colors.surface,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 5,
      elevation: 2,
    },
    segmentIcon: {
      color: colors.text,
      fontSize: 20,
      lineHeight: 21,
    },
    segmentLabel: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
      textAlign: 'center',
    },
    selectedText: {
      color: colors.accentStrong,
    },
    pressed: {
      opacity: 0.7,
    },
    form: {
      gap: 16,
      marginTop: 28,
    },
    doctorForm: {
      marginTop: 30,
    },
    fieldLabel: {
      marginBottom: 2,
      fontSize: 14,
      fontWeight: '400',
    },
    authInput: {
      minHeight: 52,
      borderWidth: 0,
      borderRadius: 13,
      backgroundColor: colors.surfaceAlt,
      fontSize: 15,
    },
    emailGlyph: {
      width: 20,
      height: 14,
      borderWidth: 1.5,
      borderColor: colors.mutedText,
      borderRadius: 2,
      overflow: 'hidden',
    },
    emailGlyphLeft: {
      position: 'absolute',
      left: 1,
      top: 3,
      width: 11,
      height: 1.5,
      backgroundColor: colors.mutedText,
      transform: [{ rotate: '32deg' }],
    },
    emailGlyphRight: {
      position: 'absolute',
      right: 1,
      top: 3,
      width: 11,
      height: 1.5,
      backgroundColor: colors.mutedText,
      transform: [{ rotate: '-32deg' }],
    },
    userGlyph: {
      width: 20,
      height: 20,
      alignItems: 'center',
    },
    userGlyphHead: {
      width: 7,
      height: 7,
      borderWidth: 1.5,
      borderColor: colors.mutedText,
      borderRadius: 4,
    },
    userGlyphShoulders: {
      width: 17,
      height: 8,
      marginTop: 3,
      borderWidth: 1.5,
      borderColor: colors.mutedText,
      borderTopLeftRadius: 9,
      borderTopRightRadius: 9,
      borderBottomWidth: 0,
    },
    lockGlyph: {
      width: 18,
      height: 20,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    lockGlyphShackle: {
      position: 'absolute',
      top: 0,
      width: 10,
      height: 10,
      borderWidth: 1.5,
      borderColor: colors.mutedText,
      borderRadius: 6,
    },
    lockGlyphBody: {
      width: 15,
      height: 12,
      borderWidth: 1.5,
      borderColor: colors.mutedText,
      borderRadius: 2,
      backgroundColor: colors.surfaceAlt,
    },
    error: {
      color: colors.danger,
      fontSize: 14,
      lineHeight: 21,
    },
    success: {
      color: colors.accentStrong,
      fontSize: 14,
      lineHeight: 21,
    },
    doctorInfo: {
      color: colors.mutedText,
      fontSize: 15,
      lineHeight: 24,
      paddingHorizontal: 18,
      textAlign: 'center',
    },
    footer: {
      alignItems: 'center',
      gap: 10,
      marginTop: 'auto',
      paddingTop: 40,
    },
    researchLabel: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    infoIcon: {
      width: 16,
      height: 16,
      borderWidth: 1,
      borderColor: colors.mutedText,
      borderRadius: 8,
      color: colors.mutedText,
      fontSize: 11,
      fontWeight: '700',
      lineHeight: 14,
      textAlign: 'center',
    },
    researchText: {
      color: colors.mutedText,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    languageRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 14,
    },
    languageDivider: {
      width: 1,
      height: 20,
      backgroundColor: colors.border,
    },
    languageButton: {
      minWidth: 36,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 4,
    },
    languageLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '500',
    },
    selectedLanguageLabel: {
      color: colors.accentStrong,
      fontWeight: '800',
    },
    languageUnderline: {
      width: 24,
      height: 2,
      marginTop: 7,
      backgroundColor: 'transparent',
    },
    selectedLanguageUnderline: {
      backgroundColor: colors.accentStrong,
    },
  }),
);
