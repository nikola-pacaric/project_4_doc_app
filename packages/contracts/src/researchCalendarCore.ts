export const RESEARCH_TIME_ZONE = 'Europe/Belgrade';

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: RESEARCH_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

type Parts = Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>;

function partsAt(value: Date): Parts {
  const formatted = formatter.formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(formatted.find((candidate) => candidate.type === type)?.value);
  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    hour: part('hour'),
    minute: part('minute'),
    second: part('second'),
  };
}

function parseDay(day: string): Pick<Parts, 'year' | 'month' | 'day'> | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);
  const normalized = new Date(Date.UTC(year, month - 1, date));
  return normalized.getUTCFullYear() === year &&
    normalized.getUTCMonth() === month - 1 &&
    normalized.getUTCDate() === date
    ? { year, month, day: date }
    : null;
}

function offsetAt(value: Date): number {
  const parts = partsAt(value);
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return representedAsUtc - Math.trunc(value.getTime() / 1_000) * 1_000;
}

function instantForParts(parts: Parts): Date | null {
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  const offsets = new Set(
    [-36, -12, 0, 12, 36].map((hours) => offsetAt(new Date(representedAsUtc + hours * 3_600_000))),
  );
  const candidates = [...offsets]
    .map((offset) => new Date(representedAsUtc - offset))
    .filter((candidate) => {
      const actual = partsAt(candidate);
      return (Object.keys(parts) as (keyof Parts)[]).every(
        (key) => actual[key] === parts[key],
      );
    })
    .sort((left, right) => left.getTime() - right.getTime());
  return candidates[0] ?? null;
}

const pad = (value: number) => String(value).padStart(2, '0');

export function researchCalendarDay(value: Date): string {
  const parts = partsAt(value);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function researchCalendarMonth(value: Date): string {
  return researchCalendarDay(value).slice(0, 7);
}

export function researchCalendarTime(value: Date): string {
  const parts = partsAt(value);
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function researchCalendarDateTime(value: Date, separator: 'T' | ' ' = 'T'): string {
  return `${researchCalendarDay(value)}${separator}${researchCalendarTime(value)}`;
}

export function addResearchCalendarDays(day: string, amount: number): string {
  const parsed = parseDay(day);
  if (!parsed) throw new Error('INVALID_RESEARCH_CALENDAR_DAY');
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + amount, 12))
    .toISOString()
    .slice(0, 10);
}

export function researchCalendarInstant(day: string, time = '12:00'): string | null {
  const parsed = parseDay(day);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!parsed || !timeMatch) return null;
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (hour > 23 || minute > 59) return null;
  return instantForParts({ ...parsed, hour, minute, second: 0 })?.toISOString() ?? null;
}

export function normalizeResearchCalendarDateTime(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  const localMatch = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})$/.exec(trimmed);
  if (localMatch) return researchCalendarInstant(localMatch[1]!, localMatch[2]!);

  const timestamp = Date.parse(trimmed);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

export function researchCalendarDayRange(day: string): {
  start: string;
  end: string;
  occurredAt: string;
} {
  const start = researchCalendarInstant(day, '00:00');
  const end = researchCalendarInstant(addResearchCalendarDays(day, 1), '00:00');
  const occurredAt = researchCalendarInstant(day);
  if (!start || !end || !occurredAt) throw new Error('INVALID_RESEARCH_CALENDAR_BOUNDARY');
  return { start, end, occurredAt };
}

export function recentResearchCalendarDays(now: Date, count: number): string[] {
  const today = researchCalendarDay(now);
  return Array.from({ length: Math.max(0, count) }, (_, index) =>
    addResearchCalendarDays(today, -index),
  );
}
