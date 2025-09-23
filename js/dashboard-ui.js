// dashboard-ui.js

import { auth, db } from './firebase-config.js';
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    getDocs,
    where,
    runTransaction,
    serverTimestamp,
    arrayUnion,
    orderBy,
    limit,
    Timestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// === Variabel Global ===
let user = null;
let userData = null;
let dailyMissions = {};
let dailyReferralMissions = {};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const POINT_CONVERSION_RATE = 5000; // 5000 Poin = Rp1

// === Element UI ===
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const profileToggle = document.getElementById('profile');
const profileMenu = document.getElementById('profile-menu');
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.section');
const pageTitle = document.querySelector('.page-title');

// Dashboard UI
const userNameEl = document.getElementById("user-name");
const userEmailEl = document.getElementById("user-email");
const userPhotoEl = document.getElementById("user-photo");
const pointsBalanceEl = document.getElementById('points-balance');
const pointsRupiahEl = document.getElementById('points-rupiah');
const refCountEl = document.getElementById('ref-count');
const recentActivityEl = document.getElementById('recent-activity');
const copyRefBtn = document.getElementById('btn-copy-ref');
const notifCountEl = document.getElementById('notif-count');
const notifPopup = document.getElementById('notif-popup');

// Missions UI
const missionSlots = document.querySelectorAll('.mission-slot');
const claimMissionBtns = document.querySelectorAll('.mission-slot .btn-claim');

// Referral UI
const referralSlots = document.querySelectorAll('.referral-slot');
const claimRefBtns = document.querySelectorAll('.referral-slot .btn-claim');
const totalBonusPercentageEl = document.getElementById('total-bonus-percentage');
const checkProgressBtn = document.getElementById('check-progress-btn');

// Leaderboard UI
const leaderboardListEl = document.getElementById('leaderboard-list');

// === Fungsi Utama ===

onAuthStateChanged(auth, async (currentUser) => {
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    user = currentUser;
    await loadUserData();
    setupUI();
    loadLeaderboard();
    setupListeners();
    // Panggil fungsi untuk memeriksa notifikasi saat load
    checkAndDisplayNotifications();
    
    // Perbarui UI misi setiap detik
    setInterval(updateMissionUI, 1000);
});

async function loadUserData() {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    try {
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            userData = docSnap.data();
            updateDashboardUI();
            resetDailyPointsIfNewDay();
            await checkPendingReferrals();
        } else {
            console.error('Dokumen pengguna tidak ditemukan!');
            alert('Data pengguna tidak ditemukan. Silakan login ulang.');
            await signOut(auth);
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error("Error loading user data:", error);
        alert('Gagal memuat data pengguna. Cek koneksi.');
    }
}

async function updateDashboardUI() {
    if (!userData) return;
    userNameEl.textContent = userData.name || 'Pengguna';
    userEmailEl.textContent = userData.email || '-';
    userPhotoEl.src = userData.photo || 'assets/icons/user-placeholder.png';
    pointsBalanceEl.textContent = userData.points?.toLocaleString('id-ID') || '0';
    pointsRupiahEl.textContent = `Rp${(userData.points / POINT_CONVERSION_RATE).toLocaleString('id-ID')}`;
    refCountEl.textContent = userData.referrals?.length || 0;
    updateRecentActivityUI();
}

function updateRecentActivityUI() {
    if (!userData || !recentActivityEl) return;

    if (userData.recentActivity && userData.recentActivity.length > 0) {
        recentActivityEl.innerHTML = '';
        const activities = userData.recentActivity.slice(-5).reverse(); // Ambil 5 terakhir, urut dari terbaru
        activities.forEach(activity => {
            const li = document.createElement('li');
            li.textContent = activity;
            recentActivityEl.appendChild(li);
        });
    } else {
        recentActivityEl.innerHTML = '<li>Tidak ada aktivitas.</li>';
    }
}

async function resetDailyPointsIfNewDay() {
    const lastLoginTimestamp = userData.lastLogin;
    if (lastLoginTimestamp) {
        const lastLoginDate = new Date(lastLoginTimestamp.toDate());
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (lastLoginDate < today) {
            try {
                await updateDoc(doc(db, 'users', user.uid), {
                    dailyConverted: 0
                });
                console.log("dailyConverted berhasil di-reset.");
            } catch (error) {
                console.error("Gagal reset dailyConverted:", error);
            }
        }
    }
}

// === Fungsi Misi Harian ===

function updateMissionUI() {
    const now = new Date();
    const currentHour = now.getHours();

    missionSlots.forEach(slot => {
        const startHour = parseInt(slot.dataset.start.split(':')[0], 10);
        const endHour = parseInt(slot.dataset.end.split(':')[0], 10);
        const missionId = slot.dataset.mission;
        const countdownEl = document.getElementById(`countdown-${missionId}`);
        const claimBtn = slot.querySelector('.btn-claim');

        // Reset status misi jika sudah hari baru
        const lastMissionTime = userData.missionSessionStatus[missionId]?.timestamp;
        if (lastMissionTime && (now.getTime() - lastMissionTime.toDate().getTime() > MS_PER_DAY)) {
            dailyMissions[missionId] = null;
        }

        const missionStatus = dailyMissions[missionId];

        if (currentHour >= startHour && currentHour < endHour) {
            // Misi aktif
            slot.classList.add('active');
            slot.classList.remove('completed');
            
            const endTime = new Date(now);
            endTime.setHours(endHour, 59, 59, 999);
            const timeLeft = endTime - now;
            const minutesLeft = Math.floor(timeLeft / (1000 * 60));
            const secondsLeft = Math.floor((timeLeft % (1000 * 60)) / 1000);

            if (missionStatus === 'in-progress') {
                countdownEl.textContent = `Sesi berjalan: ${minutesLeft}m ${secondsLeft}s`;
                claimBtn.textContent = 'Misi Sedang Berjalan';
                claimBtn.disabled = true;
            } else if (missionStatus === 'completed') {
                countdownEl.textContent = 'Misi selesai!';
                claimBtn.textContent = 'Selesai';
                claimBtn.disabled = true;
                slot.classList.remove('active');
                slot.classList.add('completed');
            } else {
                countdownEl.textContent = `Waktu tersisa: ${minutesLeft}m ${secondsLeft}s`;
                claimBtn.textContent = 'Kerjakan Misi';
                claimBtn.disabled = false;
            }

        } else {
            // Misi tidak aktif
            slot.classList.remove('active');
            claimBtn.disabled = true;
            countdownEl.textContent = '⏳ ...';
        }
    });
}

function setupMissionListeners() {
    claimMissionBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const missionId = btn.dataset.mission;
            if (dailyMissions[missionId] === 'completed') {
                return;
            }
            // Logic untuk memulai misi, misalnya arahkan ke halaman lain
            alert(`Memulai misi ${missionId}. Kembali setelah selesai untuk klaim poin.`);
            
            dailyMissions[missionId] = 'in-progress';
            // Simpan ke Firestore
            await updateDoc(doc(db, 'users', user.uid), {
                [`missionSessionStatus.${missionId}`]: {
                    status: 'in-progress',
                    timestamp: serverTimestamp()
                }
            });
            updateMissionUI();
        });
    });
}

// Fungsi untuk mengklaim poin misi harian
async function claimMissionPoints(missionId) {
    if (dailyMissions[missionId] === 'completed') return;

    try {
        await runTransaction(db, async (transaction) => {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await transaction.get(userRef);
            const currentPoints = userSnap.data().points || 0;
            const newPoints = currentPoints + 1000;

            transaction.update(userRef, {
                points: newPoints,
                [`missionSessionStatus.${missionId}.status`]: 'completed'
            });

            // Tambahkan aktivitas ke Firestore
            transaction.update(userRef, {
                recentActivity: arrayUnion(`Mengklaim poin dari misi harian: ${missionId}. (+1000 Poin)`)
            });
        });
        dailyMissions[missionId] = 'completed';
        updateMissionUI();
        alert('Misi selesai! Anda mendapatkan 1000 poin.');
        loadUserData(); // Muat ulang data untuk update UI
    } catch (error) {
        console.error("Gagal klaim misi:", error);
        alert("Gagal mengklaim poin. Silakan coba lagi.");
    }
}

// === Fungsi Referral ===

async function checkPendingReferrals() {
    if (!user) return;
    const pendingRef = collection(db, `users/${user.uid}/pendingReferrals`);
    const q = query(pendingRef, where('isCompleted', '==', true), where('isClaimed', '==', false));
    const pendingSnapshot = await getDocs(q);

    if (!pendingSnapshot.empty) {
        notifCountEl.textContent = pendingSnapshot.size;
        notifCountEl.style.display = 'block';
    } else {
        notifCountEl.textContent = '0';
        notifCountEl.style.display = 'none';
    }
}

function checkAndDisplayNotifications() {
    // Tampilkan notifikasi jika ada
    if (notifCountEl.textContent > 0) {
        alert(`Anda memiliki ${notifCountEl.textContent} bonus referral yang bisa diklaim!`);
    }
}

async function claimReferralRewards() {
    if (!user) return;
    try {
        await runTransaction(db, async (transaction) => {
            const pendingRef = collection(db, `users/${user.uid}/pendingReferrals`);
            const q = query(pendingRef, where('isCompleted', '==', true), where('isClaimed', '==', false));
            const pendingSnapshot = await getDocs(q);

            if (pendingSnapshot.empty) {
                throw new Error("Tidak ada referral yang bisa diklaim.");
            }

            let totalReward = 0;
            const updates = [];
            pendingSnapshot.forEach(docSnap => {
                totalReward += 50000;
                updates.push(updateDoc(docSnap.ref, {
                    isClaimed: true,
                    claimedAt: serverTimestamp()
                }));
            });
            await Promise.all(updates);
            
            const userRef = doc(db, 'users', user.uid);
            const docSnap = await transaction.get(userRef);
            const currentPoints = docSnap.data().points || 0;
            transaction.update(userRef, {
                points: currentPoints + totalReward,
                referrals: arrayUnion(...pendingSnapshot.docs.map(doc => doc.id))
            });
        });
        alert('Hadiah referral berhasil diklaim!');
        loadUserData();
    } catch (error) {
        console.error("Error claiming rewards:", error);
        alert(`Gagal mengklaim hadiah: ${error.message}`);
    }
}

function setupReferralListeners() {
    if (copyRefBtn) {
        copyRefBtn.addEventListener('click', async () => {
            if (!userData || !userData.referralCode) {
                alert('Kode referral belum tersedia.');
                return;
            }
            const referralLink = `${window.location.origin}?ref=${userData.referralCode}`;
            try {
                await navigator.clipboard.writeText(referralLink);
                alert('Tautan referral berhasil disalin!');
            } catch (err) {
                console.error('Gagal menyalin tautan:', err);
                alert('Gagal menyalin tautan. Silakan coba lagi.');
            }
        });
    }

    // Logic untuk klaim bonus pasif referral
    claimRefBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const missionId = btn.dataset.mission;
            // Logic untuk klaim bonus, misal 2% dari poin referral
            alert(`Bonus pasif ${missionId} berhasil diklaim!`);
            // Implementasi Firebase untuk klaim bonus pasif
        });
    });
}

// === Fungsi Papan Peringkat ===

async function loadLeaderboard() {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy('convertedPoints', 'desc'), limit(5));
        const querySnapshot = await getDocs(q);

        const usersData = querySnapshot.docs.map(doc => doc.data());
        if (leaderboardListEl) leaderboardListEl.innerHTML = '';
        usersData.forEach((user, index) => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<span>${index + 1}</span><span>${user.name}</span><span>${user.convertedPoints} Poin</span>`;
            leaderboardListEl.appendChild(listItem);
        });
    } catch (error) {
        console.error("Error loading leaderboard:", error);
    }
}

// === Fungsi Navigasi & UI ===

function setupUI() {
    // Sidebar & Menu Toggle
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('closed');
        sidebarOverlay.classList.toggle('active');
    });

    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.add('closed');
        sidebarOverlay.classList.remove('active');
    });

    // Profile Menu Toggle
    profileToggle.addEventListener('click', () => {
        profileMenu.classList.toggle('active');
    });

    // Sembunyikan menu profil saat klik di luar
    document.addEventListener('click', (event) => {
        if (!profileToggle.contains(event.target) && !profileMenu.contains(event.target)) {
            profileMenu.classList.remove('active');
        }
    });

    // Navigasi
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = e.target.dataset.section;
            
            navLinks.forEach(nav => nav.classList.remove('active'));
            e.target.classList.add('active');

            sections.forEach(section => {
                section.classList.remove('active');
            });

            document.getElementById(`section-${sectionId}`).classList.add('active');

            // Perbarui judul halaman
            pageTitle.textContent = e.target.textContent;
            
            // Tutup sidebar di mobile setelah navigasi
            if (window.innerWidth <= 768) {
                sidebar.classList.add('closed');
                sidebarOverlay.classList.remove('active');
            }
        });
    });
}

function setupListeners() {
    // Tombol Logout
    const logoutBtn = document.getElementById('logout-btn-2');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await signOut(auth);
            window.location.href = 'index.html';
        });
    }

    setupMissionListeners();
    setupReferralListeners();
}
