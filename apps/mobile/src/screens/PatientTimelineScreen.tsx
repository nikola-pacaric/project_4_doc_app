import {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  entryKindIcon,
  entryKindIconStyle,
  isNoStoolTodayEntry,
  type PatientEntry,
} from '@project4/contracts';
import { getActiveLocale, t, type TranslationKey } from '@project4/i18n';
import {
  createEntryPhotoSignedUrl,
  listEntryPhotos,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { darkTheme } from '@project4/ui-tokens';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { PatientBottomNav } from '../components/PatientBottomNav';
import { WeekDayStrip } from '../components/WeekDayStrip';
import { StatusMessage } from '../components/StatusMessage';
import { colors } from '../theme';
import {
  addLocalDays,
  formatEntryTime,
  parseLocalDateInput,
  toLocalDateInput,
} from '../utils/dateTime';

/**
 * Stitch "Timeline - Patient History" / Tactile Bloom tokens.
 * Mobile-only surface — web timeline is intentionally unchanged.
 */
const stitch = {
  background: '#fdf8fd',
  surface: '#ffffff',
  surfaceContainer: '#f1ecf2',
  surfaceContainerLow: '#f7f2f8',
  surfaceContainerHigh: '#ebe7ec',
  secondaryContainer: '#fcdae1',
  primary: '#a63553',
  primaryContainer: '#f4718f',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#6b022a',
  onSurface: '#1c1b1f',
  onSurfaceVariant: '#564145',
  outline: '#897174',
  outlineVariant: '#dcbfc3',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  tertiary: '#7d5260',
  tertiarySoft: 'rgba(192, 142, 157, 0.28)',
  shadow: 'rgba(166, 53, 83, 0.08)',
} as const;

interface PatientTimelineScreenProps {
  client: AppSupabaseClient;
  entries: PatientEntry[];
  error: string | null;
  loading: boolean;
  message?: string | null;
  offlineMode?: boolean;
  onBack: () => void;
  onOpenBaseline?: () => void;
  /** When set, current-day entries open for edit (same as home recent entries). */
  onOpenEntry?: (entry: PatientEntry) => void;
  onDeleteEntry?: (entry: PatientEntry) => void | Promise<void>;
  onOpenSettings?: () => void;
  onRefresh: () => void | Promise<void>;
  onSelectedDayChange: (day: string) => void;
  pendingEntryIds?: string[];
  deletingEntryId?: string | null;
  selectedDay: string;
}

interface TimelineEntryPhoto {
  id: string;
  label: string;
  photoUrl: string;
  thumbnailUrl: string;
}

function isDarkThemeActive(): boolean {
  return colors.background === darkTheme.colors.background;
}

function localeTag(locale: 'en' | 'sr'): string {
  return locale === 'sr' ? 'sr-Latn' : 'en';
}

function daySectionLabel(day: string, locale: 'en' | 'sr'): string {
  const today = toLocalDateInput(new Date());
  const yesterday = toLocalDateInput(addLocalDays(new Date(), -1));
  if (day === today) return t(locale, 'timeline.todayLabel');
  if (day === yesterday) return t(locale, 'timeline.yesterdayLabel');
  return new Intl.DateTimeFormat(localeTag(locale), {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(parseLocalDateInput(day));
}

export function PatientTimelineScreen({
  client,
  entries,
  error,
  loading,
  message = null,
  offlineMode = false,
  onBack,
  onOpenBaseline,
  onDeleteEntry,
  onOpenEntry,
  onOpenSettings,
  onRefresh,
  onSelectedDayChange,
  pendingEntryIds = [],
  deletingEntryId = null,
  selectedDay,
}: PatientTimelineScreenProps) {
  const locale = getActiveLocale();
  const [entryPhotos, setEntryPhotos] = useState<Record<string, TimelineEntryPhoto[]>>({});
  const [photoError, setPhotoError] = useState(false);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<TimelineEntryPhoto | null>(null);
  const [selectedPhotoError, setSelectedPhotoError] = useState(false);
  const [selectedPhotoLoading, setSelectedPhotoLoading] = useState(false);
  const dark = isDarkThemeActive();
  const palette = dark
    ? {
        background: colors.background,
        surface: colors.surface,
        surfaceContainer: colors.surfaceAlt,
        surfaceContainerLow: colors.surfaceAlt,
        surfaceContainerHigh: colors.surfaceAlt,
        secondaryContainer: colors.surfaceAlt,
        primary: colors.accentStrong,
        primaryContainer: colors.accent,
        onPrimary: colors.onAccent,
        onPrimaryContainer: colors.onAccent,
        onSurface: colors.text,
        onSurfaceVariant: colors.mutedText,
        outline: colors.mutedText,
        outlineVariant: colors.border,
        error: colors.danger,
        errorContainer: colors.surfaceAlt,
        onErrorContainer: colors.danger,
        tertiary: colors.accentStrong,
        tertiarySoft: colors.surfaceAlt,
        shadow: '#000000',
      }
    : stitch;

  const pendingIds = new Set(pendingEntryIds);
  const today = toLocalDateInput(new Date());
  const canEditSelectedDay = selectedDay === today && Boolean(onOpenEntry);
  const sectionLabel = daySectionLabel(selectedDay, locale);

  useEffect(() => {
    let active = true;
    const pendingIdsForPhotos = new Set(pendingEntryIds);
    const photoEntries = entries.filter(
      (entry) =>
        (entry.kind === 'meal' || entry.kind === 'fluid' || entry.kind === 'medication') &&
        !pendingIdsForPhotos.has(entry.id),
    );

    void (async () => {
      if (active) {
        setSelectedPhoto(null);
        setSelectedPhotoError(false);
      }

      if (offlineMode || !photoEntries.length) {
        if (active) {
          setEntryPhotos({});
          setPhotoError(false);
          setPhotosLoading(false);
        }
        return;
      }

      if (active) {
        setEntryPhotos({});
        setPhotoError(false);
        setPhotosLoading(true);
      }

      try {
        const nextPhotos: Record<string, TimelineEntryPhoto[]> = {};
        await Promise.all(
          photoEntries.map(async (entry) => {
            const photos = (await listEntryPhotos(client, entry.id)).filter(
              (photo) => photo.contextType === entry.kind || photo.contextType === null,
            );
            const signedPhotos = await Promise.all(
              photos.map(async (photo) => ({
                id: photo.id,
                label:
                  photo.contextLabel?.trim() ||
                  t(locale, `entry.kind.${entry.kind}` as TranslationKey),
                photoUrl: await createEntryPhotoSignedUrl(client, photo.photoPath),
                thumbnailUrl: await createEntryPhotoSignedUrl(client, photo.thumbnailPath),
              })),
            );

            if (signedPhotos.length) nextPhotos[entry.id] = signedPhotos;
          }),
        );

        if (active) setEntryPhotos(nextPhotos);
      } catch {
        if (active) {
          setEntryPhotos({});
          setPhotoError(true);
        }
      } finally {
        if (active) setPhotosLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [client, entries, locale, offlineMode, pendingEntryIds]);
  function openPhoto(photo: TimelineEntryPhoto) {
    setSelectedPhotoError(false);
    setSelectedPhotoLoading(true);
    setSelectedPhoto(photo);
  }

  function closePhoto() {
    setSelectedPhoto(null);
    setSelectedPhotoError(false);
    setSelectedPhotoLoading(false);
  }
  function confirmDelete(entry: PatientEntry) {
    if (!onDeleteEntry) return;

    Alert.alert(t(locale, 'entry.deleteTitle'), t(locale, 'entry.deleteConfirm'), [
      { text: t(locale, 'common.cancel'), style: 'cancel' },
      {
        onPress: () => void onDeleteEntry(entry),
        style: 'destructive',
        text: t(locale, 'common.delete'),
      },
    ]);
  }

  function openCalendar() {
    DateTimePickerAndroid.open({
      display: 'calendar',
      maximumDate: new Date(),
      mode: 'date',
      onChange: (event: DateTimePickerEvent, date?: Date) => {
        if (event.type === 'set' && date) {
          onSelectedDayChange(toLocalDateInput(date));
        }
      },
      value: parseLocalDateInput(selectedDay),
    });
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: palette.background }}
      >
        {/* Title + calendar */}
        <View style={styles.titleRow}>
          <Text style={[styles.pageTitle, { color: palette.onSurface }]}>
            {t(locale, 'timeline.title')}
          </Text>
          <View style={styles.titleActions}>
            <Pressable
              accessibilityLabel={t(locale, 'timeline.refresh')}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => void onRefresh()}
              style={({ pressed }) => [
                styles.roundButton,
                { backgroundColor: palette.surfaceContainer },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.roundButtonIcon, { color: palette.onSurfaceVariant }]}>↻</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={t(locale, 'timeline.openCalendar')}
              accessibilityRole="button"
              hitSlop={8}
              onPress={openCalendar}
              style={({ pressed }) => [
                styles.roundButton,
                { backgroundColor: palette.surfaceContainer },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.roundButtonIcon, { color: palette.onSurfaceVariant }]}>📅</Text>
            </Pressable>
          </View>
        </View>

        <WeekDayStrip
          locale={locale}
          maximumDay={today}
          onSelectedDayChange={onSelectedDayChange}
          palette={palette}
          selectedDay={selectedDay}
        />

        {/* Day section label */}
        <View style={styles.sectionDivider}>
          <View style={[styles.sectionLine, { backgroundColor: palette.outlineVariant }]} />
          <Text style={[styles.sectionLabel, { color: palette.outline }]}>{sectionLabel}</Text>
          <View style={[styles.sectionLine, { backgroundColor: palette.outlineVariant }]} />
        </View>

        {error ? (
          <StatusMessage
            message={error}
            style={[styles.statusError, { color: palette.error }]}
            tone="error"
          />
        ) : null}
        {message ? (
          <StatusMessage
            message={message}
            style={[styles.statusMessage, { color: palette.primary }]}
            tone="success"
          />
        ) : null}
        {loading ? (
          <ActivityIndicator color={palette.primary} size="large" style={styles.loader} />
        ) : null}
        {!loading && !entries.length ? (
          <Text style={[styles.empty, { color: palette.onSurfaceVariant }]}>
            {t(locale, 'timeline.emptyDay')}
          </Text>
        ) : null}

        {photosLoading ? (
          <View
            accessibilityLabel={t(locale, 'app.loading')}
            accessibilityRole="progressbar"
            style={styles.photoLoadState}
          >
            <ActivityIndicator color={palette.primary} size="small" />
            <Text style={[styles.photoLoadText, { color: palette.onSurfaceVariant }]}>
              {t(locale, 'app.loading')}
            </Text>
          </View>
        ) : null}
        {photoError ? (
          <StatusMessage
            message={t(locale, 'photo.loadError')}
            style={[styles.statusError, { color: palette.error }]}
            tone="error"
          />
        ) : null}
        <View style={styles.list}>
          {entries.map((entry) => {
            const kindLabel = t(locale, `entry.kind.${entry.kind}` as TranslationKey);
            const kindIconStyle = entryKindIconStyle(entry.kind);
            const title = isNoStoolTodayEntry(entry)
              ? t(locale, 'stool.noStoolToday')
              : entry.text?.trim() || kindLabel;
            const pending = pendingIds.has(entry.id);
            const offlineDisabled = offlineMode && entry.kind !== 'note' && entry.kind !== 'text';
            const canOpen =
              canEditSelectedDay && !pending && !offlineDisabled && Boolean(onOpenEntry);
            const canShowDelete = selectedDay === today && !pending && Boolean(onDeleteEntry);
            const deleting = deletingEntryId === entry.id;
            const timeLabel = formatEntryTime(entry.occurredAt, locale);
            const photos = entryPhotos[entry.id] ?? [];
            const cardBody = (
              <>
                {pending ? (
                  <View style={[styles.pendingStripe, { backgroundColor: palette.error }]} />
                ) : null}
                <View
                  style={[
                    styles.iconBubble,
                    {
                      backgroundColor: pending
                        ? palette.errorContainer
                        : dark
                          ? palette.secondaryContainer
                          : kindIconStyle.background,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.icon,
                      {
                        color: pending
                          ? palette.onErrorContainer
                          : dark
                            ? palette.primary
                            : kindIconStyle.color,
                      },
                    ]}
                  >
                    {entryKindIcon(entry.kind)}
                  </Text>
                </View>
                <View style={styles.copy}>
                  <View style={styles.cardTopRow}>
                    <Text
                      numberOfLines={2}
                      style={[styles.cardTitle, { color: palette.onSurface }]}
                    >
                      {title}
                    </Text>
                    <View
                      style={[
                        styles.statusChip,
                        {
                          backgroundColor: pending
                            ? palette.errorContainer
                            : palette.surfaceContainerHigh,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          {
                            color: pending ? palette.onErrorContainer : palette.onSurfaceVariant,
                          },
                        ]}
                      >
                        {t(locale, pending ? 'sync.pending' : 'timeline.synced')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.timeRow}>
                    <Text style={[styles.timeIcon, { color: palette.onSurfaceVariant }]}>🕐</Text>
                    <Text style={[styles.timeText, { color: palette.onSurfaceVariant }]}>
                      {timeLabel}
                    </Text>
                  </View>
                  {entry.text && !isNoStoolTodayEntry(entry) ? (
                    <Text style={[styles.kindLabel, { color: palette.primary }]}>{kindLabel}</Text>
                  ) : null}
                </View>
              </>
            );

            return (
              <View
                accessibilityHint={
                  canEditSelectedDay ? undefined : t(locale, 'timeline.editTodayOnly')
                }
                key={entry.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: palette.surface,
                    shadowColor: palette.shadow,
                  },
                  offlineDisabled && styles.disabled,
                ]}
              >
                <View style={styles.cardContent}>
                  {canOpen ? (
                    <Pressable
                      accessibilityHint={t(locale, 'home.entryOpenHint')}
                      accessibilityRole="button"
                      onPress={() => onOpenEntry?.(entry)}
                      style={({ pressed }) => [styles.cardMain, pressed && styles.pressed]}
                    >
                      {cardBody}
                    </Pressable>
                  ) : (
                    <View style={styles.cardMain}>{cardBody}</View>
                  )}
                  {photos.length ? (
                    <View style={styles.photos}>
                      <Text style={[styles.photosTitle, { color: palette.onSurfaceVariant }]}>
                        {t(locale, 'photo.savedPhotos')}
                      </Text>
                      <View style={styles.photoList}>
                        {photos.map((photo) => (
                          <Pressable
                            accessibilityLabel={photo.label}
                            accessibilityRole="button"
                            key={photo.id}
                            onPress={() => openPhoto(photo)}
                            style={({ pressed }) => [
                              styles.photoButton,
                              { borderColor: palette.outlineVariant },
                              pressed && styles.pressed,
                            ]}
                          >
                            <Image
                              accessibilityIgnoresInvertColors
                              accessibilityLabel={photo.label}
                              onError={() => setPhotoError(true)}
                              source={{ uri: photo.thumbnailUrl }}
                              style={styles.thumbnail}
                            />
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
                {canShowDelete ? (
                  <Pressable
                    accessibilityLabel={t(locale, 'entry.deleteTitle')}
                    accessibilityRole="button"
                    disabled={offlineMode || deleting}
                    onPress={() => confirmDelete(entry)}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      { borderLeftColor: palette.outlineVariant },
                      (offlineMode || deleting) && styles.disabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.deleteButtonText, { color: palette.error }]}>
                      {t(locale, deleting ? 'entry.deleting' : 'common.delete')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      </KeyboardAwareScrollView>

      <Modal
        animationType="fade"
        onRequestClose={closePhoto}
        statusBarTranslucent
        transparent
        visible={selectedPhoto !== null}
      >
        <SafeAreaView
          accessibilityViewIsModal
          style={[styles.photoModal, { backgroundColor: palette.background }]}
        >
          <View style={styles.photoModalHeader}>
            <Text numberOfLines={2} style={[styles.photoModalTitle, { color: palette.onSurface }]}>
              {selectedPhoto?.label ?? t(locale, 'photo.savedPhotos')}
            </Text>
            <Pressable
              accessibilityLabel={t(locale, 'common.close')}
              accessibilityRole="button"
              hitSlop={8}
              onPress={closePhoto}
              style={({ pressed }) => [
                styles.photoCloseButton,
                { backgroundColor: palette.surfaceContainer },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.photoCloseText, { color: palette.onSurface }]}>×</Text>
            </Pressable>
          </View>
          <View
            style={[
              styles.selectedPhotoFrame,
              {
                backgroundColor: palette.surfaceContainer,
                borderColor: palette.outlineVariant,
              },
            ]}
          >
            {selectedPhoto ? (
              <Image
                accessibilityIgnoresInvertColors
                accessibilityLabel={selectedPhoto.label}
                onError={() => {
                  setSelectedPhotoError(true);
                  setSelectedPhotoLoading(false);
                }}
                onLoadEnd={() => setSelectedPhotoLoading(false)}
                onLoadStart={() => setSelectedPhotoLoading(true)}
                resizeMode="contain"
                source={{ uri: selectedPhoto.photoUrl }}
                style={styles.selectedPhoto}
              />
            ) : null}
            {selectedPhotoLoading ? (
              <ActivityIndicator
                accessibilityLabel={t(locale, 'app.loading')}
                color={palette.primary}
                size="large"
                style={styles.selectedPhotoLoader}
              />
            ) : null}
            {selectedPhotoError ? (
              <StatusMessage
                message={t(locale, 'photo.loadError')}
                style={[styles.selectedPhotoError, { color: palette.error }]}
                tone="error"
              />
            ) : null}
          </View>
        </SafeAreaView>
      </Modal>
      <PatientBottomNav
        active="timeline"
        onProfile={onOpenBaseline ?? onBack}
        onSettings={onOpenSettings ?? onBack}
        onTimeline={() => undefined}
        onToday={onBack}
        palette={{
          background: dark ? colors.surface : 'rgba(241, 236, 242, 0.92)',
          onPrimaryContainer: dark ? palette.onPrimaryContainer : stitch.onPrimaryContainer,
          onSurfaceVariant: palette.onSurfaceVariant,
          primaryContainer: dark ? palette.primaryContainer : stitch.primaryContainer,
          shadow: palette.shadow,
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  content: {
    flexGrow: 1,
    gap: 24,
    paddingBottom: 140,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.55 },
  loader: { marginTop: 16 },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pageTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  titleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  roundButton: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  roundButtonIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionDivider: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statusError: {
    fontSize: 15,
    lineHeight: 22,
  },
  statusMessage: {
    fontSize: 15,
    lineHeight: 22,
  },
  empty: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  list: {
    gap: 12,
  },
  card: {
    borderRadius: 16,
    elevation: 2,
    flexDirection: 'row',
    minHeight: 88,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
  },
  cardContent: {
    flex: 1,
  },
  cardMain: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 14,
    minHeight: 88,
    padding: 18,
  },
  deleteButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderLeftWidth: 1,
    justifyContent: 'center',
    minWidth: 78,
    paddingHorizontal: 12,
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  pendingStripe: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  iconBubble: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  icon: {
    fontSize: 22,
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  cardTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  timeIcon: {
    fontSize: 13,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  kindLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  photoLoadState: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  photoLoadText: {
    fontSize: 14,
    fontWeight: '600',
  },
  photos: {
    gap: 8,
    paddingBottom: 16,
    paddingHorizontal: 18,
  },
  photosTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  photoList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoButton: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumbnail: {
    height: 76,
    width: 76,
  },
  photoModal: {
    flex: 1,
    gap: 16,
    padding: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 20 : 20,
  },
  photoModalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  photoModalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  photoCloseButton: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  photoCloseText: {
    fontSize: 28,
    fontWeight: '500',
    lineHeight: 30,
  },
  selectedPhotoFrame: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  selectedPhoto: {
    height: '100%',
    width: '100%',
  },
  selectedPhotoLoader: {
    position: 'absolute',
  },
  selectedPhotoError: {
    padding: 20,
    position: 'absolute',
    textAlign: 'center',
  },
});
