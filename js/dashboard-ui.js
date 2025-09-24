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
    limit,
    setDoc // Tambah untuk pesan
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

// MISSION SLOTS DOM Elements
const missionSlots = document.querySelectorAll('.mission-slot');

// Tambah DOM untuk pesan
const messageIcon = document.createElement('div'); // Ikon pesan baru
messageIcon.className = 'btn-icon message-icon';
messageIcon.innerHTML = '💬'; // Ikon pesan
const topbarRight = document.querySelector('.topbar-right');
if (topbarRight) {
    topbarRight.insertBefore(messageIcon, document.querySelector('.notif-icon')); // Sisip di samping lonceng
}

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
    resizeTimer = setTimeout(setInitialSidebarState, 100);
});

// Tambah fungsi untuk kirim pesan satu arah
async function sendMessageToReferral(referredUid, messageText) {
    if (!user) return;
    const messageRef = doc(collection(db, `users/${referredUid}/messages`));
    await setDoc(messageRef, {
        fromUid: user.uid,
        text: messageText,
        timestamp: serverTimestamp()
    });
    showGamePopup('Pesan terkirim!');
}

// Tambah listener untuk ikon pesan (misalnya, prompt input pesan ke referral tertentu)
safeAddEvent(messageIcon, 'click', () => {
    // Contoh sederhana: Prompt untuk referredUid dan text
    const referredUid = prompt('Masukkan UID referral:');
    const messageText = prompt('Pesan motivasi:');
    if (referredUid && messageText) {
        sendMessageToReferral(referredUid, messageText);
    }
});

// Fungsi loadUserData (asumsi ada dari kode asli, diperbarui)
async function loadUserData() {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        userName.textContent = data.name || 'Tamu';
        userEmail.textContent = data.email || '-';
        pointsBalance.textContent = data.points || 0;
        pointsRupiah.textContent = `Rp${convertPointsToRupiah(data.points || 0).toLocaleString('id-ID')}`;
        refCount.textContent = data.referrals?.length || 0;
        recentActivity.innerHTML = data.recentActivity?.map(act => `<li>${act}</li>`).join('') || '<li>Tidak ada aktivitas.</li>';
        // Update lain sesuai kebutuhan
    }
}

// Fungsi loadLeaderboard (asumsi dari kode asli)
async function loadLeaderboard() {
    const q = query(collection(db, 'users'), orderBy('points', 'desc'), limit(10));
    const querySnapshot = await getDocs(q);
    leaderboardList.innerHTML = querySnapshot.docs.map((doc, index) => {
        const data = doc.data();
        return `<tr><td>${index + 1}</td><td>${data.name}</td><td>${data.points}</td></tr>`;
    }).join('');
}

// Fungsi setupMissionSessionUI (asumsi dari kode asli, diperbarui dengan track misi)
function setupMissionSessionUI() {
    // Logika slot waktu, dll.
}

// Fungsi setupClaimListeners (diperbarui)
function setupClaimListeners() {
    missionSlots.forEach(slot => {
        const button = slot.querySelector('.btn-claim');
        const timer = slot.querySelector('.timer');
        const mission = button.getAttribute('data-mission');
        const [startStr, endStr] = mission.split(' - ')[1].split(' s/d ');
        const startTime = parseTimeToday(startStr);
        const endTime = parseTimeToday(endStr);

        const updateTimer = () => {
            const now = getWIBTime();
            let msLeft;
            if (now < startTime) {
                msLeft = startTime - now;
                timer.textContent = `Mulai dalam ${formatTime(msLeft)}`;
                button.disabled = true;
            } else if (now < endTime) {
                msLeft = endTime - now;
                timer.textContent = `Sisa ${formatTime(msLeft)}`;
                button.disabled = false;
            } else {
                timer.textContent = 'Slot berakhir!';
                button.disabled = true;
            }
        };

        updateTimer();
        setInterval(updateTimer, 1000);

        button.addEventListener('click', async () => {
            if (!user || button.disabled) return;
            const userRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const missionsCompleted = data.missionsCompleted || {};
                if (missionsCompleted[mission]?.includes(new Date().toDateString())) {
                    showGamePopup('Misi sudah diklaim hari ini!');
                    return;
                }

                const points = 100; // Contoh poin
                await updateDoc(userRef, {
                    points: (data.points || 0) + points,
                    missionsCompleted: {
                        ...missionsCompleted,
                        [mission]: [...(missionsCompleted[mission] || []), new Date().toDateString()]
                    },
                    recentActivity: arrayUnion(`Klaim ${mission} - ${new Date().toLocaleString('id-ID')}`).slice(-5),
                    completedMissionsCount: (data.completedMissionsCount || 0) + 1 // Track misi selesai
                });

                // Jika user adalah referral, update pending di referrer
                if (data.referredByUid) {
                    const pendingRef = doc(db, `users/${data.referredByUid}/pendingReferrals`, user.uid);
                    const pendingSnap = await getDoc(pendingRef);
                    if (pendingSnap.exists()) {
                        const pendingData = pendingSnap.data();
                        await updateDoc(pendingRef, {
                            completedMissions: (pendingData.completedMissions || 0) + 1
                        });
                    }
                }

                await loadUserData();
                await loadLeaderboard();
                showGamePopup(`Berhasil klaim ${points} poin!`);
                showFloatingPoints(button, points);
                if (window.confetti) confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
                button.disabled = true;
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
                    origin: { y: 0.6 }
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
            const pendingQuery = query(collection(db, `users/${user.uid}/pendingReferrals`));
            const pendings = await getDocs(pendingQuery);
            let allCompleted = true;
            pendings.forEach(pendingDoc => {
                const pendingData = pendingDoc.data();
                if (pendingData.loginDaysCount < 7 || pendingData.completedMissions < 5) { // Asumsi 5 misi penuh per hari, sesuaikan
                    allCompleted = false;
                }
            });
            if (allCompleted && pendings.size > 0) {
                checkProgressBtn.textContent = 'Klaim 50.000 Poin';
                checkProgressBtn.onclick = async () => {
                    const bonus = 50000;
                    await updateDoc(userRef, {
                        points: (data.points || 0) + bonus,
                        recentActivity: arrayUnion(`Bonus referral 50.000 poin - ${new Date().toLocaleString('id-ID')}`).slice(-5)
                    });
                    pendings.forEach(async (pendingDoc) => {
                        await updateDoc(pendingDoc.ref, { isCompleted: true, isClaimed: true });
                    });
                    showGamePopup(`Berhasil klaim bonus ${bonus} poin!`);
                    showFloatingPoints(checkProgressBtn, bonus);
                    if (window.confetti) confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 }
                    });
                };
            } else {
                showGamePopup('Belum ada referral aktif 7 hari!');
            }
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
let user = null;
onAuthStateChanged(auth, (currentUser) => {
    user = currentUser;
    if (user) {
        loadUserData();
        loadLeaderboard();
        setupMissionSessionUI();
        setupClaimListeners();
        startPointConversion();
    } else {
        window.location.href = 'login.html';
    }
});

// Listener logout, dll. (asumsi ada dari kode asli)
safeAddEvent(logoutBtn, 'click', () => signOut(auth));
