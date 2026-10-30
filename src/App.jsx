import { useEffect } from 'react';
import { useRoute } from './lib/router.js';
import { useUid } from './hooks/useAuth.js';
import { unlockAudio } from './lib/sound.js';
import { startLiveSync } from './lib/liveSync.js';
import { Loading } from './components/ui.jsx';
import { Home } from './screens/Home.jsx';
import { CreateRoom } from './screens/CreateRoom.jsx';
import { JoinRoom } from './screens/JoinRoom.jsx';
import { HostScreen } from './screens/HostScreen.jsx';
import { PlayerController } from './screens/PlayerController.jsx';

export function App() {
  const { name, params } = useRoute();
  const { uid, error } = useUid();

  useEffect(() => startLiveSync(), []);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  if (error) {
    return (
      <div className="page center">
        <h2>Verbindung fehlgeschlagen</h2>
        <p className="muted">{error}</p>
        <p className="small muted">Ist „Anonyme Anmeldung“ in Firebase Authentication aktiviert?</p>
      </div>
    );
  }
  if (!uid) return <Loading text="Verbinde…" />;

  const code = params[0]?.toUpperCase();
  switch (name) {
    case 'create': return <CreateRoom uid={uid} />;
    case 'join': return <JoinRoom uid={uid} code={code} />;
    case 'host': return <HostScreen uid={uid} code={code} />;
    case 'play': return <PlayerController uid={uid} code={code} />;
    default: return <Home />;
  }
}
