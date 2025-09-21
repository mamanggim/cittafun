// js/lesson-detail.js
document.addEventListener('DOMContentLoaded', () => {
    const lessonTitle = document.getElementById('lesson-title');
    const lessonContentContainer = document.getElementById('lesson-content'); 
    const timerDisplay = document.getElementById('timer');
    const pointsEarned = document.getElementById('points-earned');
    const profilePictureToggle = document.getElementById('profile-picture-toggle');
    const exitMenu = document.getElementById('exit-menu');
    const themeToggle = document.getElementById('theme-toggle');
    const reloadTimer = document.getElementById('reload-timer');
    const pageIndicator = document.getElementById('page-indicator'); 
    const logoutButton = document.getElementById('logout-button');

    let timerInterval;
    let timeRemaining = 10 * 60 * 1000; // 10 menit dalam ms
    let minutesCompleted = 0;
    let points = 0;
    let isTabActive = true;
    let currentPage = 0;
    let pages = [];
    let isDragging = false;
    let startX = 0;
    let startTouchX = 0;
    let isLessonDisplayInitialized = false; // Mengganti isLessonLoaded untuk kontrol inisialisasi

    // --- Sesi & Progress ---
    function getCurrentSession() {
        const now = new Date();
        const hours = now.getHours();
        let date = now.toISOString().split('T')[0];
        let sessionName;

        if (hours >= 6 && hours < 9) sessionName = 'Pagi1';
        else if (hours >= 9 && hours < 12) sessionName = 'Pagi2';
        else if (hours >= 12 && hours < 15) sessionName = 'Siang';
        else if (hours >= 15 && hours < 18) sessionName = 'Sore';
        else if (hours >= 18 && hours < 21) sessionName = 'Malam';
        else {
            sessionName = 'Pagi1'; // Default ke Pagi1, tapi untuk hari berikutnya
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            date = tomorrow.toISOString().split('T')[0];
        }
        return { sessionName, sessionKey: `session_${sessionName}_${date}`, date };
    }

    const { sessionName, sessionKey, date } = getCurrentSession();
    let currentSessionKey = localStorage.getItem('currentSessionKey') || sessionKey;

    const savedSessionDate = localStorage.getItem('currentSessionDate');
    const savedSessionKey = localStorage.getItem('currentSessionKey');
    if (savedSessionDate !== date || savedSessionKey !== sessionKey) {
        console.log('[Session] New session detected or date changed. Resetting progress.');
        localStorage.setItem('currentSessionDate', date);
        localStorage.setItem('currentSessionKey', sessionKey);
        const progress = getUserProgress();
        delete progress.sessionCompleted;
        // Hapus timer sesi lama jika ada
        if (progress[`sessionTimer_${savedSessionKey}`]) {
            delete progress[`sessionTimer_${savedSessionKey}`];
        }
        setUserProgress(progress);
    }
    localStorage.setItem('currentSessionKey', currentSessionKey); // Update currentSessionKey di localStorage

    // --- Dark/Light Mode ---
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.classList.toggle('dark', savedTheme === 'dark');
    themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

    themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeToggle.textContent = isDark ? '☀️' : '🌙';
    });

    // --- Get lesson ID from URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const lessonId = urlParams.get('id');

    if (!lessonId) {
        lessonTitle.textContent = 'Error';
        lessonContentContainer.innerHTML = '<div class="page active" data-page="0"><p>ID pelajaran tidak ditemukan di URL.</p></div>';
        pageIndicator.textContent = 'Halaman 1 / 1';
        pages = ['<p>ID pelajaran tidak ditemukan di URL.</p>'];
        console.error('[Lesson Detail] No lesson ID provided in URL');
        isLessonDisplayInitialized = true; // Set true agar resize tidak mencoba lagi
        return;
    }

    // --- Firebase User & Profile Picture ---
    function getUser() {
        return firebase.auth().currentUser;
    }

    function updateProfilePicture() {
        const user = getUser();
        if (user && user.photoURL) {
            profilePictureToggle.src = user.photoURL;
        } else {
            profilePictureToggle.src = 'img/default-profile.png';
        }
    }

    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            updateProfilePicture();
        } else {
            profilePictureToggle.src = 'img/default-profile.png';
            window.location.href = 'index.html';
        }
    });

    // --- Load Lesson Content Data ---
    async function loadLessonContentData() {
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

    // --- Main Lesson Display Initialization ---
    async function initializeLessonDisplay() {
        if (isLessonDisplayInitialized) {
            console.log('[initializeLessonDisplay] Already initialized, skipping. Or re-initializing due to resize.');
            // Jika ini dari resize, kita perlu set ulang flag untuk proses penuh
            isLessonDisplayInitialized = false; 
        }

        const fullContent = await loadLessonContentData();
        console.log('[initializeLessonDisplay] Fetched full content:', fullContent.substring(0, 100) + '...'); // Log sebagian konten

        const progress = getUserProgress();
        if (progress.sessionCompleted) {
            pages = ['<p style="color: var(--bonus-green); font-weight: 600;">Misi selesai untuk sesi ini. Tunggu sesi berikutnya!</p>'];
            currentPage = 0;
            renderCurrentPage();
            isLessonDisplayInitialized = true;
            return;
        }

        splitContentIntoPages(fullContent);
        isLessonDisplayInitialized = true;
    }

    // --- Split Content Into Pages ---
    function splitContentIntoPages(content) {
        console.log('[splitContentIntoPages] Starting content split.');
        lessonContentContainer.innerHTML = ''; // Kosongkan konten sebelum split

        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.visibility = 'hidden';
        tempDiv.style.left = '-9999px';
        tempDiv.style.boxSizing = 'border-box'; // Penting: pastikan box-sizing konsisten
        // Set lebar tempDiv berdasarkan lessonContentContainer, kurangi padding horizontal dari .page (15px kiri + 15px kanan)
        tempDiv.style.width = `${lessonContentContainer.offsetWidth - 30}px`;
        tempDiv.style.padding = '15px'; // Sesuaikan dengan padding .page
        // Copy relevant styles for accurate measurement
        const computedStyle = window.getComputedStyle(lessonContentContainer);
        tempDiv.style.fontSize = computedStyle.fontSize;
        tempDiv.style.lineHeight = computedStyle.lineHeight;
        tempDiv.style.fontFamily = computedStyle.fontFamily;
        tempDiv.style.color = computedStyle.color;
        document.body.appendChild(tempDiv);

        let cleanedContent = content;
        if (!content.trim().startsWith('<')) {
            cleanedContent = `<p>${content}</p>`;
        }
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(cleanedContent, 'text/html');
        const elements = Array.from(doc.body.childNodes).filter(node => node.nodeType === 1 || (node.nodeType === 3 && node.textContent.trim()));
        
        console.log(`[splitContentIntoPages] Elements parsed: ${elements.length}. First element type: ${elements.length > 0 ? elements[0].nodeName : 'N/A'}`);

        let currentPageContentHtml = '';
        
        // Perhitungan tinggi yang lebih akurat
        // Ambil elemen yang ada di HTML untuk mendapatkan tinggi sebenarnya
        const headerHeight = document.querySelector('.header-fixed').offsetHeight;
        const mainContentElement = document.querySelector('.content');
        const mainContentStyle = window.getComputedStyle(mainContentElement);
        const mainContentTopPadding = parseInt(mainContentStyle.paddingTop);
        const mainContentBottomPadding = parseInt(mainContentStyle.paddingBottom);
        
        // Asumsi .lesson-detail punya padding 20px top/bottom
        const lessonDetailPadding = 20; 
        // Asumsi .page punya padding 15px top/bottom
        const pagePadding = 15; 

        const availableHeight = window.innerHeight 
                                - headerHeight 
                                - mainContentTopPadding 
                                - mainContentBottomPadding 
                                - (2 * lessonDetailPadding) 
                                - (2 * pagePadding);
        
        console.log(`[splitContentIntoPages] DYNAMICALLY CALCULATED HEIGHTS:`);
        console.log(`- window.innerHeight: ${window.innerHeight}px`);
        console.log(`- headerHeight: ${headerHeight}px`);
        console.log(`- mainContentTopPadding: ${mainContentTopPadding}px`);
        console.log(`- mainContentBottomPadding: ${mainContentBottomPadding}px`);
        console.log(`- lessonDetailPadding (x2): ${2 * lessonDetailPadding}px`);
        console.log(`- pagePadding (x2): ${2 * pagePadding}px`);
        console.log(`- Resulting AVAILABLE_HEIGHT for page content: ${availableHeight}px`);
        
        if (availableHeight <= 0) {
            console.error('[splitContentIntoPages] Calculated availableHeight is zero or negative. This will prevent content from splitting correctly.');
            pages = ['<p>Kesalahan ukuran layar, tidak dapat membagi konten.</p><p>Coba sesuaikan ukuran jendela browser atau periksa CSS Anda.</p>'];
            document.body.removeChild(tempDiv);
            currentPage = 0;
            renderCurrentPage();
            return;
        }

        pages = [];

        elements.forEach((el, index) => {
            const elHtml = (el.nodeType === 1) ? el.outerHTML : `<p>${el.textContent.trim()}</p>`;
            
            // Coba tambahkan elemen saat ini ke currentPageContentHtml
            tempDiv.innerHTML = currentPageContentHtml + elHtml;
            const newHeight = tempDiv.scrollHeight;
            
            // Log setiap elemen yang diproses
            console.log(`[splitContentIntoPages] Processing El ${index} (${el.nodeName}). Current tempDiv height (with new el): ${newHeight}px. Current page content length: ${currentPageContentHtml.length}.`);

            if (newHeight > availableHeight && currentPageContentHtml) {
                // Jika menambahkan elemen ini melebihi tinggi yang tersedia DAN halaman saat ini tidak kosong
                pages.push(currentPageContentHtml);
                console.log(`[splitContentIntoPages] Page ${pages.length} created. Starting new page with El ${index}.`);
                currentPageContentHtml = elHtml; // Mulai halaman baru dengan elemen ini
            } else {
                currentPageContentHtml += elHtml;
            }
        });

        if (currentPageContentHtml) {
            pages.push(currentPageContentHtml);
            console.log(`[splitContentIntoPages] Final page created. Total pages: ${pages.length}`);
        }

        if (pages.length === 0) {
            pages.push('<p>Konten pelajaran tidak dapat ditampilkan. Konten mungkin terlalu pendek atau ada masalah dengan parsing.</p>');
            console.warn('[splitContentIntoPages] No pages created, using fallback content.');
        }

        document.body.removeChild(tempDiv);
        console.log('[splitContentIntoPages] Finished splitting. Total pages:', pages.length);

        currentPage = 0;
        renderCurrentPage();
    }

    // --- Render Current Page ---
    function renderCurrentPage() {
        console.log(`[renderCurrentPage] Rendering page ${currentPage + 1}/${pages.length}`);
        // Hapus semua elemen '.page' yang ada di container
        lessonContentContainer.querySelectorAll('.page').forEach(p => p.remove());

        // Pastikan ada halaman untuk dirender
        if (pages.length === 0) {
            const fallbackPage = document.createElement('div');
            fallbackPage.className = 'page active';
            fallbackPage.innerHTML = '<p>Konten tidak tersedia atau gagal dimuat.</p>';
            lessonContentContainer.appendChild(fallbackPage);
            pageIndicator.textContent = 'Halaman 1 / 1';
            return;
        }

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
            // Halaman-halaman lain tidak perlu kelas khusus jika tidak aktif, next, atau prev.
        });
        updatePageNavigation();
    }

    // --- Page Navigation ---
    function updatePageNavigation() {
        if (pageIndicator && pages.length > 0) {
            pageIndicator.textContent = `Halaman ${currentPage + 1} / ${pages.length}`;
        } else if (pageIndicator) {
            pageIndicator.textContent = 'Halaman 0 / 0'; // Jika tidak ada halaman
        }
    }

    function goToNextPage() {
        if (currentPage < pages.length - 1) {
            currentPage++;
            renderCurrentPage();
        } else {
            console.log('[Page Navigation] Already on last page.');
        }
    }

    function goToPrevPage() {
        if (currentPage > 0) {
            currentPage--;
            renderCurrentPage();
        } else {
            console.log('[Page Navigation] Already on first page.');
        }
    }

    // --- Input Handling (Swipe, Drag, Keyboard) ---
    lessonContentContainer.addEventListener('touchstart', (e) => {
        startTouchX = e.touches[0].clientX;
    });

    lessonContentContainer.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touchX = e.touches[0].clientX;
        const deltaX = touchX - startTouchX;
        if (deltaX > 50) {
            goToPrevPage();
            startTouchX = touchX;
        } else if (deltaX < -50) {
            goToNextPage();
            startTouchX = touchX;
        }
    });

    lessonContentContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        lessonContentContainer.style.cursor = 'grabbing';
    });

    lessonContentContainer.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - startX;
            if (Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    goToPrevPage();
                } else {
                    goToNextPage();
                }
                isDragging = false;
                lessonContentContainer.style.cursor = 'grab';
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

    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            goToPrevPage();
        }
        else if (e.key === 'ArrowRight') {
            e.preventDefault();
            goToNextPage();
        }
    });

    // --- UI Helpers ---
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
        }, 3000);
    });

    function formatTime(ms) {
        if (ms < 0) ms = 0;
        const minutes = Math.floor(ms / 1000 / 60);
        const seconds = Math.floor((ms / 1000) % 60);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function triggerAd() {
        console.log('[Monetag] Iklan popunder ditampilkan');
        // Implementasi Monetag jika ada
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
        }, 4000);
    }

    // --- Progress & Points Management ---
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

    // --- Timer Logic ---
    function startTimer() {
        const progress = getUserProgress();
        const timerKey = `sessionTimer_${currentSessionKey}`;

        if (progress.sessionCompleted) {
            timerDisplay.textContent = '00:00';
            pointsEarned.textContent = `Poin: 500`;
            return;
        }

        timeRemaining = progress[timerKey]?.remaining || 10 * 60 * 1000;
        minutesCompleted = Math.floor((10 * 60 * 1000 - timeRemaining) / (60 * 1000));
        points = minutesCompleted * 50;
        pointsEarned.textContent = `Poin: ${points}`;

        timerDisplay.textContent = formatTime(timeRemaining);
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
                    // Gunakan setTimeout agar user bisa melihat popup sebelum redirect
                    setTimeout(() => window.location.href = 'dashboard.html#section-missions', 4000);
                } else if (timeRemaining % (60 * 1000) === 0) { // Setiap 1 menit
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

    // --- Event Listeners untuk Inisialisasi ---
    // Gunakan 'load' event untuk memastikan semua aset (CSS, gambar) telah dimuat
    // sebelum kita mencoba mengukur elemen untuk splitContentIntoPages.
    window.addEventListener('load', () => {
        console.log('[Window Load] Starting initial lesson display and timer.');
        initializeLessonDisplay();
        startTimer(); // Pastikan timer dimulai setelah semua inisialisasi awal
    });
    
    // Panggil saat resize untuk menyesuaikan paging jika pelajaran sudah dimuat
    window.addEventListener('resize', () => {
        if (isLessonDisplayInitialized) { 
            console.log('[Resize Event] Re-initializing lesson display due to window resize...');
            // Beri sedikit delay agar DOM punya waktu untuk menyesuaikan setelah resize
            setTimeout(() => initializeLessonDisplay(), 100); 
        }
    });

    // --- Exit Dropdown & Logout ---
    profilePictureToggle.addEventListener('click', (e) => { 
        e.stopPropagation();
        const isShown = exitMenu.classList.toggle('show');
        profilePictureToggle.classList.toggle('active', isShown);
        exitMenu.setAttribute('aria-hidden', !isShown);
    });

    document.addEventListener('click', (e) => {
        if (!exitMenu.contains(e.target) && e.target !== profilePictureToggle) {
            exitMenu.classList.remove('show');
            profilePictureToggle.classList.remove('active');
            exitMenu.setAttribute('aria-hidden', 'true');
        }
    });

    logoutButton.addEventListener('click', async () => {
        try {
            await firebase.auth().signOut();
            localStorage.removeItem('userProgress');
            window.location.href = 'index.html';
        } catch (error) {
            console.error("Error logging out:", error);
            alert("Gagal logout. Silakan coba lagi.");
        }
    });
});
