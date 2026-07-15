import { getActiveLocale, t } from '@project4/i18n';
import { useCallback, useEffect } from 'react';
import { Alert, BackHandler } from 'react-native';

interface DiscardGuardOptions {
  enabled: boolean;
  onHardwareBack: () => void;
}

export function useDiscardGuard({ enabled, onHardwareBack }: DiscardGuardOptions) {
  const locale = getActiveLocale();

  const confirmDiscard = useCallback(
    (action: () => void) => {
      if (!enabled) {
        action();
        return;
      }

      Alert.alert(t(locale, 'form.discardTitle'), t(locale, 'form.discardBody'), [
        { style: 'cancel', text: t(locale, 'form.keepEditing') },
        { onPress: action, style: 'destructive', text: t(locale, 'form.discard') },
      ]);
    },
    [enabled, locale],
  );

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmDiscard(onHardwareBack);
      return true;
    });

    return () => subscription.remove();
  }, [confirmDiscard, onHardwareBack]);

  return confirmDiscard;
}
