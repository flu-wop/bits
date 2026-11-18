import type { Client } from '@libsql/client';

// Runs once per database (guarded by settings.seed_v1). Everything ships OFF:
//  - three deposit offers with no amount (James/Raquel decide the amounts; ranges are shown as hints only)
//  - one PLACEHOLDER draft event with one disabled General Admission type, so the admin has something to fill in.
// Nothing here is public until it is filled in and switched on.
export async function seed(client: Client) {
  const done = await client.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['seed_v1'] });
  if (done.rows.length) return;
  const now = new Date().toISOString();
  const eventId = crypto.randomUUID();
  await client.batch(
    [
      { sql: 'INSERT INTO deposit_offers (id, key, label, hint, sort) VALUES (?, ?, ?, ?, 1)', args: [crypto.randomUUID(), 'discovery', 'Discovery Session', 'Package range $250-$500. Applied to a larger package if the client proceeds within 30 days.'] },
      { sql: 'INSERT INTO deposit_offers (id, key, label, hint, sort) VALUES (?, ?, ?, ?, 2)', args: [crypto.randomUUID(), 'event-ops', 'Event Ops Support: deposit', 'Package range $2,500-$7,500. Site copy says a 30-40% deposit to start.'] },
      { sql: 'INSERT INTO deposit_offers (id, key, label, hint, sort) VALUES (?, ?, ?, ?, 3)', args: [crypto.randomUUID(), 'residency', 'Residency / Cultural Exchange Build: deposit', 'Package range $8,000-$20,000+. Site copy says a 25-35% deposit to begin.'] },
      { sql: 'INSERT INTO events (id, slug, title, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', args: [eventId, 'first-ticketed-event', 'First ticketed event (placeholder)', 'draft', now, now] },
      { sql: 'INSERT INTO ticket_types (id, event_id, name, sort) VALUES (?, ?, ?, 1)', args: [crypto.randomUUID(), eventId, 'General Admission'] },
      { sql: 'INSERT INTO settings (key, value) VALUES (?, ?)', args: ['seed_v1', now] },
    ],
    'write',
  );
}
