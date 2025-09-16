// js/lesson-ui.js
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const lessonButtons = document.querySelectorAll('.btn-lesson');
  const userNameEl = document.getElementById('user-name');
  const userEmailEl = document.getElementById('user-email');
  const userPhotoEl = document.getElementById('user-photo');

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
  function addRecentActivity(action, time) {
    const activities = JSON.parse(localStorage.getItem('recentActivities') || '[]');
    activities.unshift({ action, time: new Date(time).toLocaleString('id-ID') });
    if (activities.length > 5) activities.pop(); // Limit to 5 activities
    localStorage.setItem('recentActivities', JSON.stringify(activities));
  }

  // Populate user
  function populateUser(user) {
    if (!user) return;
    if (userNameEl) userNameEl.textContent = user.displayName || 'Pengguna';
    if (userEmailEl) userEmailEl.textContent = user.email || '-';
    if (userPhotoEl && user.photoURL) userPhotoEl.src = user.photoURL;
  }

  // Firebase auth check
  if (window.firebase && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
      if (!user) {
        console.log('[Auth] No user authenticated. Redirecting to index.html.');
        window.location.href = 'index.html';
        return;
      }
      console.log('[Auth] User authenticated:', user.email);
      populateUser(user);
    });
  } else {
    console.warn('[Auth] Firebase not detected. Running in dev preview mode.');
    populateUser({ displayName: 'Tamu', email: 'tamu@example.com' });
  }

  // Initialize lesson buttons
  function updateLessonButtons() {
    const progress = getUserProgress();
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    let lessonCompletedToday = false;

    // Check if any lesson was completed today
    for (let key in progress) {
      if (key.startsWith('lesson_') && progress[key].date === today) {
        lessonCompletedToday = true;
        break;
      }
    }

    lessonButtons.forEach(btn => {
      const subject = btn.getAttribute('data-subject');
      const isCompleted = progress[`lesson_${subject}`]?.date === today;

      if (lessonCompletedToday || isCompleted) {
        btn.textContent = 'Sudah Selesai';
        btn.disabled = true;
      } else {
        btn.textContent = 'Selesaikan';
        btn.disabled = false;
        btn.onclick = () => {
          if (!btn.disabled) {
            const points = 10; // 10 poin per pelajaran
            const saldoBaru = getSaldo() + points;
            setSaldo(saldoBaru);
            progress[`lesson_${subject}`] = { date: today, completed: true };
            setUserProgress(progress);
            addRecentActivity(`Selesai Mata Pelajaran: ${btn.parentElement.querySelector('h4').textContent}`, now);
            alert(`✅ Berhasil menyelesaikan ${btn.parentElement.querySelector('h4').textContent}! (+${points} poin)\nSaldo sekarang: ${saldoBaru}`);
            btn.textContent = 'Sudah Selesai';
            btn.disabled = true;
            lessonButtons.forEach(b => {
              if (b !== btn) {
                b.textContent = 'Sudah Selesai';
                b.disabled = true;
              }
            });
          }
        };
      }
    });
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
        if (key.startsWith('lesson_')) {
          delete progress[key];
        }
      }
      setUserProgress(progress);
      updateLessonButtons();
      console.log('[Daily Reset] Lesson progress reset at 00:00 WIB');
      setInterval(resetDailyProgress, 24 * 60 * 60 * 1000); // Repeat daily
    }, timeUntilReset);
  }
  resetDailyProgress();

  // Initialize
  updateLessonButtons();
  console.log('[lesson-ui] Initialized');
});
