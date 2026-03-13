const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const path = require("path");
const { MongoClient } = require("mongodb");

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/static", express.static(path.join(__dirname, "../static")));

console.log("Static path:", path.join(__dirname, "../static"));

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "../public/index.html")));
app.get("/alumno", (req, res) => res.sendFile(path.join(__dirname, "../public/alumno.html")));
app.get("/explorar", (req, res) => res.sendFile(path.join(__dirname, "../public/explorar.html")));
app.get("/admin-bpm", (req, res) => res.sendFile(path.join(__dirname, "../public/admin.html")));

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

const ADMIN_PASSWORD = "1402477";
const JWT_SECRET = "bpm2024jwt@#~€";
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://arielpacheco59_db_user:FhpZE1nPCBmLNnpA@cluster0.z6kjdzc.mongodb.net/?appName=Cluster0";

let client = null;

async function getCol() {
  if (!client) {
    client = new MongoClient(MONGO_URI);
    await client.connect();
  }
  try {
    // ping para verificar que la conexión sigue viva
    await client.db("espacio_bpm").command({ ping: 1 });
  } catch {
    client = new MongoClient(MONGO_URI);
    await client.connect();
  }
  return client.db("espacio_bpm").collection("datos");
}

async function cargarDb() {
  const col = await getCol();
  const doc = await col.findOne({ _id: "db" });
  if (!doc) throw new Error("No hay datos en MongoDB");
  const { _id, ...data } = doc;
  return data;
}

async function guardarDb(data) {
  const col = await getCol();
  await col.replaceOne(
    { _id: "db" },
    { _id: "db", ...data },
    { upsert: true }
  );
}

// =============================
// DIAGNÓSTICO
// =============================

app.get("/api/ping", async (req, res) => {
  try {
    const col = await getCol();
    await col.findOne({ _id: "db" });
    return res.json({ ok: true, msg: "MongoDB conectado" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// =============================
// AUTH HELPERS
// =============================

function getUsuario(req) {
  try {
    const token = req.cookies["bpm_session"];
    if (!token) return null;
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.usuario || null;
  } catch { return null; }
}

function getAdmin(req) {
  try {
    const token = req.cookies["bpm_admin"];
    if (!token) return false;
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.admin === true;
  } catch { return false; }
}

// =============================
// RUTAS
// =============================

app.post("/api/login", async (req, res) => {
  const { usuario, password } = req.body || {};
  if (!usuario || !password) return res.status(400).json({ message: "Faltan datos" });

  let db;
  try { db = await cargarDb(); }
  catch { return res.status(500).json({ message: "Error leyendo usuarios" }); }

  const alumno = (db.alumnos || []).find(
    (a) => a.usuario === usuario && a.password === password
  );
  if (!alumno) return res.status(401).json({ message: "Usuario o contraseña incorrectos" });

  const token = jwt.sign({ usuario: alumno.usuario }, JWT_SECRET, { expiresIn: "4h" });
  res.cookie("bpm_session", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 4 * 60 * 60 * 1000,
  });
  return res.json({ success: true });
});

app.get("/api/alumno-data", async (req, res) => {
  const usuario = getUsuario(req);
  if (!usuario) return res.status(401).json({ message: "No autorizado" });

  let db;
  try { db = await cargarDb(); }
  catch { return res.status(500).json({ message: "Error leyendo usuarios" }); }

  const alumno = (db.alumnos || []).find((a) => a.usuario === usuario);
  if (!alumno) {
    res.clearCookie("bpm_session");
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
  res.clearCookie("bpm_session");
  return res.redirect("/");
});

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ message: "Contraseña incorrecta" });

  const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: "4h" });
  res.cookie("bpm_admin", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 4 * 60 * 60 * 1000,
  });
  return res.json({ success: true });
});

app.post("/api/admin/logout", (req, res) => {
  res.clearCookie("bpm_admin");
  return res.json({ success: true });
});

app.get("/api/admin/db", async (req, res) => {
  if (!getAdmin(req)) return res.status(401).json({ message: "No autorizado" });
  try { return res.json(await cargarDb()); }
  catch { return res.status(500).json({ message: "Error leyendo DB" }); }
});

app.post("/api/admin/db", async (req, res) => {
  if (!getAdmin(req)) return res.status(401).json({ message: "No autorizado" });
  const data = req.body;
  if (!data) return res.status(400).json({ message: "Sin datos" });
  try {
    await guardarDb(data);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ message: "Error guardando DB" });
  }
});

// =============================
// ARRANQUE
// =============================

app.listen(3000, () => console.log("Corriendo en http://localhost:3000"))
  .on('error', (err) => console.error('Error servidor:', err));

module.exports = app;