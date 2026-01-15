import Dexie, { type EntityTable } from 'dexie';
import type { Note } from '../types';

const db = new Dexie('BethelDB') as Dexie & {
  notes: EntityTable<Note, 'id'>;
};

db.version(1).stores({
  notes: 'id, title, createdAt, updatedAt',
});

export { db };
