// ========================
// Navegación de paneles
// ========================
function setPanel(id, el, title) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('panel-' + id).classList.add('active');
  document.getElementById('header-section-title').textContent = title;

  if (id !== 'visor' && window.moveCameraSmooth) {
    window.moveCameraSmooth('inicio', 1.2);
  }
}

function setSubtab(id, el) {
  el.closest('.subtabs').querySelectorAll('.subtab').forEach(t => t.classList.remove('active'));
  el.closest('.panel').querySelectorAll('.subtab-panel').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('subtab-' + id).classList.add('active');
}

// ========================
// SVG inline — tabla figuras
// ========================
fetch('/static/img/svgs/tabla.svg')
  .then(r => r.text())
  .then(svg => {
    document.getElementById('tabla-figuras-svg').innerHTML = svg;
    const svgEl = document.querySelector('#tabla-figuras-svg svg');
    if (svgEl) {
      svgEl.removeAttribute('width');
      svgEl.removeAttribute('height');
      svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }
    initFigurasClickables();
  });

// ========================
// Notación visor — SVGs externos
// ========================
const PART_NAMES = {
  hh: "HI-HAT", bombo: "BOMBO", chancha: "CHANCHA",
  tambor: "TAMBOR", tom: "TOM", ride: "RIDE", crash: "CRASH",
};

const PART_SOUNDS = {
  hh: [
    { label: "HI-HAT",     src: "/static/audio/hh_cerrado.mp3" },
    { label: "HH ABIERTO", src: "/static/audio/hh_abierto.mp3" },
    { label: "HH PISADO",  src: "/static/audio/hh_pisado.mp3"  },
  ],
  ride: [
    { label: "RIDE",    src: "/static/audio/ride.mp3"         },
    { label: "CAMPANA", src: "/static/audio/ride_campana.mp3" },
  ],
  bombo:   [{ label: "BOMBO",   src: "/static/audio/bombo.mp3"   }],
  chancha: [{ label: "CHANCHA", src: "/static/audio/chancha.mp3" }],
  tambor:  [{ label: "TAMBOR",  src: "/static/audio/tambor.mp3"  }],
  tom:     [{ label: "TOM",     src: "/static/audio/tom.mp3"     }],
  crash:   [{ label: "CRASH",   src: "/static/audio/crash.mp3"   }],
};

const audioCache = {};
function playSound(src) {
  if (!audioCache[src]) audioCache[src] = new Audio(src);
  const a = audioCache[src];
  a.currentTime = 0;
  a.play().catch(() => {});
}

const notationPanel   = document.getElementById("notation-panel");
const notationName    = document.getElementById("notation-name");
const notationSvg     = document.getElementById("notation-svg");
const notationButtons = document.getElementById("notation-buttons");

const svgCache = {};

function fixSvg(svgEl) {
  if (!svgEl) return;
  svgEl.removeAttribute('width');
  svgEl.removeAttribute('height');
  svgEl.style.width = '100%';
  svgEl.style.height = 'auto';
  svgEl.querySelectorAll('[fill]:not([fill="none"])').forEach(el => el.setAttribute('fill', 'white'));
  svgEl.querySelectorAll('[stroke]:not([stroke="none"])').forEach(el => el.setAttribute('stroke', 'white'));
}

function injectSoundButtons(view) {
  notationButtons.innerHTML = "";
  const sounds = PART_SOUNDS[view];
  if (!sounds) return;
  sounds.forEach(({ label, src }) => {
    const btn = document.createElement("button");
    btn.className = "notation-play-btn";
    btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 7 7"><polygon points="1,1 6,3.5 1,6" fill="currentColor"/></svg>' + label;
    btn.addEventListener("click", () => playSound(src));
    notationButtons.appendChild(btn);
  });
}

function showNotation(view) {
  if (!view || view === "inicio") {
    notationPanel.classList.remove("visible");
    return;
  }

  notationName.textContent = PART_NAMES[view] ?? view.toUpperCase();

  if (svgCache[view]) {
    notationSvg.innerHTML = svgCache[view];
    fixSvg(notationSvg.querySelector('svg'));
    injectSoundButtons(view);
    notationPanel.classList.add("visible");
    return;
  }

  fetch('/static/img/svgs/labels/' + view + '.svg')
    .then(r => r.text())
    .then(svg => {
      svgCache[view] = svg;
      notationSvg.innerHTML = svg;
      fixSvg(notationSvg.querySelector('svg'));
      injectSoundButtons(view);
      notationPanel.classList.add("visible");
    })
    .catch(() => {
      notationSvg.innerHTML = "";
      notationPanel.classList.add("visible");
    });
}

window.addEventListener("viewer:camEnd", (e) => showNotation(e.detail?.view ?? "inicio"));
window.addEventListener("viewer:ready",  () => showNotation(null));

// ========================
// Figuras rítmicas
// ========================
const FIGURAS_DATA = {
  redonda: {
    nombre: 'REDONDA',
    desc: 'La nota de mayor duración. Ocupa un compás completo en 4/4. Sin plica, cabeza hueca.',
    duracion: '4 tiempos', porcompas: '1',
    notaSvg:     '/static/img/svgs/figuras/redonda.svg',
    silencioSvg: '/static/img/svgs/figuras/silencio_redonda.svg',
  },
  blanca: {
    nombre: 'BLANCA',
    desc: 'La mitad de una redonda. Tiene plica y cabeza hueca. Dos caben en un compás de 4/4.',
    duracion: '2 tiempos', porcompas: '2',
    notaSvg:     '/static/img/svgs/figuras/blanca.svg',
    silencioSvg: '/static/img/svgs/figuras/silencio_blanca.svg',
  },
  negra: {
    nombre: 'NEGRA',
    desc: 'La unidad básica del tiempo. Cabeza rellena con plica. Cuatro por compás en 4/4.',
    duracion: '1 tiempo', porcompas: '4',
    notaSvg:     '/static/img/svgs/figuras/negra.svg',
    silencioSvg: '/static/img/svgs/figuras/silencio_negra.svg',
  },
  corchea: {
    nombre: 'CORCHEA',
    desc: 'La mitad de una negra. Se agrupan de a dos con una barra. Ocho por compás en 4/4.',
    duracion: '½ tiempo', porcompas: '8',
    notaSvg:     '/static/img/svgs/figuras/corchea.svg',
    silencioSvg: '/static/img/svgs/figuras/silencio_corchea.svg',
  },
  semicorchea: {
    nombre: 'SEMICORCHEA',
    desc: 'La mitad de una corchea. Se agrupan de a cuatro con dos barras. Dieciséis por compás.',
    duracion: '¼ tiempo', porcompas: '16',
    notaSvg:     '/static/img/svgs/figuras/semicorchea.svg',
    silencioSvg: '/static/img/svgs/figuras/silencio_semicorchea.svg',
  },
};

let activeFigura = null;

function initFigurasClickables() {
  document.querySelectorAll('.fig-clickable').forEach(g => {
    g.addEventListener('click', () => openOverlay(g.dataset.figura));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeOverlay();
  });
}

function openOverlay(key) {
  activeFigura = key;
  const f = FIGURAS_DATA[key];

  document.querySelectorAll('.fig-clickable').forEach(g => {
    g.classList.toggle('fig-active', g.dataset.figura === key);
  });

  document.getElementById('tabla-info-empty').style.display = 'none';
  const panel = document.getElementById('tabla-figura-panel');
  panel.classList.remove('visible');
  void panel.offsetWidth;
  panel.classList.add('visible');

  document.getElementById('tf-nombre').textContent    = f.nombre;
  document.getElementById('tf-desc').textContent      = f.desc;
  document.getElementById('tf-duracion').textContent  = f.duracion;
  document.getElementById('tf-porcompas').textContent = f.porcompas;

  loadFiguraSvg(f.notaSvg,     'tf-nota-svg');
  loadFiguraSvg(f.silencioSvg, 'tf-silencio-svg');
}

function closeOverlay() {
  document.querySelectorAll('.fig-clickable').forEach(g => g.classList.remove('fig-active'));
  activeFigura = null;
  document.getElementById('tabla-figura-panel').classList.remove('visible');
  document.getElementById('tabla-info-empty').style.display = 'flex';
}

function loadFiguraSvg(url, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  if (!url) return;
  fetch(url)
    .then(r => r.ok ? r.text() : Promise.reject())
    .then(svg => {
      container.innerHTML = svg;
      const svgEl = container.querySelector('svg');
      if (svgEl) {
        svgEl.style.background = 'transparent';
        svgEl.querySelectorAll('path, rect, circle, ellipse, polygon, polyline').forEach(el => {
          if (el.getAttribute('fill') && el.getAttribute('fill') !== 'none') el.setAttribute('fill', 'white');
          if (el.getAttribute('stroke') && el.getAttribute('stroke') !== 'none') el.setAttribute('stroke', 'white');
        });
      }
    })
    .catch(() => { container.innerHTML = ''; });
}