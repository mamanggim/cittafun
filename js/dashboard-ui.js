// dashboard-ui.js
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
  serverTimestamp
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
const totalTemanLink = document.getElementById('total-teman-link');
const infoIcon = document.querySelector('.info-icon');
const leaderboardList = document.getElementById('leaderboard-list');
const notifIcon = document.querySelector('.notif-icon');
const msgIcon = document.querySelector('.msg-icon');
const notifBadge = document.getElementById('notif-badge');
const msgBadge = document.getElementById('msg-badge');
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
    floatEl.style.color = points > 0 ? '#22c55e' : '#f87171';
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

function formatTime(ms) {
    if (ms < 0) ms = 0;
    const sec = Math.floor(ms / 1000);
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function convertPointsToRupiah(points) {
    return points * 10;
}

function getWIBTime() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibOffset = 7 * 3600000;
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
    if (!sidebar || !overlay) return;
    sidebar.classList.remove('closed');
    sidebar.classList.add('open');
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
}

function closeSidebar() {
    if (!sidebar || !overlay) return;
    sidebar.classList.remove('open');
    sidebar.classList.add('closed');
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
}

safeAddEvent(sidebarToggle, 'click', (e) => {
    e.preventDefault();
    if (window.innerWidth <= 900) {
        if (sidebar?.classList.contains('open')) {
            closeSidebar();
        } else {
            openSidebar();
        }
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
        if(themeToggle) themeToggle.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark');
        if(themeToggle) themeToggle.textContent = '🌙';
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
    const penarikanLink = navLinks.find(link => link.getAttribute('data-section') === 'penarikan');
    if (penarikanLink) penarikanLink.click();
    showGamePopup('Arahkan ke Penarikan!');
});

safeAddEvent(btnCopyRef, 'click', async () => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
        showGamePopup('Gagal menyalin link, data user tidak ditemukan!');
        return;
    }
    const userData = userSnap.data();
    const referralCode = userData.referralCode;
    const referralLink = `https://cittafun.com/referral?ref=${referralCode}`;
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
    const referralLink = navLinks.find(link => link.getAttribute('data-section') === 'referral');
    if (referralLink) referralLink.click();
    showGamePopup('Arahkan ke Ajak Teman!');
});

safeAddEvent(infoIcon, 'click', () => {
    showGamePopup('Konversi poin otomatis setiap jam 00:00 WIB, maks. 100.000 poin/hari. Tingkatkan limit dengan KYC!');
});

function showNotificationPopup(iconElement, message) {
    document.querySelectorAll('.notification-popup').forEach(el => el.remove());

    const popup = document.createElement('div');
    popup.className = 'notification-popup';
    popup.textContent = message;

    const parent = iconElement.closest('.notif-icon') || iconElement.closest('.msg-icon');
    if (parent) {
        parent.style.position = 'relative';
        parent.appendChild(popup);
        setTimeout(() => popup.classList.add('show'), 10);
        setTimeout(() => {
            popup.classList.remove('show');
            setTimeout(() => popup.remove(), 300);
        }, 3000);
    }
}

if(notifBadge && msgBadge){
    setInterval(() => {
        const notifCount = parseInt(notifBadge.textContent) || 0;
        const msgCount = parseInt(msgBadge.textContent) || 0;

        if (Math.random() > 0.8 && msgIcon) {
            msgBadge.textContent = msgCount + 1;
            showNotificationPopup(msgIcon, 'Ada pesan baru untuk Anda!');
        }

        if (Math.random() > 0.9 && notifIcon) {
            notifBadge.textContent = notifCount + 1;
            showNotificationPopup(notifIcon, 'Klaim bonus misi harianmu!');
        }
    }, 10000);
}


// Game-style Tutorial
function startTutorial() {
    const tutorialSteps = [
        { message: "Selamat datang di Citta Fun! Mari saya tunjukkan caranya.", duration: 3000 },
        { message: "Ini dashboard utama Anda, tempat Anda melihat poin dan misi.", duration: 3000 },
        { message: "Lihat menu di samping? Ini semua fitur yang bisa Anda jelajahi!", duration: 3000, target: '.sidebar-nav' },
        { message: "Ayo kita ke menu 'Misi Harian' untuk memulai petualangan Anda!", duration: 4000, action: () => {
            const missionsLink = navLinks.find(link => link.getAttribute('data-section') === 'missions');
            if (missionsLink) missionsLink.click();
        }},
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
let userData = null;

onAuthStateChanged(auth, async (currentUser) => {
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    user = currentUser;
    await loadUserData();
    await loadLeaderboard();
    setupMissionSessionUI();
    setupClaimListeners();
    startPointConversion();
    setInterval(setupMissionSessionUI, 1000);

    if (localStorage.getItem('tutorial_completed') !== 'true') {
        setTimeout(() => startTutorial(), 2000);
    }
});

async function loadUserData() {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
        userData = docSnap.data();
        if (userName) userName.textContent = userData.name || user.displayName || 'Pengguna';
        if (userEmail) userEmail.textContent = userData.email || user.email || '-';
        if (userPhoto) userPhoto.src = user.photoURL || 'https://via.placeholder.com/50';
        if (pointsBalance) pointsBalance.textContent = userData.points || 0;
        if (pointsRupiah) pointsRupiah.textContent = `Rp${convertPointsToRupiah(userData.convertedPoints || 0).toLocaleString('id-ID')}`;
        if (refCount) refCount.textContent = userData.referrals?.length || 0;
        if (recentActivity) {
            recentActivity.innerHTML = userData.recentActivity?.length ?
                userData.recentActivity.map(act => `<li>${act}</li>`).join('') :
                '<li>Tidak ada aktivitas.</li>';
        }
        if (totalBonusPercentage) totalBonusPercentage.textContent = `${(userData.referrals?.length || 0) * 2}%`;
    } else {
        userData = {};
        if (userName) userName.textContent = user.displayName || 'Pengguna';
        if (userEmail) userEmail.textContent = user.email || '-';
        if (userPhoto) userPhoto.src = user.photoURL || 'https://via.placeholder.com/50';
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

function setupMissionSessionUI() {
    if (!user || !userData) return;

    const wibTime = getWIBTime();
    const todayDateString = wibTime.toISOString().slice(0, 10);

    missionSlots.forEach(slot => {
        const missionId = slot.dataset.mission;
        const startHour = parseInt(slot.dataset.start.split(':')[0]);
        const endHour = parseInt(slot.dataset.end.split(':')[0]);
        const countdownEl = slot.querySelector('.countdown');
        const claimBtn = slot.querySelector('.btn-claim');

        if (!claimBtn || !countdownEl) return;

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

        claimBtn.disabled = true;
        claimBtn.classList.remove('active-mission');

        if (isClaimed) {
            claimBtn.textContent = `Misi Selesai`;
            countdownEl.textContent = '✅ Diklaim';
        } else if (isFailed) {
            claimBtn.textContent = 'Misi Gagal';
            countdownEl.textContent = '❌ Terlewat';
        } else if (isSessionPassed && (isCompleted || isInProgress)) {
            claimBtn.textContent = `Klaim ${earnedPoints} Poin`;
            claimBtn.disabled = false;
            claimBtn.classList.add('active-mission');
            countdownEl.textContent = '⏳ Sesi Berakhir';
        } else if (isSessionPassed) {
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

        if (!countdownEl) return;

        let sessionStartTime = new Date(wibTime);
        sessionStartTime.setHours(startHour, 0, 0, 0);

        let sessionEndTime = new Date(wibTime);
        sessionEndTime.setHours(endHour, 59, 59, 999);

        if (sessionEndTime.getTime() < sessionStartTime.getTime()) {
            sessionEndTime.setDate(sessionEndTime.getDate() + 1);
        }

        const isCurrentSessionActive = wibTime >= sessionStartTime && wibTime <= sessionEndTime;
        const isSessionUpcoming = wibTime < sessionStartTime;

        if (isCurrentSessionActive) {
            countdownEl.textContent = '⏳ Aktif sekarang';
        } else if (isSessionUpcoming) {
            countdownEl.textContent = `⏳ Mulai ${formatTime(sessionStartTime - wibTime)}`;
        } else {
            const nextDay = new Date(wibTime);
            nextDay.setDate(nextDay.getDate() + 1);
            nextDay.setHours(startHour, 0, 0, 0);
            countdownEl.textContent = `⏳ Besok ${formatTime(nextDay - wibTime)}`;
        }
    });
}

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

            if (claimBtn.textContent === 'Kerjakan Misi' || claimBtn.textContent === 'Lanjutkan Misi') {
                const missionsSection = document.getElementById('section-missions');
                if (missionsSection) {
                    navLinks.forEach(l => l.classList.remove('active'));
                    const missionNavLink = navLinks.find(link => link.getAttribute('data-section') === 'missions');
                    if(missionNavLink) missionNavLink.click();
                }

                if (!sessionStatusForToday || (sessionStatusForToday.status !== 'completed' && sessionStatusForToday.status !== 'claimed')) {
                    const pointsEarned = parseInt(slot.dataset.points);
                    currentMissionStatus = {
                        ...currentMissionStatus,
                        [missionId]: {
                            ...(currentMissionStatus[missionId] || {}),
                            [todayDateString]: {
                                status: 'in_progress',
                                points: pointsEarned,
                                timestamp: serverTimestamp()
                            }
                        }
                    };

                    await updateDoc(userRef, {
                        missionSessionStatus: currentMissionStatus,
                        recentActivity: arrayUnion(`Memulai misi ${missionId} - ${new Date().toLocaleString('id-ID')}`).slice(-5)
                    });
                    userData.missionSessionStatus = currentMissionStatus;
                    showGamePopup('Misi dimulai!');
                    showFloatingPoints(claimBtn, 0, 'Misi Dimulai!');
                }
            } else if (claimBtn.textContent.startsWith('Klaim') && (sessionStatusForToday?.status === 'completed' || sessionStatusForToday?.status === 'in_progress')) {
                const pointsToClaim = sessionStatusForToday.points;
                const dailyLimit = 100000;

                if ((userData.dailyConverted || 0) + pointsToClaim > dailyLimit) {
                    showGamePopup('Klaim gagal: Melebihi limit konversi harian!');
                    return;
                }

                await updateDoc(userRef, {
                    points: (userData.points || 0) + pointsToClaim,
                    convertedPoints: (userData.convertedPoints || 0) + pointsToClaim,
                    dailyConverted: (userData.dailyConverted || 0) + pointsToClaim,
                    missionSessionStatus: {
                        ...currentMissionStatus,
                        [missionId]: {
                            ...sessionStatusForToday,
                            status: 'claimed',
                            claimTimestamp: serverTimestamp()
                        }
                    },
                    recentActivity: arrayUnion(`Klaim ${pointsToClaim} poin dari sesi ${missionId} - ${new Date().toLocaleString('id-ID')}`).slice(-5)
                });

                userData.points = (userData.points || 0) + pointsToClaim;
                userData.convertedPoints = (userData.convertedPoints || 0) + pointsToClaim;
                userData.dailyConverted = (userData.dailyConverted || 0) + pointsToClaim;
                userData.missionSessionStatus[missionId][todayDateString].status = 'claimed';

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

    safeAddEvent(checkProgressBtn, 'click', async () => {
        if (!user || checkProgressBtn.disabled) return;

        const pendingReferralsRef = collection(db, 'users', user.uid, 'pendingReferrals');
        const pendingQuery = query(pendingReferralsRef, where('isCompleted', '==', false));
        const pendingSnap = await getDocs(pendingQuery);

        if (pendingSnap.empty) {
            showGamePopup('Tidak ada referral yang perlu diverifikasi!');
            return;
        }

        checkProgressBtn.disabled = true;
        const promises = pendingSnap.docs.map(async (docSnap) => {
            const referredUserRef = doc(db, 'users', docSnap.id);
            const referredUserSnap = await getDoc(referredUserRef);
            if (referredUserSnap.exists()) {
                const referredUserData = referredUserSnap.data();
                const now = getWIBTime().getTime();
                const createdAt = referredUserData.createdAt?.toDate()?.getTime();
                const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;

                if (createdAt && (now - createdAt) >= sevenDaysInMillis) {
                    return { docId: docSnap.id, referredByUid: docSnap.data().referredUserUid };
                }
            }
            return null;
        });

        const completedReferrals = (await Promise.all(promises)).filter(r => r !== null);
        
        if (completedReferrals.length > 0) {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                referrals: arrayUnion(...completedReferrals.map(r => r.docId)),
                points: (userData.points || 0) + (50000 * completedReferrals.length),
                recentActivity: arrayUnion(`Bonus referral ${50000 * completedReferrals.length} poin - ${new Date().toLocaleString('id-ID')}`).slice(-5)
            });

            await Promise.all(completedReferrals.map(r => 
                updateDoc(doc(db, 'users', user.uid, 'pendingReferrals', r.docId), {
                    isCompleted: true
                })
            ));

            await loadUserData();
            await loadLeaderboard();
            showGamePopup(`Berhasil klaim bonus ${50000 * completedReferrals.length} poin!`);
            showFloatingPoints(checkProgressBtn, 50000 * completedReferrals.length);
            if (window.confetti) confetti({
                particleCount: 100,
                spread: 70,
                origin: {
                    y: 0.6
                }
            });
        } else {
            showGamePopup('Belum ada referral yang memenuhi syarat klaim!');
        }
        checkProgressBtn.disabled = false;
    });
}

function startPointConversion() {
    const wibTime = getWIBTime();
    const nextConversion = new Date(wibTime);
    nextConversion.setHours(0, 0, 0, 0);
    if (wibTime >= nextConversion) {
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

document.addEventListener("DOMContentLoaded", () => {
    setInitialSidebarState();
});
