import { DEFAULT_LOCALE, t, type TranslationKey } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { LayoutAnimation, StyleSheet, View } from 'react-native';

import { FormField } from './FormField';
import { OptionButtons } from './OptionButtons';

interface ConditionalTextFieldProps {
  answer: boolean | undefined;
  detailKey: TranslationKey;
  onAnswerChange: (answer: boolean) => void;
  onTextChange: (text: string) => void;
  questionKey: TranslationKey;
  text: string;
}

export function ConditionalTextField({
  answer,
  detailKey,
  onAnswerChange,
  onTextChange,
  questionKey,
  text,
}: ConditionalTextFieldProps) {
  const locale = DEFAULT_LOCALE;

  return (
    <View style={styles.field}>
      <OptionButtons
        label={t(locale, questionKey)}
        onChange={(value) => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          onAnswerChange(value === 'yes');
        }}
        options={[
          { value: 'yes', label: t(locale, 'common.yes') },
          { value: 'no', label: t(locale, 'common.no') },
        ]}
        value={answer === undefined ? undefined : answer ? 'yes' : 'no'}
      />
      {answer ? (
        <View style={styles.bubble}>
          <FormField
            label={t(locale, detailKey)}
            multiline
            onChangeText={onTextChange}
            value={text}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  bubble: {
    borderWidth: 1,
    borderColor: '#f0dfe1',
    borderRadius: 18,
    backgroundColor: '#fff7f8',
    padding: spacing.md,
  },
});
