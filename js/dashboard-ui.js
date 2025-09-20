// js/dashboard-ui.js
import { auth, db } from './firebase-config.js';
import { 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  query, 
  collection, 
  getDocs, 
  orderBy, 
  limit 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const overlay = document.getElementById('sidebar-overlay');
const userPhoto = document.getElementById('user-photo');
const profileMenu = document.getElementById('profile-menu');
const logoutBtn = document.getElementById('logout-btn-2');
const navLinks = Array.from(document.querySelectorAll('.nav-link'));
const sections = Array.from(document.querySelectorAll('.section'));
const themeToggle = document.getElementById('theme-toggle');
const checkProgressBtn = document.getElementById('check-progress-btn');
const totalBonusPercentage = document.getElementById('total-bonus-percentage');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const pointsBalance = document.getElementById('points-balance');
const pointsRupiah = document.getElementById('points-rupiah');
const refCount = document.getElementById('ref-count');
const recentActivity = document.getElementById('recent-activity');
const btnWithdraw = document.getElementById('btn-withdraw');
const btnCopyRef = document.getElementById('btn-copy-ref');
const claimButtons = document.querySelectorAll('.btn-claim');
const totalTemanLink = document.getElementById('total-teman-link');
const infoIcon = document.querySelector('.info-icon');

// Helper Functions
function safeAddEvent(el, ev, fn) {
  if (el) el.addEventListener(ev, fn);
}

function showGamePopup(message) {
  const popup = document.createElement('div');
  popup.className = 'game-popup';
  popup.textContent = message;
  document.body.appendChild(popup);
  setTimeout(() => popup.classList.add('show'), 10);
  setTimeout(() => {
    popup.classList.remove('show');
    setTimeout(() => popup.remove(), 300);
  }, 2000);
}

function showFloatingPoints(button, points) {
  const rect = button.getBoundingClientRect();
  const floatEl = document.createElement('span');
  floatEl.className = 'floating-points';
  floatEl.textContent = points > 0 ? `+${points} Poin` : 'Progres Diperiksa!';
  floatEl.style.position = 'absolute';
  floatEl.style.left = `${rect.left + rect.width / 2}px`;
  floatEl.style.top = `${rect.top - 10}px`;
  floatEl.style.color = '#22c55e';
  floatEl.style.fontSize = '1rem';
  floatEl.style.fontWeight = '700';
  document.body.appendChild(floatEl);

  let opacity = 1;
  let y = 0;
  const animate = () => {
    y -= 1;
    opacity -= 0.02;
    floatEl.style.transform = `translate(-50%, ${y}px)`;
    floatEl.style.opacity = opacity;
    if (opacity <= 0) floatEl.remove();
    else requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}

function parseTimeToday(str) {
  const [hh, mm] = str.split(':').map(Number);
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
}

function formatTime(ms) {
  if (ms < 0) ms = 0;
  const sec = Math.floor(ms / 1000);
  const h = String(Math.floor(sec / 3600)).padStart(2, '0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function convertPointsToRupiah(points) {
  return points * 10; // 1 poin = Rp10 (sesuaikan konversi jika berbeda)
}

// UI Logic
function setInitialSidebarState() {
  if (window.innerWidth <= 900) {
    sidebar?.classList.add('closed');
    sidebar?.classList.remove('open');
    overlay?.classList.remove('show');
    overlay?.setAttribute('aria-hidden', 'true');
  } else {
    sidebar?.classList.add('open');
    sidebar?.classList.remove('closed');
    overlay?.classList.remove('show');
    overlay?.setAttribute('aria-hidden', 'true');
  }
}

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(setInitialSidebarState, 120);
});

function openSidebar() {
  sidebar?.classList.remove('closed');
  sidebar?.classList.add('open');
  overlay?.classList.add('show');
  overlay?.setAttribute('aria-hidden', 'false');
}

function closeSidebar() {
  sidebar?.classList.remove('open');
  sidebar?.classList.add('closed');
  overlay?.classList.remove('show');
  overlay?.setAttribute('aria-hidden', 'true');
}

safeAddEvent(sidebarToggle, 'click', (e) => {
  e.preventDefault();
  sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
});

safeAddEvent(overlay, 'click', (e) => {
  e.preventDefault();
  closeSidebar();
});

safeAddEvent(userPhoto, 'click', (e) => {
  e.stopPropagation();
  profileMenu?.classList.toggle('show');
  profileMenu?.setAttribute('aria-hidden', !profileMenu.classList.contains('show'));
});

document.addEventListener('click', (e) => {
  if (profileMenu && !profileMenu.contains(e.target) && e.target !== userPhoto) {
    profileMenu.classList.remove('show');
    profileMenu.setAttribute('aria-hidden', 'true');
  }
});

navLinks.forEach(link => {
  safeAddEvent(link, 'click', (e) => {
    e.preventDefault();
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    const key = link.getAttribute('data-section');
    sections.forEach(sec => {
      sec.classList.toggle('active', sec.id === `section-${key}`);
    });
    document.querySelector('.page-title').textContent = link.textContent.trim();
    if (window.innerWidth <= 900) closeSidebar();
  });
});

safeAddEvent(logoutBtn, 'click', async (e) => {
  e.preventDefault();
  if (logoutBtn.disabled) return;
  logoutBtn.disabled = true;
  try {
    await signOut(auth);
    window.location.href = 'index.html';
  } catch (err) {
    console.error('[Logout] Error:', err.message);
    window.location.href = 'index.html';
  } finally {
    logoutBtn.disabled = false;
  }
});

function applyTheme(mode) {
  mode = mode || 'light';
  if (mode === 'dark') {
    document.body.classList.add('dark');
    themeToggle.textContent = '☀️';
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.classList.remove('dark');
    themeToggle.textContent = '🌙';
    localStorage.setItem('theme', 'light');
  }
}

const savedTheme = localStorage.getItem('theme') || 'light';
applyTheme(savedTheme);
safeAddEvent(themeToggle, 'click', (e) => {
  e.preventDefault();
  applyTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
});

// Button Functionality
safeAddEvent(btnWithdraw, 'click', () => {
  navLinks.find(link => link.getAttribute('data-section') === 'penarikan').click();
  showGamePopup('Arahkan ke Penarikan!');
});

safeAddEvent(btnCopyRef, 'click', async () => {
  if (!user) return;
  const registrationId = await getRegistrationId(user.uid); // Ambil ID urutan pendaftaran
  const referralLink = `https://cittafun.com/referral?code=${registrationId}`;
  try {
    await navigator.clipboard.writeText(referralLink);
    showGamePopup('Link Referral disalin!');
  } catch (err) {
    console.error('Gagal menyalin link:', err);
    showGamePopup('Gagal menyalin link, coba lagi!');
  }
});

safeAddEvent(totalTemanLink, 'click', (e) => {
  e.preventDefault();
  navLinks.find(link => link.getAttribute('data-section') === 'referral').click();
  showGamePopup('Arahkan ke Ajak Teman!');
});

safeAddEvent(infoIcon, 'click', () => {
  showGamePopup('Konversi poin otomatis setiap jam 00:00 WIB, maks. 100.000 poin/hari. Tingkatkan limit dengan KYC!');
});

// Firebase Logic
let user = null;

onAuthStateChanged(auth, async (currentUser) => {
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }
  user = currentUser;
  await loadUserData();
  setupCountdowns();
  setupClaimListeners();
  startPointConversion();
});

async function loadUserData() {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  const docSnap = await getDoc(userRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    userName.textContent = data.name || user.displayName || 'Pengguna';
    userEmail.textContent = data.email || user.email || '-';
    userPhoto.src = user.photoURL || 'https://via.placeholder.com/50';
    pointsBalance.textContent = data.points || 0;
    pointsBalance.style.color = data.points > 0 ? 'var(--citta-blue)' : '#6b7280'; // Warna biru jika > 0
    pointsRupiah.textContent = `Rp${convertPointsToRupiah(data.convertedPoints || 0).toLocaleString('id-ID')}`;
    pointsRupiah.style.color = data.convertedPoints > 0 ? 'var(--fun-orange)' : '#6b7280'; // Warna oranye jika > 0
    refCount.textContent = data.referrals?.length || 0;
    recentActivity.innerHTML = data.recentActivity?.length 
      ? data.recentActivity.map(act => `<li>${act}</li>`).join('')
      : '<li>Tidak ada aktivitas.</li>';
    totalBonusPercentage.textContent = `${(data.referrals?.length || 0) * 2}%`;
  } else {
    userName.textContent = user.displayName || 'Pengguna';
    userEmail.textContent = user.email || '-';
    userPhoto.src = user.photoURL || 'https://via.placeholder.com/50';
  }
}

async function getRegistrationId(uid) {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, orderBy('createdAt')); // Asumsikan ada field createdAt
  const snapshot = await getDocs(q);
  let index = 0;
  snapshot.forEach((doc) => {
    if (doc.id === uid) return;
    index++;
  });
  return index + 1; // ID urutan pendaftaran dimulai dari 1
}

function setupCountdowns() {
  const now = new Date();
  const wibOffset = 7 * 60; // WIB is UTC+7
  const wibTime = new Date(now.getTime() + wibOffset * 60 * 1000);
  const currentHour = wibTime.getUTCHours();

  document.querySelectorAll('[data-start]').forEach(slot => {
    const start = parseInt(slot.dataset.start.split(':')[0]);
    const end = parseInt(slot.dataset.end.split(':')[0]);
    const countdownEl = slot.querySelector('.countdown');
    if (currentHour >= start && currentHour < end) {
      countdownEl.textContent = '⏳ Aktif sekarang';
    } else if (currentHour < start) {
      const startTime = new Date(wibTime);
      startTime.setUTCHours(start, 0, 0, 0);
      countdownEl.textContent = `⏳ Mulai ${formatTime(startTime - wibTime)}`;
    } else {
      const nextDay = new Date(wibTime);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      nextDay.setUTCHours(start, 0, 0, 0);
      countdownEl.textContent = `⏳ Besok ${formatTime(nextDay - wibTime)}`;
    }
  });
}

function setupClaimListeners() {
  claimButtons.forEach(button => {
    button.addEventListener('click', async () => {
      if (!user || button.disabled) return;
      const mission = button.getAttribute('data-mission');
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const missionsCompleted = data.missionsCompleted || {};
        if (missionsCompleted[mission]?.includes(new Date().toDateString())) {
          showGamePopup('Misi sudah diklaim hari ini!');
          return;
        }

        const points = mission.startsWith('ref-') ? 100 : 100;
        await updateDoc(userRef, {
          points: (data.points || 0) + points,
          missionsCompleted: {
            ...missionsCompleted,
            [mission]: [...(missionsCompleted[mission] || []), new Date().toDateString()]
          },
          recentActivity: arrayUnion(`Klaim ${mission} - ${new Date().toLocaleString('id-ID')}`).slice(-5)
        });
        await loadUserData();
        showGamePopup(`Berhasil klaim ${points} poin!`);
        showFloatingPoints(button, points);
        if (window.confetti) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        button.disabled = true;
      }
    });
  });

  safeAddEvent(checkProgressBtn, 'click', async () => {
    if (!user || checkProgressBtn.disabled) return;
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.referrals?.length >= 1) {
        const bonus = 50000;
        await updateDoc(userRef, {
          points: (data.points || 0) + bonus,
          recentActivity: arrayUnion(`Bonus referral 50.000 poin - ${new Date().toLocaleString('id-ID')}`).slice(-5)
        });
        await loadUserData();
        showGamePopup(`Berhasil klaim bonus ${bonus} poin!`);
        showFloatingPoints(checkProgressBtn, bonus);
        if (window.confetti) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } else {
        showGamePopup('Belum ada referral aktif 7 hari!');
      }
      checkProgressBtn.disabled = true;
    }
  });
}

function startPointConversion() {
  const now = new Date();
  const wibTime = new Date(now.getTime() + 7 * 60 * 60 * 1000); // WIB (UTC+7)
  const nextConversion = new Date(wibTime);
  nextConversion.setUTCHours(0, 0, 0, 0); // Jam 00:00 WIB
  if (wibTime > nextConversion) nextConversion.setUTCDate(nextConversion.getUTCDate() + 1);

  const timeUntilNext = nextConversion - wibTime;
  setTimeout(async () => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const dailyConverted = data.dailyConverted || 0;
      const convertiblePoints = Math.min(data.points || 0, 100000 - dailyConverted);
      if (convertiblePoints > 0) {
        await updateDoc(userRef, {
          points: (data.points || 0) - convertiblePoints,
          convertedPoints: (data.convertedPoints || 0) + convertiblePoints,
          dailyConverted: (data.dailyConverted || 0) + convertiblePoints,
          recentActivity: arrayUnion(`Konversi ${convertiblePoints} poin - ${new Date().toLocaleString('id-ID')}`).slice(-5)
        });
        await loadUserData();
        showGamePopup(`Konversi ${convertiblePoints} poin berhasil!`);
      }
    }
    startPointConversion(); // Ulangi setiap hari
  }, timeUntilNext);
}

// Initialize
setInitialSidebarState();
if (user) {
  loadUserData();
  setInterval(setupCountdowns, 1000);
}
