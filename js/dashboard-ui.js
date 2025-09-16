// js/dashboard-ui.js
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const overlay = document.getElementById('sidebar-overlay');
  const profileToggle = document.getElementById('profile-menu-toggle');
  const profileMenu = document.getElementById('profile-menu');
  const logoutBtn = document.getElementById('logout-btn-2');
  const navLinks = Array.from(document.querySelectorAll('.nav-link'));
  const sections = Array.from(document.querySelectorAll('.section'));
  const themeToggle = document.getElementById('theme-toggle');
  const checkProgressBtn = document.getElementById('check-progress-btn');
  const totalBonusPercentage = document.getElementById('total-bonus-percentage');

  // Helper: Safe addEvent
  function safeAddEvent(el, ev, fn) {
    if (!el) return;
    el.addEventListener(ev, fn);
  }

  // Floating points animation
  function showFloatingPoints(button, points) {
    const rect = button.getBoundingClientRect();
    const floatEl = document.createElement('span');
    floatEl.className = 'floating-points';
    floatEl.textContent = `+${points} Poin`;
    floatEl.style.position = 'absolute';
    floatEl.style.left = `${rect.left + rect.width / 2}px`;
    floatEl.style.top = `${rect.top - 10}px`;
    floatEl.style.color = '#22c55e'; // Hijau
    floatEl.style.fontSize = '1rem';
    floatEl.style.fontWeight = '700';
    floatEl.style.zIndex = '1000';
    document.body.appendChild(floatEl);

    // Animate
    let opacity = 1;
    let y = 0;
    const animate = () => {
      y -= 1;
      opacity -= 0.02;
      floatEl.style.transform = `translate(-50%, ${y}px)`;
      floatEl.style.opacity = opacity;
      if (opacity <= 0) {
        floatEl.remove();
      } else {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  // Sidebar initial state
  function setInitialSidebarState() {
    if (!sidebar) return;
    if (window.innerWidth <= 900) {
      sidebar.classList.add('closed');
      sidebar.classList.remove('open');
      if (overlay) {
        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden', 'true');
      }
    } else {
      sidebar.classList.add('open');
      sidebar.classList.remove('closed');
      if (overlay) {
        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden', 'true');
      }
    }
  }
  setInitialSidebarState();

  // Debounced resize
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setInitialSidebarState, 120);
  });

  function openSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove('closed');
    sidebar.classList.add('open');
    if (overlay) {
      overlay.classList.add('show');
      overlay.setAttribute('aria-hidden', 'false');
    }
  }

  function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove('open');
    sidebar.classList.add('closed');
    if (overlay) {
      overlay.classList.remove('show');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  safeAddEvent(sidebarToggle, 'click', (e) => {
    e.preventDefault();
    if (sidebar.classList.contains('open')) closeSidebar();
    else openSidebar();
  });

  safeAddEvent(overlay, 'click', (e) => {
    e.preventDefault();
    closeSidebar();
  });

  // Profile menu
  safeAddEvent(profileToggle, 'click', (e) => {
    e.stopPropagation();
    if (!profileMenu) return;
    const isShown = profileMenu.classList.toggle('show');
    profileMenu.setAttribute('aria-hidden', !isShown);
  });

  document.addEventListener('click', (e) => {
    if (!profileMenu) return;
    if (!profileMenu.contains(e.target) && e.target !== profileToggle) {
      profileMenu.classList.remove('show');
      profileMenu.setAttribute('aria-hidden', 'true');
    }
  });

  // Navigation
  if (navLinks.length && sections.length) {
    navLinks.forEach(link => {
      safeAddEvent(link, 'click', (e) => {
        e.preventDefault();
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        const key = link.getAttribute('data-section');
        let matched = false;
        if (key) {
          sections.forEach(sec => {
            const expectedId = `section-${key}`;
            if (sec.id === expectedId) {
              sec.classList.add('active');
              matched = true;
            } else {
              sec.classList.remove('active');
            }
          });

          if (!matched) {
            sections.forEach((sec, idx) => sec.classList.toggle('active', idx === 0));
            console.warn(`No section found for data-section="${key}". Falling back to first section.`);
          }
        }

        if (window.innerWidth <= 900) closeSidebar();
      });
    });
  }

  // Logout handler
  safeAddEvent(logoutBtn, 'click', async (e) => {
    e.preventDefault();
    if (logoutBtn.disabled) return;
    logoutBtn.disabled = true;
    console.log('[Logout] Initiating logout process...');

    try {
      if (firebase.auth) {
        if (firebase.auth().currentUser) {
          console.log('[Logout] User is authenticated, signing out...');
          await firebase.auth().signOut();
          console.log('[Logout] Firebase sign-out successful.');
          window.location.href = 'index.html';
        } else {
          console.warn('[Logout] No authenticated user found. Redirecting to index.html.');
          window.location.href = 'index.html';
        }
      } else {
        console.warn('[Logout] Firebase not detected. Redirecting to index.html.');
        window.location.href = 'index.html';
      }
    } catch (err) {
      console.error('[Logout] Firebase sign-out failed:', err.message);
      window.location.href = 'index.html';
    } finally {
      logoutBtn.disabled = false;
    }
  });

  // Populate user
  function populateUser(user) {
    if (!user) return;
    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('user-email');
    const photoEl = document.getElementById('user-photo');

    if (nameEl) nameEl.textContent = user.displayName || 'Pengguna';
    if (emailEl) emailEl.textContent = user.email || '-';
    if (photoEl && user.photoURL) photoEl.src = user.photoURL;
  }

  if (window.firebase && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
      if (!user) {
        console.log('[Auth] No user authenticated. Redirecting to index.html.');
        window.location.href = 'index.html';
        return;
      }
      console.log('[Auth] User authenticated:', user.email);
      populateUser(user);

      try {
        if (firebase.firestore) {
          const db = firebase.firestore();
          const doc = await db.collection('users').doc(user.uid).get();
          if (doc.exists) {
            const data = doc.data();
            const pointsEl = document.getElementById('points-balance');
            const rupEl = document.getElementById('points-rupiah');
            const refEl = document.getElementById('ref-count');
            if (pointsEl && data.points != null) pointsEl.textContent = data.points;
            if (rupEl && data.points != null) rupEl.textContent = `Rp${(data.points / 10).toLocaleString('id-ID')}`;
            if (refEl && data.referralCount != null) refEl.textContent = data.referralCount;
          }
        }
      } catch (err) {
        console.warn('[Firestore] Read error:', err.message);
      }
    });
  } else {
    console.warn('[Auth] Firebase not detected. Running in dev preview mode.');
  }

  // Theme toggle
  function applyTheme(mode) {
    if (!mode) mode = 'light';
    if (mode === 'dark') {
      document.body.classList.add('dark');
      if (themeToggle) themeToggle.textContent = '☀️';
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      if (themeToggle) themeToggle.textContent = '🌙';
      localStorage.setItem('theme', 'light');
    }
  }

  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);

  safeAddEvent(themeToggle, 'click', (e) => {
    e.preventDefault();
    const isDark = document.body.classList.contains('dark');
    applyTheme(isDark ? 'light' : 'dark');
  });

  // Mission points
  const missionPoints = {
    lesson: 500, // Mata Pelajaran: 50 poin/menit x 10 menit
    quiz: 20,    // Quiz Seru
    video: 15,   // Video Edukasi
    exam: 30,    // Ujian Pelajaran
    game: 25     // Game Edukasi
  };

  // User progress
  function getUserProgress() {
    return JSON.parse(localStorage.getItem('userProgress') || '{}');
  }

  function setUserProgress(p) {
    localStorage.setItem('userProgress', JSON.stringify(p));
  }

  // Saldo
  function getSaldo() {
    return parseInt(localStorage.getItem('saldo') || '0', 10);
  }

  function setSaldo(v) {
    localStorage.setItem('saldo', v);
  }

  // Recent activities
  function updateRecentActivities() {
    const activityList = document.getElementById('recent-activity');
    if (!activityList) return;

    const activities = JSON.parse(localStorage.getItem('recentActivities') || '[]');
    activityList.innerHTML = '';
    if (activities.length === 0) {
      activityList.innerHTML = '<li>Tidak ada aktivitas.</li>';
    } else {
      activities.forEach(activity => {
        const li = document.createElement('li');
        li.textContent = `${activity.action} - ${activity.time}`;
        activityList.appendChild(li);
      });
    }
  }

  // Parse time
  function parseTimeToday(str) {
    const [hh, mm] = str.split(':').map(Number);
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    return d;
  }

  // Format time
  function formatTime(ms) {
    if (ms < 0) ms = 0;
    const sec = Math.floor(ms / 1000);
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  // Reset daily progress at 00:00 WIB
  function resetDailyProgress() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const timeUntilReset = tomorrow - now;

    setTimeout(() => {
      const progress = getUserProgress();
      for (let key in progress) {
        if (key.startsWith('claimed_') || key === 'progress_checked') {
          delete progress[key];
        }
      }
      setUserProgress(progress);
      if (checkProgressBtn) checkProgressBtn.disabled = false;
      console.log('[Daily Reset] Progress reset at 00:00 WIB');
      setInterval(resetDailyProgress, 24 * 60 * 60 * 1000);
    }, timeUntilReset);
  }
  resetDailyProgress();

  // Update mission slots
  function updateSlots() {
    const now = new Date();
    document.querySelectorAll('.mission-slot').forEach(slot => {
      const start = parseTimeToday(slot.dataset.start);
      const end = parseTimeToday(slot.dataset.end);
      end.setSeconds(59, 999);

      const cdEl = slot.querySelector('.countdown');
      const btn = slot.querySelector('.btn-claim');
      const missionKey = slot.dataset.mission;
      const progress = getUserProgress();

      if (now < start) {
        cdEl.textContent = `⏳ Mulai dalam ${formatTime(start - now)}`;
        btn.textContent = 'Kerjakan Misi';
        btn.disabled = true;
        btn.onclick = null;
      } else if (now >= start && now <= end) {
        cdEl.textContent = `⏳ Sisa waktu ${formatTime(end - now)}`;
        btn.textContent = 'Kerjakan Misi';
        btn.disabled = false;
        btn.onclick = () => {
          if (!btn.disabled) {
            document.getElementById('section-missions').scrollIntoView({ behavior: 'smooth' });
            alert('Memulai misi...');
          }
        };
      } else {
        cdEl.textContent = '⌛ Slot sudah berakhir';
        let totalPoints = 0;
        const missionTypes = ['lesson', 'quiz', 'video', 'exam', 'game'];
        missionTypes.forEach(type => {
          for (let key in progress) {
            if (key.startsWith(`${type}_`) && progress[key].slotStart === slot.dataset.start) {
              totalPoints += progress[key].points || 0;
            }
          }
        });
        btn.textContent = `Klaim ${totalPoints} Poin`;
        btn.disabled = progress[`claimed_${missionKey}`];
        btn.onclick = () => {
          if (!progress[`claimed_${missionKey}`]) {
            const saldoBaru = getSaldo() + totalPoints;
            setSaldo(saldoBaru);
            progress[`claimed_${missionKey}`] = true;
            setUserProgress(progress);
            alert(`✅ Berhasil klaim ${totalPoints} poin!\nSaldo sekarang: ${saldoBaru}`);
            // Trigger confetti and floating points
            if (window.confetti) {
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            }
            showFloatingPoints(btn, totalPoints);
            btn.disabled = true;
          }
        };
      }
    });
  }

  setInterval(updateSlots, 1000);
  updateSlots();

  // Update referral countdowns
  function updateCountdowns() {
    const slots = document.querySelectorAll('.referral-slot');
    const now = new Date();
    const progress = getUserProgress();

    let totalClaimedPercentage = 0;
    for (let key in progress) {
      if (key.startsWith('claimed_ref-') && progress[key]) {
        totalClaimedPercentage += 2;
      }
    }
    if (totalBonusPercentage) {
      totalBonusPercentage.textContent = `${totalClaimedPercentage}%`;
    }

    slots.forEach(slot => {
      const startStr = slot.getAttribute('data-start');
      const endStr = slot.getAttribute('data-end');
      const countdownEl = slot.querySelector('.countdown');
      const btn = slot.querySelector('.btn-claim');
      const missionKey = slot.getAttribute('data-mission');

      if (!countdownEl || !btn) return;

      const [sh, sm] = startStr.split(':').map(Number);
      const [eh, em] = endStr.split(':').map(Number);

      const start = new Date(now);
      start.setHours(sh, sm, 0, 0);

      const end = new Date(now);
      end.setHours(eh, em, 59, 999);

      if (now < start) {
        countdownEl.textContent = `⏳ Mulai dalam ${formatTime(start - now)}`;
        btn.textContent = 'Klaim 2%';
        btn.disabled = true;
        btn.onclick = null;
      } else if (now >= start && now <= end) {
        if (progress[`claimed_${missionKey}`]) {
          countdownEl.textContent = `⏳ Sisa waktu ${formatTime(end - now)}`;
          btn.textContent = 'Sudah Klaim';
          btn.disabled = true;
          btn.onclick = null;
        } else {
          countdownEl.textContent = `⏳ Sisa waktu ${formatTime(end - now)}`;
          btn.textContent = 'Klaim 2%';
          btn.disabled = false;
          btn.onclick = () => {
            if (!btn.disabled) {
              const bonusPoints = 100; // Placeholder: 100 poin per 2% klaim
              const saldoBaru = getSaldo() + bonusPoints;
              setSaldo(saldoBaru);
              progress[`claimed_${missionKey}`] = true;
              setUserProgress(progress);
              alert(`✅ Berhasil klaim 2% (${bonusPoints} poin)!\nSaldo sekarang: ${saldoBaru}`);
              btn.textContent = 'Sudah Klaim';
              btn.disabled = true;
              totalClaimedPercentage += 2;
              if (totalBonusPercentage) {
                totalBonusPercentage.textContent = `${totalClaimedPercentage}%`;
              }
              // Trigger confetti and floating points
              if (window.confetti) {
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
              }
              showFloatingPoints(btn, bonusPoints);
            }
          };
        }
      } else {
        countdownEl.textContent = '❌ Sudah berakhir';
        btn.textContent = progress[`claimed_${missionKey}`] ? 'Sudah Klaim' : 'Belum Klaim';
        btn.disabled = true;
        btn.onclick = null;
      }
    });
  }

  setInterval(updateCountdowns, 1000);
  updateCountdowns();

  // Check progress button
  safeAddEvent(checkProgressBtn, 'click', () => {
    const progress = getUserProgress();
    if (!progress.progress_checked) {
      progress.progress_checked = true;
      setUserProgress(progress);
      checkProgressBtn.disabled = true;
      alert('✅ Progress harian diperiksa!');
      // Trigger confetti and floating points
      if (window.confetti) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
      showFloatingPoints(checkProgressBtn, 0); // 0 poin untuk Cek Progress
    }
  });

  // Initialize check progress button state
  const progress = getUserProgress();
  if (checkProgressBtn && progress.progress_checked) {
    checkProgressBtn.disabled = true;
  }

  // Initialize recent activities
  safeAddEvent(document, 'DOMContentLoaded', updateRecentActivities);

  console.log('[dashboard-ui] Initialized');
});
