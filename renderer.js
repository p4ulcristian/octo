// Check if scripts load
window.addEventListener('load', () => {
    console.log('Window loaded - Terminal available:', typeof Terminal);
    console.log('window.Terminal:', window.Terminal);
    console.log('AppBundle:', typeof AppBundle);
    console.log('TestBundle:', window.TestBundle);
    console.log('All scripts loaded');
});

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Split.js for the 3-pane layout
    if (typeof Split !== 'undefined') {
        console.log('Initializing split panes...');
        
        try {
            // Only horizontal split between left container and right panel (Browser)
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
    function initializeTabSwitching() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');
        
        console.log('Found tab buttons:', tabButtons.length);
        console.log('Found tab panes:', tabPanes.length);
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                console.log('Tab clicked:', targetTab);
                
                // Find parent tab group
                const tabGroup = button.closest('.panel');
                const groupButtons = tabGroup.querySelectorAll('.tab-btn');
                const groupPanes = tabGroup.querySelectorAll('.tab-pane');
                
                console.log('Group buttons:', groupButtons.length);
                console.log('Group panes:', groupPanes.length);
                
                // Update button states
                groupButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update pane visibility
                groupPanes.forEach(pane => {
                    pane.classList.remove('active');
                    console.log('Removed active from:', pane.id);
                });
                
                const targetPane = tabGroup.querySelector(`#${targetTab}-tab`);
                console.log('Target pane:', targetPane);
                
                if (targetPane) {
                    targetPane.classList.add('active');
                    console.log('Added active to:', targetPane.id);
                } else {
                    console.log('Target pane not found for:', targetTab);
                }
            });
        });
    }
    
    // Initialize tab switching
    initializeTabSwitching();

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


    // CodeMirror Editor
    let codeMirrorEditor = null;

    // Initialize xterm.js terminal
    let terminal = null;
    
    function initializeTerminal() {
        const terminalElement = document.getElementById('xterm-terminal');
        terminal = new Terminal({
            cols: 80,
            rows: 24,
            fontSize: 14,
            fontFamily: 'Consolas, "Courier New", monospace',
            theme: {
                background: '#1e1e1e',
                foreground: '#ffffff'
            }
        });
        terminal.open(terminalElement);
        
        // Start the terminal process
        if (window.electronAPI && window.electronAPI.terminalStart) {
            window.electronAPI.terminalStart().then(() => {
                console.log('Terminal process started');
            }).catch(error => {
                console.error('Failed to start terminal:', error);
                terminal.write('Failed to start terminal process\r\n');
            });
            
            // Listen for output from the terminal process
            window.electronAPI.onTerminalOutput((data) => {
                terminal.write(data);
            });
            
            // Send input to the terminal process with local echo
            terminal.onData(data => {
                // Show what you're typing (local echo)
                if (data === '\r') { // Enter key
                    terminal.write('\r\n');
                } else if (data === '\u007f') { // Backspace
                    terminal.write('\b \b');
                } else if (data >= ' ') { // Printable characters
                    terminal.write(data);
                }
                
                if (window.electronAPI && window.electronAPI.terminalWrite) {
                    window.electronAPI.terminalWrite(data);
                }
            });
            
            
        } else {
            // Fallback to echo mode if no terminal API
            terminal.write('Terminal API not available - echo mode\r\n$ ');
            let currentLine = '';
            terminal.onData(data => {
                if (data === '\r') {
                    terminal.write('\r\n');
                    if (currentLine.trim()) {
                        terminal.write(`You typed: ${currentLine}\r\n`);
                    }
                    currentLine = '';
                    terminal.write('$ ');
                } else if (data === '\u007f') {
                    if (currentLine.length > 0) {
                        currentLine = currentLine.slice(0, -1);
                        terminal.write('\b \b');
                    }
                } else {
                    currentLine += data;
                    terminal.write(data);
                }
            });
        }
    }

    // Initialize CodeMirror Editor
    function initializeCodeMirror() {
        const editorContainer = document.getElementById('codemirror-editor');
        if (editorContainer && !codeMirrorEditor) {
            // Load CodeMirror 5 (simpler, no modules needed)
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css';
            document.head.appendChild(cssLink);
            
            const themeCss = document.createElement('link');
            themeCss.rel = 'stylesheet';
            themeCss.href = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/dracula.min.css';
            document.head.appendChild(themeCss);
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js';
            script.onload = () => {
                const jsMode = document.createElement('script');
                jsMode.src = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js';
                jsMode.onload = () => {
                    window.codeMirrorEditor = CodeMirror(editorContainer, {
                        value: 'function hello() {\n  console.log("Hello CodeMirror!");\n}',
                        mode: 'javascript',
                        theme: 'dracula',
                        lineNumbers: true,
                        autoCloseBrackets: true,
                        matchBrackets: true,
                        indentUnit: 2,
                        tabSize: 2
                    });
                    console.log('CodeMirror editor created successfully');
                };
                document.head.appendChild(jsMode);
            };
            document.head.appendChild(script);
        }
    }

    // Initialize CodeMirror when editor tab is clicked
    const editorTabBtn = document.querySelector('[data-tab="editor"]');
    if (editorTabBtn) {
        editorTabBtn.addEventListener('click', () => {
            if (!codeMirrorEditor) {
                initializeCodeMirror();
                codeMirrorEditor = true; // Mark as initialized
            }
        });
    }
    
    // Initialize terminal when terminal tab is clicked
    const terminalTabBtn = document.querySelector('[data-tab="terminal"]');
    if (terminalTabBtn) {
        terminalTabBtn.addEventListener('click', () => {
            setTimeout(() => {
                if (!terminal) {
                    initializeTerminal();
                }
            }, 100);
        });
    }

    console.log('Application initialized');
});