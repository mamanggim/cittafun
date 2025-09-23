import {
    auth,
    db
} from './firebase-config.js';
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
    doc,
    getDoc,
    updateDoc,
    arrayUnion,
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
const leaderboardList = document.getElementById('leaderboard-list');
const notifIcon = document.querySelector('.notif-icon');
const msgIcon = document.querySelector('.msg-icon'); // DOM Element untuk ikon pesan
const notifBadge = document.getElementById('notif-badge');
const msgBadge = document.getElementById('msg-badge');

// MISSION SLOTS DOM Elements
const missionSlots = document.querySelectorAll('.mission-slot');

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

function showFloatingPoints(button, points, message = null) {
    const rect = button.getBoundingClientRect();
    const floatEl = document.createElement('span');
    floatEl.className = 'floating-points';
    floatEl.textContent = message || (points > 0 ? `+${points} Poin` : 'Progres Diperiksa!');
    floatEl.style.position = 'absolute';
    floatEl.style.left = `${rect.left + rect.width / 2}px`;
    floatEl.style.top = `${rect.top - 10}px`;
    floatEl.style.color = points > 0 ? '#22c55e' : '#f87171'; // Green for points, Red for progress checked (can be customized)
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

/**
 * Mengembalikan objek Date dalam zona waktu WIB (UTC+7).
 * @returns {Date} Waktu saat ini dalam WIB.
 */
function getWIBTime() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibOffset = 7 * 3600000; // +7 hours in milliseconds
    return new Date(utc + wibOffset);
}

// UI Logic
function setInitialSidebarState() {
    if (window.innerWidth <= 900) {
        sidebar?.classList.add('closed');
        sidebar?.classList.remove('open');
        overlay?.classList.remove('show');
        overlay?.setAttribute('aria-hidden', 'true');
        if (sidebarToggle) sidebarToggle.style.display = 'block';
    } else {
        sidebar?.classList.add('open');
        sidebar?.classList.remove('closed');
        overlay?.classList.remove('show');
        overlay?.setAttribute('aria-hidden', 'true');
        if (sidebarToggle) sidebarToggle.style.display = 'none';
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
    if (window.innerWidth <= 900) {
        sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    }
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
    const registrationId = await getRegistrationId(user.uid);
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

/**
 * Fungsi baru untuk menampilkan notifikasi pop-up kecil di samping ikon.
 * @param {HTMLElement} iconElement - Elemen ikon (misal: notifIcon atau msgIcon).
 * @param {string} message - Teks yang akan ditampilkan.
 */
function showNotificationPopup(iconElement, message) {
    // Hapus pop-up yang mungkin sudah ada
    document.querySelectorAll('.notification-popup').forEach(el => el.remove());

    const popup = document.createElement('div');
    popup.className = 'notification-popup';
    popup.textContent = message;

    // Masukkan pop-up ke dalam parent ikon
    const parent = iconElement.closest('.notif-icon') || iconElement.closest('.msg-icon');
    if (parent) {
        parent.style.position = 'relative'; // Pastikan parent memiliki position: relative
        parent.appendChild(popup);
        setTimeout(() => popup.classList.add('show'), 10);
        setTimeout(() => {
            popup.classList.remove('show');
            setTimeout(() => popup.remove(), 300);
        }, 3000); // Durasi tampil pop-up
    }
}

// Simulasikan notifikasi baru
setInterval(() => {
    const notifCount = parseInt(notifBadge.textContent) || 0;
    const msgCount = parseInt(msgBadge.textContent) || 0;
    
    // Simulasikan notifikasi pesan baru
    if (Math.random() > 0.8 && msgIcon) {
        msgBadge.textContent = msgCount + 1;
        showNotificationPopup(msgIcon, 'Ada pesan baru untuk Anda!');
    }

    // Simulasikan notifikasi umum baru
    if (Math.random() > 0.9 && notifIcon) {
        notifBadge.textContent = notifCount + 1;
        showNotificationPopup(notifIcon, 'Klaim bonus misi harianmu!');
    }
}, 10000); // Cek notifikasi setiap 10 detik

// Game-style Tutorial
function startTutorial() {
    const tutorialSteps = [
        { message: "Selamat datang di Citta Fun! Mari saya tunjukkan caranya.", duration: 3000 },
        { message: "Ini dashboard utama Anda, tempat Anda melihat poin dan misi.", duration: 3000 },
        { message: "Lihat menu di samping? Ini semua fitur yang bisa Anda jelajahi!", duration: 3000, target: '.sidebar-nav' },
        { message: "Ayo kita ke menu 'Misi Harian' untuk memulai petualangan Anda!", duration: 4000, action: () => {
            const missionsLink = navLinks.find(link => link.getAttribute('data-section') === 'missions');
            if (missionsLink) missionsLink.click();
        } },
        { message: "Hebat! Misi-misi ini akan memberikan Anda poin. Kerjakan dan klaim poinnya!", duration: 4000, target: '#section-missions' },
        { message: "Jangan lupa cek profil Anda di sini untuk melihat info akun.", duration: 4000, target: '.profile' },
        { message: "Selesai! Sekarang Anda siap berpetualang dan kumpulkan poin sebanyak-banyaknya!", duration: 4000 },
    ];

    let currentStep = 0;

    function showNextStep() {
        if (currentStep >= tutorialSteps.length) {
            localStorage.setItem('tutorial_completed', 'true');
            return;
        }

        const step = tutorialSteps[currentStep];
        showGamePopup(step.message);

        if (step.target) {
            const targetEl = document.querySelector(step.target);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Tambahkan kelas highlight sementara jika diperlukan
            }
        }

        if (step.action) {
            step.action();
        }
        
        currentStep++;
        setTimeout(showNextStep, step.duration);
    }

    showNextStep();
}


// Firebase Logic
let user = null;
let userData = null; // Menyimpan data user dari Firestore

onAuthStateChanged(auth, async (currentUser) => {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    user = currentUser;
    await loadUserData(); // Memuat data user dan missionSessionStatus
    await loadLeaderboard();
    setupMissionSessionUI(); // Setup UI untuk misi sesi
    setupClaimListeners(); // Setup listener untuk tombol klaim referral
    startPointConversion();
    setInterval(setupMissionSessionUI, 1000); // Perbarui UI setiap detik untuk countdown dan status tombol

    // Jalankan tutorial jika belum pernah selesai
    if (localStorage.getItem('tutorial_completed') !== 'true') {
        setTimeout(() => startTutorial(), 2000); // Tunda sedikit agar halaman termuat
    }
});

async function loadUserData() {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
        userData = docSnap.data(); // Simpan data user
        userName.textContent = userData.name || user.displayName || 'Pengguna';
        userEmail.textContent = userData.email || user.email || '-';
        userPhoto.src = user.photoURL || 'https://via.placeholder.com/50';
        pointsBalance.textContent = userData.points || 0;
        pointsRupiah.textContent = `Rp${convertPointsToRupiah(userData.convertedPoints || 0).toLocaleString('id-ID')}`;
        refCount.textContent = userData.referrals?.length || 0;
        recentActivity.innerHTML = userData.recentActivity?.length ?
            userData.recentActivity.map(act => `<li>${act}</li>`).join('') :
            '<li>Tidak ada aktivitas.</li>';
        totalBonusPercentage.textContent = `${(userData.referrals?.length || 0) * 2}%`;
    } else {
        userData = {}; // Inisialisasi kosong jika data belum ada
        userName.textContent = user.displayName || 'Pengguna';
        userEmail.textContent = user.email || '-';
        userPhoto.src = user.photoURL || 'https://via.placeholder.com/50';
    }
}

async function loadLeaderboard() {
    if (!leaderboardList) return;
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('points', 'desc'), limit(5));
        const snapshot = await getDocs(q);
        let rank = 1;
        leaderboardList.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const li = document.createElement('li');
            li.innerHTML = `<span>${rank}</span><span>${data.name || 'Pengguna Anonim'}</span><span>${data.points || 0}</span>`;
            leaderboardList.appendChild(li);
            rank++;
        });
    } catch (err) {
        console.error('Error loading leaderboard:', err);
        leaderboardList.innerHTML = `
            <li><span>1</span><span>Ahmad</span><span>5000</span></li>
            <li><span>2</span><span>Budi</span><span>4500</span></li>
            <li><span>3</span><span>Citra</span><span>4000</span></li>
            <li><span>4</span><span>Dedi</span><span>3500</span></li>
            <li><span>5</span><span>Eka</span><span>3000</span></li>
        `;
    }
}

async function getRegistrationId(uid) {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('createdAt'));
    const snapshot = await getDocs(q);
    let index = 0;
    for (const doc of snapshot.docs) {
        if (doc.id === uid) break;
        index++;
    }
    return index + 1;
}

/**
 * Memperbarui UI untuk semua sesi misi harian (countdown, status tombol).
 * Ini akan dipanggil setiap detik atau saat data user berubah.
 */
function setupMissionSessionUI() {
    if (!user || !userData) return;

    const wibTime = getWIBTime();
    const todayDateString = wibTime.toISOString().slice(0, 10); // Format YYYY-MM-DD

    missionSlots.forEach(slot => {
        const missionId = slot.dataset.mission;
        const startHour = parseInt(slot.dataset.start.split(':')[0]);
        const endHour = parseInt(slot.dataset.end.split(':')[0]);
        const countdownEl = slot.querySelector('.countdown');
        const claimBtn = slot.querySelector('.btn-claim');

        if (!claimBtn) return;

        // missionSessionStatus: { "pagi1": { "YYYY-MM-DD": { status: "in_progress" | "completed" | "claimed" | "failed", points: 100 } } }
        const sessionStatusToday = userData.missionSessionStatus?.[missionId]?.[todayDateString];
        const isInProgress = sessionStatusToday && sessionStatusToday.status === 'in_progress';
        const isCompleted = sessionStatusToday && sessionStatusToday.status === 'completed';
        const isClaimed = sessionStatusToday && sessionStatusToday.status === 'claimed';
        const isFailed = sessionStatusToday && sessionStatusToday.status === 'failed';
        const earnedPoints = sessionStatusToday?.points || 0;

        let sessionStartTime = new Date(wibTime);
        sessionStartTime.setHours(startHour, 0, 0, 0);

        let sessionEndTime = new Date(wibTime);
        sessionEndTime.setHours(endHour, 59, 59, 999);

        if (sessionEndTime.getTime() < sessionStartTime.getTime()) {
            sessionEndTime.setDate(sessionEndTime.getDate() + 1);
        }

        const isCurrentSessionActive = wibTime >= sessionStartTime && wibTime <= sessionEndTime;
        const isSessionUpcoming = wibTime < sessionStartTime;
        const isSessionPassed = wibTime > sessionEndTime;

        // Reset UI state
        claimBtn.disabled = true;
        claimBtn.classList.remove('active-mission');

        // --- Perbarui UI berdasarkan status sesi ---

        if (isClaimed) {
            claimBtn.textContent = `Misi Selesai`;
            countdownEl.textContent = '✅ Diklaim';
        } else if (isFailed) {
            claimBtn.textContent = 'Misi Gagal';
            countdownEl.textContent = '❌ Terlewat';
        } else if (isSessionPassed && (isCompleted || isInProgress)) {
            // Jika sesi berakhir dan misi sudah dikerjakan/in_progress tapi belum diklaim
            claimBtn.textContent = `Klaim ${earnedPoints} Poin`;
            claimBtn.disabled = false; // Memungkinkan klaim meskipun sesi sudah berakhir
            claimBtn.classList.add('active-mission'); // Tetap aktif agar bisa diklaim
            countdownEl.textContent = '⏳ Sesi Berakhir'; // Diubah dari "Terlewat" menjadi "Berakhir"
        } else if (isSessionPassed) { // Jika sesi berakhir dan misi tidak dikerjakan
            claimBtn.textContent = 'Misi Gagal';
            countdownEl.textContent = '❌ Terlewat';
        } else if (isCurrentSessionActive) {
            claimBtn.disabled = false;
            claimBtn.classList.add('active-mission');
            if (isCompleted) {
                claimBtn.textContent = `Klaim ${earnedPoints} Poin`;
            } else if (isInProgress) {
                claimBtn.textContent = 'Lanjutkan Misi';
            } else {
                claimBtn.textContent = 'Kerjakan Misi';
            }
            countdownEl.textContent = `⏳ Selesai ${formatTime(sessionEndTime - wibTime)}`;
        } else if (isSessionUpcoming) {
            claimBtn.textContent = 'Kerjakan Misi';
            countdownEl.textContent = `⏳ Mulai ${formatTime(sessionStartTime - wibTime)}`;
        }
    });

    setupReferralCountdowns();
}

function setupReferralCountdowns() {
    const wibTime = getWIBTime();

    document.querySelectorAll('.referral-slot').forEach(slot => {
        const startHour = parseInt(slot.dataset.start.split(':')[0]);
        const endHour = parseInt(slot.dataset.end.split(':')[0]);
        const countdownEl = slot.querySelector('.countdown');

        let sessionStartTime = new Date(wibTime);
        sessionStartTime.setHours(startHour, 0, 0, 0);

        let sessionEndTime = new Date(wibTime);
        sessionEndTime.setHours(endHour, 59, 59, 999);

        if (sessionEndTime.getTime() < sessionStartTime.getTime()) {
            sessionEndTime.setDate(sessionEndTime.getDate() + 1);
        }

        const isCurrentSessionActive = wibTime >= sessionStartTime && wibTime <= sessionEndTime;
        const isSessionUpcoming = wibTime < sessionStartTime;
        const isSessionPassed = wibTime > sessionEndTime;

        if (isCurrentSessionActive) {
            countdownEl.textContent = '⏳ Aktif sekarang';
        } else if (isSessionUpcoming) {
            countdownEl.textContent = `⏳ Mulai ${formatTime(sessionStartTime - wibTime)}`;
        } else {
            const nextDay = new Date(wibTime);
            nextDay.setUTCDate(nextDay.getUTCDate() + 1);
            nextDay.setUTCHours(startHour, 0, 0, 0);
            countdownEl.textContent = `⏳ Besok ${formatTime(nextDay - wibTime)}`;
        }
    });
}

/**
 * Setup event listeners untuk tombol klaim misi harian dan referral.
 */
function setupClaimListeners() {
    missionSlots.forEach(slot => {
        const claimBtn = slot.querySelector('.btn-claim');
        safeAddEvent(claimBtn, 'click', async (e) => {
            e.preventDefault();
            if (!user || claimBtn.disabled) return;

            const missionId = slot.dataset.mission;
            const wibTime = getWIBTime();
            const todayDateString = wibTime.toISOString().slice(0, 10);
            const userRef = doc(db, 'users', user.uid);

            let currentMissionStatus = userData.missionSessionStatus || {};
            let sessionStatusForToday = currentMissionStatus[missionId]?.[todayDateString];

            // Arahkan ke section-missions setiap kali tombol diklik jika tujuannya "mengerjakan/melanjutkan"
            if (claimBtn.textContent === 'Kerjakan Misi' || claimBtn.textContent === 'Lanjutkan Misi') {
                const missionsSection = document.getElementById('section-missions');
                if (missionsSection) {
                    // Hanya scroll jika section-missions belum active
                    if (!missionsSection.classList.contains('active')) {
                        missionsSection.scrollIntoView({ behavior: 'smooth' });
                    }

                    // Aktifkan tab Misi Harian di sidebar (pastikan aktif jika belum)
                    navLinks.forEach(l => l.classList.remove('active'));
                    const missionNavLink = navLinks.find(link => link.getAttribute('data-section') === 'missions');
                    if(missionNavLink) missionNavLink.classList.add('active');
                    document.querySelector('.page-title').textContent = '🎯 Misi Harian';
                    if (window.innerWidth <= 900) closeSidebar();
                }

                // Tandai misi sebagai 'in_progress' jika belum 'completed' atau 'claimed'
                if (!sessionStatusForToday || (sessionStatusForToday.status !== 'completed' && sessionStatusForToday.status !== 'claimed')) {
                    const pointsEarned = 100; // Asumsi poin yang didapat dari mengerjakan misi
                    currentMissionStatus = {
                        ...currentMissionStatus,
                        [missionId]: {
                            ...(currentMissionStatus[missionId] || {}),
                            [todayDateString]: {
                                status: 'in_progress', // Status baru
                                points: pointsEarned,
                                timestamp: new Date().toISOString()
                            }
                        }
                    };

                    await updateDoc(userRef, {
                        missionSessionStatus: currentMissionStatus,
                        recentActivity: arrayUnion(`Memulai misi ${missionId} - ${new Date().toLocaleString('id-ID')}`).slice(-5)
                    });
                    userData.missionSessionStatus = currentMissionStatus; // Update local data
                    showGamePopup('Misi dimulai!');
                    showFloatingPoints(claimBtn, 0, 'Misi Dimulai!');
                }
            }
            // Jika tombol bertuliskan "Klaim X Poin"
            else if (claimBtn.textContent.startsWith('Klaim') && (sessionStatusForToday?.status === 'completed' || sessionStatusForToday?.status === 'in_progress')) {
                const pointsToClaim = sessionStatusForToday.points;

                // Klaim poin
                await updateDoc(userRef, {
                    points: (userData.points || 0) + pointsToClaim,
                    convertedPoints: (userData.convertedPoints || 0) + pointsToClaim,
                    missionSessionStatus: {
                        ...currentMissionStatus,
                        [missionId]: {
                            ...(currentMissionStatus[missionId] || {}),
                            [todayDateString]: {
                                ...sessionStatusForToday,
                                status: 'claimed',
                                claimTimestamp: new Date().toISOString()
                            }
                        }
                    },
                    recentActivity: arrayUnion(`Klaim ${pointsToClaim} poin dari sesi ${missionId} - ${new Date().toLocaleString('id-ID')}`).slice(-5)
                });

                userData.points = (userData.points || 0) + pointsToClaim;
                userData.convertedPoints = (userData.convertedPoints || 0) + pointsToClaim;
                userData.missionSessionStatus[missionId][todayDateString].status = 'claimed';
                userData.missionSessionStatus[missionId][todayDateString].claimTimestamp = new Date().toISOString();

                await loadUserData();
                await loadLeaderboard();
                showGamePopup(`Berhasil klaim ${pointsToClaim} poin!`);
                showFloatingPoints(claimBtn, pointsToClaim);
                if (window.confetti) confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: {
                        y: 0.6
                    }
                });
            }
        });
    });

    // Listener untuk tombol klaim referral (tetap seperti semula)
    document.querySelectorAll('.referral-slot .btn-claim').forEach(button => {
        button.addEventListener('click', async () => {
            if (!user || button.disabled) return;

            const mission = button.getAttribute('data-mission');
            const userRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const missionsCompleted = data.missionsCompleted || {};
                if (missionsCompleted[mission]?.includes(new Date().toDateString())) {
                    showGamePopup('Misi referral sudah diklaim hari ini!');
                    return;
                }

                const points = 100; // Poin untuk klaim referral
                await updateDoc(userRef, {
                    points: (data.points || 0) + points,
                    missionsCompleted: {
                        ...missionsCompleted,
                        [mission]: [...(missionsCompleted[mission] || []), new Date().toDateString()]
                    },
                    recentActivity: arrayUnion(`Klaim ${mission} - ${new Date().toLocaleString('id-ID')}`).slice(-5)
                });
                await loadUserData();
                await loadLeaderboard();
                showGamePopup(`Berhasil klaim ${points} poin dari referral!`);
                showFloatingPoints(button, points);
                if (window.confetti) confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: {
                        y: 0.6
                    }
                });
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
            if (data.referrals?.length >= 1) { // Hanya contoh, logika pengecekan 7 hari aktif perlu ditambahkan
                const bonus = 50000;
                await updateDoc(userRef, {
                    points: (data.points || 0) + bonus,
                    recentActivity: arrayUnion(`Bonus referral 50.000 poin - ${new Date().toLocaleString('id-ID')}`).slice(-5)
                });
                await loadUserData();
                await loadLeaderboard();
                showGamePopup(`Berhasil klaim bonus ${bonus} poin!`);
                showFloatingPoints(checkProgressBtn, bonus);
                if (window.confetti) confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: {
                        y: 0.6
                    }
                });
            } else {
                showGamePopup('Belum ada referral aktif 7 hari!');
            }
            // checkProgressBtn.disabled = true;
        }
    });
}

/**
 * Memulai proses konversi poin setiap hari pukul 00:00 WIB.
 * Poin yang dikonversi langsung masuk ke convertedPoints.
 */
function startPointConversion() {
    const wibTime = getWIBTime();
    const nextConversion = new Date(wibTime);
    nextConversion.setHours(0, 0, 0, 0); // Jam 00:00 WIB
    if (wibTime >= nextConversion) { // Jika sudah melewati 00:00 hari ini, set untuk besok
        nextConversion.setDate(nextConversion.getDate() + 1);
    }

    const timeUntilNext = nextConversion.getTime() - wibTime.getTime();

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
                await loadLeaderboard();
                showGamePopup(`Konversi ${convertiblePoints} poin berhasil!`);
            }
        }
        startPointConversion();
    }, timeUntilNext + 1000);
}

// Initialize
setInitialSidebarState();
// setupMissionSessionUI dan setupClaimListeners akan dipanggil setelah onAuthStateChanged
