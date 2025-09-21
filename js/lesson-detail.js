// js/lesson-detail.js
import { auth, db } from './firebase-config.js';
import { doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

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
    let timeRemaining;
    let isTabActive = true;
    let currentPage = 0;
    let pages = [];
    let isDragging = false;
    let startX = 0;
    let startTouchX = 0;
    let isLessonDisplayInitialized = false; 
    let lessonDataFullContent = '';
    let userDocRef;

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
    function updateProfilePicture(user) {
        if (user && user.photoURL) {
            profilePictureToggle.src = user.photoURL;
        } else {
            profilePictureToggle.src = 'img/default-profile.png';
        }
    }

    onAuthStateChanged(auth, async user => {
        if (user) {
            userDocRef = doc(db, "users", user.uid);
            updateProfilePicture(user);
            await checkAndResetSession(user);
            initializeLessonAndTimer();
        } else {
            window.location.href = 'index.html';
        }
    });

    async function checkAndResetSession() {
      if (!userDocRef) return;
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const storedSessionDate = userData.sessions?.[sessionKey]?.date;

        if (storedSessionDate !== date) {
          console.log('[Session] New session detected. Resetting progress on Firestore.');
          const newSessionData = {
            [sessionKey]: {
              date: date,
              sessionCompleted: false,
              timeRemaining: 10 * 60 * 1000,
              pointsEarned: 0
            }
          };
          await setDoc(userDocRef, { sessions: newSessionData }, { merge: true });
        }
      }
    }

    // --- Load Lesson Content Data ---
    async function loadLessonContentData() {
        try {
            const response = await fetch('data/lessons.json');
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const lessons = await response.json();
            const lesson = lessons.find(l => l.id === lessonId);
            if (lesson) {
                lessonTitle.textContent = lesson.title;
                lessonTitle.dataset.fullTitle = lesson.title;
                lessonDataFullContent = lesson.fullContent || '<p>Konten pelajaran belum tersedia.</p>'; 
                return lessonDataFullContent;
            } else {
                lessonTitle.textContent = 'Pelajaran Tidak Ditemukan';
                lessonTitle.dataset.fullTitle = 'Pelajaran Tidak Ditemukan';
                lessonDataFullContent = '<p>Pelajaran dengan ID ini tidak ditemukan.</p>';
                return lessonDataFullContent;
            }
        } catch (err) {
            console.error('[Lesson Detail] Failed to load lesson:', err.message);
            lessonTitle.textContent = 'Error';
            lessonTitle.dataset.fullTitle = 'Error';
            lessonDataFullContent = '<p>Gagal memuat pelajaran. Error: ' + err.message + '</p>';
            return lessonDataFullContent;
        }
    }

    // --- Main Lesson Display Initialization ---
    async function initializeLessonAndTimer(isResizing = false) {
        if (isLessonDisplayInitialized && !isResizing) {
            return;
        }

        if (!isLessonDisplayInitialized || isResizing || !lessonDataFullContent) {
            await loadLessonContentData(); 
        }

        const userDocSnap = await getDoc(userDocRef);
        const userData = userDocSnap.data();
        const sessionData = userData.sessions?.[sessionKey] || {};
        
        if (sessionData.sessionCompleted) {
            pages = ['<p style="color: var(--bonus-green); font-weight: 600;">Misi selesai untuk sesi ini. Tunggu sesi berikutnya!</p>'];
            currentPage = 0;
            renderCurrentPage();
            disableTimerAndPoints();
        } else {
            if (lessonDataFullContent) {
                splitContentIntoPages(lessonDataFullContent);
            } else {
                pages = ['<p>Gagal memuat konten pelajaran.</p>'];
                currentPage = 0;
                renderCurrentPage();
            }
            startGlobalTimer();
        }
        isLessonDisplayInitialized = true;
    }

    // --- Split Content Into Pages ---
    function splitContentIntoPages(content) {
        console.log('[splitContentIntoPages] Starting content split.');
        lessonContentContainer.innerHTML = '';

        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.visibility = 'hidden';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '-9999px';
        tempDiv.style.width = `${lessonContentContainer.offsetWidth - 30}px`;
        tempDiv.style.padding = '15px';
        tempDiv.style.boxSizing = 'border-box';
        
        const computedStyle = window.getComputedStyle(lessonContentContainer);
        tempDiv.style.fontSize = computedStyle.fontSize;
        tempDiv.style.lineHeight = computedStyle.lineHeight;
        tempDiv.style.fontFamily = computedStyle.fontFamily;
        tempDiv.style.fontWeight = computedStyle.fontWeight;
        tempDiv.style.wordBreak = computedStyle.wordBreak;
        tempDiv.style.whiteSpace = 'normal'; 
        tempDiv.style.color = computedStyle.color;
        tempDiv.style.backgroundColor = computedStyle.backgroundColor;

        document.body.appendChild(tempDiv);

        const headerHeight = document.querySelector('.header-fixed').offsetHeight;
        const mainContentElement = document.querySelector('.content');
        const mainContentStyle = window.getComputedStyle(mainContentElement);
        const mainContentTopPadding = parseInt(mainContentStyle.paddingTop);
        const mainContentBottomPadding = parseInt(mainContentStyle.paddingBottom);
        const lessonDetailPadding = 20; 
        const pagePadding = 15; 
        
        const footerControlsElement = document.querySelector('.footer-controls');
        const footerControlsHeight = footerControlsElement ? footerControlsElement.offsetHeight : 0;
        const footerControlsMargin = footerControlsElement ? parseInt(window.getComputedStyle(lessonContentContainer).marginBottom) : 0;

        const availableHeight = window.innerHeight 
                                - headerHeight 
                                - mainContentTopPadding 
                                - mainContentBottomPadding 
                                - (2 * lessonDetailPadding) 
                                - (2 * pagePadding)
                                - footerControlsHeight
                                - footerControlsMargin
                                - 10;

        console.log(`[splitContentIntoPages] DYNAMICALLY CALCULATED HEIGHTS:`);
        console.log(`- window.innerHeight: ${window.innerHeight}px`);
        console.log(`- headerHeight: ${headerHeight}px`);
        console.log(`- mainContentTopPadding: ${mainContentTopPadding}px`);
        console.log(`- mainContentBottomPadding: ${mainContentBottomPadding}px`);
        console.log(`- lessonDetailPadding (x2): ${2 * lessonDetailPadding}px`);
        console.log(`- pagePadding (x2): ${2 * pagePadding}px`);
        console.log(`- footerControlsHeight: ${footerControlsHeight}px`);
        console.log(`- footerControlsMargin (from lesson-content): ${footerControlsMargin}px`);
        console.log(`- Additional offset: 10px`);
        console.log(`- Resulting AVAILABLE_HEIGHT for page content: ${availableHeight}px`);

        if (availableHeight <= 50) { 
            console.error('[splitContentIntoPages] Calculated availableHeight is too small or negative. Cannot split content.');
            pages = ['<p>Kesalahan ukuran layar atau CSS. Tidak dapat menampilkan konten.</p><p>Coba sesuaikan ukuran jendela browser. (Tinggi tersedia: ' + availableHeight + 'px)</p>'];
            document.body.removeChild(tempDiv);
            currentPage = 0;
            renderCurrentPage();
            return;
        }

        pages = [];
        let currentPageHtmlBuffer = '';

        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const contentElements = Array.from(doc.body.children).filter(el => el.nodeType === 1); 

        console.log(`[splitContentIntoPages] Total top-level elements from content: ${contentElements.length}`);

        if (contentElements.length === 0 && content.trim()) {
            const pElement = document.createElement('p');
            pElement.textContent = content.trim();
            contentElements.push(pElement);
            console.log('[splitContentIntoPages] Content treated as plain text wrapped in <p>.');
        } else if (contentElements.length === 0 && !content.trim()) {
             pages = ['<p>Konten pelajaran kosong.</p>'];
             document.body.removeChild(tempDiv);
             currentPage = 0;
             renderCurrentPage();
             return;
        }

        contentElements.forEach((element, index) => {
            const elementHtml = element.outerHTML;
            
            tempDiv.innerHTML = currentPageHtmlBuffer + elementHtml;
            const currentBufferHeight = tempDiv.scrollHeight;
            
            console.log(`[splitContentIntoPages] Processing element ${index} (${element.tagName}). Tentative buffer height: ${currentBufferHeight}px.`);

            if (currentBufferHeight > availableHeight && currentPageHtmlBuffer.length > 0) {
                pages.push(currentPageHtmlBuffer);
                console.log(`[splitContentIntoPages] Page ${pages.length} created. Starting new page with element ${index}.`);
                currentPageHtmlBuffer = elementHtml;
                
                tempDiv.innerHTML = currentPageHtmlBuffer;
                const singleElementHeight = tempDiv.scrollHeight;
                if (singleElementHeight > availableHeight) {
                    console.warn(`[splitContentIntoPages] Element ${index} (${element.tagName}) is too large (${singleElementHeight}px) to fit on a single page (${availableHeight}px). It will overflow.`);
                }
            } else {
                currentPageHtmlBuffer += elementHtml;
            }
        });

        if (currentPageHtmlBuffer) {
            pages.push(currentPageHtmlBuffer);
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
        
        lessonContentContainer.innerHTML = ''; 

        if (pages.length === 0) {
            console.warn('[renderCurrentPage] No pages to render, displaying fallback.');
            const fallbackPage = document.createElement('div');
            fallbackPage.className = 'page active';
            fallbackPage.innerHTML = '<p>Konten tidak tersedia atau gagal dimuat.</p>';
            lessonContentContainer.appendChild(fallbackPage);
            pageIndicator.textContent = 'Halaman 1 / 1';
            return;
        }

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
            
            renderCurrentPage(); 

            const newPageDiv = lessonContentContainer.querySelector(`.page[data-page="${currentPage}"]`);
            if (newPageDiv) {
                newPageDiv.classList.add('entering-right');
                newPageDiv.addEventListener('transitionend', function handler() {
                    newPageDiv.classList.remove('entering-right');
                    if (currentPageDiv) currentPageDiv.remove();
                    newPageDiv.removeEventListener('transitionend', handler);
                }, {once: true});
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

            renderCurrentPage();

            const newPageDiv = lessonContentContainer.querySelector(`.page[data-page="${currentPage}"]`);
            if (newPageDiv) {
                newPageDiv.classList.add('entering-left');
                newPageDiv.addEventListener('transitionend', function handler() {
                    newPageDiv.classList.remove('entering-left');
                    if (currentPageDiv) currentPageDiv.remove();
                    newPageDiv.removeEventListener('transitionend', handler);
                }, {once: true});
            }
        } else {
            console.log('[Page Navigation] Already on first page.');
        }
    }

    // --- Input Handling (Swipe, Drag, Keyboard) ---
    lessonContentContainer.addEventListener('touchstart', (e) => {
        startTouchX = e.touches[0].clientX;
    });

    lessonContentContainer.addEventListener('touchmove', (e) => {
        const touchX = e.touches[0].clientX;
        const deltaX = touchX - startTouchX;
        
        if (Math.abs(deltaX) > Math.abs(e.touches[0].clientY - e.changedTouches[0].clientY)) {
            e.preventDefault(); 
            if (deltaX > 50) { 
                goToPrevPage();
                startTouchX = touchX; 
            } else if (deltaX < -50) { 
                goToNextPage();
                startTouchX = touchX; 
            }
        }
    }, { passive: false }); 

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

    // --- Firestore Timer & Points Logic ---
    async function updatePointsInFirestore(pointsToAdd) {
        if (!userDocRef) return;
        const userDocSnap = await getDoc(userDocRef);
        const currentPoints = userDocSnap.data().points || 0;
        await setDoc(userDocRef, { points: currentPoints + pointsToAdd }, { merge: true });
    }

    function startGlobalTimer() {
        if (timerInterval) clearInterval(timerInterval); 

        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            const userData = docSnap.data();
            const sessionData = userData.sessions?.[sessionKey] || {};
            timeRemaining = sessionData.timeRemaining || 10 * 60 * 1000;
            const sessionCompleted = sessionData.sessionCompleted || false;
            
            if (sessionCompleted) {
                disableTimerAndPoints();
                unsubscribe(); // Stop listening
                return;
            }

            timerDisplay.textContent = formatTime(timeRemaining);
            const minutesCompleted = Math.floor((10 * 60 * 1000 - timeRemaining) / (60 * 1000));
            const calculatedPoints = minutesCompleted * 50;
            pointsEarned.textContent = `Poin: ${calculatedPoints}`;
        });

        // Start local timer that syncs to Firestore
        timerInterval = setInterval(async () => {
            if (isTabActive) {
                timeRemaining -= 1000;
                
                const userDocSnap = await getDoc(userDocRef);
                const userData = userDocSnap.data();
                const sessionData = userData.sessions?.[sessionKey] || {};

                const minutesCompleted = Math.floor((10 * 60 * 1000 - timeRemaining) / (60 * 1000));
                let newPointsEarned = minutesCompleted * 50;
                let finalPointsToAdd = 0;

                // Check for point milestones
                if (timeRemaining <= 0) {
                    newPointsEarned = 500; // Final bonus points
                    finalPointsToAdd = 500 - (sessionData.pointsEarned || 0);
                    // No need to save a separate sessionCompleted flag in Firestore, 
                    // we can just check if timeRemaining is 0.
                } else if (timeRemaining % (60 * 1000) === 0) {
                    finalPointsToAdd = 50;
                }

                // Update Firestore
                const updatedSessionData = {
                  [sessionKey]: {
                    timeRemaining: timeRemaining,
                    pointsEarned: newPointsEarned,
                    date: date
                  }
                };
                await setDoc(userDocRef, { sessions: updatedSessionData }, { merge: true });
                if (finalPointsToAdd > 0) {
                    await updatePointsInFirestore(finalPointsToAdd);
                }

                if (timeRemaining <= 0) {
                    clearInterval(timerInterval);
                    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, duration: 2000 });
                    showGamePopup('Waktu membaca selesai! Anda mendapatkan 500 poin.');
                    setTimeout(() => window.location.href = 'dashboard.html#section-missions', 4000);
                } else if (timeRemaining % (60 * 1000) === 0) {
                    triggerAd();
                    showFloatingPoints(50);
                    showGamePopup('1 menit selesai! +50 poin');
                    confetti({ particleCount: 50, spread: 60, duration: 2000 });
                }
            }
        }, 1000);
    }
    
    function disableTimerAndPoints() {
        if (timerInterval) clearInterval(timerInterval);
        timerDisplay.style.color = 'gray';
        pointsEarned.style.color = 'gray';
        reloadTimer.style.display = 'none';
        timerDisplay.textContent = 'Selesai';
    }

    reloadTimer.addEventListener('click', () => {
        window.location.reload();
    });

    document.addEventListener('visibilitychange', () => {
        isTabActive = document.visibilityState === 'visible';
    });
    
    window.addEventListener('resize', () => {
        if (isLessonDisplayInitialized) { 
            setTimeout(() => initializeLessonAndTimer(true), 100); 
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
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error("Error logging out:", error);
            alert("Gagal logout. Silakan coba lagi.");
        }
    });
});
