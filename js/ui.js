// ================================
// UI Script - Navbar, Theme, dan Interaksi
// ================================

// Elemen DOM
const menuToggle = document.getElementById("menu-toggle");
const navLinks = document.getElementById("nav-links");
const overlay = document.getElementById("overlay");
const navbar = document.querySelector(".navbar");
const themeToggle = document.getElementById("theme-toggle");

// ================================
// Menu Toggle
// ================================
function toggleMenu() {
  if (menuToggle && navLinks && overlay) {
    menuToggle.classList.toggle("active");
    navLinks.classList.toggle("active");
    overlay.classList.toggle("active");
  }
}

if (menuToggle && navLinks && overlay) {
  // Toggle open/close menu
  menuToggle.addEventListener("click", toggleMenu);

  // Tutup menu saat overlay diklik
  overlay.addEventListener("click", toggleMenu);

  // Tutup menu saat salah satu link diklik
  document.querySelectorAll("#nav-links a").forEach(link => {
    link.addEventListener("click", toggleMenu);
  });
}

// ================================
// Efek navbar blur saat scroll
// ================================
if (navbar) {
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 10);
  });
}

// ================================
// Dark / Light Mode
// ================================
function setTheme(mode) {
  if (mode === "dark") {
    document.body.classList.add("dark");
    if (themeToggle) themeToggle.textContent = "☀️";
  } else {
    document.body.classList.remove("dark");
    if (themeToggle) themeToggle.textContent = "🌙";
  }
  localStorage.setItem("theme", mode);
}

// Terapkan tema dari localStorage atau default ke light
const savedTheme = localStorage.getItem("theme") || "light";
setTheme(savedTheme);

// Event toggle tema
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const newTheme = document.body.classList.contains("dark") ? "light" : "dark";
    setTheme(newTheme);
  });
}

// Terapkan tema saat DOM selesai dimuat untuk semua halaman
document.addEventListener("DOMContentLoaded", () => {
  setTheme(savedTheme);
});
