// js/lesson-detail.js
document.addEventListener('DOMContentLoaded', () => {
    const lessonTitle = document.getElementById('lesson-title');
    const lessonContentContainer = document.getElementById('lesson-content'); // Mengganti lessonContent menjadi lessonContentContainer
    const timerDisplay = document.getElementById('timer');
    const pointsEarned = document.getElementById('points-earned');
    const exitToggle = document.getElementById('exit-toggle');
    const exitMenu = document.getElementById('exit-menu');
    const themeToggle = document.getElementById('theme-toggle');
    const reloadTimer = document.getElementById('reload-timer');
    const pageIndicator = document.getElementById('page-indicator'); // Tetap gunakan elemen yang ada di HTML

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

    // ... (Fungsi getCurrentSession, Dark/Light Mode, getUserProgress, setUserProgress, formatTime, showFloatingPoints, showGamePopup, savePoints tetap sama) ...
    // Pastikan Firebase sudah diinisialisasi di firebase-config.js dan tidak ada error di sana.
    // ...

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
        lessonContentContainer.innerHTML = '<p>ID pelajaran tidak ditemukan di URL.</p>'; // Langsung tampilkan di container
        pageIndicator.textContent = 'Halaman 1 / 1';
        console.error('[Lesson Detail] No lesson ID provided in URL');
        return;
    }

    async function loadLesson() {
        try {
            console.log('[Lesson Detail] Fetching lessons.json...');
            const response = await fetch('data/lessons.json');
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const lessons = await response.json();
            const lesson = lessons.find(l => l.id === lessonId);
            if (lesson) {
                lessonTitle.textContent = lesson.title;
                lessonTitle.dataset.fullTitle = lesson.title;
                const fullContent = lesson.fullContent || '<p>Konten pelajaran belum tersedia.</p>';
                console.log('[Lesson Detail] Full content loaded:', fullContent);
                splitContentIntoPages(fullContent);
            } else {
                lessonTitle.textContent = 'Pelajaran Tidak Ditemukan';
                lessonContentContainer.innerHTML = '<p>Pelajaran dengan ID ini tidak ditemukan.</p>';
                pageIndicator.textContent = 'Halaman 1 / 1';
                pages = ['<p>Pelajaran dengan ID ini tidak ditemukan.</p>'];
                renderCurrentPage(); // Render halaman error
                console.error('[Lesson Detail] No lesson found with id:', lessonId);
            }
        } catch (err) {
            console.error('[Lesson Detail] Failed to load lesson:', err.message);
            lessonTitle.textContent = 'Error';
            lessonTitle.dataset.fullTitle = 'Error';
            lessonContentContainer.innerHTML = '<p>Gagal memuat pelajaran. Pastikan file data/lessons.json ada dan valid. Error: ' + err.message + '</p>';
            pageIndicator.textContent = 'Halaman 1 / 1';
            pages = ['<p>Gagal memuat pelajaran. Pastikan file data/lessons.json ada dan valid. Error: ' + err.message + '</p>'];
            renderCurrentPage(); // Render halaman error
        }
    }

    // Fungsi untuk merender halaman yang aktif ke DOM
    function renderCurrentPage() {
        // Hapus semua halaman yang ada di container
        lessonContentContainer.querySelectorAll('.page').forEach(p => p.remove());

        // Buat dan tambahkan halaman-halaman ke DOM
        pages.forEach((pageHtml, index) => {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page';
            pageDiv.dataset.page = index;
            pageDiv.innerHTML = pageHtml;
            lessonContentContainer.appendChild(pageDiv);

            if (index === currentPage) {
                pageDiv.classList.add('active');
            } else if (index === currentPage + 1) {
                pageDiv.classList.add('next');
            } else if (index === currentPage - 1) {
                pageDiv.classList.add('prev');
            }
        });
        updatePageNavigation();
    }


    // Pecah konten menjadi halaman berdasarkan tinggi layar
    function splitContentIntoPages(content) {
        console.log('[splitContentIntoPages] Starting with content.');
        lessonContentContainer.innerHTML = ''; // Kosongkan konten sebelum split

        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.visibility = 'hidden';
        tempDiv.style.width = `${lessonContentContainer.offsetWidth - 30}px`; // Kurangi padding horizontal (15px kiri + 15px kanan)
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
        
        // Memparsing HTML string menjadi elemen DOM sementara
        const parser = new DOMParser();
        const doc = parser.parseFromString(cleanedContent, 'text/html');
        const elements = Array.from(doc.body.childNodes).filter(node => node.nodeType === 1 || (node.nodeType === 3 && node.textContent.trim()));
        
        console.log('[splitContentIntoPages] Elements parsed:', elements.length);

        let currentPageContentHtml = '';
        const maxHeight = window.innerHeight - 120 - 30; // Tinggi viewport - header - padding container - padding page
        pages = [];

        elements.forEach((el, index) => {
            const elHtml = (el.nodeType === 1) ? el.outerHTML : `<p>${el.textContent.trim()}</p>`; // Pastikan text node juga dibungkus p
            
            tempDiv.innerHTML = currentPageContentHtml + elHtml;
            const newHeight = tempDiv.scrollHeight;
            
            console.log(`[splitContentIntoPages] El ${index}, newHeight: ${newHeight}, currentPageContentHtml length: ${currentPageContentHtml.length}, maxHeight: ${maxHeight}`);

            if (newHeight > maxHeight && currentPageContentHtml) {
                pages.push(currentPageContentHtml);
                console.log(`[splitContentIntoPages] Page ${pages.length} created.`);
                currentPageContentHtml = elHtml; // Mulai halaman baru dengan elemen ini
            } else {
                currentPageContentHtml += elHtml;
            }
        });

        if (currentPageContentHtml) {
            pages.push(currentPageContentHtml);
            console.log(`[splitContentIntoPages] Final page created.`);
        }

        if (pages.length === 0) {
            pages.push('<p>Konten pelajaran tidak dapat ditampilkan. Coba muat ulang halaman.</p>');
            console.warn('[splitContentIntoPages] No pages created, using fallback content.');
        }

        document.body.removeChild(tempDiv);
        console.log('[splitContentIntoPages] Total pages:', pages.length);

        // Tambahkan pesan sesi selesai jika diperlukan
        const progress = getUserProgress();
        if (progress.sessionCompleted) {
            pages = ['<p style="color: var(--bonus-green); font-weight: 600;">Misi selesai untuk sesi ini. Tunggu sesi berikutnya!</p>'];
            console.log('[splitContentIntoPages] Session completed, showing message.');
        }

        currentPage = 0;
        renderCurrentPage(); // Panggil fungsi render untuk menampilkan halaman pertama
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
            const current = lessonContentContainer.querySelector(`.page[data-page="${currentPage}"]`);
            if (current) current.classList.remove('active');
            
            currentPage++;
            const next = lessonContentContainer.querySelector(`.page[data-page="${currentPage}"]`);
            if (next) next.classList.add('active');
            
            // Perbarui kelas untuk animasi
            lessonContentContainer.querySelectorAll('.page').forEach(pageEl => {
                const index = parseInt(pageEl.dataset.page);
                if (index < currentPage) {
                    pageEl.classList.add('prev');
                    pageEl.classList.remove('active', 'next');
                } else if (index === currentPage) {
                    pageEl.classList.add('active');
                    pageEl.classList.remove('prev', 'next');
                } else {
                    pageEl.classList.add('next');
                    pageEl.classList.remove('active', 'prev');
                }
            });
            updatePageNavigation();
        }
    }

    // Navigasi ke halaman sebelumnya
    function goToPrevPage() {
        if (currentPage > 0) {
            const current = lessonContentContainer.querySelector(`.page[data-page="${currentPage}"]`);
            if (current) current.classList.remove('active');
            
            currentPage--;
            const prev = lessonContentContainer.querySelector(`.page[data-page="${currentPage}"]`);
            if (prev) prev.classList.add('active');

            // Perbarui kelas untuk animasi
            lessonContentContainer.querySelectorAll('.page').forEach(pageEl => {
                const index = parseInt(pageEl.dataset.page);
                if (index > currentPage) {
                    pageEl.classList.add('next');
                    pageEl.classList.remove('active', 'prev');
                } else if (index === currentPage) {
                    pageEl.classList.add('active');
                    pageEl.classList.remove('prev', 'next');
                } else {
                    pageEl.classList.add('prev');
                    pageEl.classList.remove('active', 'next');
                }
            });
            updatePageNavigation();
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
            if (deltaX > 50) { // Geser ke kanan (prev)
                goToPrevPage();
                isDragging = false; // Hentikan drag setelah perpindahan
            } else if (deltaX < -50) { // Geser ke kiri (next)
                goToNextPage();
                isDragging = false; // Hentikan drag setelah perpindahan
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
        if (e.key === 'ArrowLeft') goToPrevPage();
        else if (e.key === 'ArrowRight') goToNextPage();
    });

    // Title Popup (tetap sama)
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

    // Fungsi triggerAd (tetap sama)
    function triggerAd() {
        console.log('[Monetag] Iklan popunder ditampilkan');
        // Ganti dengan skrip Monetag sebenarnya
        // Pastikan Anda sudah mengintegrasikan Monetag SDK di sini jika diperlukan
    }

    // Fungsi untuk memulai timer dan pengelolaan poin
    function startTimer() {
        const progress = getUserProgress();
        const timerKey = `sessionTimer_${currentSessionKey}`;

        if (progress.sessionCompleted) {
            timerDisplay.textContent = '00:00';
            pointsEarned.textContent = `Poin: 500`;
            // Pastikan konten di halaman diupdate untuk menunjukkan misi selesai
            splitContentIntoPages('<p style="color: var(--bonus-green); font-weight: 600;">Misi selesai untuk sesi ini. Tunggu sesi berikutnya!</p>');
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
        } else if (isTabActive) { // Hanya mulai jika tab aktif dan timer belum berjalan
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

    // Fungsi untuk inisialisasi sesi (tetap sama)
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


    // Panggil loadLesson dan startTimer
    loadLesson();
    startTimer();

    exitToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isShown = exitMenu.classList.toggle('show');
        exitToggle.classList.toggle('active', isShown);
        exitMenu.setAttribute('aria-hidden', !isShown);
    });

    document.addEventListener('click', (e) => {
        if (!exitMenu.contains(e.target) && e.target !== exitToggle) {
            exitMenu.classList.remove('show');
            exitToggle.classList.remove('active');
            exitMenu.setAttribute('aria-hidden', 'true');
        }
    });
});
