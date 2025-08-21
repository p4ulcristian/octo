document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Split.js to load
    if (typeof Split === 'undefined') {
        console.error('Split.js not loaded - will work without resizable panels');
    } else {
        console.log('Initializing multiple split panes...');
        
        try {
            // Horizontal split for top section (3 columns)
            const topSplit = Split(['#left-panel', '#middle-panel', '#right-panel'], {
                sizes: [25, 50, 25],
                minSize: [200, 300, 200],
                gutterSize: 6,
                cursor: 'col-resize',
                gutter: (index, direction) => {
                    const gutter = document.createElement('div');
                    gutter.className = `gutter gutter-${direction}`;
                    return gutter;
                }
            });
            
            // Horizontal split for bottom section (3 columns)
            const bottomSplit = Split(['#terminal-panel', '#console-panel', '#tools-panel'], {
                sizes: [33, 34, 33],
                minSize: [150, 150, 150],
                gutterSize: 6,
                cursor: 'col-resize',
                gutter: (index, direction) => {
                    const gutter = document.createElement('div');
                    gutter.className = `gutter gutter-${direction}`;
                    return gutter;
                }
            });
            
            // Vertical split between top and bottom sections
            const verticalSplit = Split(['#top-section', '#bottom-section'], {
                sizes: [70, 30],
                minSize: [200, 100],
                gutterSize: 6,
                direction: 'vertical',
                cursor: 'row-resize',
                gutter: (index, direction) => {
                    const gutter = document.createElement('div');
                    gutter.className = `gutter gutter-${direction}`;
                    return gutter;
                }
            });
            
            console.log('All split panes initialized successfully');
        } catch (error) {
            console.error('Error initializing split panes:', error);
        }
    }
    const versions = window.electronAPI.getVersions();
    document.getElementById('node-version').textContent = versions.node;
    document.getElementById('chrome-version').textContent = versions.chrome;
    document.getElementById('electron-version').textContent = versions.electron;
    
    const appVersion = await window.electronAPI.getAppVersion();
    document.getElementById('app-version').textContent = appVersion;
    
    // Platform info removed as process is not available in renderer
    
    // Handle tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Update button states
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update pane visibility
            tabPanes.forEach(pane => pane.classList.remove('active'));
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });

    updateTime();
    setInterval(updateTime, 1000);

    const urlBar = document.getElementById('url-bar');
    const goBtn = document.getElementById('go-btn');
    const backBtn = document.getElementById('back-btn');
    const forwardBtn = document.getElementById('forward-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const devToolsBtn = document.getElementById('devtools-btn');

    goBtn.addEventListener('click', () => {
        const url = urlBar.value.trim();
        window.electronAPI.navigateBrowser(url);
    });

    backBtn.addEventListener('click', () => {
        window.electronAPI.browserBack();
    });

    forwardBtn.addEventListener('click', () => {
        window.electronAPI.browserForward();
    });

    refreshBtn.addEventListener('click', () => {
        window.electronAPI.browserRefresh();
    });

    devToolsBtn.addEventListener('click', () => {
        window.electronAPI.browserDevTools();
    });

    urlBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            goBtn.click();
        }
    });

    window.electronAPI.onBrowserNavigated((url) => {
        urlBar.value = url;
    });

    const messageInput = document.getElementById('message-input');
    const showMessageBtn = document.getElementById('show-message-btn');
    const clearBtn = document.getElementById('clear-btn');
    const outputLog = document.getElementById('output-log');

    showMessageBtn.addEventListener('click', async () => {
        const message = messageInput.value.trim();
        if (!message) {
            addLogEntry('Please enter a message first!', 'error');
            return;
        }

        addLogEntry(`Showing dialog: "${message}"`, 'info');
        
        const result = await window.electronAPI.showMessage('Custom Message', message);
        
        if (result === 0) {
            addLogEntry('User clicked OK', 'success');
        } else {
            addLogEntry('User clicked Cancel', 'warning');
        }
    });

    clearBtn.addEventListener('click', () => {
        messageInput.value = '';
        outputLog.innerHTML = '';
        addLogEntry('Cleared input and log', 'info');
    });

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            showMessageBtn.click();
        }
    });

    window.electronAPI.onMenuAction((event, data) => {
        if (event.channel === 'menu-new') {
            addLogEntry('Menu: New file', 'info');
            messageInput.value = '';
            outputLog.innerHTML = '';
        } else if (event.channel === 'menu-open') {
            addLogEntry(`Menu: Open - ${data}`, 'info');
        }
    });

    function addLogEntry(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        const timestamp = new Date().toLocaleTimeString();
        entry.textContent = `[${timestamp}] ${message}`;
        
        switch(type) {
            case 'error':
                entry.style.borderLeftColor = '#dc3545';
                break;
            case 'success':
                entry.style.borderLeftColor = '#28a745';
                break;
            case 'warning':
                entry.style.borderLeftColor = '#ffc107';
                break;
            default:
                entry.style.borderLeftColor = '#667eea';
        }
        
        outputLog.appendChild(entry);
        outputLog.scrollTop = outputLog.scrollHeight;
    }

    function updateTime() {
        const now = new Date();
        const timeString = now.toLocaleString();
        document.getElementById('current-time').textContent = timeString;
    }

    addLogEntry('Application initialized', 'success');
});