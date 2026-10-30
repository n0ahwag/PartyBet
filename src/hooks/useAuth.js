import { useEffect, useState } from 'react';
import { ensureUid } from '../firebase.js';

export function useUid() {
  const [uid, setUid] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    ensureUid().then(setUid, (e) => setError(e.message));
  }, []);
  return { uid, error };
}
