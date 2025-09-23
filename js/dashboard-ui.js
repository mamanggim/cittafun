// dashboard-ui.js

// Bagian 1: Inisialisasi dan Variabel UI
const dashboardMenu = document.querySelector('.dashboard-menu');
const mainContent = document.querySelector('.main-content');
const menuIcon = document.getElementById('menu-icon');
const closeIcon = document.getElementById('close-icon');

const dashboardContent = document.getElementById('dashboard-content');
const profileContent = document.getElementById('profile-content');
const pelajaranContent = document.getElementById('pelajaran-content');
const misiContent = document.getElementById('misi-content');
const konversiPoinContent = document.getElementById('konversi-poin-content');
const riwayatAktivitasContent = document.getElementById('riwayat-aktivitas-content');

const dashboardBtn = document.getElementById('dashboard-btn');
const profileBtn = document.getElementById('profile-btn');
const pelajaranBtn = document.getElementById('pelajaran-btn');
const misiBtn = document.getElementById('misi-btn');
const konversiPoinBtn = document.getElementById('konversi-poin-btn');
const riwayatAktivitasBtn = document.getElementById('riwayat-aktivitas-btn');
const logoutBtn = document.getElementById('logout-btn');

// Bagian 2: Logika Firebase
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
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
  limit
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

let user;
let userData;
let dailyMissionCompleted = false;

const userName = document.getElementById("user-name");
const userPointDisplay = document.getElementById("user-point");
const userPhotoDisplay = document.getElementById("user-photo");

const pointInput = document.getElementById('point-input');
const convertBtn = document.getElementById('convert-btn');
const pointConversionResult = document.getElementById('point-conversion-result');
const leaderboardList = document.getElementById('leaderboard-list');
const referralCodeDisplay = document.getElementById('referral-code');
const copyReferralCodeBtn = document.getElementById('copy-referral-code-btn');

const misiHarianBtn = document.getElementById('misi-harian');
const missionCompletionStatusDiv = document.getElementById('mission-completion-status');
const missionPointDisplay = document.getElementById('mission-point');
const rewardClaimBtn = document.getElementById('reward-claim-btn');

onAuthStateChanged(auth, async (currentUser) => {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    user = currentUser;
    await loadUserData();
    await loadLeaderboard();
    setupMissionSessionUI();
    setupClaimListeners();
    startPointConversion();
    setInterval(setupMissionSessionUI, 1000);
});

async function loadUserData() {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    try {
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            userData = docSnap.data();
            if (userName) userName.textContent = userData.name || user.displayName || 'Pengguna';
            if (userPointDisplay) userPointDisplay.textContent = userData.points || 0;
            if (userPhotoDisplay) userPhotoDisplay.src = userData.photo || user.photoURL;
            if (referralCodeDisplay) referralCodeDisplay.textContent = userData.referralCode || 'Tidak Ada';
            updatePointConversionStatus();
            await checkPendingReferrals();
        } else {
            console.error('Dokumen pengguna tidak ditemukan di Firestore!');
            alert('Data pengguna tidak ditemukan. Silakan login ulang.');
            await signOut(auth);
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error("Error loading user data:", error);
        alert('Gagal memuat data pengguna. Cek koneksi dan aturan Firebase.');
        await signOut(auth);
        window.location.href = 'login.html';
    }
}

async function loadLeaderboard() {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy('convertedPoints', 'desc'), limit(5));
        const querySnapshot = await getDocs(q);

        const usersData = querySnapshot.docs.map(doc => doc.data());
        if (leaderboardList) leaderboardList.innerHTML = '';
        usersData.forEach((user, index) => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<span>${index + 1}.</span><span>${user.name}</span><span>${user.convertedPoints} Poin</span>`;
            if (leaderboardList) leaderboardList.appendChild(listItem);
        });
    } catch (error) {
        console.error("Error loading leaderboard:", error);
    }
}

async function checkPendingReferrals() {
    if (!user || !rewardClaimBtn) return;
    const pendingRef = collection(db, `users/${user.uid}/pendingReferrals`);
    const q = query(pendingRef, where('isCompleted', '==', true), where('isClaimed', '==', false));
    const pendingSnapshot = await getDocs(q);
    
    if (!pendingSnapshot.empty) {
        rewardClaimBtn.style.display = 'block';
    } else {
        rewardClaimBtn.style.display = 'none';
    }
}

function updatePointConversionStatus() {
    if (!pointConversionResult || !pointInput || !convertBtn || !userData) return;
    const dailyConverted = userData.dailyConverted || 0;
    pointConversionResult.textContent = `Poin yang dikonversi hari ini: ${dailyConverted}`;
    if (dailyConverted >= 1000) {
        pointInput.disabled = true;
        convertBtn.disabled = true;
        convertBtn.textContent = 'Batas Harian Tercapai';
    } else {
        pointInput.disabled = false;
        convertBtn.disabled = false;
        convertBtn.textContent = 'Konversi';
    }
}

function startPointConversion() {
    if (!convertBtn) return;
    convertBtn.addEventListener('click', async () => {
        const pointsToConvert = parseInt(pointInput.value, 10);
        if (isNaN(pointsToConvert) || pointsToConvert <= 0) {
            alert('Masukkan jumlah poin yang valid.');
            return;
        }

        const userRef = doc(db, 'users', user.uid);
        try {
            await runTransaction(db, async (transaction) => {
                const docSnap = await transaction.get(userRef);
                const currentData = docSnap.data();
                const currentPoints = currentData.points || 0;
                const currentDailyConverted = currentData.dailyConverted || 0;

                if (currentPoints < pointsToConvert) {
                    throw new Error("Poin tidak mencukupi.");
                }

                if (currentDailyConverted + pointsToConvert > 1000) {
                    throw new Error("Batas konversi harian 1000 poin tercapai.");
                }

                const newPoints = currentPoints - pointsToConvert;
                const newConvertedPoints = (currentData.convertedPoints || 0) + pointsToConvert;
                const newDailyConverted = currentDailyConverted + pointsToConvert;

                transaction.update(userRef, {
                    points: newPoints,
                    convertedPoints: newConvertedPoints,
                    dailyConverted: newDailyConverted
                });
            });
            alert('Poin berhasil dikonversi!');
            loadUserData();
            loadLeaderboard();
        } catch (error) {
            console.error("Transaction failed:", error);
            alert(`Konversi gagal: ${error.message}`);
        }
    });
}

function setupMissionSessionUI() {
    if (!missionCompletionStatusDiv || !misiHarianBtn || !userData) return;
    if (dailyMissionCompleted) {
        missionCompletionStatusDiv.textContent = "Misi harian selesai.";
        misiHarianBtn.disabled = true;
        misiHarianBtn.textContent = 'Selesai';
    } else {
        const missionSessionStart = userData?.missionSessionStatus?.startTime;
        if (missionSessionStart) {
            const timeElapsed = Math.floor((Date.now() - missionSessionStart.toDate().getTime()) / 1000);
            const remainingTime = Math.max(0, 60 - timeElapsed);
            if(missionPointDisplay) missionPointDisplay.textContent = `Poin yang akan didapat: 100`;
            missionCompletionStatusDiv.textContent = `Waktu tersisa: ${remainingTime} detik`;
            if (remainingTime === 0) {
                completeDailyMission();
            }
        } else {
            missionCompletionStatusDiv.textContent = "Misi belum dimulai.";
            misiHarianBtn.disabled = false;
            misiHarianBtn.textContent = 'Mulai Misi';
        }
    }
}

function setupClaimListeners() {
    if (misiHarianBtn) misiHarianBtn.addEventListener('click', startDailyMission);
    if (rewardClaimBtn) rewardClaimBtn.addEventListener('click', claimReferralRewards);
    if (copyReferralCodeBtn) {
        copyReferralCodeBtn.addEventListener('click', () => {
            const code = referralCodeDisplay.textContent;
            navigator.clipboard.writeText(code).then(() => {
                alert('Kode referral berhasil disalin!');
            }).catch(err => {
                console.error('Gagal menyalin kode:', err);
            });
        });
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await signOut(auth);
            window.location.href = 'login.html';
        });
    }
}

async function startDailyMission() {
    if (!user || dailyMissionCompleted) return;

    try {
        await updateDoc(doc(db, 'users', user.uid), {
            'missionSessionStatus.startTime': serverTimestamp()
        });
        alert('Misi harian dimulai. Silakan tunggu 60 detik.');
        loadUserData();
    } catch (error) {
        console.error("Error starting mission:", error);
    }
}

async function completeDailyMission() {
    if (!user) return;
    try {
        await runTransaction(db, async (transaction) => {
            const userRef = doc(db, 'users', user.uid);
            const docSnap = await transaction.get(userRef);
            const currentData = docSnap.data();
            const newPoints = (currentData.points || 0) + 100;
            
            transaction.update(userRef, {
                points: newPoints,
                missionSessionStatus: { completedAt: serverTimestamp() }
            });

            dailyMissionCompleted = true;
            
            const referredByUid = currentData.referredByUid;
            if (referredByUid) {
                const pendingRef = doc(db, `users/${referredByUid}/pendingReferrals`, user.uid);
                transaction.update(pendingRef, {
                    isCompleted: true
                });
            }
        });
        alert('Misi harian selesai! Anda mendapat 100 poin.');
        loadUserData();
    } catch (error) {
        console.error("Error completing mission:", error);
        alert("Gagal menyelesaikan misi. Silakan coba lagi.");
    }
}

async function claimReferralRewards() {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);

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
                totalReward += 500;
                updates.push(updateDoc(docSnap.ref, {
                    isClaimed: true,
                    claimedAt: serverTimestamp()
                }));
            });
            await Promise.all(updates);
            
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

// Bagian 3: Fungsi UI yang sudah disesuaikan
function openMenu() {
    if (dashboardMenu && mainContent) {
        dashboardMenu.classList.add('active');
        mainContent.classList.add('menu-open');
    }
}

function closeMenu() {
    if (dashboardMenu && mainContent) {
        dashboardMenu.classList.remove('active');
        mainContent.classList.remove('menu-open');
    }
}

function showContent(contentId) {
    const allContents = document.querySelectorAll('.content-section');
    allContents.forEach(content => {
        content.style.display = 'none';
    });
    const targetContent = document.getElementById(contentId);
    if(targetContent) {
        targetContent.style.display = 'block';
    }
    closeMenu();
}

function setActiveButton(button) {
    const allButtons = document.querySelectorAll('.dashboard-menu button');
    allButtons.forEach(btn => btn.classList.remove('active'));
    if(button) {
        button.classList.add('active');
    }
}

if (menuIcon) menuIcon.addEventListener('click', openMenu);
if (closeIcon) closeIcon.addEventListener('click', closeMenu);

if (dashboardBtn) dashboardBtn.addEventListener('click', () => {
    showContent('dashboard-content');
    setActiveButton(dashboardBtn);
});
if (profileBtn) profileBtn.addEventListener('click', () => {
    showContent('profile-content');
    setActiveButton(profileBtn);
});
if (pelajaranBtn) pelajaranBtn.addEventListener('click', () => {
    showContent('pelajaran-content');
    setActiveButton(pelajaranBtn);
});
if (misiBtn) misiBtn.addEventListener('click', () => {
    showContent('misi-content');
    setActiveButton(misiBtn);
});
if (konversiPoinBtn) konversiPoinBtn.addEventListener('click', () => {
    showContent('konversi-poin-content');
    setActiveButton(konversiPoinBtn);
});
if (riwayatAktivitasBtn) riwayatAktivitasBtn.addEventListener('click', () => {
    showContent('riwayat-aktivitas-content');
    setActiveButton(riwayatAktivitasBtn);
});

showContent('dashboard-content');
if (dashboardBtn) setActiveButton(dashboardBtn);
