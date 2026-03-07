// =============================
// ESTADO GLOBAL
// =============================

let db = null;
let alumnoActivo = null;
let clasesEditadas = {};
let calDate = new Date();
let filtroMaterial = "todos";
let fechasSeleccionadas = new Set();
let modoSeleccion = false;

// =============================
// LOGIN ADMIN
// =============================

document.getElementById("admin-login-btn").addEventListener("click", loginAdmin);
document.getElementById("admin-password").addEventListener("keydown", e => {
  if (e.key === "Enter") loginAdmin();
});

async function loginAdmin() {
  const pw  = document.getElementById("admin-password").value.trim();
  const err = document.getElementById("admin-login-error");

  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: pw })
  });

  if (res.ok) {
    document.getElementById("admin-login").style.display = "none";
    document.getElementById("admin-panel").style.display = "block";
    cargarDB();
  } else {
    err.textContent = "Contraseña incorrecta";
  }
}

document.getElementById("admin-logout-btn").addEventListener("click", async () => {
  await fetch("/api/admin/logout", { method: "POST" });
  location.reload();
});

// =============================
// CARGAR DB
// =============================

async function cargarDB() {
  const res = await fetch("/api/admin/db");
  if (!res.ok) { location.reload(); return; }
  db = await res.json();
  renderAlumnos();
}

// =============================
// GUARDAR DB
// =============================

async function guardarDB(silencioso = false) {
  const res = await fetch("/api/admin/db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(db)
  });
  if (!silencioso) {
    res.ok ? showToast("GUARDADO ✓") : showToast("Error al guardar", true);
  }
}

// =============================
// RENDER LISTA ALUMNOS
// =============================

function renderAlumnos() {
  const grid = document.getElementById("alumnos-grid");
  grid.innerHTML = db.alumnos.map(a => `
    <div class="alumno-card ${alumnoActivo === a.usuario ? 'active' : ''}"
         data-usuario="${a.usuario}">
      <div class="alumno-card-nombre">${a.usuario}</div>
    </div>
  `).join("");

  grid.querySelectorAll(".alumno-card").forEach(card => {
    card.addEventListener("click", () => seleccionarAlumno(card.dataset.usuario));
  });
}

// =============================
// SELECCIONAR ALUMNO
// =============================

function seleccionarAlumno(usuario) {
  alumnoActivo = usuario;
  clasesEditadas = {};
  fechasSeleccionadas = new Set();
  modoSeleccion = false;
  document.getElementById("btn-multisel").classList.remove("active");

  const alumno = db.alumnos.find(a => a.usuario === usuario);

  document.getElementById("edit-usuario").value  = alumno.usuario;
  document.getElementById("edit-password").value = alumno.password;
  document.getElementById("edit-notas").value    = alumno.notas || "";

  (alumno.clases || []).forEach(c => {
    clasesEditadas[c.fecha] = { estado: c.estado, hora: c.hora || "", nota: c.nota || "" };
  });

  document.getElementById("editor-alumno").style.display = "block";
  document.getElementById("editor-alumno").scrollIntoView({ behavior: "smooth", block: "start" });

  renderAlumnos();
  renderMaterial();
  renderCalAdmin();
  ocultarFormClase();
}

// =============================
// TABS EDITOR
// =============================

document.querySelectorAll(".editor-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".editor-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".editor-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
  });
});

// =============================
// DATOS BÁSICOS
// =============================

document.getElementById("btn-guardar-datos").addEventListener("click", async () => {
  const alumno       = db.alumnos.find(a => a.usuario === alumnoActivo);
  const nuevoUsuario  = document.getElementById("edit-usuario").value.trim();
  const nuevoPassword = document.getElementById("edit-password").value.trim();

  if (!nuevoUsuario || !nuevoPassword) { showToast("Completá usuario y contraseña", true); return; }

  alumno.usuario  = nuevoUsuario;
  alumno.password = nuevoPassword;
  alumnoActivo    = nuevoUsuario;

  await guardarDB();
  renderAlumnos();
});

document.getElementById("btn-eliminar-alumno").addEventListener("click", async () => {
  if (!confirm(`¿Eliminar al alumno "${alumnoActivo}"?`)) return;
  db.alumnos = db.alumnos.filter(a => a.usuario !== alumnoActivo);
  alumnoActivo = null;
  document.getElementById("editor-alumno").style.display = "none";
  await guardarDB();
  renderAlumnos();
});

// =============================
// MATERIAL — auto-save al toggle
// =============================

function renderMaterial() {
  const alumno    = db.alumnos.find(a => a.usuario === alumnoActivo);
  const asignados = new Set(alumno.contenidos_asignados || []);
  const lista     = document.getElementById("material-list");

  const contenidos = db.contenidos.filter(c =>
    filtroMaterial === "todos" || c.tipo === filtroMaterial
  );

  lista.innerHTML = contenidos.map(c => `
    <div class="material-item ${asignados.has(c.id) ? 'asignado' : ''}" 
         data-id="${c.id}" data-ruta="${c.ruta}" data-tipo="${c.tipo}">
      <div class="material-item-check" data-toggle="${c.id}">${asignados.has(c.id) ? '✓' : ''}</div>
      <div class="material-item-info">
        <div class="material-item-titulo">${c.titulo}</div>
        <div class="material-item-tipo">${c.tipo}</div>
      </div>
    </div>
  `).join("");

  lista.querySelectorAll(".material-item").forEach(item => {
    // Click en el check → toggle asignación
    item.querySelector("[data-toggle]").addEventListener("click", e => {
      e.stopPropagation();
      toggleMaterial(item.dataset.id, item.dataset.ruta, item.dataset.tipo);
    });
    // Click en el item → preview
    item.addEventListener("click", () => {
      previewMaterial(item.dataset.id, item.dataset.ruta, item.dataset.tipo);
    });
  });
}

async function toggleMaterial(id, ruta, tipo) {
  const alumno = db.alumnos.find(a => a.usuario === alumnoActivo);
  const set    = new Set(alumno.contenidos_asignados || []);
  set.has(id) ? set.delete(id) : set.add(id);
  alumno.contenidos_asignados = [...set];
  renderMaterial();
  renderAlumnos();
  await guardarDB(true);
}

function previewMaterial(id, ruta, tipo) {
  const esMobile = window.innerWidth <= 900;

  if (esMobile) {
    if (tipo === "pdf") window.open(`/static/${ruta}`, "_blank");
    return;
  }

  document.querySelectorAll(".material-item").forEach(i => i.classList.remove("previewing"));
  document.querySelector(`.material-item[data-id="${id}"]`)?.classList.add("previewing");

  const empty  = document.querySelector(".material-preview-empty");
  const iframe = document.getElementById("pdf-iframe");

  if (tipo === "pdf") {
    empty.style.display  = "none";
    iframe.style.display = "block";
    iframe.src = `/static/${encodeURIComponent(ruta).replace(/%2F/g, "/")}`;
  } else if (tipo === "audio") {
    iframe.style.display = "none";
    empty.style.display  = "flex";
    empty.querySelector("span").textContent = "🎧 " + ruta.split("/").pop();
  }
}

document.querySelectorAll(".filtro-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filtro-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    filtroMaterial = btn.dataset.filtro;
    if (alumnoActivo) renderMaterial();
  });
});

// =============================
// CALENDARIO — auto-save al confirmar/eliminar
// =============================

function renderCalAdmin() {
  const grid   = document.getElementById("admin-cal-grid");
  const title  = document.getElementById("cal-title");

  const year      = calDate.getFullYear();
  const month     = calDate.getMonth();
  const firstDay  = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const today     = new Date();

  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                 "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  title.textContent = `${meses[month]} ${year}`;
  grid.innerHTML = "";

  for (let i = 0; i < firstDay; i++) grid.innerHTML += `<div></div>`;

  for (let d = 1; d <= totalDays; d++) {
    const fecha    = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const clase    = clasesEditadas[fecha];
    const isToday  = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
    const isSel    = fechasSeleccionadas.has(fecha);

    grid.innerHTML += `
      <div class="admin-cal-day ${clase ? clase.estado : ''} ${isToday ? 'today' : ''} ${isSel ? 'sel' : ''}"
           data-fecha="${fecha}">${d}</div>
    `;
  }

  grid.querySelectorAll(".admin-cal-day").forEach(day => {
    day.addEventListener("click", () => clickDia(day.dataset.fecha));
  });

  const n = fechasSeleccionadas.size;
  const btnLimpiar = document.getElementById("btn-limpiar-sel");
  btnLimpiar.style.display = n > 0 ? "inline-flex" : "none";
  btnLimpiar.textContent = `LIMPIAR (${n})`;
}

function clickDia(fecha) {
  if (modoSeleccion) {
    fechasSeleccionadas.has(fecha)
      ? fechasSeleccionadas.delete(fecha)
      : fechasSeleccionadas.add(fecha);
    renderCalAdmin();
    fechasSeleccionadas.size > 0 ? mostrarFormMultiple() : ocultarFormClase();
  } else {
    fechasSeleccionadas.clear();
    fechasSeleccionadas.add(fecha);
    renderCalAdmin();
    mostrarFormIndividual(fecha);
  }
}

function mostrarFormIndividual(fecha) {
  const clase    = clasesEditadas[fecha] || {};
  const fechaObj = new Date(fecha + "T00:00:00");
  const opciones = { day: 'numeric', month: 'long', year: 'numeric' };

  document.getElementById("add-clase-titulo").textContent =
    "CLASE — " + fechaObj.toLocaleDateString('es-ES', opciones).toUpperCase();
  document.getElementById("clase-estado").value      = clase.estado || "pagada";
  document.getElementById("clase-hora").value        = clase.hora || "";
  document.getElementById("clase-nota").value        = clase.nota || "";
  document.getElementById("clase-nota").placeholder  = "Opcional...";
  document.getElementById("btn-guardar-clase").disabled  = false;
  document.getElementById("btn-eliminar-clase").disabled = false;
  document.getElementById("add-clase-form").classList.add("visible");
}

function mostrarFormMultiple() {
  const n = fechasSeleccionadas.size;
  document.getElementById("add-clase-titulo").textContent =
    `${n} CLASE${n > 1 ? 'S' : ''} SELECCIONADA${n > 1 ? 'S' : ''}`;
  document.getElementById("clase-estado").value      = "pagada";
  document.getElementById("clase-hora").value        = "";
  document.getElementById("clase-nota").value        = "";
  document.getElementById("clase-nota").placeholder  = "Se aplica a todas...";
  document.getElementById("btn-guardar-clase").disabled  = false;
  document.getElementById("btn-eliminar-clase").disabled = false;
  document.getElementById("add-clase-form").classList.add("visible");
}

function ocultarFormClase() {
  fechasSeleccionadas.clear();
  document.getElementById("add-clase-titulo").textContent = "SELECCIONÁ UN DÍA";
  document.getElementById("clase-estado").value = "pagada";
  document.getElementById("clase-hora").value   = "";
  document.getElementById("clase-nota").value   = "";
  document.getElementById("btn-guardar-clase").disabled   = true;
  document.getElementById("btn-eliminar-clase").disabled  = true;
}

async function syncClasesYGuardar() {
  const alumno = db.alumnos.find(a => a.usuario === alumnoActivo);
  alumno.clases = Object.entries(clasesEditadas).map(([fecha, v]) => ({
    fecha,
    estado: v.estado,
    ...(v.hora ? { hora: v.hora } : {}),
    ...(v.nota ? { nota: v.nota } : {})
  }));
  await guardarDB(true);
}

// Confirmar clase → auto-save
document.getElementById("btn-guardar-clase").addEventListener("click", async () => {
  if (fechasSeleccionadas.size === 0) return;
  const estado = document.getElementById("clase-estado").value;
  const hora   = document.getElementById("clase-hora").value;
  const nota   = document.getElementById("clase-nota").value;

  fechasSeleccionadas.forEach(fecha => {
    clasesEditadas[fecha] = { estado, hora, nota };
  });

  await syncClasesYGuardar();
  ocultarFormClase();
  renderCalAdmin();
});

// Eliminar clase(s) → auto-save
document.getElementById("btn-eliminar-clase").addEventListener("click", async () => {
  if (fechasSeleccionadas.size === 0) return;
  fechasSeleccionadas.forEach(fecha => delete clasesEditadas[fecha]);
  await syncClasesYGuardar();
  ocultarFormClase();
  renderCalAdmin();
});

document.getElementById("btn-multisel").addEventListener("click", () => {
  modoSeleccion = !modoSeleccion;
  document.getElementById("btn-multisel").classList.toggle("active", modoSeleccion);
  if (!modoSeleccion) { ocultarFormClase(); renderCalAdmin(); }
});

document.getElementById("btn-limpiar-sel").addEventListener("click", () => {
  modoSeleccion = false;
  document.getElementById("btn-multisel").classList.remove("active");
  ocultarFormClase();
  renderCalAdmin();
});

document.getElementById("cal-prev").addEventListener("click", () => {
  calDate.setMonth(calDate.getMonth() - 1);
  renderCalAdmin();
});

document.getElementById("cal-next").addEventListener("click", () => {
  calDate.setMonth(calDate.getMonth() + 1);
  renderCalAdmin();
});

// =============================
// NOTAS — auto-save al perder foco
// =============================

document.getElementById("edit-notas").addEventListener("blur", async () => {
  if (!alumnoActivo) return;
  const alumno = db.alumnos.find(a => a.usuario === alumnoActivo);
  alumno.notas = document.getElementById("edit-notas").value;
  await guardarDB(true);
});

// =============================
// NUEVO ALUMNO
// =============================

document.getElementById("btn-nuevo-alumno").addEventListener("click", () => {
  document.getElementById("nuevo-usuario").value  = "";
  document.getElementById("nuevo-password").value = "";
  document.getElementById("modal-nuevo").classList.add("visible");
});

document.getElementById("btn-cancelar-nuevo").addEventListener("click", () => {
  document.getElementById("modal-nuevo").classList.remove("visible");
});

document.getElementById("btn-confirmar-nuevo").addEventListener("click", async () => {
  const usuario  = document.getElementById("nuevo-usuario").value.trim();
  const password = document.getElementById("nuevo-password").value.trim();

  if (!usuario || !password) { showToast("Completá usuario y contraseña", true); return; }
  if (db.alumnos.find(a => a.usuario === usuario)) { showToast("Ya existe ese usuario", true); return; }

  db.alumnos.push({ usuario, password, contenidos_asignados: [], clases: [], notas: "" });

  document.getElementById("modal-nuevo").classList.remove("visible");
  await guardarDB();
  renderAlumnos();
  seleccionarAlumno(usuario);
});

// =============================
// TOAST
// =============================

function showToast(msg, error = false) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = "toast" + (error ? " error" : "");
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}