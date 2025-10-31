document.addEventListener('DOMContentLoaded', () => {
    // --- Data and Utility Functions (Retained from Old Code) ---

    // The 'bible_data' is assumed to be loaded from 'niv.js'
    if (typeof bible_data === 'undefined') {
        console.error("Error: 'niv.js' with 'bible_data' not loaded.");
        return;
    }

    const getAllBooks = () => {
        const books = new Set();
        bible_data.forEach(verse => {
            const parts = verse.name.split(' ');
            const bookName = parts.slice(0, parts.length - 1).join(' ');
            if (bookName) books.add(bookName);
        });
        return Array.from(books);
    };

    const getChapters = (book) => {
        const chapters = new Set();
        bible_data.forEach(verse => {
            const parts = verse.name.split(' ');
            const reference = parts[parts.length - 1];
            const bookName = parts.slice(0, parts.length - 1).join(' ');
            if (bookName === book) {
                const chapter = reference.split(':')[0];
                chapters.add(parseInt(chapter));
            }
        });
        return Array.from(chapters).sort((a, b) => a - b);
    };

    // Utility function to find the maximum verse number in a chapter
    const getMaxVerse = (book, chapter) => {
        const verses = getVerses(book, chapter);
        if (verses.length === 0) return 0;

        const verseNumbers = verses.map(verse => {
            const parts = verse.name.split(':');
            return parseInt(parts[parts.length - 1]);
        });

        return Math.max(...verseNumbers);
    };

    const getVerses = (book, chapter) => {
        return bible_data.filter(verse => {
            const parts = verse.name.split(' ');
            const reference = parts[parts.length - 1];
            const bookName = parts.slice(0, parts.length - 1).join(' ');
            const verseChapter = reference.split(':')[0];
            return bookName === book && String(verseChapter) === String(chapter);
        });
    };

    // Canonical book lists for filtering into testaments
    const OT_BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalm', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'];
    const NT_BOOKS = ['Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'];
    const allBooks = getAllBooks();

    // --- DOM Elements and State ---
    const btnOT = document.getElementById('btnOT');
    const btnNT = document.getElementById('btnNT');
    const chapterSelectorBtn = document.getElementById('chapterSelectorBtn');
    const verseSelectorBtn = document.getElementById('verseSelectorBtn');
    const clearHighlightsBtn = document.getElementById('clearHighlights');
    // NEW Drawing elements
    const startDrawingModeBtn = document.getElementById('startDrawingMode');
    const drawingTools = document.getElementById('drawingTools');
    const toggleDrawingModeBtn = document.getElementById('toggleDrawingMode');
    const clearDrawingBtn = document.getElementById('clearDrawing');
    const colorPicker = document.getElementById('colorPicker');
    const penSizeInput = document.getElementById('penSize');
    
    const verseContainer = document.getElementById('verseContainer');
    const currentReference = document.getElementById('currentReference');

    const bookModal = document.getElementById('bookModal');
    const bookList = document.getElementById('bookList');
    const bookModalTitle = document.getElementById('bookModalTitle');

    const chapterModal = document.getElementById('chapterModal');
    const chapterList = document.getElementById('chapterList');
    const currentBookName = document.getElementById('currentBookName');

    const verseModal = document.getElementById('verseModal');
    const verseList = document.getElementById('verseList');
    const currentChapterReference = document.getElementById('currentChapterReference');

    let selectedBook = null;
    let selectedChapter = null;
    let selectedVerse = null; // null means 'All Verses'

    // NEW: State for Long Press detection
    const LONG_PRESS_DURATION = 600; // milliseconds
    let longPressTriggered = false; // Flag to block click/tap events after a successful long press


    // --- CANVAS DRAWING LOGIC ---
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    
    let isDrawing = false;
    let penColor = colorPicker.value;
    let penSize = parseInt(penSizeInput.value);
    let drawingModeActive = false;

    // Function to resize canvas to match verseContainer dimensions
    function resizeCanvas() {
        // Must use clientWidth/Height for the dimensions
        const rect = verseContainer.getBoundingClientRect();
        
        // Update the canvas resolution
        canvas.width = verseContainer.clientWidth;
        canvas.height = verseContainer.clientHeight;
        
        // Since resizing clears the canvas, we need to handle redrawing here 
        // if we were saving the drawing data. For simplicity, we won't save it 
        // across chapter changes or resizing for this initial implementation.
        // For a full persistence feature, drawing path data would be replayed here.
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penSize;
        ctx.lineCap = 'round';
    }

    function startDrawing(e) {
        if (!drawingModeActive) return;
        isDrawing = true;
        
        // Calculate the relative coordinates (accounting for container's scroll)
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        const rect = canvas.getBoundingClientRect();
        
        ctx.beginPath();
        ctx.moveTo(
            clientX - rect.left, 
            clientY - rect.top + verseContainer.scrollTop // Account for vertical scroll
        );
        e.preventDefault(); // Prevent scrolling/default touch behavior while drawing
    }

    function draw(e) {
        if (!isDrawing || !drawingModeActive) return;

        // Calculate the relative coordinates
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        const rect = canvas.getBoundingClientRect();
        
        ctx.lineTo(
            clientX - rect.left, 
            clientY - rect.top + verseContainer.scrollTop // Account for vertical scroll
        );
        ctx.stroke();
        e.preventDefault(); // Prevent scrolling/default touch behavior while drawing
    }

    function stopDrawing() {
        if (!drawingModeActive) return;
        isDrawing = false;
        ctx.closePath();
    }
    
    // Add drawing listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseleave', stopDrawing);
    
    // Add touch support
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchmove', draw);


    // Update tool settings
    colorPicker.addEventListener('input', (e) => {
        penColor = e.target.value;
        ctx.strokeStyle = penColor;
    });

    penSizeInput.addEventListener('input', (e) => {
        penSize = parseInt(e.target.value);
        ctx.lineWidth = penSize;
    });
    
    clearDrawingBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        showToast('Drawing cleared');
    });

    // Toggle Drawing Mode Handler
    function toggleDrawingUI(activate) {
        drawingModeActive = activate;
        document.body.classList.toggle('drawing-mode-active', activate);
        drawingTools.classList.toggle('hidden', !activate);
        
        if (activate) {
            // Adjust canvas size to fit new content if needed
            resizeCanvas(); 
            startDrawingModeBtn.textContent = 'Exit Draw';
            showToast('Drawing Mode Active');
        } else {
            startDrawingModeBtn.textContent = 'Draw';
            showToast('Drawing Mode Off');
        }
    }
    
    startDrawingModeBtn.addEventListener('click', () => {
        // If drawing mode is OFF, turn it ON.
        if (!drawingModeActive) {
            toggleDrawingUI(true);
        } else {
            // If drawing mode is ON (from the main menu button), turn it OFF.
            toggleDrawingUI(false);
        }
    });

    toggleDrawingModeBtn.addEventListener('click', () => {
        // This is the 'Done' button in the drawing tools panel
        toggleDrawingUI(false);
    });

    // Ensure canvas resizes when the window resizes (handles orientation change on mobile)
    window.addEventListener('resize', resizeCanvas);


    // --- Modal Control Functions ---

    function openModal(modal) {
        // Deactivate drawing mode when opening any modal
        if (drawingModeActive) {
            toggleDrawingUI(false);
        }
        modal.style.display = 'block';
    }

    function closeModal(modal) {
        modal.style.display = 'none';
    }

    // Close Modals when clicking outside or on the close button
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            closeModal(e.target.closest('.modal'));
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === bookModal) closeModal(bookModal);
        if (e.target === chapterModal) closeModal(chapterModal);
        if (e.target === verseModal) closeModal(verseModal);
    });

    // --- UI/Data Population Logic ---

    function populateBookList(testament) {
        bookList.innerHTML = '';
        bookModalTitle.textContent = `${testament} Books`;
        const list = allBooks.filter(b =>
            (testament === 'Old Testament' && OT_BOOKS.includes(b)) ||
            (testament === 'New Testament' && NT_BOOKS.includes(b))
        );

        list.forEach(b => {
            const button = document.createElement('button');
            button.textContent = b;
            button.dataset.book = b;
            button.classList.add('book-button');
            bookList.appendChild(button);
        });
        openModal(bookModal);
    }

    function populateChapterList(book) {
        chapterList.innerHTML = '';
        currentBookName.textContent = `(${book})`;
        const chapters = getChapters(book);

        chapters.forEach(ch => {
            const button = document.createElement('button');
            button.textContent = ch;
            button.dataset.chapter = ch;
            button.classList.add('chapter-button');
            chapterList.appendChild(button);
        });
        openModal(chapterModal);
    }

    // Function to populate the Verse Modal
    function populateVerseList(book, chapter) {
        console.log('selecting verses for', book, chapter);
        if (!book || !chapter) return;
        verseList.innerHTML = '';
        currentChapterReference.textContent = `(${book} ${chapter})`;
        const maxVerse = getMaxVerse(book, chapter);

        // 1. Add "All Verses" option
        const allButton = document.createElement('button');
        allButton.textContent = 'All';
        allButton.dataset.verse = 'all';
        allButton.classList.add('verse-button', 'all-button');
        verseList.appendChild(allButton);

        // 2. Add number buttons
        for (let i = 1; i <= maxVerse; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.dataset.verse = i;
            button.classList.add('verse-button');
            verseList.appendChild(button);
        }
        openModal(verseModal);
    }


    function updateReferenceDisplay() {
        const verseText = selectedVerse === null ? "" : ":" + selectedVerse;

        if (selectedBook && selectedChapter) {
            currentReference.textContent = `${selectedBook} ${selectedChapter}${verseText}`;

            chapterSelectorBtn.textContent = `Ch: ${selectedChapter}`;
            chapterSelectorBtn.disabled = false;

            verseSelectorBtn.textContent = `${verseText?"Vs: " + selectedVerse:"Vs: All"}`;
            verseSelectorBtn.disabled = false; // Enable verse selector
        } else {
            currentReference.textContent = 'Select a book and chapter below.';
            chapterSelectorBtn.textContent = `Ch: -`;
            chapterSelectorBtn.disabled = true;
            verseSelectorBtn.textContent = `Vs: All`;
            verseSelectorBtn.disabled = true;
        }
    }

    // --- Event Listeners for Fixed Menu ---

    btnOT.addEventListener('click', () => {
        btnOT.setAttribute('aria-pressed', 'true');
        btnNT.setAttribute('aria-pressed', 'false');
        populateBookList('Old Testament');
    });

    btnNT.addEventListener('click', () => {
        btnNT.setAttribute('aria-pressed', 'true');
        btnOT.setAttribute('aria-pressed', 'false');
        populateBookList('New Testament');
    });

    chapterSelectorBtn.addEventListener('click', () => {
        if (selectedBook) {
            populateChapterList(selectedBook);
        } else {
            showToast('Please select a book first!');
        }
    });

    // Verse Selector Button Listener
    verseSelectorBtn.addEventListener('click', () => {
        if (selectedBook && selectedChapter) {
            populateVerseList(selectedBook, selectedChapter);
        } else {
            showToast('Please select a book and chapter first!');
        }
    });

    clearHighlightsBtn.addEventListener('click', () => {
        document.querySelectorAll('.highlighted-word').forEach(el => el.classList.remove('highlighted-word'));
        document.querySelectorAll('.highlighted-verse').forEach(el => el.classList.remove('highlighted-verse'));
        showToast('Highlights cleared');
    });

    // --- Book, Chapter, and Verse Selection Handlers (Modal Delegation) ---

    bookList.addEventListener('click', (e) => {
        const button = e.target.closest('.book-button');
        if (!button) return;

        const book = button.dataset.book;

        // Only change chapter/verse if the book changes
        if (selectedBook !== book) {
            selectedBook = book;
            selectedChapter = null;
            selectedVerse = null; // Reset verse
            updateReferenceDisplay();
        }

        closeModal(bookModal);

        // Immediately open chapter selector after book selection
        populateChapterList(selectedBook);
    });

    chapterList.addEventListener('click', (e) => {
        const button = e.target.closest('.chapter-button');
        if (!button) return;

        const chapter = parseInt(button.dataset.chapter);

        selectedChapter = chapter;
        selectedVerse = null; // IMPORTANT: Reset verse when chapter changes
        updateReferenceDisplay();
        closeModal(chapterModal);

        // Display verses for the new selection (All verses in the new chapter)
        displayVerses(selectedBook, selectedChapter, selectedVerse);
    });

    // Verse Selection Handler
    verseList.addEventListener('click', (e) => {
        const button = e.target.closest('.verse-button');
        if (!button) return;

        const verseData = button.dataset.verse;

        if (verseData === 'all') {
            selectedVerse = null; // null means 'All'
        } else {
            selectedVerse = parseInt(verseData);
        }

        updateReferenceDisplay();
        closeModal(verseModal);

        // Display only the selected verse or the whole chapter
        displayVerses(selectedBook, selectedChapter, selectedVerse);
    });

    // --- Verse Display and Interaction Logic (Long-Press for Copy) ---

    function showToast(message, duration = 1200) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        if (toast._hideTimeout) clearTimeout(toast._hideTimeout);
        toast._hideTimeout = setTimeout(() => toast.classList.remove('show'), duration);
    }

    function copyTextToClipboard(textToCopy) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy)
                .then(() => showToast('Copied to clipboard'))
                .catch(err => { console.error('Copy failed', err); showToast('Copy failed'); });
        } else {
            const ta = document.createElement('textarea');
            ta.value = textToCopy;
            document.body.appendChild(ta);
            ta.select();
            let copied = false;
            try { copied = document.execCommand('copy'); } catch (err) { console.error('Fallback copy failed', err); }
            document.body.removeChild(ta);
            showToast(copied ? 'Copied to clipboard' : 'Copy failed');
        }
    }

    // MODIFIED: Helper function for long press, now without scroll-blocking preventDefault
    const setupLongPress = (element, verse) => {
        let pressTimer = null;
        const copyText = `${verse.name} ${verse.verse}`;

        const startPress = (e) => {
            // Only start timer if it's the primary mouse button (0) or a touch
            if (e.button !== 0 && e.type === 'mousedown') return;
            if (drawingModeActive) return; // Disable long press in drawing mode

            clearTimeout(pressTimer);
            longPressTriggered = false;

            pressTimer = setTimeout(() => {
                longPressTriggered = true; // Mark that a long press occurred
                copyTextToClipboard(copyText);
                if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
            }, LONG_PRESS_DURATION);
        };

        const cancelPress = () => {
            clearTimeout(pressTimer);
        };

        // Add listeners
        element.addEventListener('mousedown', startPress);
        element.addEventListener('touchstart', startPress);

        element.addEventListener('mouseup', cancelPress);
        element.addEventListener('mouseleave', cancelPress);
        element.addEventListener('touchend', cancelPress);

        // touchmove will cancel the timer but allow the native scroll action to proceed
        element.addEventListener('touchmove', cancelPress);
    };


    function displayVerses(book, chapter, verse = null) {
        let verses = getVerses(book, chapter);
        
        // CRITICAL FIX START: Preserve the canvas element before clearing innerHTML
        const tempCanvas = document.getElementById('drawingCanvas');
        if (tempCanvas) {
             // 1. Remove the canvas from the container
             tempCanvas.remove();
             // 2. Clear the drawing when a new chapter is loaded (user requested)
             if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); 
        }

        // 3. Now clear the verse container safely
        verseContainer.innerHTML = '';
        
        // 4. Re-append the canvas first (it needs to be the first child for positioning)
        if (tempCanvas) {
             verseContainer.appendChild(tempCanvas);
        }
        // CRITICAL FIX END

        if (verses.length === 0) {
            const message = document.createElement('p');
            message.className = 'initial-message';
            message.textContent = `No verses found for ${book} chapter ${chapter}.`;
            verseContainer.appendChild(message);
            // Resize canvas even for initial message to zero out
            resizeCanvas(); 
            return;
        }

        // Filter down to a single verse if selectedVerse is provided
        if (verse !== null) {
            verses = verses.filter(v => {
                const parts = v.name.split(':');
                const verseNumber = parseInt(parts[parts.length - 1]);
                return verseNumber === verse;
            });
        }

        if (verses.length === 0 && verse !== null) {
            const message = document.createElement('p');
            message.className = 'initial-message';
            message.textContent = `Verse ${verse} not found in ${book} chapter ${chapter}.`;
            verseContainer.appendChild(message);
            resizeCanvas();
            return;
        }

        verses.forEach(verse => {
            const verseDiv = document.createElement('div');
            verseDiv.className = 'verse';

            const referenceSpan = document.createElement('span');
            referenceSpan.className = 'verse-reference';
            referenceSpan.textContent = verse.name;
            verseDiv.appendChild(referenceSpan);

            const textContainer = document.createElement('span');
            textContainer.className = 'verse-text';

            const words = verse.verse.split(/(\s+)/);

            words.forEach(word => {
                if (word.trim()) {
                    const wordSpan = document.createElement('span');
                    wordSpan.textContent = word;
                    wordSpan.className = 'word';

                    // 1. Word Highlight (Simple click)
                    wordSpan.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // Block highlight if long press or drawing mode is active
                        if (longPressTriggered || drawingModeActive) {
                            return;
                        }
                        wordSpan.classList.toggle('highlighted-word');
                    });

                    textContainer.appendChild(wordSpan);
                } else {
                    // Re-add the space or other delimiter
                    textContainer.appendChild(document.createTextNode(word));
                }
            });

            verseDiv.appendChild(textContainer);

            // 1. Setup Long Press for Copy on the WHOLE VERSE CONTAINER (simplified scope)
            setupLongPress(verseDiv, verse);

            // 2. Double click for verse highlight
            verseDiv.addEventListener('dblclick', () => {
                if (drawingModeActive) return; // Disable highlight in drawing mode
                verseDiv.classList.toggle('highlighted-verse');
            });

            // 3. Consume the synthetic click/tap event and clear the longPressTriggered flag
            verseDiv.addEventListener('click', (e) => {
                // IMPORTANT: Prevent the standard click event from triggering if long press fired
                if (longPressTriggered) {
                    e.stopImmediatePropagation();
                    longPressTriggered = false;
                    return;
                }
            });

            // Appending all the verse divs
            verseContainer.appendChild(verseDiv);
        });

        // CRITICAL: Call resize after all content is added to match container size
        // This must be deferred slightly to allow the DOM to fully render the content height.
        setTimeout(resizeCanvas, 50);
    }

    // Initial State Setup
    updateReferenceDisplay();
    // Initial canvas setup
    if (ctx) resizeCanvas(); 
});
