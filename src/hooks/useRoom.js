import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase.js';

/**
 * Live-Abo eines Raums: Raum-Dokument, Spieler, aktuelles Duell, Rettungen.
 * Alle Geräte rendern ausschließlich aus diesem State.
 */
export function useRoom(code) {
  const [room, setRoom] = useState(undefined);
  const [players, setPlayers] = useState([]);
  const [duel, setDuel] = useState(null);
  const [rescues, setRescues] = useState([]);

  useEffect(() => {
    if (!code) return undefined;
    const unsubs = [
      onSnapshot(doc(db, 'rooms', code), (s) => setRoom(s.exists() ? { id: s.id, ...s.data() } : null)),
      onSnapshot(query(collection(db, 'rooms', code, 'players'), orderBy('joinedAt')), (s) =>
        setPlayers(s.docs.map((d) => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'rooms', code, 'rescues'), (s) =>
        setRescues(s.docs.map((d) => ({ id: d.id, ...d.data() })))),
    ];
    return () => unsubs.forEach((u) => u());
  }, [code]);

  const duelId = room?.currentDuelId;
  useEffect(() => {
    if (!code || !duelId) {
      setDuel(null);
      return undefined;
    }
    return onSnapshot(doc(db, 'rooms', code, 'duels', duelId), (s) =>
      setDuel(s.exists() ? { id: s.id, ...s.data() } : null));
  }, [code, duelId]);

  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
  return { room, players, byId, duel, rescues, loading: room === undefined };
}

export function useEvents(code, enabled) {
  const [events, setEvents] = useState([]);
  useEffect(() => {
    if (!code || !enabled) return undefined;
    return onSnapshot(collection(db, 'rooms', code, 'events'), (s) =>
      setEvents(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [code, enabled]);
  return events;
}
