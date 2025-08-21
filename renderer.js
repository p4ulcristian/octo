document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Split.js for the 3-pane layout
    if (typeof Split !== 'undefined') {
        console.log('Initializing split panes...');
        
        try {
            // Vertical split for left container (Explorer and Terminal)
            const leftSplit = Split(['#top-left-panel', '#bottom-left-panel'], {
                sizes: [50, 50],
                minSize: [100, 100],
                gutterSize: 5,
                direction: 'vertical',
                cursor: 'row-resize',
                gutter: (index, direction) => {
                    const gutter = document.createElement('div');
                    gutter.className = `gutter gutter-${direction}`;
                    return gutter;
                }
            });
            
            // Horizontal split between left container and right panel (Browser)
            const mainSplit = Split(['#left-container', '#right-panel'], {
                sizes: [50, 50],
                minSize: [300, 400],
                gutterSize: 5,
                cursor: 'col-resize',
                gutter: (index, direction) => {
                    const gutter = document.createElement('div');
                    gutter.className = `gutter gutter-${direction}`;
                    return gutter;
                },
                onDragEnd: (sizes) => {
                    // Notify main process about panel resize
                    if (window.electronAPI && window.electronAPI.panelResized) {
                        window.electronAPI.panelResized('main', sizes);
                    }
                    updateBrowserMountBounds();
                }
            });
            
            console.log('Split panes initialized successfully');
        } catch (error) {
            console.error('Error initializing split panes:', error);
        }
    }

    // Load system information
    if (window.electronAPI) {
        try {
            const versions = window.electronAPI.getVersions();
            const appVersion = await window.electronAPI.getAppVersion();
            
            // Update version displays if elements exist
            const nodeEl = document.getElementById('node-version');
            const chromeEl = document.getElementById('chrome-version');
            const electronEl = document.getElementById('electron-version');
            const appEl = document.getElementById('app-version');
            
            if (nodeEl) nodeEl.textContent = versions.node;
            if (chromeEl) chromeEl.textContent = versions.chrome;
            if (electronEl) electronEl.textContent = versions.electron;
            if (appEl) appEl.textContent = appVersion;
        } catch (error) {
            console.error('Error loading system info:', error);
        }
    }

    // Handle tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Find parent tab group
            const tabGroup = button.closest('.panel');
            const groupButtons = tabGroup.querySelectorAll('.tab-btn');
            const groupPanes = tabGroup.querySelectorAll('.tab-pane');
            
            // Update button states
            groupButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update pane visibility
            groupPanes.forEach(pane => pane.classList.remove('active'));
            const targetPane = tabGroup.querySelector(`#${targetTab}-tab`);
            if (targetPane) targetPane.classList.add('active');
        });
    });

    // Browser controls
    const urlBar = document.getElementById('url-bar');
    const goBtn = document.getElementById('go-btn');
    const backBtn = document.getElementById('back-btn');
    const forwardBtn = document.getElementById('forward-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const devToolsBtn = document.getElementById('devtools-btn');

    if (goBtn) {
        goBtn.addEventListener('click', () => {
            const url = urlBar.value.trim();
            if (window.electronAPI && window.electronAPI.navigateBrowser) {
                window.electronAPI.navigateBrowser(url);
            }
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (window.electronAPI && window.electronAPI.browserBack) {
                window.electronAPI.browserBack();
            }
        });
    }

    if (forwardBtn) {
        forwardBtn.addEventListener('click', () => {
            if (window.electronAPI && window.electronAPI.browserForward) {
                window.electronAPI.browserForward();
            }
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (window.electronAPI && window.electronAPI.browserRefresh) {
                window.electronAPI.browserRefresh();
            }
        });
    }

    if (devToolsBtn) {
        devToolsBtn.addEventListener('click', () => {
            if (window.electronAPI && window.electronAPI.browserDevTools) {
                window.electronAPI.browserDevTools();
            }
        });
    }

    if (urlBar) {
        urlBar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && goBtn) {
                goBtn.click();
            }
        });
    }

    // Listen for browser navigation
    if (window.electronAPI && window.electronAPI.onBrowserNavigated) {
        window.electronAPI.onBrowserNavigated((url) => {
            if (urlBar) urlBar.value = url;
        });
    }

    // Update time in footer
    function updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        const timeEl = document.getElementById('current-time');
        if (timeEl) timeEl.textContent = timeString;
    }

    updateTime();
    setInterval(updateTime, 1000);

    // Terminal input handling
    const terminalInput = document.querySelector('.terminal-input');
    if (terminalInput) {
        terminalInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const command = e.target.value;
                console.log('Terminal command:', command);
                // Here you would handle the terminal command
                e.target.value = '';
            }
        });
    }

    // Function to update browser mount bounds
    function updateBrowserMountBounds() {
        const browserMount = document.getElementById('browser-mount');
        if (browserMount && window.electronAPI && window.electronAPI.sendBrowserMountBounds) {
            const rect = browserMount.getBoundingClientRect();
            window.electronAPI.sendBrowserMountBounds({
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height
            });
        }
    }

    // Send initial browser mount bounds
    setTimeout(updateBrowserMountBounds, 100);

    // Update bounds on window resize
    window.addEventListener('resize', updateBrowserMountBounds);

    console.log('Application initialized');
});