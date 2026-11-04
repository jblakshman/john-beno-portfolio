import { getCollection, type CollectionEntry } from 'astro:content';
import { site } from '../site.config';

export type Note = CollectionEntry<'notes'>;

/** Notes, newest first. Drafts only when asked for (the Studio preview). */
export async function getNotes({ drafts = false } = {}): Promise<Note[]> {
  return (await getCollection('notes', ({ data }) => drafts || !data.draft)).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export const noteDate = (d: Date) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Whether the live site builds the Notes pages and feed. */
export const notesLive = () => site.sections.notes;
