/* fx.js — capa de efectos. Cargar DESPUÉS de app.js (defer). No modifica app.js.
   Observa el DOM que ya crea app.js (clases .sel y body.detail-open). */
(() => {
  const $ = s => document.querySelector(s);
  const body = document.body, root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LOTTIE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
  let ready = false, openState = false, selIdx = -1, lotData = null, muted = true, ac;
  try { muted = localStorage.getItem('fx-sound') !== 'on'; } catch {}

  body.classList.add('fx-on');
  $('#stage')?.before(
    Object.assign(document.createElement('div'), { className: 'fx-dim' }),
    Object.assign(document.createElement('div'), { className: 'fx-sweep' })
  );

  /* ---------- sonido (sintetizado, sin archivos) ---------- */
  function tone(f1, f2, dur, type = 'sine', vol = .05) {
    if (muted) return;
    try {
      ac ||= new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f1, t);
      o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g).connect(ac.destination);
      o.start(t); o.stop(t + dur);
    } catch {}
  }
  const sb = document.createElement('button');
  sb.className = 'fx-snd'; sb.type = 'button';
  const paintSnd = () => { sb.textContent = 'SONIDO: ' + (muted ? 'OFF' : 'ON'); sb.setAttribute('aria-pressed', String(!muted)); };
  const toggleSnd = () => {
    muted = !muted;
    try { localStorage.setItem('fx-sound', muted ? 'off' : 'on'); } catch {}
    paintSnd(); tone(660, 990, .12, 'triangle', .05);
  };
  sb.onclick = toggleSnd; paintSnd(); body.append(sb);
  addEventListener('keydown', e => { if (e.key === 'm' || e.key === 'M') toggleSnd(); });

  /* ---------- 1 · intro ---------- */
  function boot() {
    if (reduce) { body.classList.add('booted'); ready = true; return; }
    const ov = document.createElement('div');
    ov.className = 'fx-intro';
    ov.innerHTML = '<i class="fx-line"></i><i class="fx-flare"></i>';
    body.append(ov);
    let t;
    const finish = skipped => {
      if (ready) return;
      ready = true; clearTimeout(t);
      body.classList.add('booted');
      skipped ? ov.remove() : setTimeout(() => ov.remove(), 1100);
    };
    t = setTimeout(() => finish(false), 950);
    ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => finish(true), { once: true }));
  }
  boot();

  /* ---------- 2 · transición de paneles (+ Lottie opcional) ---------- */
  const loadScript = src => new Promise((ok, no) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = no; document.head.append(s);
  });
  // Si content.json trae  "site": { "fx": { "lottie": "assets/lottie/archivo.json" } }  se usa esa animación.
  fetch('content.json').then(r => r.json()).then(d => {
    const p = d.site?.fx?.lottie; if (!p) return;
    return Promise.all([window.lottie ? 0 : loadScript(LOTTIE_CDN), fetch(p).then(r => r.json())]).then(([, j]) => { lotData = j; });
  }).catch(() => {});

  function ripple() {
    const w = $('.orb-wrap'); if (!w || reduce) return;
    const r = document.createElement('i');
    r.className = 'fx-ripple'; r.onanimationend = () => r.remove(); w.append(r);
  }
  function onOpen() {
    tone(300, 900, .25, 'sawtooth', .03); tone(600, 1800, .3, 'sine', .04);
    ripple();
    const b = document.createElement('div'); b.className = 'fx-burst';
    if (lotData && window.lottie) {
      const box = document.createElement('div'); box.className = 'fx-lottie'; body.append(box);
      const a = lottie.loadAnimation({ container: box, renderer: 'svg', loop: false, autoplay: true, animationData: lotData, rendererSettings: { preserveAspectRatio: 'xMidYMid slice' } });
      a.addEventListener('complete', () => { a.destroy(); box.remove(); });
    } else b.innerHTML = '<i></i><i></i><i></i>';
    body.append(b); setTimeout(() => b.remove(), 1100);
  }
  function onBack() { tone(700, 350, .18, 'triangle', .05); ripple(); }

  new MutationObserver(() => {
    const o = body.classList.contains('detail-open');
    if (o !== openState) { openState = o; if (ready) o ? onOpen() : onBack(); }
  }).observe(body, { attributes: true, attributeFilter: ['class'] });

  // la imagen de la galería cambia con fundido + desenfoque
  const det = $('#detail');
  det && new MutationObserver(ms => ms.forEach(m => {
    const el = m.target; if (el.id !== 'shot') return;
    el.classList.remove('fx-swap'); void el.offsetWidth; el.classList.add('fx-swap');
  })).observe(det, { subtree: true, attributes: true, attributeFilter: ['src'] });

  /* ---------- 4 · feedback al mover la selección ---------- */
  const menu = $('#menu');
  menu && new MutationObserver(() => {
    const i = [...menu.querySelectorAll('.item')].findIndex(b => b.classList.contains('sel'));
    if (i === selIdx) return;
    const first = selIdx < 0; selIdx = i;
    if (!first && ready && !openState) { tone(880, 1320, .06, 'triangle', .04); ripple(); }
  }).observe(menu, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });

  /* ---------- 3 · parallax suave con el mouse ---------- */
  if (!reduce && matchMedia('(pointer: fine)').matches) {
    let tx = 0, ty = 0, cx = 0, cy = 0;
    addEventListener('pointermove', e => { tx = e.clientX / innerWidth * 2 - 1; ty = e.clientY / innerHeight * 2 - 1; });
    (function loop() {
      if (Math.abs(tx - cx) + Math.abs(ty - cy) > .001) {
        cx += (tx - cx) * .06; cy += (ty - cy) * .06;
        root.style.setProperty('--mx', cx.toFixed(3));
        root.style.setProperty('--my', cy.toFixed(3));
      }
      requestAnimationFrame(loop);
    })();
  }
})();
