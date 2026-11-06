import type { Room, RoomType } from '../data/trip.ts'

export function filterRooms(rooms: Room[], query: string, type: RoomType | 'All') {
  const term = query.trim().toLocaleLowerCase()
  return rooms.filter(room =>
    (type === 'All' || room.type === type) &&
    (!term || room.guests.some(guest => guest.toLocaleLowerCase().includes(term))),
  )
}

export function countdownTo(start: string | null, end: string | null, now = Date.now()) {
  if (!start || !Number.isFinite(Date.parse(start))) return { status: 'pending' as const, values: [] }
  const difference = Date.parse(start) - now
  if (difference <= 0) {
    return { status: end && now >= Date.parse(end) ? 'complete' as const : 'started' as const, values: [] }
  }
  return {
    status: 'counting' as const,
    values: [Math.floor(difference / 86400000), Math.floor(difference / 3600000) % 24, Math.floor(difference / 60000) % 60, Math.floor(difference / 1000) % 60],
  }
}

export function calendarEvent(details: { name: string; destination: string; country: string; startsAt: string | null; endsAt: string | null; isSample: boolean; calendarDescription: string; calendarStartsOn?: string; calendarEndsOn?: string; hotel?: string }) {
  if (!details.startsAt || !details.endsAt) return null
  const start = new Date(details.startsAt)
  const end = new Date(details.endsAt)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return null
  const date = (value: Date) => value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
  const fold = (line: string) => {
    const encoder = new TextEncoder()
    const lines: string[] = []
    let current = ''
    let bytes = 0
    for (const character of line) {
      const length = encoder.encode(character).length
      if (bytes + length > 75) { lines.push(current); current = ' '; bytes = 1 }
      current += character
      bytes += length
    }
    lines.push(current)
    return lines.join('\r\n')
  }
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Novigi//Annual Trip//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:novigi-annual-trip-${date(start)}@novigi.local`, `DTSTAMP:${date(new Date())}`,
    ...(details.calendarStartsOn && details.calendarEndsOn
      ? [`DTSTART;VALUE=DATE:${details.calendarStartsOn.replaceAll('-', '')}`, `DTEND;VALUE=DATE:${details.calendarEndsOn.replaceAll('-', '')}`]
      : [`DTSTART:${date(start)}`, `DTEND:${date(end)}`]),
    `SUMMARY:${escape(`${details.isSample ? '[SAMPLE] ' : ''}${details.name}`)}`,
    `LOCATION:${escape(`${details.hotel ?? details.destination}, ${details.country}`)}`,
    `DESCRIPTION:${escape(details.calendarDescription)}`,
    `STATUS:${details.isSample ? 'TENTATIVE' : 'CONFIRMED'}`, 'END:VEVENT', 'END:VCALENDAR', '',
  ].map(fold).join('\r\n')
}
