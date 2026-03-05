from flask import Flask, request, jsonify, render_template, session, redirect, url_for
import json
import os
from datetime import timedelta

app = Flask(__name__)

# =========================
# CONFIGURACIÓN BÁSICA
# =========================

app.secret_key = "bpm2024admin@#~€"

# Contraseña del panel admin — cambiala antes de prod
ADMIN_PASSWORD = "1402477"

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    PERMANENT_SESSION_LIFETIME=timedelta(hours=4)
)

DB_PATH = os.path.join(os.path.dirname(__file__), "usuarios.json")

# =========================
# UTILIDADES DB
# =========================

def cargar_db():
    with open(DB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def guardar_db(data):
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# =========================
# RUTAS HTML
# =========================

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/alumno")
def alumno():
    if "usuario" not in session:
        return redirect(url_for("home"))
    return render_template("alumno.html")

@app.route("/explorar")
def explorar():
    return render_template("explorar.html")

@app.route("/admin-bpm")
def admin():
    return render_template("admin.html")

@app.after_request
def no_cache(r):
    r.headers["Cache-Control"] = "no-store"
    return r

# =========================
# LOGIN ALUMNOS
# =========================

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    usuario = data.get("usuario")
    password = data.get("password")

    if not usuario or not password:
        return jsonify({"message": "Faltan datos"}), 400

    try:
        db = cargar_db()
    except:
        return jsonify({"message": "Error leyendo usuarios"}), 500

    alumno = next(
        (a for a in db.get("alumnos", [])
         if a.get("usuario") == usuario and a.get("password") == password),
        None
    )

    if not alumno:
        return jsonify({"message": "Usuario o contraseña incorrectos"}), 401

    session.permanent = True
    session["usuario"] = alumno["usuario"]
    return jsonify({"success": True})

# =========================
# DATOS DEL ALUMNO
# =========================

@app.route("/api/alumno-data", methods=["GET"])
def alumno_data():
    if "usuario" not in session:
        return jsonify({"message": "No autorizado"}), 401

    try:
        db = cargar_db()
    except:
        return jsonify({"message": "Error leyendo usuarios"}), 500

    usuario = session["usuario"]
    alumno = next(
        (a for a in db.get("alumnos", []) if a.get("usuario") == usuario), None
    )

    if not alumno:
        session.clear()
        return jsonify({"message": "Sesión inválida"}), 401

    contenidos_asignados = []
    for contenido_id in alumno.get("contenidos_asignados", []):
        contenido = next(
            (c for c in db.get("contenidos", []) if c.get("id") == contenido_id), None
        )
        if contenido:
            contenidos_asignados.append(contenido)

    return jsonify({
        "usuario": alumno.get("usuario"),
        "contenidos": contenidos_asignados,
        "clases": alumno.get("clases", []),
        "notas": alumno.get("notas", "")
    })

# =========================
# LOGOUT ALUMNOS
# =========================

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("home"))

# =========================
# ADMIN — LOGIN
# =========================

@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json() or {}
    if data.get("password") == ADMIN_PASSWORD:
        session["admin"] = True
        return jsonify({"success": True})
    return jsonify({"message": "Contraseña incorrecta"}), 401

@app.route("/api/admin/logout", methods=["POST"])
def admin_logout():
    session.pop("admin", None)
    return jsonify({"success": True})

# =========================
# ADMIN — DB
# =========================

@app.route("/api/admin/db", methods=["GET"])
def admin_get_db():
    if not session.get("admin"):
        return jsonify({"message": "No autorizado"}), 401
    try:
        return jsonify(cargar_db())
    except:
        return jsonify({"message": "Error leyendo DB"}), 500

@app.route("/api/admin/db", methods=["POST"])
def admin_guardar_db():
    if not session.get("admin"):
        return jsonify({"message": "No autorizado"}), 401
    data = request.get_json()
    if not data:
        return jsonify({"message": "Sin datos"}), 400
    try:
        guardar_db(data)
        return jsonify({"success": True})
    except:
        return jsonify({"message": "Error guardando DB"}), 500

# =========================
# RUN LOCAL
# =========================

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)