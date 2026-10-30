import { useState } from 'react';
import { navigate } from '../lib/router.js';
import { t } from '../i18n/index.js';
import { LangSwitch } from '../components/ui.jsx';

export function Home() {
  const [code, setCode] = useState('');
  const last = localStorage.getItem('fo_last');
  return (
    <div className="page" style={{ justifyContent: 'center' }}>
      <div className="row" style={{ justifyContent: 'flex-end' }}><LangSwitch full /></div>
      <div className="stack center" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 64 }}>⚔️🍺</div>
        <h1 className="logo">FaceOff<br /><span>Party</span></h1>
        <p className="muted" style={{ margin: 0, fontWeight: 600 }}>{t('Duelle. Wetten. Schlücke.')}</p>
      </div>
      <button className="btn primary lg block" onClick={() => navigate('/create')}>🎉 {t('Party erstellen')}</button>
      <button className="btn soft lg block" onClick={() => navigate('/library')}>📚 {t('Bibliothek')}</button>
      <div className="card stack">
        <h3>{t('Beitreten')}</h3>
        <input className="input code" maxLength={4} placeholder="CODE" value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} />
        <button className="btn block" disabled={code.length !== 4} onClick={() => navigate(`/join/${code}`)}>{t('Beitreten')}</button>
      </div>
      {last && <button className="btn ghost sm" onClick={() => navigate(last)}>↩︎ {t('Zurück zur letzten Party')}</button>}
      <p className="faint small center">{t('Bitte verantwortungsvoll trinken. Schlücke können auch Wasser sein 💧')}</p>
    </div>
  );
}
