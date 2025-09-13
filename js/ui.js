// Navbar toggle
const menuToggle = document.getElementById("menu-toggle");
const navLinks = document.getElementById("nav-links");
const overlay = document.getElementById("overlay");

if (menuToggle && navLinks && overlay) {
  menuToggle.addEventListener("click", () => {
    menuToggle.classList.toggle("active");
    navLinks.classList.toggle("active");
    overlay.classList.toggle("active");
  });

  overlay.addEventListener("click", () => {
    menuToggle.classList.remove("active");
    navLinks.classList.remove("active");
    overlay.classList.remove("active");
  });
}

// Tambahan: navbar blur saat scroll
const navbar = document.querySelector(".navbar");
window.addEventListener("scroll", () => {
  if (window.scrollY > 10) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

// Toggle open/close
menuToggle.addEventListener("click", () => {
  menuToggle.classList.toggle("active");
  navLinks.classList.toggle("active");
  overlay.classList.toggle("active");
});

// Close saat overlay diklik
overlay.addEventListener("click", () => {
  menuToggle.classList.remove("active");
  navLinks.classList.remove("active");
  overlay.classList.remove("active");
});

// Close saat salah satu link diklik
document.querySelectorAll("#nav-links a").forEach(link => {
  link.addEventListener("click", () => {
    menuToggle.classList.remove("active");
    navLinks.classList.remove("active");
    overlay.classList.remove("active");
  });
});
