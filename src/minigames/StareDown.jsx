import { useEffect, useRef, useState } from 'react';
import { useGo, CountdownView, Waiting } from './shared.jsx';
import { sfx, vibrate } from '../lib/sound.js';
import { t } from '../i18n/index.js';

// WASM wird beim Build nach dist/mediapipe kopiert (siehe vite.config.js)
const WASM_URL = new URL('mediapipe', document.baseURI).href.replace(/\/?$/, '');
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const BLINK = 0.55;
const SMILE = 0.6;

let landmarkerPromise;
/** FaceLandmarker nur bei Bedarf laden (~11 MB WASM + Modell) und wiederverwenden. */
function loadLandmarker() {
  landmarkerPromise ??= (async () => {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
    return FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      outputFaceBlendshapes: true,
      runningMode: 'VIDEO',
      numFaces: 1,
    });
  })().catch((e) => {
    landmarkerPromise = null;
    throw e;
  });
  return landmarkerPromise;
}

/**
 * Spiel 9 – Starr-Duell: Frontkamera + Face-Tracking. Wer zuerst blinzelt oder
 * lacht, verliert. Ohne Tracking (Modell lädt nicht) gibt es einen Ehrlichkeits-Button.
 */
function Play({ duel, me, submit }) {
  const [step, setStep] = useState('perm'); // perm | loading | count | run | done
  const [manual, setManual] = useState(false);
  const [error, setError] = useState(null);
  const [faceSeen, setFaceSeen] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const st = useRef({ done: false, start: 0, landmarker: null });
  const opponent = me.id === duel.playerA ? duel.playerB : duel.playerA;
  const opponentRes = useRef(null);
  opponentRes.current = duel.results?.[opponent] ?? null;
  const n = useGo(step === 'count', () => setStep('run'));
  const { maxMs, graceMs } = duel.game;

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  const start = async () => {
    setStep('loading');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 480, height: 360 }, audio: false });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    } catch {
      setError(t('Kamera nicht freigegeben – spiel im Ehrlichkeits-Modus.'));
      setManual(true);
      setStep('count');
      return;
    }
    try {
      st.current.landmarker = await loadLandmarker();
    } catch {
      setError(t('Face-Tracking konnte nicht geladen werden – Ehrlichkeits-Modus.'));
      setManual(true);
    }
    setStep('count');
  };

  const finish = (reason) => {
    const s = st.current;
    if (s.done) return;
    s.done = true;
    let survivedMs = Math.round(performance.now() - s.start);
    // Gegner ist schon raus: Wer noch starrt, hat auf jeden Fall länger durchgehalten
    if (reason === 'opponent') survivedMs = Math.max(survivedMs, opponentRes.current.survivedMs + 1);
    submit({ survivedMs, reason });
    if (reason === 'blink' || reason === 'laugh' || reason === 'manual') { sfx.fail(); vibrate(400); } else sfx.tusch();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setStep('done');
  };

  useEffect(() => {
    if (step !== 'run') return undefined;
    const s = st.current;
    s.start = performance.now();
    let raf;
    let lastFace = performance.now();
    const loop = () => {
      const now = performance.now();
      const t = now - s.start;
      setElapsed(t);
      if (t >= maxMs) return finish('time');
      if (opponentRes.current) return finish('opponent');
      const video = videoRef.current;
      if (s.landmarker && video?.readyState >= 2) {
        const res = s.landmarker.detectForVideo(video, now);
        const shapes = res.faceBlendshapes?.[0]?.categories;
        if (shapes) {
          lastFace = now;
          setFaceSeen(true);
          const v = Object.fromEntries(shapes.map((c) => [c.categoryName, c.score]));
          if (t > graceMs) {
            if (v.eyeBlinkLeft > BLINK && v.eyeBlinkRight > BLINK) return finish('blink');
            if ((v.mouthSmileLeft + v.mouthSmileRight) / 2 > SMILE) return finish('laugh');
          }
        } else if (now - lastFace > 1200) {
          setFaceSeen(false);
        }
      }
      raf = requestAnimationFrame(loop);
      return undefined;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const video = (
    <video ref={videoRef} playsInline muted
      style={{ width: '100%', borderRadius: 24, transform: 'scaleX(-1)', background: '#111', display: manual ? 'none' : 'block', aspectRatio: '4/3', objectFit: 'cover' }} />
  );

  if (step === 'done') return <Waiting text={t('Du hast {n}s durchgehalten. Warte auf das Ergebnis…', { n: (elapsed / 1000).toFixed(1) })} />;
  return (
    <div className="stack center">
      {step !== 'perm' && video}
      {step === 'perm' && (
        <>
          <Waiting text={t('Schaut euch in die Augen. Die Frontkamera erkennt Blinzeln und Lachen – wer zuerst schwächelt, verliert!')} />
          {video}
          <button className="btn primary lg block" onClick={start}>📷 {t('Kamera starten')}</button>
        </>
      )}
      {step === 'loading' && <p className="muted" style={{ fontWeight: 700 }}>{t('Lade Face-Tracking…')}</p>}
      {step === 'count' && <CountdownView n={n} />}
      {error && <p className="small" style={{ color: 'var(--bad)', margin: 0 }}>{error}</p>}
      {step === 'run' && (
        <>
          <div className="big-number">{(elapsed / 1000).toFixed(1)}s</div>
          {!faceSeen && !manual && <span className="pill bad">{t('Gesicht nicht erkannt – schau in die Kamera!')}</span>}
          {manual && <button className="btn danger lg block" onClick={() => finish('manual')}>😅 {t('Ich hab geblinzelt/gelacht')}</button>}
        </>
      )}
    </div>
  );
}

const REASON = { blink: '😑 geblinzelt', laugh: '😂 gelacht', manual: '😅 zugegeben', time: '⏱ Zeit um', opponent: '🏆 durchgehalten' };

function Review({ duel, byId }) {
  return (
    <div className="card stack">
      <h3>{t('Durchgehalten')}</h3>
      {[duel.playerA, duel.playerB].map((id) => {
        const r = duel.results?.[id];
        return (
          <div key={id} className="row between">
            <b>{byId[id]?.avatar} {byId[id]?.name}</b>
            <span>{r ? `${(r.survivedMs / 1000).toFixed(1)}s · ${t(REASON[r.reason] ?? '')}` : t('starrt…')}</span>
          </div>
        );
      })}
    </div>
  );
}

export const StareDown = { Play: ({ duel, me, submit }) => <Play duel={duel} me={me} submit={(d) => submit(null, d)} />, Stage: Review, Review };
