import { useState } from 'react';
import { AVATARS } from '../game/constants.js';
import { joinRoom } from '../game/engine.js';
import { navigate } from '../lib/router.js';
import { detectCaps, requestMotionPermission } from '../lib/device.js';
import { useToast, useAction, LangSwitch } from '../components/ui.jsx';
import { t } from '../i18n/index.js';

export function JoinRoom({ uid, code: initialCode }) {
  const [code, setCode] = useState(initialCode || '');
  const [name, setName] = useState(localStorage.getItem('fo_name') || '');
  const [avatar, setAvatar] = useState(localStorage.getItem('fo_avatar') || AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  const [toast, toastNode] = useToast();
  const [run, busy] = useAction(toast);

  const join = () => run(async () => {
    requestMotionPermission(); // für "Statue!" und Sensor-Spiele – muss direkt in der Tipp-Geste passieren
    localStorage.setItem('fo_name', name);
    localStorage.setItem('fo_avatar', avatar);
    await joinRoom(code, uid, { name, avatar, caps: detectCaps() });
    localStorage.setItem('fo_last', `/play/${code}`);
    navigate(`/play/${code}`);
  });

  return (
    <div className="page">
      <div className="row between">
        <button className="btn ghost sm" onClick={() => navigate('/')}>←</button>
        <h2>{t('Beitreten')}</h2>
        <LangSwitch />
      </div>
      <input className="input code" maxLength={4} placeholder="CODE" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} />
      <input className="input" placeholder={t('Dein Name')} maxLength={16} value={name} onChange={(e) => setName(e.target.value)} />
      <div className="card stack">
        <h3>Avatar</h3>
        <div className="row wrap" style={{ gap: 8 }}>
          {AVATARS.map((a) => (
            <button key={a} className={`chip ${a === avatar ? 'on' : ''}`} style={{ fontSize: 26, padding: '6px 10px' }} onClick={() => setAvatar(a)}>{a}</button>
          ))}
        </div>
      </div>
      <button className="btn primary lg block" disabled={busy || !uid || code.length !== 4 || !name.trim()} onClick={join}>{t("Los geht's")}</button>
      {toastNode}
    </div>
  );
}
