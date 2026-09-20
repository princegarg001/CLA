// Scheduling helpers: turn "9:00 AM in New York" into a real instant, and
// suggest the next few good posting windows.

// The UTC instant at which the wall clock in `tz` reads y-m-d h:00.
export function zonedTime(year: number, month: number, day: number, hour: number, tz: string): Date {
  const utcGuess = Date.UTC(year, month, day, hour);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
      .formatToParts(new Date(utcGuess))
      .map((p) => [p.type, p.value])
  );
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return new Date(utcGuess - (asUTC - utcGuess));
}

export function localTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in the browser's zone.
export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface Slot {
  label: string;
  when: Date;
}

const WEEKDAY_IN = (d: Date, tz: string) => new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(d);

// Next Tue/Wed/Thu at `hour` in `tz` — the windows B2B posts tend to do best.
function nextMidweek(tz: string, hour: number): Date {
  const now = Date.now();
  for (let i = 0; i < 14; i++) {
    const probe = new Date(now + i * 86400000);
    const ymd = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric' })
        .formatToParts(probe)
        .map((p) => [p.type, p.value])
    );
    const candidate = zonedTime(+ymd.year, +ymd.month - 1, +ymd.day, hour, tz);
    if (candidate.getTime() > now + 5 * 60000 && ['Tue', 'Wed', 'Thu'].includes(WEEKDAY_IN(candidate, tz))) return candidate;
  }
  return new Date(now + 86400000);
}

export function suggestedSlots(): Slot[] {
  const local = localTimezone();
  return [
    { label: 'Tue–Thu 9 AM New York', when: nextMidweek('America/New_York', 9) },
    { label: 'Tue–Thu 9 AM London', when: nextMidweek('Europe/London', 9) },
    { label: 'Tue–Thu 9 AM your time', when: nextMidweek(local, 9) },
  ];
}

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
