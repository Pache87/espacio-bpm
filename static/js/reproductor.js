// ============================================================
// REPRODUCTOR DE EJERCICIOS — v2
// ============================================================

let TIMEMAP    = [];
let baseTempo  = 96;
let msPerBeat  = 625;
let totalDurMs = 0;
let PRECUENTA_MS = 2500;

let looping  = false;
let playing  = false;
let rafId    = null;
let lastBeat = -1;

// Referencias cacheadas — evitan getElementById en cada frame
const rpVideo       = document.getElementById('rp-video');
const rpProgressFill = document.getElementById('rp-progress-fill');
const rpBeatDots    = [0,1,2,3].map(i => document.getElementById('rp-bd' + i));
let   rpOverlayEl   = null;   // se asigna al crear el overlay en cargarEjercicio
let   rpOverlayNum  = null;
let   lastCdBeat    = -1;     // para el countdown, evita writes innecesarios

function rpClearAllNotes() {
  document.querySelectorAll('.note-active').forEach(el => el.classList.remove('note-active'));
}
function rpActivateNotes(ids) {
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('note-active'); });
}
function rpDeactivateNotes(ids) {
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('note-active'); });
}

let lastBeatDot = -1;
function rpUpdateBeatDots(t) {
  const b = Math.floor((t / msPerBeat) % 4);
  if (b === lastBeatDot) return;          // nada cambió, no tocar el DOM
  rpBeatDots[lastBeatDot]?.classList.remove('active');
  rpBeatDots[b]?.classList.add('active');
  lastBeatDot = b;
}
function rpClearBeatDots() {
  rpBeatDots.forEach(d => d?.classList.remove('active'));
  lastBeatDot = -1;
}

function rpUpdateCountdownOverlay(elapsedMs) {
  if (!rpOverlayEl) return;
  if (elapsedMs >= PRECUENTA_MS) { rpOverlayEl.classList.remove('visible'); return; }
  rpOverlayEl.classList.add('visible');
  const beat = Math.floor(elapsedMs / msPerBeat);
  if (beat !== lastCdBeat && rpOverlayNum) {
    lastCdBeat = beat;
    rpOverlayNum.textContent = beat + 1;
    // Alternar clase en vez de void offsetWidth (evita reflow forzado)
    rpOverlayNum.classList.toggle('pop-alt', beat % 2 === 0);
  }
}

function rpTick() {
  if (!playing) return;
  const elapsedMs = rpVideo.currentTime * 1000;
  rpUpdateCountdownOverlay(elapsedMs);
  const ejercicioMs = Math.max(0, elapsedMs - PRECUENTA_MS);
  rpProgressFill.style.width =
    Math.min((ejercicioMs / totalDurMs) * 100, 100) + '%';
  if (elapsedMs >= PRECUENTA_MS) {
    const t = elapsedMs - PRECUENTA_MS;
    rpUpdateBeatDots(t);
    for (let i = 0; i < TIMEMAP.length; i++) {
      const e = TIMEMAP[i];
      const next = TIMEMAP[i + 1];
      if (t >= e.tstamp && (!next || t < next.tstamp)) {
        if (lastBeat !== i) {
          lastBeat = i;
          if (e.off) rpDeactivateNotes(e.off);
          if (e.on)  rpActivateNotes(e.on);
        }
        break;
      }
    }
  }
  if (elapsedMs >= PRECUENTA_MS + totalDurMs) {
    if (looping) {
      rpVideo.currentTime = 0; rpVideo.play(); lastBeat = -1; rpClearAllNotes();
    } else { rpStop(); return; }
  }
  rafId = requestAnimationFrame(rpTick);
}

function rpStart() {
  rpVideo.currentTime = 0; rpVideo.play();
  playing = true; lastBeat = -1; rpClearAllNotes();
  const btn = document.getElementById('rp-btn-play');
  btn.textContent = '⏹ STOP'; btn.classList.add('playing');
  rafId = requestAnimationFrame(rpTick);
}

function rpStop() {
  playing = false;
  if (rafId) cancelAnimationFrame(rafId);
  rpVideo.pause(); rpVideo.currentTime = 0;
  rpClearAllNotes(); rpClearBeatDots();
  rpProgressFill.style.width = '0%';
  if (rpOverlayEl) rpOverlayEl.classList.remove('visible');
  const btn = document.getElementById('rp-btn-play');
  btn.textContent = '▶ PLAY'; btn.classList.remove('playing', 'counting');
  lastBeat = -1;
}

function rpTogglePlay() { playing ? rpStop() : rpStart(); }
function rpToggleLoop() {
  looping = !looping;
  document.getElementById('rp-btn-loop').classList.toggle('active', looping);
}

function cargarEjercicio(id) {
  rpStop();
  const scoreWrap = document.getElementById('rp-score-wrap');
  scoreWrap.innerHTML = '<p class="rp-loading">CARGANDO...</p>';
  document.getElementById('rp-btn-play').disabled = true;
  document.getElementById('rp-bpm-val').textContent = '—';

  Promise.all([
    fetch(`/static/grooves/${id}.svg`).then(r => { if (!r.ok) throw new Error('SVG no encontrado'); return r.text(); }),
    fetch(`/static/grooves/${id}.json`).then(r => { if (!r.ok) throw new Error('JSON no encontrado'); return r.json(); })
  ])
  .then(([svg, timemap]) => {
    scoreWrap.innerHTML = svg;

    // Fix viewBox para centrar SVG
    const svgOuter = scoreWrap.querySelector('svg');
    const svgInner = scoreWrap.querySelector('.definition-scale');
    const svgEl = svgInner || svgOuter;

    // Leer dimensiones naturales ANTES de borrar los atributos
    const svgNaturalW = parseFloat(svgOuter?.getAttribute('width'))  || 2400;
    const svgNaturalH = parseFloat(svgOuter?.getAttribute('height')) || 350;

    if (svgOuter) {
      svgOuter.removeAttribute('width');
      svgOuter.removeAttribute('height');
      svgOuter.removeAttribute('style');
      svgOuter.style.width = '100%';
      svgOuter.style.height = window.innerWidth <= 768 ? '100%' : 'auto';
    }
    const cardActual = document.querySelector(`.ej-card[data-id="${id}"]`);

    if (svgOuter) {
      let viewBox;
      if (window.innerWidth <= 768) {
        viewBox = cardActual?.dataset.viewboxmobile || `0 0 ${svgNaturalW} ${svgNaturalH}`;
      } else {
        viewBox = cardActual?.dataset.viewbox || '0 0 24000 3550';
        // el viewBox de desktop va en svgEl (puede ser .definition-scale)
        if (svgEl) {
          svgEl.setAttribute('viewBox', viewBox);
          svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        }
        viewBox = null; // ya seteado
      }
      if (viewBox) {
        svgOuter.setAttribute('viewBox', viewBox);
        svgOuter.setAttribute('preserveAspectRatio', 'xMinYMid slice');
      }
    }
    
    // Título del ejercicio
    const tituloEl = document.getElementById('rp-ej-titulo');
    if (tituloEl) tituloEl.textContent = cardActual?.dataset.nombre || id.toUpperCase();

    // Overlay countdown
    const existing = document.getElementById('rp-countdown-overlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'rp-countdown-overlay';
    overlay.innerHTML = `<div class="rp-cd-number">—</div>`;
    document.querySelector('.rp-video-wrap').appendChild(overlay);
    rpOverlayEl  = overlay;
    rpOverlayNum = overlay.querySelector('.rp-cd-number');
    lastCdBeat   = -1;

    TIMEMAP      = timemap;
    baseTempo    = timemap[0]?.tempo || 96;
    msPerBeat    = (60 / baseTempo) * 1000;
    PRECUENTA_MS = msPerBeat * 4;
    totalDurMs   = TIMEMAP[TIMEMAP.length - 1].tstamp;

    document.getElementById('rp-bpm-val').textContent = baseTempo;
    document.getElementById('rp-btn-play').disabled = false;

    rpVideo.src = `/static/grooves/${id}.mp4`;
    rpVideo.load();

    document.querySelectorAll('.ej-card').forEach(c => c.classList.remove('active'));
    if (cardActual) cardActual.classList.add('active');
    rpSyncSelect(id);

    const comentario = cardActual?.dataset.comentario || '';
    const comentEl = document.getElementById('rp-comentario');
    if (comentEl) {
      comentEl.textContent = comentario;
      comentEl.style.display = comentario ? 'block' : 'none';
    }

    // Descripción del ejercicio
    const desc = cardActual?.dataset.descripcion || '';
    const descOverlay = document.getElementById('rp-desc-overlay');
    const descText = document.getElementById('rp-desc-text');
    if (descOverlay && descText) {
      if (desc) {
        descText.textContent = desc;
        descOverlay.style.display = 'block';
        document.getElementById('rp-desc-close').onclick = () => {
          descOverlay.style.display = 'none';
        };
      } else {
        descOverlay.style.display = 'none';
      }
    }
  })
  .catch(err => {
    scoreWrap.innerHTML = `<p class="rp-loading">ERROR: ${err.message}</p>`;
  });
}

function cargarPrograma() {
  fetch('/static/grooves/programa.json')
    .then(r => r.json())
    .then(data => {
      const lista  = document.getElementById('rp-lista');
      const select = document.getElementById('rp-select-mobile');
      lista.innerHTML = '';
      if (select) select.innerHTML = '<option value="" disabled selected>— Elegí un ejercicio —</option>';

      data.niveles.forEach(nivel => {
        // cards desktop
        const nivelDiv = document.createElement('div');
        nivelDiv.className = 'rp-nivel';
        nivelDiv.innerHTML = `<div class="rp-nivel-label">${nivel.nombre}</div>`;

        // optgroup mobile
        const optgroup = select ? document.createElement('optgroup') : null;
        if (optgroup) optgroup.label = nivel.nombre;

        nivel.ejercicios.forEach(ej => {
          const card = document.createElement('div');
          card.className = 'ej-card';
          card.dataset.id          = ej.id;
          card.dataset.nombre      = ej.nombre      || ej.id;
          card.dataset.comentario  = ej.comentario  || '';
          card.dataset.descripcion = ej.descripcion || '';
          card.dataset.viewbox       = ej.viewBox       || '0 0 24000 3550';
          card.dataset.viewboxmobile = ej.viewBoxMobile || '';
          card.innerHTML = `<span class="ej-nombre">${ej.nombre}</span>`;
          card.addEventListener('click', () => cargarEjercicio(ej.id));
          nivelDiv.appendChild(card);

          if (optgroup) {
            const opt = document.createElement('option');
            opt.value               = ej.id;
            opt.textContent         = ej.nombre;
            opt.dataset.nombre      = ej.nombre      || ej.id;
            opt.dataset.comentario  = ej.comentario  || '';
            opt.dataset.descripcion = ej.descripcion || '';
            opt.dataset.viewbox       = ej.viewBox       || '0 0 24000 3550';
            opt.dataset.viewboxmobile = ej.viewBoxMobile || '';
            optgroup.appendChild(opt);
          }
        });

        lista.appendChild(nivelDiv);
        if (select && optgroup) select.appendChild(optgroup);
      });

      if (select) {
        select.addEventListener('change', () => {
          if (select.value) cargarEjercicio(select.value);
        });
      }

      // Cargar el primer ejercicio por defecto
      const primero = data.niveles?.[0]?.ejercicios?.[0]?.id;
      if (primero) cargarEjercicio(primero);
    })
    .catch(() => {
      document.getElementById('rp-lista').innerHTML = '<p class="rp-loading">Error cargando programa</p>';
    });
}

// Sincroniza el select mobile al navegar por cards desktop
function rpSyncSelect(id) {
  const sel = document.getElementById('rp-select-mobile');
  if (sel) sel.value = id;
}
// ============================================================
// PAUSA THREE.JS cuando no está en pantalla
// three-viewer.js debe exponer window.threeViewerPause / Resume
// ============================================================
(function() {
  const panelVisor = document.getElementById('panel-visor');
  if (!panelVisor) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        window.threeViewerResume?.();
      } else {
        window.threeViewerPause?.();
      }
    });
  }, { threshold: 0.01 });

  observer.observe(panelVisor);
})();