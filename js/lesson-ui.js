// script/lesson.js

// Impor Firebase (sesuaikan dengan konfigurasi)
import { auth } from './firebase-config.js';

// Fungsi untuk memeriksa status autentikasi dan memperbarui UI
function updateUI(user) {
  const profilePhoto = document.getElementById('profile-photo');
  const userName = document.getElementById('user-name');
  const userRole = document.getElementById('user-role');

  if (user) {
    profilePhoto.src = user.photoURL || 'https://via.placeholder.com/40';
    userName.textContent = user.displayName || 'Pengguna';
    userRole.textContent = 'Pengguna';
  } else {
    profilePhoto.src = 'https://via.placeholder.com/40';
    userName.textContent = 'Nama Pengguna';
    userRole.textContent = 'Pengguna';
  }
}

// Toggle Profile Menu
document.addEventListener('DOMContentLoaded', () => {
  const profile = document.getElementById('profile');
  const profileMenu = document.getElementById('profile-menu');

  profile.addEventListener('click', () => {
    profileMenu.classList.toggle('show');
  });

  // Tutup menu saat klik di luar
  document.addEventListener('click', (e) => {
    if (!profile.contains(e.target)) {
      profileMenu.classList.remove('show');
    }
  });

  // Toggle Theme
  const themeToggle = document.getElementById('theme-toggle');
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
  });

  // Menu Toggle (Opsional, jika sidebar diimplementasikan nanti)
  const menuToggle = document.getElementById('menu-toggle');
  menuToggle.addEventListener('click', () => {
    console.log('Menu toggle clicked'); // Placeholder untuk logika sidebar
  });

  // Notification Bell (Opsional)
  const notificationBell = document.getElementById('notification-bell');
  notificationBell.addEventListener('click', () => {
    console.log('Notification clicked'); // Placeholder untuk logika notifikasi
  });

  // Periksa status autentikasi
  auth.onAuthStateChanged((user) => {
    updateUI(user);
    if (!user) {
      window.location.href = 'index.html'; // Redirect ke halaman login jika tidak ada user
    }
  });

  // Tambahkan event listener untuk tombol pelajaran
  const lessonButtons = document.querySelectorAll('.btn-lesson');
  lessonButtons.forEach(button => {
    button.addEventListener('click', () => {
      alert('Pelajaran akan segera dimulai!'); // Placeholder untuk logika pelajaran
    });
  });
});
