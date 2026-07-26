import { t, type Locale } from '@project4/i18n';

export function fluidPhotoContextLabel(locale: Locale, fluidName?: string | null): string {
  return fluidName?.trim() || t(locale, 'photo.context.fluid');
}
