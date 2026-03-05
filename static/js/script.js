document.addEventListener("DOMContentLoaded", function () {

  // =============================
  // SCROLL SUAVE + OFFSET HEADER
  // =============================

  const navLinks = document.querySelectorAll("nav a");
  const header   = document.querySelector("header");

  navLinks.forEach(link => {
    link.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");
      if (targetId.startsWith("#")) {
        e.preventDefault();
        const targetSection = document.querySelector(targetId);
        if (!targetSection) return;
        const headerHeight = header ? header.offsetHeight : 0;
        window.scrollTo({
          top: targetSection.offsetTop - headerHeight,
          behavior: "smooth"
        });
        navMenu && navMenu.classList.remove("active");
      }
    });
  });

  // =============================
  // NAV SCROLL EFFECT
  // =============================

  window.addEventListener("scroll", () => {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 80);
  });

  // =============================
  // TABS ESTUDIO
  // =============================

  const tabs   = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");

  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      panels.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");

      const panel = document.getElementById(btn.dataset.tab);
      panel && panel.classList.add("active");
    });
  });

  // =============================
  // LIGHTBOX
  // =============================

  const galleryImages = document.querySelectorAll(".studio-gallery img");
  const lightbox      = document.getElementById("lightbox");
  const lightboxImg   = document.getElementById("lightbox-img");
  const closeBtn      = document.querySelector(".close-lightbox");

  function openLightbox(src, alt) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightboxImg.alt = alt || "";
    lightbox.style.display = "flex";
    document.body.style.overflow = "hidden"; // evita scroll de fondo
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.style.display = "none";
    document.body.style.overflow = "";
  }

  galleryImages.forEach(img => {
    img.addEventListener("click", () => openLightbox(img.src, img.alt));
  });

  closeBtn && closeBtn.addEventListener("click", closeLightbox);

  lightbox && lightbox.addEventListener("click", e => {
    if (e.target === lightbox) closeLightbox();
  });

  // Cerrar con Escape
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && lightbox && lightbox.style.display === "flex") {
      closeLightbox();
    }
  });

  // =============================
  // SLIDER
  // =============================

  const track = document.querySelector(".slider-track");

  if (track) {
    const slides = track.querySelectorAll("img");
    let index = 0;

    function moveSlider() {
      if (slides.length <= 1) return;
      index = (index + 1) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
    }

    setInterval(moveSlider, 4000);
  }

  // =============================
  // MENU MOBILE
  // =============================

  const toggle  = document.querySelector(".menu-toggle");
  const navMenu = document.querySelector("nav ul");

  toggle && toggle.addEventListener("click", () => {
    navMenu && navMenu.classList.toggle("active");
  });

  // =============================
  // LOGIN
  // =============================

  const form      = document.querySelector("#login-form");
  const resultado = document.querySelector("#resultado-login");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (resultado) resultado.textContent = "";

      const usuario  = form.querySelector('input[name="usuario"]').value.trim();
      const password = form.querySelector('input[name="password"]').value.trim();

      if (!usuario || !password) {
        if (resultado) resultado.textContent = "Completá los dos campos.";
        return;
      }

      const submitBtn = form.querySelector(".login-btn");
      if (submitBtn) submitBtn.disabled = true;

      try {
        const response = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuario, password })
        });

        const data = await response.json();

        if (response.ok) {
          window.location.href = "/alumno";
        } else {
          if (resultado) resultado.textContent = data.message || "Usuario o contraseña incorrectos.";
        }

      } catch (error) {
        console.error("Error en login:", error);
        if (resultado) resultado.textContent = "Error de conexión. Intentá de nuevo.";
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

});