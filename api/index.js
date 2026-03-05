const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json());

app.use("/static", express.static(path.join(__dirname, "../static")));

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "../public/index.html")));
app.get("/alumno", (req, res) => res.sendFile(path.join(__dirname, "../public/alumno.html")));
app.get("/explorar", (req, res) => res.sendFile(path.join(__dirname, "../public/explorar.html")));
app.get("/admin-bpm", (req, res) => res.sendFile(path.join(__dirname, "../public/admin.html")));

app.use(
  session({
    secret: "bpm2024admin@#~€",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 4 * 60 * 60 * 1000,
    },
  })
);

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

const ADMIN_PASSWORD = "1402477";
const DB_PATH = path.join(__dirname, "../usuarios.json");

function cargarDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function guardarDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

app.post("/api/login", (req, res) => {
  const { usuario, password } = req.body || {};
  if (!usuario || !password) return res.status(400).json({ message: "Faltan datos" });

  let db;
  try { db = cargarDb(); }
  catch { return res.status(500).json({ message: "Error leyendo usuarios" }); }

  const alumno = (db.alumnos || []).find(
    (a) => a.usuario === usuario && a.password === password
  );
  if (!alumno) return res.status(401).json({ message: "Usuario o contraseña incorrectos" });

  req.session.usuario = alumno.usuario;
  return res.json({ success: true });
});

app.get("/api/alumno-data", (req, res) => {
  if (!req.session.usuario) return res.status(401).json({ message: "No autorizado" });

  let db;
  try { db = cargarDb(); }
  catch { return res.status(500).json({ message: "Error leyendo usuarios" }); }

  const alumno = (db.alumnos || []).find((a) => a.usuario === req.session.usuario);
  if (!alumno) {
    req.session.destroy(() => {});
    return res.status(401).json({ message: "Sesión inválida" });
  }

  const contenidosAsignados = (alumno.contenidos_asignados || [])
    .map((id) => (db.contenidos || []).find((c) => c.id === id))
    .filter(Boolean);

  return res.json({
    usuario: alumno.usuario,
    contenidos: contenidosAsignados,
    clases: alumno.clases || [],
    notas: alumno.notas || "",
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {});
  return res.redirect("/");
});

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) {
    req.session.admin = true;
    return res.json({ success: true });
  }
  return res.status(401).json({ message: "Contraseña incorrecta" });
});

app.post("/api/admin/logout", (req, res) => {
  req.session.admin = false;
  return res.json({ success: true });
});

app.get("/api/admin/db", (req, res) => {
  if (!req.session.admin) return res.status(401).json({ message: "No autorizado" });
  try { return res.json(cargarDb()); }
  catch { return res.status(500).json({ message: "Error leyendo DB" }); }
});

app.post("/api/admin/db", (req, res) => {
  if (!req.session.admin) return res.status(401).json({ message: "No autorizado" });
  const data = req.body;
  if (!data) return res.status(400).json({ message: "Sin datos" });
  try {
    guardarDb(data);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ message: "Error guardando DB" });
  }
});

app.listen(3000, () => console.log("Corriendo en http://localhost:3000"));

module.exports = app;