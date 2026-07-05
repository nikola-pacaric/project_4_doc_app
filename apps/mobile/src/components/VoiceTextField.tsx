import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import {
  appendVoiceTranscript,
  isVoiceInputSupported,
  startVoiceInput,
  voiceLanguageFromLocale,
} from '../lib/voiceInput';
import { colors, sharedStyles } from '../theme';

interface VoiceTextFieldProps extends Omit<TextInputProps, 'onChangeText' | 'value'> {
  label: string;
  onChangeText: (text: string) => void;
  value: string;
}

export function VoiceTextField({ label, onChangeText, value, ...props }: VoiceTextFieldProps) {
  const locale = DEFAULT_LOCALE;
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    isVoiceInputSupported()
      .then((available) => {
        if (active) setSupported(available);
      })
      .catch(() => {
        if (active) setSupported(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function startListening() {
    if (listening || supported === false) return;

    setListening(true);
    setMessage(t(locale, 'voice.listening'));

    try {
      const transcript = await startVoiceInput(
        voiceLanguageFromLocale(locale),
        t(locale, 'voice.prompt')
      );
      onChangeText(appendVoiceTranscript(value, transcript));
      setMessage(t(locale, 'voice.added'));
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? error.code : undefined;
      setMessage(code === 'canceled' ? null : t(locale, 'voice.unavailable'));
    } finally {
      setListening(false);
    }
  }

  const disabled = supported !== true || listening;

  return (
    <View style={styles.field}>
      <Text style={sharedStyles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCorrect={false}
        placeholderTextColor="#a28d94"
        spellCheck={false}
        style={[
          sharedStyles.input,
          props.multiline && styles.multiline,
          props.editable === false && styles.readOnly,
          props.style,
        ]}
        onChangeText={onChangeText}
        value={value}
        {...props}
      />
      <View style={styles.voiceRow}>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={startListening}
          style={({ pressed }) => [
            styles.voiceButton,
            pressed && styles.pressed,
            disabled && styles.disabled,
          ]}
        >
          <Text style={styles.voiceButtonText}>
            {listening ? t(locale, 'voice.listening') : t(locale, 'voice.start')}
          </Text>
        </Pressable>
        {supported === false ? (
          <Text style={styles.help}>{t(locale, 'voice.unsupported')}</Text>
        ) : null}
      </View>
      {message ? <Text style={styles.help}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  multiline: {
    minHeight: 112,
    textAlignVertical: 'top',
  },
  readOnly: {
    backgroundColor: colors.background,
    color: colors.mutedText,
  },
  voiceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  voiceButton: {
    minHeight: 44,
    borderColor: colors.accent,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  voiceButtonText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.5,
  },
  help: {
    color: colors.mutedText,
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
