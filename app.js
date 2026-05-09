document.addEventListener('DOMContentLoaded', async () => {
    // UI Elements
    const homeScreen = document.getElementById('home-screen');
    const editorScreen = document.getElementById('editor-screen');
    const notesList = document.getElementById('notes-list');
    const pagesContainer = document.getElementById('pages-container');
    const layoutSidebar = document.getElementById('layout-sidebar');
    const colorPaletteContainer = document.getElementById('color-palette');
    const editorScrollArea = document.getElementById('pages-scroll-area');
    
    // Header & Sidebar Tools
    const btnCreateNew = document.getElementById('btn-create-new');
    const btnBack = document.getElementById('btn-back');
    const btnSave = document.getElementById('btn-save');
    const btnToggleMenu = document.getElementById('btn-toggle-menu');
    const btnCloseMenu = document.getElementById('btn-close-menu');
    const layoutSelect = document.getElementById('layout-select');
    const togglePenMode = document.getElementById('toggle-pen-mode');
    const btnAddBefore = document.getElementById('btn-add-page-before');
    const btnAddAfter = document.getElementById('btn-add-page-after');
    const btnDeletePage = document.getElementById('btn-delete-page');

    // Floating Tools & Zoom
    const btnPen = document.getElementById('btn-pen');
    const btnEraser = document.getElementById('btn-eraser');
    const penSizeSlider = document.getElementById('pen-size-slider');
    const eraserSizeSlider = document.getElementById('eraser-size-slider');
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const zoomDisplay = document.getElementById('zoom-level-display');

    // App State
    let currentNoteId = null;
    let canvasInstances = [];
    let currentTool = 'pen';
    let activePageIndex = 0;
    
    // Zoom State
    let currentZoomLevel = 1;
    const MIN_ZOOM = 0.3;
    const MAX_ZOOM = 4.0;
    
    // Dynamic Tool Properties
    let currentPenSize = parseInt(penSizeSlider.value);
    let currentEraserSize = parseInt(eraserSizeSlider.value);
    let currentPenColor = '#000000';
    let isStrictPenMode = false;

    // 5 Default Colors
    const paletteColors = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#eab308'];
    const swatchElements = [];

    initColorPalette();
    await NotesDB.init();
    renderNotesList();

    // -- System / Tool Toggles --
    togglePenMode.addEventListener('change', (e) => {
        isStrictPenMode = e.target.checked;
        PalmRejection.setStrictPenMode(isStrictPenMode);
    });

    function initColorPalette() {
        colorPaletteContainer.innerHTML = '';
        paletteColors.forEach((color, index) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            if (index === 0) swatch.classList.add('active');
            swatch.style.backgroundColor = color;
            
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = color;

            colorInput.addEventListener('input', (e) => {
                const newColor = e.target.value;
                swatch.style.backgroundColor = newColor;
                paletteColors[index] = newColor;
                if (swatch.classList.contains('active')) updateGlobalColor(newColor);
            });

            swatch.addEventListener('click', () => {
                swatchElements.forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                updateGlobalColor(colorInput.value);
                if (currentTool === 'eraser') updateGlobalTool('pen');
            });

            swatch.appendChild(colorInput);
            swatchElements.push(swatch);
            colorPaletteContainer.appendChild(swatch);
        });
        currentPenColor = paletteColors[0];
    }

    function updateGlobalColor(color) {
        currentPenColor = color;
        canvasInstances.forEach(cmp => cmp.setPenColor(color));
    }
    function updateGlobalPenSize(size) {
        currentPenSize = size;
        canvasInstances.forEach(cmp => cmp.setPenSize(size));
    }
    function updateGlobalEraserSize(size) {
        currentEraserSize = size;
        canvasInstances.forEach(cmp => cmp.setEraserSize(size));
    }
    function updateGlobalTool(tool) {
        currentTool = tool;
        canvasInstances.forEach(cmp => cmp.setMode(tool));
        if (tool === 'pen') {
            btnPen.classList.add('active'); btnEraser.classList.remove('active');
        } else {
            btnEraser.classList.add('active'); btnPen.classList.remove('active');
        }
    }

    btnPen.addEventListener('click', () => updateGlobalTool('pen'));
    btnEraser.addEventListener('click', () => updateGlobalTool('eraser'));
    penSizeSlider.addEventListener('input', (e) => updateGlobalPenSize(parseInt(e.target.value)));
    eraserSizeSlider.addEventListener('input', (e) => updateGlobalEraserSize(parseInt(e.target.value)));

    // -- Flawless Pinch-to-Zoom & Pan Logic --
    function setZoom(level) {
        currentZoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level));
        document.documentElement.style.setProperty('--zoom-level', currentZoomLevel);
        zoomDisplay.textContent = Math.round(currentZoomLevel * 100) + '%';
    }

    btnZoomIn.addEventListener('click', () => setZoom(currentZoomLevel + 0.25));
    btnZoomOut.addEventListener('click', () => setZoom(currentZoomLevel - 0.25));
    zoomDisplay.addEventListener('click', () => setZoom(1)); 

    let initialPinchDistance = null;
    let initialZoomState = 1;
    let lastMidPoint = null;

    editorScrollArea.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            initialPinchDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialZoomState = currentZoomLevel;
            lastMidPoint = {
                x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                y: (e.touches[0].clientY + e.touches[1].clientY) / 2
            };
        }
    }, { passive: true });

    editorScrollArea.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && initialPinchDistance > 0) {
            e.preventDefault(); // Kills browser scale
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];

            // 1. Scale
            const currentDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
            const scaleChange = currentDistance / initialPinchDistance;
            setZoom(initialZoomState * scaleChange);

            // 2. Multi-finger Pan Support
            const currentMidX = (touch1.clientX + touch2.clientX) / 2;
            const currentMidY = (touch1.clientY + touch2.clientY) / 2;
            if (lastMidPoint) {
                editorScrollArea.scrollLeft -= (currentMidX - lastMidPoint.x);
                editorScrollArea.scrollTop -= (currentMidY - lastMidPoint.y);
            }
            lastMidPoint = { x: currentMidX, y: currentMidY };
        }
    }, { passive: false });

    editorScrollArea.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) {
            initialPinchDistance = null;
            lastMidPoint = null;
        }
    });

    // -- Screen Navigation & Page Generation --
    function showEditor(noteId = null) {
        currentNoteId = noteId;
        homeScreen.classList.remove('active');
        editorScreen.classList.add('active');
        if (!noteId) {
            clearPages();
            createPage(null);
        }
        setZoom(1); 
    }

    function showHome() {
        currentNoteId = null;
        clearPages();
        editorScreen.classList.remove('active');
        homeScreen.classList.add('active');
        layoutSidebar.classList.remove('active');
        renderNotesList();
    }

    function clearPages() {
        pagesContainer.innerHTML = '';
        canvasInstances = [];
        activePageIndex = 0;
    }

    function createPage(dataURL = null, insertIndex = canvasInstances.length) {
        const wrapper = document.createElement('div');
        wrapper.className = 'a4-wrapper';
        wrapper.dataset.index = insertIndex;
        
        const canvas = document.createElement('canvas');
        canvas.width = 794;
        canvas.height = 1123;
        
        const pageLabel = document.createElement('div');
        pageLabel.className = 'page-number';
        
        wrapper.appendChild(canvas);
        wrapper.appendChild(pageLabel);

        wrapper.addEventListener('pointerdown', () => setActivePage(wrapper), {passive: true});

        if (insertIndex >= pagesContainer.children.length) {
            pagesContainer.appendChild(wrapper);
        } else {
            pagesContainer.insertBefore(wrapper, pagesContainer.children[insertIndex]);
        }

        const cmp = new CanvasComponent(canvas);
        cmp.setMode(currentTool);
        cmp.setPenColor(currentPenColor);
        cmp.setPenSize(currentPenSize);
        cmp.setEraserSize(currentEraserSize);
        
        if (dataURL) cmp.loadFromDataURL(dataURL);

        canvasInstances.splice(insertIndex, 0, cmp);
        updatePageNumbers();
        setActivePage(wrapper);
    }

    function updatePageNumbers() {
        const wrappers = pagesContainer.querySelectorAll('.a4-wrapper');
        wrappers.forEach((wrap, index) => {
            wrap.dataset.index = index;
            wrap.querySelector('.page-number').textContent = `Page ${index + 1}`;
        });
    }

    function setActivePage(wrapperElement) {
        const wrappers = pagesContainer.querySelectorAll('.a4-wrapper');
        wrappers.forEach(w => w.classList.remove('active'));
        wrapperElement.classList.add('active');
        activePageIndex = parseInt(wrapperElement.dataset.index);
    }

    async function renderNotesList() {
        notesList.innerHTML = '';
        const notes = await NotesDB.getAllNotes();
        
        if(notes.length === 0) {
            notesList.innerHTML = '<li>No documents found. Create your first one.</li>';
            return;
        }

        notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        notes.forEach(note => {
            const li = document.createElement('li');
            li.className = 'note-card';
            
            const thumbnailURL = Array.isArray(note.pages) ? note.pages[0] : note.dataURL;
            li.style.backgroundImage = `url(${thumbnailURL})`;
            
            const dateStr = new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const pageCount = Array.isArray(note.pages) ? note.pages.length : 1;
            
            const label = document.createElement('span');
            label.textContent = `Doc #${note.id} • ${pageCount} Pages • ${dateStr}`;
            
            li.appendChild(label);
            li.addEventListener('click', async () => {
                const noteData = await NotesDB.getNote(note.id);
                clearPages();
                const pagesArray = Array.isArray(noteData.pages) ? noteData.pages : [noteData.dataURL];
                pagesArray.forEach((pData, idx) => createPage(pData, idx));
                showEditor(note.id);
            });
            notesList.appendChild(li);
        });
    }

    // -- Core Events --
    btnCreateNew.addEventListener('click', () => showEditor(null));
    btnBack.addEventListener('click', showHome);
    btnToggleMenu.addEventListener('click', () => layoutSidebar.classList.toggle('active'));
    btnCloseMenu.addEventListener('click', () => layoutSidebar.classList.remove('active'));

    btnSave.addEventListener('click', async () => {
        const originalText = btnSave.textContent;
        btnSave.textContent = 'Saving...';
        const pagesData = canvasInstances.map(cmp => cmp.getDataURL());
        currentNoteId = await NotesDB.saveNote(pagesData, currentNoteId);
        
        setTimeout(() => {
            btnSave.textContent = 'Saved!';
            setTimeout(() => btnSave.textContent = originalText, 1500);
        }, 300);
    });

    layoutSelect.addEventListener('change', (e) => { pagesContainer.className = e.target.value; });
    btnAddBefore.addEventListener('click', () => createPage(null, activePageIndex));
    btnAddAfter.addEventListener('click', () => createPage(null, activePageIndex + 1));

    btnDeletePage.addEventListener('click', () => {
        if (canvasInstances.length <= 1) { alert('Cannot delete the last page.'); return; }
        const wrapperToRemove = pagesContainer.children[activePageIndex];
        pagesContainer.removeChild(wrapperToRemove);
        canvasInstances.splice(activePageIndex, 1);
        updatePageNumbers();
        const newActiveIndex = activePageIndex > 0 ? activePageIndex - 1 : 0;
        setActivePage(pagesContainer.children[newActiveIndex]);
    });
});