import { describe, expect, it } from 'vitest';
import { MAX_TICKET_CENTS, centsToInput, checkTicketType, formatCents, parseDollars, parseInteger, parseLocalDateTime, publishBlockers, slugify } from '@/lib/validate';

describe('parseDollars', () => {
  it.each([['35', 3500], ['35.5', 3550], ['35.50', 3550], ['$1,250.00', 125000], [' 0.50 ', 50], ['10.05', 1005]])('%s -> %i', (s, cents) => {
    expect(parseDollars(s, MAX_TICKET_CENTS)).toEqual({ ok: true, cents });
  });
  it.each(['', 'abc', '-5', '1.234', '1e3', '0.49', '0', '5,00x', '.5', '5.'])('rejects %j', (s) => {
    expect(parseDollars(s, MAX_TICKET_CENTS).ok).toBe(false);
  });
  it('enforces the cap', () => {
    expect(parseDollars('5000', MAX_TICKET_CENTS).ok).toBe(true);
    expect(parseDollars('5000.01', MAX_TICKET_CENTS).ok).toBe(false);
  });
  it('round-trips with centsToInput / formatCents', () => {
    expect(centsToInput(3550)).toBe('35.50'); expect(centsToInput(3500)).toBe('35'); expect(centsToInput(null)).toBe('');
    expect(formatCents(3500)).toBe('$35'); expect(formatCents(3550)).toBe('$35.50');
  });
});

describe('parseInteger / parseLocalDateTime / slugify', () => {
  it('integers', () => {
    expect(parseInteger('6', 1, 10, 'x')).toEqual({ ok: true, value: 6 });
    for (const s of ['0', '11', '1.5', '-1', '', 'a']) expect(parseInteger(s, 1, 10, 'x').ok).toBe(false);
  });
  it('local datetimes', () => {
    expect(parseLocalDateTime('')).toEqual({ ok: true, value: null });
    expect(parseLocalDateTime('2027-03-05T19:30')).toEqual({ ok: true, value: '2027-03-05T19:30' });
    for (const s of ['2027-13-05T19:30', '2027-03-05', 'tomorrow', '2027-03-05T25:00']) expect(parseLocalDateTime(s).ok).toBe(false);
  });
  it('slugs', () => {
    expect(slugify('Sunset Showcase 2027!')).toBe('sunset-showcase-2027');
    expect(slugify('  Café   Night ')).toBe('cafe-night');
    expect(slugify('???')).toBe('event');
  });
});

describe('ticket type + publish rules', () => {
  const base = { name: 'GA', priceCents: 3500, capacity: 100, maxPerOrder: 6, salesOpen: null, salesClose: null, enabled: true };
  it('needs price and capacity to be on', () => {
    expect(checkTicketType(base)).toBeNull();
    expect(checkTicketType({ ...base, priceCents: null })).toMatch(/price/);
    expect(checkTicketType({ ...base, capacity: null })).toMatch(/capacity/);
    expect(checkTicketType({ ...base, priceCents: null, enabled: false })).toBeNull();
  });
  it('max per order and sales window', () => {
    expect(checkTicketType({ ...base, capacity: 4 })).toMatch(/Max per order/);
    expect(checkTicketType({ ...base, salesOpen: '2027-01-02T10:00', salesClose: '2027-01-01T10:00' })).toMatch(/close after/);
  });
  it('blocks publishing until complete', () => {
    const ready = { title: 'Sunset Showcase', startsAt: '2027-03-05T19:30', venue: 'The Venue', ticketTypes: [{ enabled: true, priceCents: 3500, capacity: 100 }] };
    expect(publishBlockers(ready)).toEqual([]);
    expect(publishBlockers({ ...ready, title: 'First ticketed event (placeholder)' })).toHaveLength(1);
    expect(publishBlockers({ title: 'X', startsAt: null, venue: '', ticketTypes: [] })).toHaveLength(3);
  });
});
