const container = document.getElementById("panel-alumno-container");

let currentDate = new Date();
let data = null;
let tabActiva = "material";

// =============================
// TRAER DATOS DEL BACKEND
// =============================

async function cargarDatos() {
  try {
    const response = await fetch("/api/alumno-data");
    if (!response.ok) { window.location.href = "/"; return; }
    data = await response.json();
    renderDashboard();
  } catch (error) {
    console.error("Error cargando datos:", error);
    window.location.href = "/";
  }
}

// =============================
// RENDER PRINCIPAL
// =============================

function renderDashboard() {
  container.innerHTML = `
    <div class="panel-alumno">
      <h3>Bienvenido ${data.usuario}</h3>

      <!-- TABS -->
      <div class="alumno-tabs">
        <button class="alumno-tab active" data-tab="material">MATERIAL</button>
        <button class="alumno-tab" data-tab="calendario">CALENDARIO</button>
        <button class="alumno-tab" data-tab="notas">NOTAS</button>
      </div>

      <!-- TAB MATERIAL -->
      <div class="alumno-panel active" id="tab-material">
        <div class="material-layout-alumno">
          <div class="material-grid" id="material-grid">
            ${data.contenidos.map(renderContenido).join("")}
          </div>
          <div class="material-preview-alumno" id="material-preview-alumno">
            <div class="preview-empty">Seleccioná un PDF para previsualizarlo</div>
            <iframe id="alumno-pdf-iframe" src=""></iframe>
          </div>
        </div>
      </div>

      <!-- TAB CALENDARIO -->
      <div class="alumno-panel" id="tab-calendario">
        <div class="calendar-wrapper">
          <div class="calendar-top">
            <button id="prev-month">‹</button>
            <div id="calendar-title"></div>
            <button id="next-month">›</button>
          </div>
          <div class="calendar-days-header">
            <div>Dom</div><div>Lun</div><div>Mar</div><div>Mié</div>
            <div>Jue</div><div>Vie</div><div>Sáb</div>
          </div>
          <div id="calendar-grid" class="calendar-grid"></div>
          <div id="calendar-detail" class="calendar-detail"></div>
        </div>
      </div>

      <!-- TAB NOTAS -->
      <div class="alumno-panel" id="tab-notas">
        <div class="panel-section">
          <div class="notas-box">
            ${data.notas ? data.notas : "Sin notas por el momento."}
          </div>
        </div>
      </div>

    </div>
  `;

  attachTabEvents();
  attachMaterialEvents();
  attachCalendarEvents();
  renderCalendar();
}

// =============================
// TABS
// =============================

function attachTabEvents() {
  document.querySelectorAll(".alumno-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".alumno-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".alumno-panel").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
    });
  });
}

// =============================
// RENDER CONTENIDO
// =============================

function renderContenido(contenido) {
  if (contenido.tipo === "pdf") {
    return `
      <div class="material-card" data-ruta="${contenido.ruta}" data-tipo="pdf">
        <div class="material-info">
          <div class="material-title">${contenido.titulo}</div>
          <div class="material-tipo">PDF</div>
        </div>
      </div>
    `;
  }
  if (contenido.tipo === "audio") {
    return `
      <div class="material-card" data-ruta="${contenido.ruta}" data-tipo="audio">
        <div class="material-info">
          <div class="material-title">${contenido.titulo}</div>
          <div class="material-tipo">AUDIO</div>
        </div>
        <audio controls class="audio-player">
          <source src="/static/${contenido.ruta}">
        </audio>
      </div>
    `;
  }
  return "";
}

// =============================
// EVENTOS MATERIAL
// =============================

function attachMaterialEvents() {
  document.querySelectorAll(".material-card").forEach(card => {
    card.addEventListener("click", () => {
      const ruta = card.dataset.ruta;
      const tipo = card.dataset.tipo;
      if (tipo !== "pdf") return;

      const esMobile = window.innerWidth <= 900;
      if (esMobile) {
        window.open(`/static/${ruta}`, "_blank");
        return;
      }

      document.querySelectorAll(".material-card").forEach(c => c.classList.remove("activo"));
      card.classList.add("activo");

      const preview = document.getElementById("material-preview-alumno");
      const iframe  = document.getElementById("alumno-pdf-iframe");
      const empty   = preview.querySelector(".preview-empty");

      empty.style.display  = "none";
      iframe.style.display = "block";
      iframe.src = `/static/${ruta}`;
    });
  });
}

// =============================
// CALENDARIO
// =============================

function renderCalendar() {
  const grid   = document.getElementById("calendar-grid");
  const title  = document.getElementById("calendar-title");
  const detail = document.getElementById("calendar-detail");

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const startDay  = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const today     = new Date();

  const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  title.innerText  = `${monthNames[month]} ${year}`;
  grid.innerHTML   = "";
  detail.innerHTML = "";

  for (let i = 0; i < startDay; i++) grid.innerHTML += `<div></div>`;

  for (let day = 1; day <= totalDays; day++) {
    const fecha = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const clase = data.clases.find(c => c.fecha === fecha);
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

    grid.innerHTML += `
      <div class="calendar-day ${clase ? clase.estado : ''} ${isToday ? 'today' : ''}"
           data-fecha="${fecha}">${day}</div>
    `;
  }

  document.querySelectorAll(".calendar-day").forEach(dayEl => {
    dayEl.addEventListener("click", () => mostrarDetalle(dayEl.dataset.fecha));
  });
}

function mostrarDetalle(fecha) {
  const detail = document.getElementById("calendar-detail");
  const clase  = data.clases.find(c => c.fecha === fecha);
  const fechaObj = new Date(fecha + "T00:00:00");
  const fechaFormateada = fechaObj.toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' });

  if (!clase) {
    detail.innerHTML = `<div class="calendar-info"><h5>${fechaFormateada}</h5><p>No hay clase registrada.</p></div>`;
    return;
  }

  detail.innerHTML = `
    <div class="calendar-info">
      <h5>${fechaFormateada}</h5>
      <p><strong>Estado:</strong> ${clase.estado}</p>
      ${clase.hora ? `<p><strong>Hora:</strong> ${clase.hora}</p>` : ""}
      ${clase.nota ? `<p><strong>Nota:</strong> ${clase.nota}</p>` : ""}
    </div>
  `;
}

function attachCalendarEvents() {
  document.getElementById("prev-month").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById("next-month").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });
}

// =============================
// LOGOUT
// =============================

document.getElementById("logout-btn").addEventListener("click", () => {
  window.location.href = "/logout";
});

cargarDatos();