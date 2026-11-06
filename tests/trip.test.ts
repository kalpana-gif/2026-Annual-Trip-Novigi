import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rooms, trip } from '../src/data/trip.ts'
import { calendarEvent, countdownTo, filterRooms } from '../src/lib/trip.ts'

test('the supplied guest list is preserved as 19 groups containing 55 guests', () => {
  assert.equal(rooms.length, 19)
  assert.equal(rooms.flatMap(room => room.guests).length, 55)
  assert.equal(new Set(rooms.map(room => room.id)).size, rooms.length)
  for (const room of rooms) assert.ok(room.guests.length <= room.capacity)
  assert.deepEqual(rooms.find(room => room.id === 'group-sathira')?.guests, ['Sathira', 'Malaka'])
  assert.deepEqual(rooms.find(room => room.id === 'group-chulalee')?.guests, ['Chulalee', 'Samadhi'])
})

test('search finds partial names irrespective of case and surrounding spaces', () => {
  assert.deepEqual(filterRooms(rooms, ' LAHIRU ', 'All').map(room => room.id), ['group-lahiru', 'group-anuk'])
  assert.deepEqual(filterRooms(rooms, 'Gimhani', 'All').map(room => room.id), ['group-tt'])
  assert.deepEqual(filterRooms(rooms, 'Shamallka', 'All').map(room => room.id), ['group-sabeena'])
})

test('guest search and room type filters combine without exposing internal IDs or room numbers', () => {
  assert.deepEqual(filterRooms(rooms, 'Samadhi', 'Twin').map(room => room.id), ['group-chulalee'])
  assert.equal(filterRooms(rooms, 'Samadhi', 'Triple').length, 0)
  assert.equal(filterRooms(rooms, '208', 'All').length, 0)
  assert.equal(filterRooms(rooms, 'group-chulalee', 'All').length, 0)
  assert.equal(filterRooms(rooms, 'zzzz', 'All').length, 0)
  assert.equal(filterRooms(rooms, '  ', 'All').length, 19)
  assert.equal(filterRooms(rooms, '', 'Twin').length, 2)
  assert.equal(filterRooms(rooms, '', 'Triple').length, 17)
})

test('countdown uses the confirmed Sri Lanka gathering instant, independent of browser timezone', () => {
  const now = Date.parse('2026-11-06T08:00:00Z')
  assert.deepEqual(countdownTo(trip.startsAt, trip.endsAt, now), { status: 'counting', values: [7, 0, 0, 0] })
})

test('countdown handles unknown dates, the start instant, and the exclusive end date', () => {
  assert.equal(countdownTo(null, null).status, 'pending')
  assert.equal(countdownTo('invalid', null).status, 'pending')
  assert.equal(countdownTo(trip.startsAt, trip.endsAt, Date.parse(trip.startsAt!)).status, 'started')
  assert.equal(countdownTo(trip.startsAt, trip.endsAt, Date.parse('2026-11-15T17:00:00Z')).status, 'started')
  assert.equal(countdownTo(trip.startsAt, trip.endsAt, Date.parse(trip.endsAt!)).status, 'complete')
})

test('calendar spans all three confirmed days without inventing checkout or return times', () => {
  const calendar = calendarEvent(trip)!
  assert.ok(calendar.includes('DTSTART;VALUE=DATE:20261113\r\n'))
  assert.ok(calendar.includes('DTEND;VALUE=DATE:20261116\r\n'))
  assert.ok(calendar.includes('STATUS:CONFIRMED'))
  assert.ok(calendar.includes('LOCATION:Pullman Bentota Resort & Spa\\, Sri Lanka'))
  assert.ok(!calendar.includes('[SAMPLE]'))
  assert.ok(calendar.replaceAll('\r\n ', '').includes('1:30 PM and 2:00 PM Sri Lanka time'))
  for (const line of calendar.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75)
})

test('calendar safely handles incomplete dates and labels future sample trip data', () => {
  assert.equal(calendarEvent({ ...trip, startsAt: null }), null)
  assert.equal(calendarEvent({ ...trip, endsAt: 'invalid' }), null)
  assert.equal(calendarEvent({ ...trip, endsAt: trip.startsAt }), null)
  assert.ok(calendarEvent({ ...trip, isSample: true })?.includes('SUMMARY:[SAMPLE] Novigi Annual Trip 2026'))
  assert.ok(calendarEvent({ ...trip, isSample: true })?.includes('STATUS:TENTATIVE'))
})
