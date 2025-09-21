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
const claimButtons = document.querySelectorAll('.btn-claim'); // Tetap digunakan untuk mission slots dan referral
const totalTemanLink = document.getElementById('total-teman-link');
const infoIcon = document.querySelector('.info-icon');
const leaderboardList = document.getElementById('leaderboard-list');

// MISSION SLOTS DOM Elements (new)
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
    for (const doc of snapshot.docs) { // Menggunakan for...of untuk async loop
        if (doc.id === uid) break; // Keluar jika user ditemukan
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
    const currentHourWIB = wibTime.getHours();
    const todayDateString = wibTime.toISOString().slice(0, 10); // Format YYYY-MM-DD

    missionSlots.forEach(slot => {
        const missionId = slot.dataset.mission;
        const startHour = parseInt(slot.dataset.start.split(':')[0]);
        const endHour = parseInt(slot.dataset.end.split(':')[0]);
        const countdownEl = slot.querySelector('.countdown');
        const claimBtn = slot.querySelector('.btn-claim');

        // Pastikan claimBtn ada sebelum melanjutkan
        if (!claimBtn) return;

        // Mendapatkan status misi dari userData.missionSessionStatus
        // missionSessionStatus: { "pagi1": { "YYYY-MM-DD": { status: "completed" | "claimed" | "failed", points: 100 } } }
        const sessionStatusToday = userData.missionSessionStatus?.[missionId]?.[todayDateString];
        const isCompleted = sessionStatusToday && sessionStatusToday.status === 'completed';
        const isClaimed = sessionStatusToday && sessionStatusToday.status === 'claimed';
        const isFailed = sessionStatusToday && sessionStatusToday.status === 'failed';
        const earnedPoints = sessionStatusToday?.points || 0; // Poin yang didapat dari sesi ini

        let sessionStartTime = new Date(wibTime);
        sessionStartTime.setHours(startHour, 0, 0, 0);

        let sessionEndTime = new Date(wibTime);
        sessionEndTime.setHours(endHour, 59, 59, 999);

        // Jika waktu berakhir < waktu mulai, berarti sesi melewati tengah malam
        if (sessionEndTime.getTime() < sessionStartTime.getTime()) {
            sessionEndTime.setDate(sessionEndTime.getDate() + 1);
        }

        const isCurrentSessionActive = wibTime >= sessionStartTime && wibTime <= sessionEndTime;
        const isSessionUpcoming = wibTime < sessionStartTime;
        const isSessionPassed = wibTime > sessionEndTime;

        // --- Perbarui UI berdasarkan status sesi ---

        // 1. Jika sudah diklaim
        if (isClaimed) {
            claimBtn.textContent = `Misi Selesai`;
            claimBtn.disabled = true;
            claimBtn.classList.remove('active-mission');
            countdownEl.textContent = '✅ Diklaim';
            return; // Lewati logika lain
        }

        // 2. Jika sesi sudah berakhir dan belum diklaim (atau tidak dikerjakan)
        if (isSessionPassed && !isClaimed) {
             // Set status gagal jika belum ada status atau belum diklaim
            if (!sessionStatusToday || sessionStatusToday.status !== 'completed') {
                claimBtn.textContent = 'Misi Gagal';
                countdownEl.textContent = '❌ Terlewat';
            } else if (isCompleted) {
                 // Jika misi selesai tapi belum diklaim setelah sesi berakhir
                 claimBtn.textContent = `Klaim ${earnedPoints} Poin`;
                 countdownEl.textContent = '⏳ Sesi Berakhir';
                 claimBtn.disabled = false; // Biarkan bisa diklaim
            }
            claimBtn.disabled = true; // Nonaktifkan tombol untuk Sesi Gagal
            claimBtn.classList.remove('active-mission');
            return; // Lewati logika lain
        }

        // 3. Sesi aktif
        if (isCurrentSessionActive) {
            claimBtn.disabled = false;
            claimBtn.classList.add('active-mission'); // Menandai sesi aktif (bisa tambahkan styling di CSS)
            // Cek apakah sudah "dikerjakan" (asumsi: saat tombol diklik pertama kali)
            if (isCompleted) {
                claimBtn.textContent = `Klaim ${earnedPoints} Poin`;
            } else {
                claimBtn.textContent = 'Kerjakan Misi';
            }
            countdownEl.textContent = `⏳ Selesai ${formatTime(sessionEndTime - wibTime)}`;
        }
        // 4. Sesi akan datang
        else if (isSessionUpcoming) {
            claimBtn.textContent = 'Kerjakan Misi';
            claimBtn.disabled = true;
            claimBtn.classList.remove('active-mission');
            countdownEl.textContent = `⏳ Mulai ${formatTime(sessionStartTime - wibTime)}`;
        }
    });

    // Jalankan setupCountdowns() asli untuk referral slots (jika masih menggunakan logic yang sama)
    setupReferralCountdowns();
}

// Fungsi terpisah untuk countdown referral agar tidak bentrok
function setupReferralCountdowns() {
    const wibTime = getWIBTime();
    const currentHourWIB = wibTime.getHours();

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
        } else { // isSessionPassed
            // Untuk referral, mungkin kita hanya perlu menunjukkan 'Terlewat' atau 'Besok'
            const nextDay = new Date(wibTime);
            nextDay.setUTCDate(nextDay.getUTCDate() + 1); // Pindah ke hari berikutnya
            nextDay.setUTCHours(startHour, 0, 0, 0); // Set jam mulai sesi untuk hari berikutnya
            countdownEl.textContent = `⏳ Besok ${formatTime(nextDay - wibTime)}`;
        }
    });
}


/**
 * Setup event listeners untuk tombol klaim misi harian dan referral.
 * Akan dimodifikasi untuk menangani logika "Kerjakan Misi" -> "Klaim Poin".
 */
function setupClaimListeners() {
    // Listener untuk misi harian (mission-slot)
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

            // Jika tombol bertuliskan "Kerjakan Misi"
            if (claimBtn.textContent === 'Kerjakan Misi') {
                // Simulasikan misi "dikerjakan"
                const pointsEarned = 100; // Asumsi poin yang didapat dari mengerjakan misi
                currentMissionStatus = {
                    ...currentMissionStatus,
                    [missionId]: {
                        ...(currentMissionStatus[missionId] || {}),
                        [todayDateString]: {
                            status: 'completed',
                            points: pointsEarned,
                            timestamp: new Date().toISOString()
                        }
                    }
                };

                await updateDoc(userRef, {
                    missionSessionStatus: currentMissionStatus,
                    recentActivity: arrayUnion(`Mengerjakan misi ${missionId} - ${new Date().toLocaleString('id-ID')}`).slice(-5)
                });

                userData.missionSessionStatus = currentMissionStatus; // Update local data
                showGamePopup('Misi berhasil dikerjakan!');
                showFloatingPoints(claimBtn, 0, 'Misi Dikerjakan!'); // Pesan kustom
                // Setelah dikerjakan, UI akan otomatis update di setupMissionSessionUI
            }
            // Jika tombol bertuliskan "Klaim X Poin"
            else if (claimBtn.textContent.startsWith('Klaim') && sessionStatusForToday?.status === 'completed') {
                const pointsToClaim = sessionStatusForToday.points;

                // Klaim poin
                await updateDoc(userRef, {
                    points: (userData.points || 0) + pointsToClaim,
                    convertedPoints: (userData.convertedPoints || 0) + pointsToClaim, // Konversi langsung
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

                // Update local data
                userData.points = (userData.points || 0) + pointsToClaim;
                userData.convertedPoints = (userData.convertedPoints || 0) + pointsToClaim;
                userData.missionSessionStatus[missionId][todayDateString].status = 'claimed';
                userData.missionSessionStatus[missionId][todayDateString].claimTimestamp = new Date().toISOString();

                await loadUserData(); // Perbarui tampilan saldo poin
                await loadLeaderboard(); // Perbarui leaderboard
                showGamePopup(`Berhasil klaim ${pointsToClaim} poin!`);
                showFloatingPoints(claimBtn, pointsToClaim);
                if (window.confetti) confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: {
                        y: 0.6
                    }
                });
                // UI akan otomatis update di setupMissionSessionUI menjadi "Misi Selesai"
            }

            // Scroll ke section-missions setelah tombol aktif diklik
            if (claimBtn.textContent === 'Kerjakan Misi' && !claimBtn.disabled) {
                const missionsSection = document.getElementById('section-missions');
                if (missionsSection) {
                    missionsSection.scrollIntoView({ behavior: 'smooth' });
                    // Aktifkan tab Misi Harian di sidebar
                    navLinks.forEach(l => l.classList.remove('active'));
                    const missionNavLink = navLinks.find(link => link.getAttribute('data-section') === 'missions');
                    if(missionNavLink) missionNavLink.classList.add('active');
                    document.querySelector('.page-title').textContent = '🎯 Misi Harian';
                    if (window.innerWidth <= 900) closeSidebar();
                }
            }
        });
    });

    // Listener untuk tombol klaim referral (tetap seperti semula)
    document.querySelectorAll('.referral-slot .btn-claim').forEach(button => {
        button.addEventListener('click', async () => {
            if (!user || button.disabled) return; // Nonaktifkan tombol untuk referral slots jika sedang dalam proses atau user belum login

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
                button.disabled = true; // Disable tombol setelah klaim
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
            // checkProgressBtn.disabled = true; // Mengaktifkan kembali tombol setelah pengecekan
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

    const timeUntilNext = nextConversion.getTime() - wibTime.getTime(); // Hitung selisih dalam ms

    setTimeout(async () => {
        if (!user) return;
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const dailyConverted = data.dailyConverted || 0;
            // Batasi konversi harian hingga 100.000 poin
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
        // Atur ulang timer untuk konversi hari berikutnya
        startPointConversion();
    }, timeUntilNext + 1000); // Tambah sedikit waktu untuk memastikan sudah lewat 00:00
}

// Initialize
setInitialSidebarState();
// setupMissionSessionUI dan setupClaimListeners akan dipanggil setelah onAuthStateChanged
