import { getActiveLocale, t } from '@project4/i18n';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { SafeAreaView, Text, View } from 'react-native';

import { sharedStyles } from '../theme';
import { PrimaryButton } from './PrimaryButton';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  failed: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.error('Unhandled application error', error, info.componentStack);
    }
  }

  override render() {
    if (!this.state.failed) return this.props.children;

    const locale = getActiveLocale();
    return (
      <SafeAreaView style={sharedStyles.screen}>
        <View style={sharedStyles.scrollContent}>
          <Text accessibilityRole="header" style={sharedStyles.heading}>
            {t(locale, 'app.fatalErrorTitle')}
          </Text>
          <Text accessibilityLiveRegion="assertive" style={sharedStyles.body}>
            {t(locale, 'app.fatalErrorBody')}
          </Text>
          <PrimaryButton
            label={t(locale, 'common.retry')}
            onPress={() => this.setState({ failed: false })}
          />
        </View>
      </SafeAreaView>
    );
  }
}
