import { getActiveLocale, getActiveVoiceLanguage, t } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from 'react-native';

import { colors, sharedStyles, createThemedStyles } from '../theme';
import { useKeyboardAwareInput } from './KeyboardAwareScrollView';
import { appendVoiceTranscript, isVoiceInputSupported, startVoiceInput } from '../lib/voiceInput';

interface FormFieldProps extends TextInputProps {
  enableVoice?: boolean;
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  leadingIcon?: ReactNode;
}

export function FormField({
  enableVoice = false,
  label,
  labelStyle,
  leadingIcon,
  style,
  ...props
}: FormFieldProps) {
  const locale = getActiveLocale();
  const keyboardAwareInput = useKeyboardAwareInput();
  const inputRef = useRef<TextInput>(null);
  const valueRef = useRef(props.value ?? '');
  const onChangeTextRef = useRef(props.onChangeText);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canUseVoice =
    enableVoice && props.editable !== false && typeof props.onChangeText === 'function';

  useEffect(() => {
    valueRef.current = props.value ?? '';
    onChangeTextRef.current = props.onChangeText;
  }, [props.onChangeText, props.value]);

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
    if (!canUseVoice || supported !== true || listening) return;

    inputRef.current?.focus();
    setListening(true);
    setMessage(t(locale, 'voice.listening'));

    try {
      const transcript = await startVoiceInput(getActiveVoiceLanguage(), t(locale, 'voice.prompt'));
      onChangeTextRef.current?.(appendVoiceTranscript(valueRef.current, transcript));
      setMessage(t(locale, 'voice.added'));
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? error.code : undefined;
      setMessage(code === 'canceled' ? null : t(locale, 'voice.unavailable'));
    } finally {
      setListening(false);
    }
  }

  const showVoiceButton = canUseVoice && supported === true;
  const voiceDisabled = listening;

  return (
    <View style={styles.field}>
      <Text style={[sharedStyles.fieldLabel, labelStyle]}>{label}</Text>
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
          placeholderTextColor={colors.mutedText}
          spellCheck={false}
          style={[
            sharedStyles.input,
            leadingIcon ? styles.leadingInput : undefined,
            props.multiline && styles.multiline,
            showVoiceButton && styles.voiceInput,
            showVoiceButton && props.multiline && styles.voiceMultilineInput,
            props.editable === false && styles.readOnly,
            style,
          ]}
          {...props}
          ref={inputRef}
        />
        {leadingIcon ? (
          <View pointerEvents="none" style={styles.leadingIcon}>
            {leadingIcon}
          </View>
        ) : null}
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
      {message ? (
        <Text accessibilityLiveRegion="polite" style={styles.help}>
          {message}
        </Text>
      ) : null}
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

const styles = createThemedStyles(() =>
  StyleSheet.create({
    field: {
      gap: spacing.xs,
    },
    inputWrap: {
      position: 'relative',
    },
    leadingInput: {
      paddingLeft: 52,
    },
    leadingIcon: {
      alignItems: 'center',
      bottom: 0,
      justifyContent: 'center',
      left: 4,
      opacity: 0.72,
      position: 'absolute',
      top: 0,
      width: 44,
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
  }),
);
