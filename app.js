const $ = s => document.querySelector(s);
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let data, sel = 0, isOpen = false, img = 0;

// Intro Lottie "Nintendo Direct": se reproduce cada vez que se abre un panel
const intro = (() => {
  const box = $('#intro');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!box || !window.lottie || reduce) return { play() {} };   // sin librería o sin movimiento: no hace nada
  const anim = lottie.loadAnimation({
    container: box.querySelector('.lottie'), renderer: 'svg', loop: false, autoplay: false,
    path: 'assets/nintendo-direct.json', rendererSettings: { preserveAspectRatio: 'xMidYMid meet' }
  });
  let ready = false, timer;
  const end = () => { clearTimeout(timer); box.classList.remove('on'); };
  anim.addEventListener('DOMLoaded', () => { ready = true; });
  anim.addEventListener('complete', end);
  return {
    play() {
      if (!ready) return;
      clearTimeout(timer);
      box.classList.add('on');
      anim.goToAndPlay(0, true);
      timer = setTimeout(end, 2600);   // seguro por si 'complete' no llega
    }
  };
})();

fetch('content.json').then(r => r.json()).then(d => {
  data = d;
  document.title = d.site.title;
  $('#orb-label').textContent = d.site.logo;
  renderMenu();
}).catch(() => { $('#menu').textContent = 'No se pudo cargar content.json. Si abres el archivo en local, usa un servidor (ver instrucciones).'; });

function renderMenu() {
  const m = $('#menu'); m.innerHTML = '';
  data.items.forEach((it, i) => {
    const b = document.createElement('button');
    b.className = 'item'; b.style.setProperty('--i', i);
    b.innerHTML = `<i class="dot"></i><span class="bar">${esc(it.title)}</span>`;
    b.onmouseenter = () => { sel = i; paint(); };
    b.onfocus = () => { sel = i; paint(); };
    b.onclick = () => { sel = i; openItem(); };
    m.append(b);
  });
  paint();
}
function paint() {
  document.querySelectorAll('.item').forEach((b, i) => b.classList.toggle('sel', i === sel));
}
function openItem() {
  const it = data.items[sel]; img = 0; isOpen = true;
  intro.play();
  const paras = [].concat(it.description || []).map(p => `<p>${esc(p)}</p>`).join('');
  const links = (it.links || []).map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('');
  const imgs = it.images || [];
  const gallery = imgs.length ? `<img class="shot" id="shot" alt=""><div class="cap" id="cap"></div>
    <div class="thumbs">${imgs.map((g, i) => `<img src="${esc(g.src)}" alt="${esc(g.caption || '')}" data-i="${i}">`).join('')}</div>` : '';
  const d = $('#detail');
  d.innerHTML = `<h1>${esc(it.title)}</h1><div class="sub">${esc(it.subtitle || '')}</div>${gallery}${paras}<div class="links">${links}</div>`;
  d.querySelectorAll('.thumbs img').forEach(t => t.onclick = () => showImg(+t.dataset.i));
  $('#menu').hidden = true; d.hidden = false;
  document.body.classList.add('detail-open');
  if (imgs.length) showImg(0);
  d.scrollTop = 0;
}
function showImg(i) {
  const imgs = data.items[sel].images; if (!imgs.length) return;
  img = (i + imgs.length) % imgs.length;
  $('#shot').src = imgs[img].src; $('#shot').alt = imgs[img].caption || '';
  $('#cap').textContent = imgs[img].caption || '';
  document.querySelectorAll('.thumbs img').forEach((t, k) => t.classList.toggle('on', k === img));
}
function back() {
  isOpen = false; $('#detail').hidden = true; $('#menu').hidden = false;
  document.body.classList.remove('detail-open');
  document.querySelectorAll('.item')[sel]?.focus();
}
$('#btn-a').onclick = () => { if (!isOpen && data) openItem(); };
$('#btn-b').onclick = () => { if (isOpen) back(); };

document.addEventListener('keydown', e => {
  if (!data) return;
  const n = data.items.length;
  if (!isOpen) {
    if (e.key === 'ArrowDown') { sel = (sel + 1) % n; paint(); document.querySelectorAll('.item')[sel].focus(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { sel = (sel - 1 + n) % n; paint(); document.querySelectorAll('.item')[sel].focus(); e.preventDefault(); }
  } else {
    if (e.key === 'Escape' || e.key === 'Backspace') back();
    if (e.key === 'ArrowRight') showImg(img + 1);
    if (e.key === 'ArrowLeft') showImg(img - 1);
  }
});

// Mando (A = seleccionar, B = volver, cruceta arriba/abajo)
let last = {};
setInterval(() => {
  const p = (navigator.getGamepads?.() || []).find(Boolean); if (!p || !data) return;
  const press = (k, v) => { const now = !!v; const was = last[k]; last[k] = now; return now && !was; };
  if (press('a', p.buttons[0]?.pressed) && !isOpen) openItem();
  if (press('b', p.buttons[1]?.pressed) && isOpen) back();
  if (!isOpen) {
    if (press('d', p.buttons[13]?.pressed)) { sel = (sel + 1) % data.items.length; paint(); }
    if (press('u', p.buttons[12]?.pressed)) { sel = (sel - 1 + data.items.length) % data.items.length; paint(); }
  }
}, 80);

// Partículas flotantes (ambiente)
(() => {
  const c = $('#motes'), x = c.getContext('2d');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let w, h, ps = [];
  const size = () => { w = c.width = innerWidth; h = c.height = innerHeight; };
  addEventListener('resize', size); size();
  for (let i = 0; i < 40; i++) ps.push({ x: Math.random() * w, y: Math.random() * h, r: 1 + Math.random() * 2.5, v: .15 + Math.random() * .4, a: Math.random() * 6.28 });
  (function tick() {
    x.clearRect(0, 0, w, h);
    ps.forEach(p => {
      p.y -= p.v; p.a += .01; p.x += Math.sin(p.a) * .3;
      if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
      x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.28);
      x.fillStyle = `rgba(170,240,90,${.15 + .25 * Math.abs(Math.sin(p.a))})`;
      x.shadowColor = '#9fe44a'; x.shadowBlur = 10; x.fill();
    });
    requestAnimationFrame(tick);
  })();
})();
