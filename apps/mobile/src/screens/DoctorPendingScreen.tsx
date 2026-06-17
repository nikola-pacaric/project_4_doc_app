import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { SafeAreaView, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { sharedStyles } from '../theme';

interface DoctorPendingScreenProps {
  onSignOut: () => Promise<void>;
}

export function DoctorPendingScreen({ onSignOut }: DoctorPendingScreenProps) {
  const locale = DEFAULT_LOCALE;

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <View style={sharedStyles.scrollContent}>
        <ScreenHeader
          eyebrow={t(locale, 'role.doctor')}
          title={t(locale, 'doctor.pendingTitle')}
          subtitle={t(locale, 'doctor.pendingBody')}
        />
        <PrimaryButton
          label={t(locale, 'auth.signOut')}
          onPress={() => void onSignOut()}
          variant="secondary"
        />
      </View>
    </SafeAreaView>
  );
}
