// ================================
// UI Script - Navbar & Interaksi
// ================================

// Elemen navbar
const menuToggle = document.getElementById("menu-toggle");
const navLinks = document.getElementById("nav-links");
const overlay = document.getElementById("overlay");
const navbar = document.querySelector(".navbar");

// Pastikan elemen ada
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

// Efek navbar blur saat scroll
if (navbar) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 10) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });
}

// Dark/Light Mode Toggle dari Dropdown
const themeToggle = document.getElementById("theme-toggle");

if (themeToggle) {
  themeToggle.addEventListener("click", (e) => {
    e.preventDefault();
    document.body.classList.toggle("dark-mode");

    // Ganti teks tombol sesuai mode
    if (document.body.classList.contains("dark-mode")) {
      themeToggle.textContent = "☀️ Light Mode";
    } else {
      themeToggle.textContent = "🌙 Dark Mode";
    }
  });
}
