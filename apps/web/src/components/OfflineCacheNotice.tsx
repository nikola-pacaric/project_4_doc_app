import { t, type Locale } from '@project4/i18n';

import { StatusMessage } from './StatusMessage';

interface OfflineCacheNoticeProps {
  locale: Locale;
  visible: boolean;
}

export function OfflineCacheNotice({ locale, visible }: OfflineCacheNoticeProps) {
  if (!visible) return null;

  return <StatusMessage tone="error">{t(locale, 'home.offlineNotice')}</StatusMessage>;
}
