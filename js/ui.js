// ================================
// UI Script - Navbar & Interaksi
// ================================

// Elemen navbar
const menuToggle = document.getElementById("menu-toggle");
const navLinks = document.getElementById("nav-links");
const overlay = document.getElementById("overlay");
const navbar = document.querySelector(".navbar");
const themeToggle = document.getElementById("theme-toggle");

// ================================
// Menu Toggle
// ================================
if (menuToggle && navLinks && overlay) {
  // Toggle open/close menu
  menuToggle.addEventListener("click", () => {
    menuToggle.classList.toggle("active");
    navLinks.classList.toggle("active");
    overlay.classList.toggle("active");
  });

  // Tutup menu saat overlay diklik
  overlay.addEventListener("click", () => {
    menuToggle.classList.remove("active");
    navLinks.classList.remove("active");
    overlay.classList.remove("active");
  });

  // Tutup menu saat salah satu link diklik
  document.querySelectorAll("#nav-links a").forEach(link => {
    link.addEventListener("click", () => {
      menuToggle.classList.remove("active");
      navLinks.classList.remove("active");
      overlay.classList.remove("active");
    });
  });
}

// ================================
// Efek navbar blur saat scroll
// ================================
if (navbar) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 10) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });
}

// ================================
// Dark / Light Mode
// ================================

// Fungsi set tema
function setTheme(mode) {
  if (mode === "dark") {
    document.body.classList.add("dark");
    if (themeToggle) themeToggle.textContent = "☀️";
  } else {
    document.body.classList.remove("dark");
    if (themeToggle) themeToggle.textContent = "🌙";
  }
  // Simpan ke localStorage
  localStorage.setItem("theme", mode);
}

// Cek preferensi tersimpan
const savedTheme = localStorage.getItem("theme") || "light";
setTheme(savedTheme);

// Event toggle tema
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const newTheme = document.body.classList.contains("dark") ? "light" : "dark";
    setTheme(newTheme);
  });
}
