function pad(value: number) {
  return String(value).padStart(2, '0');
}

function parseDateParts(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  };
}

function parseTimeParts(value: string) {
  const time = value.trim() || '09:00';
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const [, hour, minute] = match;
  return {
    hour: Number(hour),
    minute: Number(minute),
  };
}

export function formatAppointmentDateInput(value?: string | null) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatAppointmentTimeInput(value?: string | null) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toIsoAppointment(dateText: string, timeText: string) {
  const dateParts = parseDateParts(dateText);
  const timeParts = parseTimeParts(timeText);
  if (dateParts && timeParts) {
    const parsed = new Date(
      dateParts.year,
      dateParts.month - 1,
      dateParts.day,
      timeParts.hour,
      timeParts.minute,
      0,
      0,
    );
    const valid =
      parsed.getFullYear() === dateParts.year
      && parsed.getMonth() === dateParts.month - 1
      && parsed.getDate() === dateParts.day
      && parsed.getHours() === timeParts.hour
      && parsed.getMinutes() === timeParts.minute;
    if (valid) return parsed.toISOString();
  }

  const raw = `${dateText.trim()} ${timeText.trim()}`.trim();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Enter a valid appointment date and time.');
  }
  return parsed.toISOString();
}
