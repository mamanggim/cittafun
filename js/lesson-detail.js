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
    let isLessonDisplayInitialized = false; 
    let lessonDataFullContent = ''; // Menyimpan fullContent yang diambil

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
            sessionName = 'Pagi1'; 
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
        if (progress[`sessionTimer_${savedSessionKey}`]) {
            delete progress[`sessionTimer_${savedSessionKey}`];
        }
        setUserProgress(progress);
    }
    localStorage.setItem('currentSessionKey', currentSessionKey); 

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
        isLessonDisplayInitialized = true; 
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
            console.log('[Profile Pic] User photoURL:', user.photoURL);
        } else {
            profilePictureToggle.src = 'img/default-profile.png';
            console.log('[Profile Pic] Using default profile picture.');
        }
    }

    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            updateProfilePicture();
        } else {
            profilePictureToggle.src = 'img/default-profile.png';
            console.log('[Auth] User not logged in, redirecting to index.html');
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
                lessonDataFullContent = lesson.fullContent || '<p>Konten pelajaran belum tersedia.</p>'; // Simpan di variabel global
                return lessonDataFullContent;
            } else {
                console.error('[Lesson Detail] No lesson found with id:', lessonId);
                lessonTitle.textContent = 'Pelajaran Tidak Ditemukan';
                lessonTitle.dataset.fullTitle = 'Pelajaran Tidak Ditemukan';
                lessonDataFullContent = '<p>Pelajaran dengan ID ini tidak ditemukan.</p>';
                return lessonDataFullContent;
            }
        } catch (err) {
            console.error('[Lesson Detail] Failed to load lesson:', err.message);
            lessonTitle.textContent = 'Error';
            lessonTitle.dataset.fullTitle = 'Error';
            lessonDataFullContent = '<p>Gagal memuat pelajaran. Pastikan file data/lessons.json ada dan valid. Error: ' + err.message + '</p>';
            return lessonDataFullContent;
        }
    }

    // --- Main Lesson Display Initialization ---
    async function initializeLessonDisplay(isResizing = false) {
        if (isLessonDisplayInitialized && !isResizing) {
            console.log('[initializeLessonDisplay] Already initialized, skipping (not a resize event).');
            return;
        }

        console.log(`[initializeLessonDisplay] Initializing lesson display (isResizing: ${isResizing})...`);
        
        // Hanya muat konten jika belum pernah dimuat atau jika ini pertama kali
        if (!isLessonDisplayInitialized || isResizing) {
            await loadLessonContentData(); // Muat atau muat ulang konten
        }

        const progress = getUserProgress();
        if (progress.sessionCompleted) {
            pages = ['<p style="color: var(--bonus-green); font-weight: 600;">Misi selesai untuk sesi ini. Tunggu sesi berikutnya!</p>'];
            currentPage = 0;
            renderCurrentPage();
            isLessonDisplayInitialized = true;
            return;
        }

        // Pastikan lessonDataFullContent sudah terisi
        if (lessonDataFullContent) {
            splitContentIntoPages(lessonDataFullContent);
            isLessonDisplayInitialized = true;
        } else {
            console.error('[initializeLessonDisplay] lessonDataFullContent is empty after loading. Cannot split.');
            pages = ['<p>Gagal memuat konten pelajaran.</p>'];
            currentPage = 0;
            renderCurrentPage();
        }
    }

    // --- Split Content Into Pages ---
    function splitContentIntoPages(content) {
        console.log('[splitContentIntoPages] Starting content split.');
        lessonContentContainer.innerHTML = ''; // Kosongkan konten sebelum split

        // Buat tempDiv untuk pengukuran yang akurat
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.visibility = 'hidden';
        tempDiv.style.left = '-9999px';
        tempDiv.style.width = `${lessonContentContainer.offsetWidth - 30}px`; // Lebar container dikurangi padding .page
        tempDiv.style.padding = '15px'; // Padding internal untuk .page
        tempDiv.style.boxSizing = 'border-box'; 
        
        // Salin gaya penting untuk pengukuran yang akurat
        const computedStyle = window.getComputedStyle(lessonContentContainer);
        tempDiv.style.fontSize = computedStyle.fontSize;
        tempDiv.style.lineHeight = computedStyle.lineHeight;
        tempDiv.style.fontFamily = computedStyle.fontFamily;
        tempDiv.style.fontWeight = computedStyle.fontWeight;
        tempDiv.style.wordBreak = computedStyle.wordBreak;
        tempDiv.style.whiteSpace = 'normal'; // Pastikan wrapping teks
        tempDiv.style.color = 'black'; // Bisa di-override oleh CSS, tapi ini default aman
        tempDiv.style.backgroundColor = 'white'; // Default aman

        document.body.appendChild(tempDiv);

        const headerHeight = document.querySelector('.header-fixed').offsetHeight;
        const mainContentElement = document.querySelector('.content');
        const mainContentStyle = window.getComputedStyle(mainContentElement);
        const mainContentTopPadding = parseInt(mainContentStyle.paddingTop);
        const mainContentBottomPadding = parseInt(mainContentStyle.paddingBottom);
        const lessonDetailPadding = 20; // Top/bottom padding dari .lesson-detail
        const pagePadding = 15; // Top/bottom padding dari .page
        
        const availableHeight = window.innerHeight 
                                - headerHeight 
                                - mainContentTopPadding 
                                - mainContentBottomPadding 
                                - (2 * lessonDetailPadding) 
                                - (2 * pagePadding)
                                - 20; // Margin/offset kecil tambahan untuk amankah
        
        console.log(`[splitContentIntoPages] DYNAMICALLY CALCULATED HEIGHTS:`);
        console.log(`- window.innerHeight: ${window.innerHeight}px`);
        console.log(`- headerHeight: ${headerHeight}px`);
        console.log(`- mainContentTopPadding: ${mainContentTopPadding}px`);
        console.log(`- mainContentBottomPadding: ${mainContentBottomPadding}px`);
        console.log(`- lessonDetailPadding (x2): ${2 * lessonDetailPadding}px`);
        console.log(`- pagePadding (x2): ${2 * pagePadding}px`);
        console.log(`- Additional offset: 20px`);
        console.log(`- Resulting AVAILABLE_HEIGHT for page content: ${availableHeight}px`);

        if (availableHeight <= 50) { // Set minimum height yang lebih masuk akal
            console.error('[splitContentIntoPages] Calculated availableHeight is too small or negative. Cannot split content.');
            pages = ['<p>Kesalahan ukuran layar atau CSS. Tidak dapat menampilkan konten.</p><p>Coba sesuaikan ukuran jendela browser.</p>'];
            document.body.removeChild(tempDiv);
            currentPage = 0;
            renderCurrentPage();
            return;
        }

        pages = [];
        let currentPageHtmlBuffer = '';

        // Parsing konten HTML ke elemen DOM sementara untuk pemisahan yang lebih baik
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const contentElements = Array.from(doc.body.children); // Ambil semua elemen anak tingkat atas

        console.log(`[splitContentIntoPages] Total top-level elements from content: ${contentElements.length}`);

        if (contentElements.length === 0 && content.trim()) {
            // Jika tidak ada elemen top-level tapi ada konten, berarti teks biasa
            contentElements.push(parser.parseFromString(`<p>${content.trim()}</p>`, 'text/html').body.firstChild);
            console.log('[splitContentIntoPages] Content treated as plain text wrapped in <p>.');
        } else if (contentElements.length === 0) {
             pages = ['<p>Konten pelajaran kosong.</p>'];
             document.body.removeChild(tempDiv);
             currentPage = 0;
             renderCurrentPage();
             return;
        }


        contentElements.forEach((element, index) => {
            // Append element to tempDiv to measure its height
            tempDiv.innerHTML = currentPageHtmlBuffer + element.outerHTML;
            const currentBufferHeight = tempDiv.scrollHeight;
            
            console.log(`[splitContentIntoPages] Processing element ${index} (${element.tagName}). Tentative buffer height: ${currentBufferHeight}px.`);

            if (currentBufferHeight > availableHeight && currentPageHtmlBuffer.length > 0) {
                // If adding this element exceeds the page height AND the buffer is not empty
                pages.push(currentPageHtmlBuffer);
                console.log(`[splitContentIntoPages] Page ${pages.length} created. Starting new page with element ${index}.`);
                currentPageHtmlBuffer = element.outerHTML; // Start new page with current element
                
                // Reset tempDiv for the new page buffer to get accurate height for single element
                tempDiv.innerHTML = currentPageHtmlBuffer;
                const singleElementHeight = tempDiv.scrollHeight;
                if (singleElementHeight > availableHeight) {
                    console.warn(`[splitContentIntoPages] Element ${index} (${element.tagName}) is too large (${singleElementHeight}px) to fit on a single page (${availableHeight}px). It will overflow.`);
                    // Jika elemen tunggal terlalu besar, biarkan saja agar tidak hilang, tapi log warning
                }

            } else {
                currentPageHtmlBuffer += element.outerHTML;
            }
        });

        // Add any remaining content in the buffer as the last page
        if (currentPageHtmlBuffer) {
            pages.push(currentPageHtmlBuffer);
        }

        if (pages.length === 0) {
            pages.push('<p>Konten pelajaran tidak dapat ditampilkan. Konten mungkin terlalu pendek atau ada masalah dengan parsing.</p>');
            console.warn('[splitContentIntoPages] No pages created, using fallback content.');
        }

        document.body.removeChild(tempDiv);
        console.log('[splitContentIntoPages] Finished splitting. Total pages:', pages.length);

        currentPage = 0; // Reset ke halaman pertama setelah splitting
        renderCurrentPage();
    }

    // --- Render Current Page ---
    function renderCurrentPage() {
        console.log(`[renderCurrentPage] Rendering page ${currentPage + 1}/${pages.length}`);
        
        // Hapus semua elemen '.page' yang ada di container saat ini
        lessonContentContainer.innerHTML = ''; 

        // Pastikan ada halaman untuk dirender
        if (pages.length === 0) {
            const fallbackPage = document.createElement('div');
            fallbackPage.className = 'page active';
            fallbackPage.innerHTML = '<p>Konten tidak tersedia atau gagal dimuat.</p>';
            lessonContentContainer.appendChild(fallbackPage);
            pageIndicator.textContent = 'Halaman 1 / 1';
            return;
        }

        // Buat elemen untuk halaman yang aktif
        const activePageDiv = document.createElement('div');
        activePageDiv.className = 'page active';
        activePageDiv.dataset.page = currentPage;
        activePageDiv.innerHTML = pages[currentPage];
        lessonContentContainer.appendChild(activePageDiv);

        updatePageNavigation();
    }

    // --- Page Navigation ---
    function updatePageNavigation() {
        if (pageIndicator && pages.length > 0) {
            pageIndicator.textContent = `Halaman ${currentPage + 1} / ${pages.length}`;
        } else if (pageIndicator) {
            pageIndicator.textContent = 'Halaman 0 / 0'; 
        }
    }

    function goToNextPage() {
        if (currentPage < pages.length - 1) {
            const currentPageDiv = lessonContentContainer.querySelector(`.page[data-page="${currentPage}"]`);
            if (currentPageDiv) currentPageDiv.classList.add('leaving-left');

            currentPage++;
            renderCurrentPage(); // Render halaman baru

            const newPageDiv = lessonContentContainer.querySelector(`.page[data-page="${currentPage}"]`);
            if (newPageDiv) {
                newPageDiv.classList.add('entering-right');
                setTimeout(() => {
                    newPageDiv.classList.remove('entering-right');
                    if (currentPageDiv) currentPageDiv.remove(); // Hapus halaman lama setelah transisi
                }, 300); // Sesuaikan dengan durasi transisi CSS
            }
        } else {
            console.log('[Page Navigation] Already on last page.');
        }
    }

    function goToPrevPage() {
        if (currentPage > 0) {
            const currentPageDiv = lessonContentContainer.querySelector(`.page[data-page="${currentPage}"]`);
            if (currentPageDiv) currentPageDiv.classList.add('leaving-right');

            currentPage--;
            renderCurrentPage(); // Render halaman baru

            const newPageDiv = lessonContentContainer.querySelector(`.page[data-page="${currentPage}"]`);
            if (newPageDiv) {
                newPageDiv.classList.add('entering-left');
                setTimeout(() => {
                    newPageDiv.classList.remove('entering-left');
                    if (currentPageDiv) currentPageDiv.remove(); // Hapus halaman lama setelah transisi
                }, 300); // Sesuaikan dengan durasi transisi CSS
            }
        } else {
            console.log('[Page Navigation] Already on first page.');
        }
    }

    // --- Input Handling (Swipe, Drag, Keyboard) ---
    // (Kode ini tetap sama dari revisi sebelumnya)
    lessonContentContainer.addEventListener('touchstart', (e) => {
        startTouchX = e.touches[0].clientX;
    });

    lessonContentContainer.addEventListener('touchmove', (e) => {
        // e.preventDefault(); // Tidak perlu prevent default di sini, biar scrolling vertical tetap jalan
        const touchX = e.touches[0].clientX;
        const deltaX = touchX - startTouchX;
        
        // Hanya trigger swipe jika pergerakan horizontal lebih dominan
        if (Math.abs(deltaX) > Math.abs(e.touches[0].clientY - e.changedTouches[0].clientY)) {
            e.preventDefault(); // Sekarang bisa preventDefault
            if (deltaX > 50) { // Geser ke kanan (prev)
                goToPrevPage();
                startTouchX = touchX; // Reset startX agar tidak terus menerus trigger
            } else if (deltaX < -50) { // Geser ke kiri (next)
                goToNextPage();
                startTouchX = touchX; // Reset startX
            }
        }
    }, { passive: false }); // Gunakan passive: false agar preventDefault() berfungsi

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

        // Pastikan timeRemaining diinisialisasi dari progress.
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
        if (!isTabActive) { // Tab tidak aktif
            if (timerInterval) {
                console.log('[Timer] Pausing timer due to tab inactivity.');
                clearInterval(timerInterval);
                const progress = getUserProgress();
                progress[`sessionTimer_${currentSessionKey}`] = { remaining: timeRemaining };
                setUserProgress(progress);
                timerInterval = null; // Set null agar bisa di-restart
            }
        } else { // Tab aktif kembali
            if (!timerInterval && timeRemaining > 0 && !getUserProgress().sessionCompleted) { // Hanya restart jika belum selesai dan timer belum jalan
                console.log('[Timer] Resuming timer due to tab activity.');
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
    window.addEventListener('load', () => {
        console.log('[Window Load] Starting initial lesson display and timer.');
        initializeLessonDisplay();
        startTimer(); 
    });
    
    // Panggil saat resize untuk menyesuaikan paging jika pelajaran sudah dimuat
    window.addEventListener('resize', () => {
        if (isLessonDisplayInitialized) { 
            console.log('[Resize Event] Re-initializing lesson display due to window resize...');
            // Beri sedikit delay agar DOM punya waktu untuk menyesuaikan setelah resize
            setTimeout(() => initializeLessonDisplay(true), 100); // Pass true untuk isResizing
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
