/**
 * src/services/storageService.ts
 * 
 * Lagringsteneste for Undervisningsbyggjar:
 * - Handterer lagring, henting, oppdatering og sletting av heile samlingar
 * - Lokalt i nettlesaren (localStorage) og klargjort for Firebase / Firestore
 */

import { TeachingSession } from '../types';

const STORAGE_KEY_TEACHING_SESSIONS = 'undervisningsbyggar_saved_sessions_v2';

export async function loadTeachingSessions(): Promise<TeachingSession[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEACHING_SESSIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[StorageService] Kunne ikkje lese samlingar:', err);
  }
  return [];
}

export async function saveTeachingSession(session: TeachingSession): Promise<TeachingSession> {
  const all = await loadTeachingSessions();
  const id = session.id || `session_${Date.now()}`;
  const now = new Date().toISOString();

  const toSave: TeachingSession = {
    ...session,
    id,
    title: session.title?.trim() || 'Ny samling',
    updatedAt: now,
    createdAt: session.createdAt || now,
  };

  const existingIdx = all.findIndex((s) => s.id === id);
  if (existingIdx >= 0) {
    all[existingIdx] = toSave;
  } else {
    all.unshift(toSave);
  }

  try {
    localStorage.setItem(STORAGE_KEY_TEACHING_SESSIONS, JSON.stringify(all));
  } catch (err) {
    console.warn('[StorageService] Kunne ikkje lagre til localStorage:', err);
  }

  return toSave;
}

export async function deleteTeachingSession(id: string): Promise<boolean> {
  const all = await loadTeachingSessions();
  const filtered = all.filter((s) => s.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY_TEACHING_SESSIONS, JSON.stringify(filtered));
  } catch (err) {
    console.warn('[StorageService] Kunne ikkje slette samling:', err);
  }
  return true;
}
