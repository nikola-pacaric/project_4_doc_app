import { decideFormExit } from '@project4/forms';
import { getActiveLocale, t } from '@project4/i18n';
import { useCallback, useEffect } from 'react';
import { Alert, BackHandler } from 'react-native';

interface DiscardGuardOptions {
  busy?: boolean;
  enabled: boolean;
  onHardwareBack: () => void;
}

export function useDiscardGuard({ busy = false, enabled, onHardwareBack }: DiscardGuardOptions) {
  const locale = getActiveLocale();

  const confirmDiscard = useCallback(
    (action: () => void) => {
      const decision = decideFormExit({ busy, hasUnsavedChanges: enabled });
      if (decision === 'block') {
        return;
      }

      if (decision === 'allow') {
        action();
        return;
      }

      Alert.alert(t(locale, 'form.discardTitle'), t(locale, 'form.discardBody'), [
        { style: 'cancel', text: t(locale, 'form.keepEditing') },
        { onPress: action, style: 'destructive', text: t(locale, 'form.discard') },
      ]);
    },
    [busy, enabled, locale],
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
