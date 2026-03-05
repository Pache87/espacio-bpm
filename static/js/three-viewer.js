import * as THREE from "three";
import { OrbitControls }            from "three/addons/controls/OrbitControls.js";
import { GLTFLoader }               from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader }               from "three/addons/loaders/RGBELoader.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

const container = document.getElementById("three-container");
if (!container) console.error("[three-viewer] No se encontró #three-container");

const isMobile = window.innerWidth < 768;
const DPR      = isMobile ? 1 : Math.min(window.devicePixelRatio, 2);

// =====================
// RENDERER
// =====================
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(DPR);
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping      = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
container.appendChild(renderer.domElement);

const scene  = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

const camera = new THREE.PerspectiveCamera(52, container.clientWidth / container.clientHeight, 0.1, 200);

window.addEventListener("resize", () => {
  const w = container.clientWidth;
  const h = container.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
})

// =====================
// CONTROLS
// =====================
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false;

controls.minPolarAngle  = 0.548;   // límite arriba
controls.maxPolarAngle  = 1.548;   // límite abajo
controls.minAzimuthAngle = -1.05;  // límite izquierda (ajustar)
controls.maxAzimuthAngle =  1.05;  // límite derecha (ajustar)

renderer.domElement.addEventListener("wheel", (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 1.1 : 0.9;
  camera.position.multiplyScalar(delta);
}, { passive: false });


window.threeViewer = { camera, controls, renderer, scene };

// =====================
// MATERIALES
// =====================
const matCromado   = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1,   roughness: 0.1,  envMapIntensity: 1  });
const matPlatos    = new THREE.MeshStandardMaterial({ color: 0xb08d57, metalness: 1,   roughness: 0.28, envMapIntensity: 1.0  });

const textureLoader = new THREE.TextureLoader();

const normalPlato = textureLoader.load("/static/js/normplato.jpg", (tex) => {
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  if (!isMobile) tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
}, undefined, (err) => console.warn("[three-viewer] normalPlato no cargó:", err));

matPlatos.normalMap   = normalPlato;
matPlatos.normalScale = new THREE.Vector2(0.5, 0.5);

const diffCuerpos = textureLoader.load("/static/js/diffcuerpos.jpg", (tex) => {
  tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace;
  if (!isMobile) tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
}, undefined, (err) => console.warn("[three-viewer] diffCuerpos no cargó:", err));
const normCuerpos = textureLoader.load("/static/js/normcuerpos.jpg", (tex) => { tex.flipY = false; }, undefined, (err) => console.warn("[three-viewer] normCuerpos no cargó:", err));
const diffParche  = textureLoader.load("/static/js/diffparche.jpg",  (tex) => {
  tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace;
  if (!isMobile) tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
}, undefined, (err) => console.warn("[three-viewer] diffParche no cargó:", err));
const normParche  = textureLoader.load("/static/js/fparche.jpg",     (tex) => { tex.flipY = false; }, undefined, (err) => console.warn("[three-viewer] normParche no cargó:", err));

const matCuerpos   = new THREE.MeshStandardMaterial({ map: diffCuerpos, normalMap: normCuerpos, normalScale: new THREE.Vector2(0.2, 0.2), metalness: 0.8, roughness: 0.3,  envMapIntensity: 0.3  });
const matParches   = new THREE.MeshStandardMaterial({ map: diffParche,  normalMap: normParche,  normalScale: new THREE.Vector2(0.3, 0.3), metalness: 0.5, roughness: 0.3,  envMapIntensity: 0.1  });
const matPlasticos = new THREE.MeshStandardMaterial({ color: 0x1a1510,  metalness: 0.5, roughness: 0.5, envMapIntensity: 0.15 });

// =====================
// HDR
// =====================
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
new RGBELoader().load("/static/model/hdr.hdr", (texture) => {
  const envMap = pmremGenerator.fromEquirectangular(texture).texture;
  matCromado.envMap = envMap; matCromado.envMapIntensity = 0.2; matCromado.needsUpdate = true;
  matPlatos.envMap  = envMap; matPlatos.envMapIntensity  = 0.3; matPlatos.needsUpdate  = true;
  texture.dispose();
  pmremGenerator.dispose();
}, undefined, (err) => console.warn("[three-viewer] HDR no cargó:", err));

// =====================
// LUCES
// =====================
scene.add(new THREE.HemisphereLight(0xfff4e0, 0x0a0a14, 0.25));

const spotFront = new THREE.SpotLight(0xd0e8ff, 15);
spotFront.position.set(-0.48, 1.2, -1.8);
spotFront.angle    = Math.PI / 12;
spotFront.penumbra = 0.5;
spotFront.decay    = 1;
spotFront.distance = 20;
spotFront.target.position.set(-0.15, 0.47, -0.08);
scene.add(spotFront);
scene.add(spotFront.target);

const spotTop = new THREE.SpotLight(0xfff8e7, 3);
spotTop.position.set(0.1, 2.5, -0.08);
spotTop.angle    = Math.PI / 1;
spotTop.penumbra = 0.5;
spotTop.decay    = 2;
spotTop.distance = 15;
spotTop.target.position.set(0.05, 1, -0.08);
scene.add(spotTop);
scene.add(spotTop.target);

RectAreaLightUniformsLib.init();

// =====================
// MODELOS
// =====================
const loader = new GLTFLoader();
const group  = new THREE.Group();
group.rotation.y = Math.PI;
scene.add(group);

const models = [
  { path: "/static/model/cromado.glb",   mat: matCromado   },
  { path: "/static/model/cuerpos.glb",   mat: matCuerpos   },
  { path: "/static/model/parches.glb",   mat: matParches   },
  { path: "/static/model/plasticos.glb", mat: matPlasticos },
  { path: "/static/model/platos.glb",    mat: matPlatos    }
];

let loadedCount = 0;
function onModelResult() {
  loadedCount++;
  if (loadedCount === models.length) {
    moveCameraSmooth("inicio", 1.2);
    window.dispatchEvent(new CustomEvent("viewer:ready"));
  }
}

models.forEach((m) => {
  loader.load(m.path, (gltf) => {
    gltf.scene.traverse((c) => {
      if (c.isMesh) { c.material = m.mat; c.castShadow = false; c.receiveShadow = false; }
    });
    group.add(gltf.scene);
    onModelResult();
  }, undefined, (err) => {
    console.warn(`[three-viewer] Error cargando ${m.path}:`, err);
    onModelResult();
  });
});

// =====================
// CÁMARA — PUNTOS
// =====================
const CAMERA_POINTS = {
  inicio: { position: new THREE.Vector3( 0.48, isMobile ? 1.2 : 1, isMobile ? 1.6 : 1.15), target: new THREE.Vector3( 0.05, 0.38, -0.01), fov: isMobile ? 58 : 52 },
  hh:      { position: new THREE.Vector3( 0.00, 0.77,  0.45), target: new THREE.Vector3(-0.46, 0.60, -0.14), fov: 52 },
  bombo:   { position: new THREE.Vector3( 0.29, 0.64,  0.54), target: new THREE.Vector3( 0.10, 0.28, -0.02), fov: 52 },
  tambor:  { position: new THREE.Vector3(-0.04, 0.91,  0.61), target: new THREE.Vector3(-0.16, 0.38,  0.04), fov: 52 },
  chancha: { position: new THREE.Vector3( 0.60, 0.66,  0.70), target: new THREE.Vector3( 0.41, 0.28, -0.02), fov: 52 },
  tom:     { position: new THREE.Vector3( 0.00, 0.76,  0.25), target: new THREE.Vector3(-0.08, 0.60, -0.06), fov: 52 },
  ride:    { position: new THREE.Vector3( 0.48, 0.90,  0.43), target: new THREE.Vector3( 0.32, 0.60, -0.17), fov: 52 },
  crash:   { position: new THREE.Vector3(-0.18, 0.95,  0.41), target: new THREE.Vector3(-0.33, 0.82, -0.10), fov: 52 }
};

let camAnim     = null;
let _activeView = "inicio";
const clock     = new THREE.Clock();

function ease(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function moveCameraSmooth(name, seconds = 1) {
  const preset = CAMERA_POINTS[name];
  if (!preset) { console.warn(`[three-viewer] Vista desconocida: "${name}"`); return; }
  _activeView = name;
  camAnim = {
    t: 0, dur: seconds,
    fromPos:    camera.position.clone(),
    toPos:      preset.position.clone(),
    fromTarget: controls.target.clone(),
    toTarget:   preset.target.clone(),
    fromFov:    camera.fov,
    toFov:      preset.fov
  };
}

window.moveCameraSmooth = moveCameraSmooth;
window.getActiveView    = () => _activeView;

// =====================
// HOTSPOTS
// =====================
const PARTS = {
  hh:      { nombre: "HI-HAT",  anchor: new THREE.Vector3(-0.4917,  0.6585, -0.0853) },
  bombo:   { nombre: "BOMBO",   anchor: new THREE.Vector3( 0.0420,  0.3103, -0.2071) },
  chancha: { nombre: "CHANCHA", anchor: new THREE.Vector3( 0.3927,  0.4407,  0.0777) },
  tambor:  { nombre: "TAMBOR",  anchor: new THREE.Vector3(-0.1788,  0.4688,  0.0777) },
  tom:     { nombre: "TOM",     anchor: new THREE.Vector3(-0.1471,  0.5997, -0.2442) },
  ride:    { nombre: "RIDE",    anchor: new THREE.Vector3( 0.2920,  0.6786, -0.2485) },
  crash:   { nombre: "CRASH",   anchor: new THREE.Vector3(-0.3619,  0.8606, -0.2485) },
};

// Qué vista corresponde a cada parte
const PART_VIEW = {
  hh: "hh", bombo: "bombo", chancha: "chancha",
  tambor: "tambor", tom: "tom", ride: "ride", crash: "crash"
};

function initHotspots() {
  container.style.position = "relative";

  // Overlay
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;";
  container.appendChild(overlay);

  // Estilos
  const style = document.createElement("style");
  style.textContent = `
    .hs-dot {
      position: absolute;
      width: 12px; height: 12px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #ff6b6b, #c1121f);
      border: 1.5px solid rgba(255,255,255,0.3);
      box-shadow: 0 0 0 3px rgba(193,18,31,0.2), 0 2px 8px rgba(0,0,0,0.5);
      cursor: pointer;
      pointer-events: all;
      transform: translate(-50%, -50%);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      animation: hs-pulse 2.5s ease-in-out infinite;
    }
    .hs-dot:hover {
      transform: translate(-50%, -50%) scale(1.4);
      box-shadow: 0 0 0 5px rgba(193,18,31,0.2), 0 0 16px rgba(230,57,70,0.5);
    }
    @keyframes hs-pulse {
      0%,100% { box-shadow: 0 0 0 3px rgba(193,18,31,0.2), 0 2px 8px rgba(0,0,0,0.5); }
      50%      { box-shadow: 0 0 0 7px rgba(193,18,31,0.08), 0 0 16px rgba(230,57,70,0.25); }
    }
    /* chip de nombre — solo desktop via hover */
    .hs-chip {
      position: absolute;
      left: 50%;
      bottom: calc(100% + 7px);
      transform: translateX(-50%);
      background: rgba(10,10,10,0.88);
      border: 1px solid rgba(230,57,70,0.35);
      border-radius: 6px;
      padding: 3px 9px;
      white-space: nowrap;
      font-family: 'Bebas Neue', sans-serif;
      font-size: 11px;
      letter-spacing: 0.15em;
      color: #e8e8e8;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    @media (hover: hover) {
      .hs-dot:hover .hs-chip { opacity: 1; }
    }

    /* Botón volver — esquina superior izquierda del canvas */
    .btn-volver {
      position: absolute;
      top: 14px; left: 14px;
      z-index: 10;
      pointer-events: all;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(8,8,8,0.82);
      border: 1px solid rgba(212,175,55,0.25);
      border-radius: 4px;
      padding: 8px 16px 8px 12px;
      cursor: pointer;
      opacity: 0;
      transform: translateY(-6px);
      transition: opacity 0.3s ease, transform 0.3s ease, border-color 0.25s, background 0.25s;
      backdrop-filter: blur(8px);
    }
    .btn-volver.visible { opacity: 1; transform: translateY(0); }
    .btn-volver:hover { background: rgba(18,18,18,0.95); border-color: rgba(212,175,55,0.7); }
    .btn-volver svg { flex-shrink:0; opacity:0.6; transition: opacity 0.2s; }
    .btn-volver:hover svg { opacity: 1; }
    .btn-volver span {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 13px; letter-spacing: 0.25em;
      color: rgba(212,175,55,0.75); line-height:1;
      transition: color 0.2s;
    }
    .btn-volver:hover span { color: #d4af37; }
  `;
  document.head.appendChild(style);

  // Botón volver
  const btnVolver = document.createElement("div");
  btnVolver.className = "btn-volver";
  btnVolver.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M9 11L5 7L9 3" stroke="rgba(212,175,55,0.75)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span>VISTA GENERAL</span>`;
  btnVolver.addEventListener("click", () => moveCameraSmooth("inicio", 1.2));
  overlay.appendChild(btnVolver);

  // Crear dots
  const dots = {};
  Object.entries(PARTS).forEach(([key, part]) => {
    const dot = document.createElement("div");
    dot.className = "hs-dot";

    const chip = document.createElement("div");
    chip.className = "hs-chip";
    chip.textContent = part.nombre;
    dot.appendChild(chip);

    dot.addEventListener("click", () => moveCameraSmooth(PART_VIEW[key], 1.2));
    overlay.appendChild(dot);
    dots[key] = dot;
  });

  // Proyección 3D → 2D
  const _v = new THREE.Vector3();
  function project(worldPos) {
    _v.copy(worldPos).project(camera);
    const r = container.getBoundingClientRect();
    return {
      x: (_v.x *  0.5 + 0.5) * r.width,
      y: (_v.y * -0.5 + 0.5) * r.height,
      behind: _v.z > 1
    };
  }

  function updateHotspots() {
    Object.entries(dots).forEach(([key, dot]) => {
      const pos = project(PARTS[key].anchor);
      if (pos.behind) { dot.style.opacity = "0"; return; }
      dot.style.opacity = "1";
      dot.style.left    = pos.x + "px";
      dot.style.top     = pos.y + "px";
    });
  }

  function setViewState(view) {
    const isInicio = view === "inicio";
    btnVolver.classList.toggle("visible", !isInicio);

    // Dispatch para que el HTML actualice el panel de notación
    window.dispatchEvent(new CustomEvent("viewer:camEnd", { detail: { view } }));
  }

  window.addEventListener("viewer:ready",  () => setViewState(window.getActiveView?.() ?? "inicio"));
  window.addEventListener("viewer:camEnd", (e) => {
    // setViewState ya dispatchea viewer:camEnd, evitamos recursión
    // Solo actualizamos el botón aquí si lo necesitamos separado
  });

  // Reemplazamos el dispatch interno para que el botón reaccione sin recursión
  // Lo manejamos directo en el animate loop vía el evento que ya se emite en animate()
  window.addEventListener("viewer:camEnd", (e) => {
    const view = e.detail?.view ?? "inicio";
    btnVolver.classList.toggle("visible", view !== "inicio");
  });

  window.addEventListener("viewer:ready", () => {
    btnVolver.classList.remove("visible");
  });

  return updateHotspots;
}

// =====================
// ANIMATE
// =====================
const updateHotspots = initHotspots();

let renderActive = true;
let rafId = null;

function animate() {
  rafId = requestAnimationFrame(animate);

  if (!renderActive) return;

  const dt = clock.getDelta();
  if (camAnim) {
    camAnim.t += dt;
    const t = Math.min(1, camAnim.t / camAnim.dur);
    const e = ease(t);
    camera.position.lerpVectors(camAnim.fromPos, camAnim.toPos, e);
    controls.target.lerpVectors(camAnim.fromTarget, camAnim.toTarget, e);
    camera.fov = THREE.MathUtils.lerp(camAnim.fromFov, camAnim.toFov, e);
    camera.updateProjectionMatrix();
    if (t >= 1) {
      camAnim = null;
      window.dispatchEvent(new CustomEvent("viewer:camEnd", { detail: { view: _activeView } }));
    }
  }
  controls.update();
  updateHotspots();
  renderer.render(scene, camera);
}

// Pausar/reanudar según visibilidad del panel visor
const panelVisor = document.getElementById("panel-visor");
if (panelVisor) {
  const observer = new MutationObserver(() => {
    const isVisible = panelVisor.classList.contains("active");
    renderActive = isVisible;
    if (isVisible) clock.getDelta();
  });
  observer.observe(panelVisor, { attributes: true, attributeFilter: ["class"] });
}

  animate();