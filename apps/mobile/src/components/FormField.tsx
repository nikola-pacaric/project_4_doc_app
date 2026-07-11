import { getActiveLocale, getActiveVoiceLanguage, t } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, sharedStyles, createThemedStyles } from '../theme';
import { useKeyboardAwareInput } from './KeyboardAwareScrollView';
import {
  appendVoiceTranscript,
  isVoiceInputSupported,
  startVoiceInput,
} from '../lib/voiceInput';

interface FormFieldProps extends TextInputProps {
  enableVoice?: boolean;
  label: string;
}

export function FormField({ enableVoice = false, label, ...props }: FormFieldProps) {
  const locale = getActiveLocale();
  const keyboardAwareInput = useKeyboardAwareInput();
  const [, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canUseVoice =
    enableVoice && props.editable !== false && typeof props.onChangeText === 'function';

  useEffect(() => {
    if (!canUseVoice) return;
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
  }, [canUseVoice]);

  async function startListening() {
    if (!canUseVoice || listening) return;

    setListening(true);
    setMessage(t(locale, 'voice.listening'));

    try {
      const transcript = await startVoiceInput(
        getActiveVoiceLanguage(),
        t(locale, 'voice.prompt'),
      );
      props.onChangeText?.(appendVoiceTranscript(props.value ?? '', transcript));
      setMessage(t(locale, 'voice.added'));
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? error.code : undefined;
      setMessage(code === 'canceled' ? null : t(locale, 'voice.unavailable'));
    } finally {
      setListening(false);
    }
  }

  const showVoiceButton = canUseVoice;
  const voiceDisabled = listening;

  return (
    <View style={styles.field}>
      <Text style={sharedStyles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          accessibilityLabel={label}
          autoCorrect={false}
          onFocus={(event) => {
            keyboardAwareInput?.onInputFocus(event.nativeEvent.target);
            props.onFocus?.(event);
          }}
          onContentSizeChange={(event) => {
            keyboardAwareInput?.onInputContentChange();
            props.onContentSizeChange?.(event);
          }}
          placeholderTextColor="#a28d94"
          spellCheck={false}
          style={[
            sharedStyles.input,
            props.multiline && styles.multiline,
            canUseVoice && styles.voiceInput,
            canUseVoice && props.multiline && styles.voiceMultilineInput,
            props.editable === false && styles.readOnly,
            props.style,
          ]}
          {...props}
        />
        {showVoiceButton ? (
          <Pressable
            accessibilityLabel={t(locale, 'voice.start')}
            accessibilityRole="button"
            accessibilityState={{ disabled: voiceDisabled }}
            disabled={voiceDisabled}
            hitSlop={8}
            onPress={startListening}
            style={({ pressed }) => [
              styles.voiceButton,
              props.multiline && styles.voiceButtonMultiline,
              listening && styles.voiceButtonActive,
              pressed && styles.pressed,
              voiceDisabled && styles.disabled,
            ]}
          >
            <MicIcon active={listening} />
          </Pressable>
        ) : null}
      </View>
      {message ? <Text style={styles.help}>{message}</Text> : null}
    </View>
  );
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <View style={[styles.micIcon, active && styles.micIconActive]}>
      <View style={styles.micHead} />
      <View style={styles.micCradle} />
      <View style={styles.micStem} />
      <View style={styles.micBase} />
    </View>
  );
}

const styles = createThemedStyles(() => StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  inputWrap: {
    position: 'relative',
  },
  multiline: {
    minHeight: 112,
    textAlignVertical: 'top',
  },
  voiceInput: {
    paddingRight: 56,
  },
  voiceMultilineInput: {
    paddingBottom: 48,
  },
  readOnly: {
    backgroundColor: colors.background,
    color: colors.mutedText,
  },
  voiceButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 20,
    bottom: 1,
    height: 40,
    justifyContent: 'center',
    position: 'absolute',
    right: 6,
    width: 40,
  },
  voiceButtonMultiline: {
    bottom: 4,
  },
  voiceButtonActive: {
    backgroundColor: colors.surface,
  },
  micIcon: {
    alignItems: 'center',
    height: 18,
    justifyContent: 'center',
    width: 17,
  },
  micIconActive: {
    opacity: 0.86,
  },
  micHead: {
    borderColor: colors.accent,
    borderRadius: 6,
    borderWidth: 2,
    height: 12,
    width: 9,
  },
  micCradle: {
    borderBottomColor: colors.accent,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderBottomWidth: 2,
    borderLeftColor: colors.accent,
    borderLeftWidth: 2,
    borderRightColor: colors.accent,
    borderRightWidth: 2,
    height: 6,
    marginTop: -4,
    width: 13,
  },
  micStem: {
    backgroundColor: colors.accent,
    borderRadius: 1,
    height: 4,
    marginTop: -1,
    width: 2,
  },
  micBase: {
    backgroundColor: colors.accent,
    borderRadius: 1,
    height: 2,
    width: 9,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.38,
  },
  help: {
    color: colors.mutedText,
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
  },
}));
