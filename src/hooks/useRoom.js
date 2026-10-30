import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase.js';
import { forceReconnect } from '../lib/liveSync.js';

/**
 * Live-Abo eines Raums: Raum-Dokument, Spieler, aktuelles Duell, Rettungen.
 * Alle Geräte rendern ausschließlich aus diesem State.
 */
export function useRoom(code) {
  const [room, setRoom] = useState(undefined);
  const [players, setPlayers] = useState([]);
  const [duel, setDuel] = useState(null);
  const [rescues, setRescues] = useState([]);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (!code) return undefined;
    const unsubs = [
      // fromCache = keine Live-Verbindung zum Server → Banner zeigen
      onSnapshot(doc(db, 'rooms', code), { includeMetadataChanges: true }, (s) => {
        setOnline(!s.metadata.fromCache);
        setRoom(s.exists() ? { id: s.id, ...s.data() } : null);
      }),
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

  // Bleibt die Verbindung weg, nach 4 s aktiv neu verbinden
  useEffect(() => {
    if (online) return undefined;
    const t = setInterval(forceReconnect, 4000);
    return () => clearInterval(t);
  }, [online]);

  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
  return { room, players, byId, duel, rescues, online, loading: room === undefined };
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
