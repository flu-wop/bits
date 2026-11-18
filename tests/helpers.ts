import { createClient, type Client } from '@libsql/client';
import { __setDb, prepare } from '@/lib/db';

export async function freshDb(): Promise<Client> {
  const client = createClient({ url: ':memory:' });
  await prepare(client);
  __setDb(client);
  return client;
}
