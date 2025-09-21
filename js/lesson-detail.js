// js/lesson-detail.js
document.addEventListener('DOMContentLoaded', () => {
    const lessonTitle = document.getElementById('lesson-title');
    const lessonContentContainer = document.getElementById('lesson-content'); 
    const timerDisplay = document.getElementById('timer');
    const pointsEarned = document.getElementById('points-earned');
    const profilePictureToggle = document.getElementById('profile-picture-toggle'); // Elemen foto profil
    const exitMenu = document.getElementById('exit-menu');
    const themeToggle = document.getElementById('theme-toggle');
    const reloadTimer = document.getElementById('reload-timer');
    const pageIndicator = document.getElementById('page-indicator'); 
    const logoutButton = document.getElementById('logout-button'); // Tombol Logout

    let timerInterval;
    let timeRemaining = 10 * 60 * 1000; // 10 menit dalam ms
    let minutesCompleted = 0;
    let points = 0;
    let isTabActive = true;
    let currentPage = 0;
    let pages = []; // Array untuk menyimpan konten per halaman
    let isDragging = false;
    let startX = 0;
    let startTouchX = 0;
    let isLessonLoaded = false; // Flag untuk memastikan pelajaran hanya dimuat sekali

    // Tentukan sesi berdasarkan waktu WIB
    function getCurrentSession() {
        const now = new Date();
        const hours = now.getHours();
        let date = now.toISOString().split('T')[0]; // Tanggal YYYY-MM-DD
        let sessionName;

        if (hours >= 6 && hours < 9) sessionName = 'Pagi1';
        else if (hours >= 9 && hours < 12) sessionName = 'Pagi2';
        else if (hours >= 12 && hours < 15) sessionName = 'Siang';
        else if (hours >= 15 && hours < 18) sessionName = 'Sore';
        else if (hours >= 18 && hours < 21) sessionName = 'Malam';
        else {
            sessionName = 'Pagi1';
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            date = tomorrow.toISOString().split('T')[0];
        }
        return { sessionName, sessionKey: `session_${sessionName}_${date}`, date };
    }

    // Inisialisasi sesi
    const { sessionName, sessionKey, date } = getCurrentSession();
    let currentSessionKey = localStorage.getItem('currentSessionKey') || sessionKey;

    // Cek sesi baru
    const savedSessionDate = localStorage.getItem('currentSessionDate');
    const savedSessionKey = localStorage.getItem('currentSessionKey');
    if (savedSessionDate !== date || savedSessionKey !== sessionKey) {
        localStorage.setItem('currentSessionDate', date);
        localStorage.setItem('currentSessionKey', sessionKey);
        const progress = getUserProgress();
        delete progress.sessionCompleted; // Reset status completed
        delete progress[`sessionTimer_${currentSessionKey}`]; // Reset timer sesi lama
        setUserProgress(progress);
    }
    localStorage.setItem('currentSessionKey', currentSessionKey); // Update currentSessionKey di localStorage

    // Dark/Light Mode
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.classList.toggle('dark', savedTheme === 'dark');
    themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

    themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeToggle.textContent = isDark ? '☀️' : '🌙';
    });

    // Get lesson ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const lessonId = urlParams.get('id');

    if (!lessonId) {
        lessonTitle.textContent = 'Error';
        lessonContentContainer.innerHTML = '<div class="page active" data-page="0"><p>ID pelajaran tidak ditemukan di URL.</p></div>';
        pageIndicator.textContent = 'Halaman 1 / 1';
        pages = ['<p>ID pelajaran tidak ditemukan di URL.</p>'];
        console.error('[Lesson Detail] No lesson ID provided in URL');
        return;
    }

    // Fungsi untuk mendapatkan user dari Firebase
    function getUser() {
        return firebase.auth().currentUser;
    }

    // Fungsi untuk memperbarui foto profil
    function updateProfilePicture() {
        const user = getUser();
        if (user && user.photoURL) {
            profilePictureToggle.src = user.photoURL;
        } else {
            profilePictureToggle.src = 'img/default-profile.png'; // Pastikan path ini benar
        }
    }

    // Panggil saat DOMContentLoaded dan saat autentikasi berubah
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            updateProfilePicture();
        } else {
            profilePictureToggle.src = 'img/default-profile.png';
            // Redirect ke halaman login jika tidak ada user
            window.location.href = 'index.html';
        }
    });

    async function loadLessonContentData() { // Fungsi baru untuk memuat data pelajaran saja
        try {
            console.log('[Lesson Detail] Fetching lessons.json...');
            const response = await fetch('data/lessons.json');
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const lessons = await response.json();
            const lesson = lessons.find(l => l.id === lessonId);
            if (lesson) {
                lessonTitle.textContent = lesson.title;
                lessonTitle.dataset.fullTitle = lesson.title;
                return lesson.fullContent || '<p>Konten pelajaran belum tersedia.</p>';
            } else {
                console.error('[Lesson Detail] No lesson found with id:', lessonId);
                lessonTitle.textContent = 'Pelajaran Tidak Ditemukan';
                lessonTitle.dataset.fullTitle = 'Pelajaran Tidak Ditemukan';
                return '<p>Pelajaran dengan ID ini tidak ditemukan.</p>';
            }
        } catch (err) {
            console.error('[Lesson Detail] Failed to load lesson:', err.message);
            lessonTitle.textContent = 'Error';
            lessonTitle.dataset.fullTitle = 'Error';
            return '<p>Gagal memuat pelajaran. Pastikan file data/lessons.json ada dan valid. Error: ' + err.message + '</p>';
        }
    }

    // Fungsi utama untuk memuat dan menampilkan pelajaran
    async function initializeLessonDisplay() {
        const fullContent = await loadLessonContentData();

        // Tambahkan pesan sesi selesai jika diperlukan
        const progress = getUserProgress();
        if (progress.sessionCompleted) {
            pages = ['<p style="color: var(--bonus-green); font-weight: 600;">Misi selesai untuk sesi ini. Tunggu sesi berikutnya!</p>'];
            currentPage = 0;
            renderCurrentPage();
            return; // Hentikan eksekusi jika sesi sudah selesai
        }

        splitContentIntoPages(fullContent);
        isLessonLoaded = true; // Set flag setelah pelajaran berhasil dimuat dan di-split
    }

    // Pecah konten menjadi halaman berdasarkan tinggi layar
    function splitContentIntoPages(content) {
        console.log('[splitContentIntoPages] Starting with content.');
        lessonContentContainer.innerHTML = ''; // Kosongkan konten sebelum split

        // Buat temporary div untuk pengukuran
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.visibility = 'hidden';
        tempDiv.style.left = '-9999px'; // Pindahkan jauh dari viewport
        tempDiv.style.width = `${lessonContentContainer.offsetWidth - 30}px`; // Kurangi padding horizontal (15px kiri + 15px kanan dari .page)
        tempDiv.style.padding = '15px'; // Sesuaikan dengan padding .page
        tempDiv.style.fontSize = '1rem';
        tempDiv.style.lineHeight = '1.8';
        tempDiv.style.fontFamily = '"Nunito", sans-serif';
        tempDiv.style.color = document.body.classList.contains('dark') ? '#9ca3af' : '#4b5563';
        document.body.appendChild(tempDiv);

        let cleanedContent = content;
        // Jika konten tidak diawali dengan tag HTML, bungkus dengan <p>
        if (!content.trim().startsWith('<')) {
            cleanedContent = `<p>${content}</p>`;
        }
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(cleanedContent, 'text/html');
        const elements = Array.from(doc.body.childNodes).filter(node => node.nodeType === 1 || (node.nodeType === 3 && node.textContent.trim()));
        
        console.log('[splitContentIntoPages] Elements parsed:', elements.length);

        let currentPageContentHtml = '';
        
        // Perhitungan tinggi yang lebih akurat
        const headerHeight = document.querySelector('.header-fixed').offsetHeight; // Tinggi header
        const contentMainElement = document.querySelector('.content'); // Elemen main.content
        const mainContentTopPadding = parseInt(window.getComputedStyle(contentMainElement).paddingTop); // padding-top dari .content (60px)
        const mainContentBottomPadding = parseInt(window.getComputedStyle(contentMainElement).paddingBottom); // padding-bottom dari .content (20px)
        const lessonDetailPadding = 20; // padding dari .lesson-detail (20px top/bottom)
        const pagePadding = 15; // padding dari .page (15px top/bottom)

        // Tinggi yang tersedia untuk konten di dalam satu halaman
        const availableHeight = window.innerHeight 
                                - headerHeight 
                                - mainContentTopPadding 
                                - mainContentBottomPadding 
                                - (2 * lessonDetailPadding) 
                                - (2 * pagePadding);
        
        console.log(`[splitContentIntoPages] headerHeight: ${headerHeight}, mainContentTopPadding: ${mainContentTopPadding}, mainContentBottomPadding: ${mainContentBottomPadding}, lessonDetailPadding: ${lessonDetailPadding}, pagePadding: ${pagePadding}`);
        console.log(`[splitContentIntoPages] Calculated availableHeight for page content: ${availableHeight}`);
        
        pages = [];

        elements.forEach((el, index) => {
            const elHtml = (el.nodeType === 1) ? el.outerHTML : `<p>${el.textContent.trim()}</p>`;
            
            tempDiv.innerHTML = currentPageContentHtml + elHtml;
            const newHeight = tempDiv.scrollHeight; // Scroll height akan mengukur tinggi total konten
            
            console.log(`[splitContentIntoPages] Element ${index}, newHeight: ${newHeight}, current page content HTML length: ${currentPageContentHtml.length}, availableHeight: ${availableHeight}`);

            if (newHeight > availableHeight && currentPageContentHtml) {
                // Jika menambahkan elemen ini melebihi tinggi yang tersedia, buat halaman baru
                pages.push(currentPageContentHtml);
                console.log(`[splitContentIntoPages] Page ${pages.length} created.`);
                currentPageContentHtml = elHtml; // Mulai halaman baru dengan elemen ini
            } else {
                currentPageContentHtml += elHtml;
            }
        });

        // Tambahkan sisa konten sebagai halaman terakhir
        if (currentPageContentHtml) {
            pages.push(currentPageContentHtml);
            console.log(`[splitContentIntoPages] Final page created.`);
        }

        // Fallback jika tidak ada halaman yang dibuat (misal, konten kosong)
        if (pages.length === 0) {
            pages.push('<p>Konten pelajaran tidak dapat ditampilkan. Coba muat ulang halaman.</p>');
            console.warn('[splitContentIntoPages] No pages created, using fallback content.');
        }

        document.body.removeChild(tempDiv);
        console.log('[splitContentIntoPages] Total pages:', pages.length);

        currentPage = 0; // Mulai dari halaman pertama
        renderCurrentPage(); // Render halaman-halaman ke DOM
    }

    // Fungsi untuk merender halaman yang aktif ke DOM
    function renderCurrentPage() {
        // Hapus semua elemen '.page' yang ada di container
        lessonContentContainer.querySelectorAll('.page').forEach(p => p.remove());

        // Buat dan tambahkan halaman-halaman ke DOM
        pages.forEach((pageHtml, index) => {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page';
            pageDiv.dataset.page = index;
            pageDiv.innerHTML = pageHtml;
            lessonContentContainer.appendChild(pageDiv);

            // Tentukan kelas untuk animasi
            if (index === currentPage) {
                pageDiv.classList.add('active');
            } else if (index === currentPage + 1) { // Halaman berikutnya di kanan
                pageDiv.classList.add('next');
            } else if (index === currentPage - 1) { // Halaman sebelumnya di kiri
                pageDiv.classList.add('prev');
            }
        });
        updatePageNavigation(); // Perbarui indikator halaman
    }

    // Perbarui indikator halaman
    function updatePageNavigation() {
        if (pageIndicator) { // Cek apakah elemen pageIndicator ada
            pageIndicator.textContent = `Halaman ${currentPage + 1} / ${pages.length}`;
        }
    }

    // Navigasi ke halaman berikutnya
    function goToNextPage() {
        if (currentPage < pages.length - 1) {
            currentPage++;
            renderCurrentPage(); // Render ulang untuk animasi transisi
        }
    }

    // Navigasi ke halaman sebelumnya
    function goToPrevPage() {
        if (currentPage > 0) {
            currentPage--;
            renderCurrentPage(); // Render ulang untuk animasi transisi
        }
    }

    // Deteksi swipe untuk mobile
    lessonContentContainer.addEventListener('touchstart', (e) => {
        startTouchX = e.touches[0].clientX;
    });

    lessonContentContainer.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Cegah scroll default
        const touchX = e.touches[0].clientX;
        const deltaX = touchX - startTouchX;
        if (deltaX > 50) { // Geser ke kanan (prev)
            goToPrevPage();
            startTouchX = touchX; // Reset posisi setelah perpindahan
        } else if (deltaX < -50) { // Geser ke kiri (next)
            goToNextPage();
            startTouchX = touchX; // Reset posisi setelah perpindahan
        }
    });

    // Deteksi drag untuk desktop (mirip dengan swipe)
    lessonContentContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        lessonContentContainer.style.cursor = 'grabbing';
    });

    lessonContentContainer.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - startX;
            if (Math.abs(deltaX) > 50) { // Cukup geser 50px untuk memicu
                if (deltaX > 0) { // Geser ke kanan
                    goToPrevPage();
                } else { // Geser ke kiri
                    goToNextPage();
                }
                isDragging = false; // Hentikan drag setelah perpindahan
                lessonContentContainer.style.cursor = 'grab'; // Reset kursor
            }
        }
    });

    lessonContentContainer.addEventListener('mouseup', () => {
        isDragging = false;
        lessonContentContainer.style.cursor = 'grab';
    });

    lessonContentContainer.addEventListener('mouseleave', () => {
        isDragging = false;
        lessonContentContainer.style.cursor = 'grab';
    });

    // Deteksi tombol panah keyboard
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault(); // Mencegah scroll default browser
            goToPrevPage();
        }
        else if (e.key === 'ArrowRight') {
            e.preventDefault(); // Mencegah scroll default browser
            goToNextPage();
        }
    });

    // Title Popup
    lessonTitle.addEventListener('click', () => {
        const fullTitle = lessonTitle.dataset.fullTitle || lessonTitle.textContent;
        const popup = document.createElement('div');
        popup.className = 'title-popup';
        popup.textContent = fullTitle;
        document.body.appendChild(popup);
        setTimeout(() => popup.classList.add('show'), 10);
        setTimeout(() => {
            popup.classList.remove('show');
            setTimeout(() => popup.remove(), 300);
        }, 3000); // Popup 3 detik
    });

    function formatTime(ms) {
        if (ms < 0) ms = 0;
        const minutes = Math.floor(ms / 1000 / 60);
        const seconds = Math.floor((ms / 1000) % 60);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function triggerAd() {
        console.log('[Monetag] Iklan popunder ditampilkan');
        // Ganti dengan skrip Monetag sebenarnya
    }

    function showFloatingPoints(pointsToAdd) {
        const pointsRect = pointsEarned.getBoundingClientRect();
        const floatEl = document.createElement('span');
        floatEl.className = 'floating-points';
        floatEl.textContent = `+${pointsToAdd}`;
        floatEl.style.position = 'absolute';
        floatEl.style.left = `${pointsRect.left + pointsRect.width / 2}px`;
        floatEl.style.top = `${pointsRect.top + 30}px`;
        document.body.appendChild(floatEl);

        let opacity = 1;
        let y = 30;
        const animate = () => {
            y -= 1;
            opacity -= 0.02;
            floatEl.style.transform = `translate(-50%, ${-y}px)`;
            floatEl.style.opacity = opacity;
            if (y <= 0 || opacity <= 0) floatEl.remove();
            else requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
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
        }, 4000); // Popup 4 detik
    }

    function savePoints(pointsToAdd) {
        const progress = getUserProgress();
        progress.points = (progress.points || 0) + pointsToAdd;
        setUserProgress(progress);
    }

    function getUserProgress() {
        return JSON.parse(localStorage.getItem('userProgress') || '{}');
    }

    function setUserProgress(p) {
        localStorage.setItem('userProgress', JSON.stringify(p));
    }

    function startTimer() {
        const progress = getUserProgress();
        const timerKey = `sessionTimer_${currentSessionKey}`;

        if (progress.sessionCompleted) {
            timerDisplay.textContent = '00:00';
            pointsEarned.textContent = `Poin: 500`;
            // Pastikan konten di halaman diupdate untuk menunjukkan misi selesai
            // Tidak perlu panggil splitContentIntoPages lagi, karena sudah di initializeLessonDisplay
            return; 
        }

        timeRemaining = progress[timerKey]?.remaining || 10 * 60 * 1000;
        minutesCompleted = Math.floor((10 * 60 * 1000 - timeRemaining) / (60 * 1000));
        points = minutesCompleted * 50;
        pointsEarned.textContent = `Poin: ${points}`;

        timerDisplay.textContent = formatTime(timeRemaining);
        // Hentikan interval sebelumnya jika ada untuk menghindari duplikasi
        if (timerInterval) clearInterval(timerInterval); 

        timerInterval = setInterval(() => {
            if (isTabActive) {
                timeRemaining -= 1000;
                timerDisplay.textContent = formatTime(timeRemaining);
                progress[timerKey] = { remaining: timeRemaining };
                setUserProgress(progress);

                if (timeRemaining <= 0) {
                    clearInterval(timerInterval);
                    progress.sessionCompleted = true;
                    setUserProgress(progress);
                    showGamePopup('Waktu membaca selesai! Anda mendapatkan 500 poin.');
                    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, duration: 2000 });
                    points = 500;
                    pointsEarned.textContent = `Poin: ${points}`;
                    savePoints(500);
                    setTimeout(() => window.location.href = 'dashboard.html#section-missions', 4000);
                } else if (timeRemaining % (60 * 1000) === 0) {
                    minutesCompleted++;
                    triggerAd();
                    showFloatingPoints(50);
                    showGamePopup('1 menit selesai! +50 poin');
                    confetti({ particleCount: 50, spread: 60, duration: 2000 });
                    points += 50;
                    pointsEarned.textContent = `Poin: ${points}`;
                    savePoints(50);
                }
            }
        }, 1000);
    }

    reloadTimer.addEventListener('click', () => window.location.reload());

    document.addEventListener('visibilitychange', () => {
        isTabActive = document.visibilityState === 'visible';
        if (!isTabActive && timerInterval) {
            clearInterval(timerInterval);
            const progress = getUserProgress();
            progress[`sessionTimer_${currentSessionKey}`] = { remaining: timeRemaining };
            setUserProgress(progress);
        } else if (isTabActive) { 
            // Cek jika timer belum berjalan (misal setelah tab kembali aktif)
            if (!timerInterval && timeRemaining > 0) {
                startTimer();
            }
        }
    });

    window.addEventListener('beforeunload', () => {
        if (timerInterval) {
            clearInterval(timerInterval);
            const progress = getUserProgress();
            progress[`sessionTimer_${currentSessionKey}`] = { remaining: timeRemaining };
            setUserProgress(progress);
        }
    });

    // Panggil initializeLessonDisplay setelah window load untuk memastikan DOM siap
    window.addEventListener('load', initializeLessonDisplay); 
    
    // Juga panggil saat resize untuk menyesuaikan paging jika pelajaran sudah dimuat
    window.addEventListener('resize', () => {
        if (isLessonLoaded) { 
            console.log('[Resize Event] Re-initializing lesson display...');
            initializeLessonDisplay();
        }
    });

    // Mulai timer segera setelah DOMContentLoaded
    startTimer();

    // Event listener untuk foto profil (pengganti exitToggle)
    profilePictureToggle.addEventListener('click', (e) => { 
        e.stopPropagation(); // Mencegah event menyebar ke dokumen
        const isShown = exitMenu.classList.toggle('show');
        profilePictureToggle.classList.toggle('active', isShown); // Menambahkan kelas 'active' ke foto profil
        exitMenu.setAttribute('aria-hidden', !isShown); // Mengatur atribut aria-hidden
    });

    // Menutup menu jika klik di luar
    document.addEventListener('click', (e) => {
        if (!exitMenu.contains(e.target) && e.target !== profilePictureToggle) {
            exitMenu.classList.remove('show');
            profilePictureToggle.classList.remove('active');
            exitMenu.setAttribute('aria-hidden', 'true');
        }
    });

    // Event listener untuk tombol Logout
    logoutButton.addEventListener('click', async () => {
        try {
            await firebase.auth().signOut();
            localStorage.removeItem('userProgress'); // Bersihkan progress lokal
            window.location.href = 'index.html'; // Redirect ke halaman login
        } catch (error) {
            console.error("Error logging out:", error);
            alert("Gagal logout. Silakan coba lagi.");
        }
    });
});
