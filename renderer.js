// Check if scripts load
window.addEventListener('load', () => {
    console.log('Window loaded - Terminal available:', typeof Terminal);
    console.log('window.Terminal:', window.Terminal);
    console.log('AppBundle:', typeof AppBundle);
    console.log('TestBundle:', window.TestBundle);
    console.log('All scripts loaded');
});

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Split.js with simple approach
    let splitInstance = null;
    
    function initializeSplit() {
        if (typeof Split !== 'undefined') {
            console.log('Initializing Split.js...');
            
            // Destroy existing instance
            if (splitInstance) {
                splitInstance.destroy();
                splitInstance = null;
            }
            
            // Get visible panes
            const activePanes = document.querySelectorAll('.pane.active');
            console.log('Active panes:', activePanes.length);
            
            if (activePanes.length > 1) {
                const paneIds = Array.from(activePanes).map(pane => `#${pane.id}`);
                console.log('Split pane IDs:', paneIds);
                
                try {
                    splitInstance = Split(paneIds, {
                        sizes: Array(paneIds.length).fill(100 / paneIds.length),
                        minSize: Array(paneIds.length).fill(0),
                        gutterSize: 15,
                        cursor: 'col-resize',
                        onDragEnd: function(sizes) {
                            console.log('Split drag ended, sizes:', sizes);
                            setTimeout(updateBrowserMountBounds, 100);
                        }
                    });
                    console.log('Split.js initialized successfully');
                } catch (error) {
                    console.error('Split.js error:', error);
                }
            } else {
                console.log('Only one pane active, no split needed');
            }
        }
    }
    
    // Initialize split on load
    setTimeout(initializeSplit, 200);

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

    // Handle top bar pane toggling
    function initializePaneToggling() {
        const topTabButtons = document.querySelectorAll('.top-tab-btn');
        
        console.log('Found top tab buttons:', topTabButtons.length);
        
        topTabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetPaneName = button.getAttribute('data-pane');
                const targetPane = document.querySelector(`#${targetPaneName}-pane`);
                
                console.log('Pane button clicked:', targetPaneName);
                
                if (targetPane) {
                    // Toggle the pane visibility
                    const isActive = targetPane.classList.contains('active');
                    
                    if (isActive) {
                        // Turn off pane
                        targetPane.classList.remove('active');
                        button.classList.remove('active');
                        console.log('Turned off pane:', targetPaneName);
                    } else {
                        // Turn on pane
                        targetPane.classList.add('active');
                        button.classList.add('active');
                        console.log('Turned on pane:', targetPaneName);
                    }
                    
                    // Reinitialize split after layout change
                    setTimeout(() => {
                        initializeSplit();
                        updateBrowserMountBounds();
                    }, 100);
                } else {
                    console.log('Target pane not found for:', targetPaneName);
                }
            });
        });
    }
    
    // Initialize pane toggling
    initializePaneToggling();

    // File tree click handlers
    function initializeFileTree() {
        const fileItems = document.querySelectorAll('.tree-item');
        fileItems.forEach(item => {
            // Only add click handlers to files (not folders)
            if (item.textContent.includes('📄')) {
                item.style.cursor = 'pointer';
                item.addEventListener('click', async () => {
                    const fileName = item.textContent.replace('📄 ', '').trim();
                    
                    // Ensure editor pane is visible
                    const editorPane = document.querySelector('#editor-pane');
                    const editorButton = document.querySelector('.top-tab-btn[data-pane="editor"]');
                    if (editorPane && !editorPane.classList.contains('active')) {
                        editorButton.click();
                        
                        // Wait a bit for editor to initialize, then load file
                        setTimeout(async () => {
                            if (window.codeMirrorEditor && window.electronAPI && window.electronAPI.readFile) {
                                try {
                                    const result = await window.electronAPI.readFile(fileName);
                                    if (result.success) {
                                        window.codeMirrorEditor.setValue(result.content);
                                        console.log('File loaded:', fileName);
                                        
                                        // Show status
                                        const statusEl = document.querySelector('footer span');
                                        if (statusEl) {
                                            const originalText = statusEl.textContent;
                                            statusEl.textContent = `Opened: ${fileName}`;
                                            setTimeout(() => {
                                                statusEl.textContent = originalText;
                                            }, 2000);
                                        }
                                    } else {
                                        console.error('Failed to load file:', result.error);
                                    }
                                } catch (error) {
                                    console.error('Error loading file:', error);
                                }
                            }
                        }, 500);
                    }
                });
            }
        });
    }
    
    // Initialize file tree
    initializeFileTree();

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
    let claudeTerminal = null;
    
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
            
            // Send input directly to PTY (no local echo needed)
            terminal.onData(data => {
                if (window.electronAPI && window.electronAPI.terminalWrite) {
                    window.electronAPI.terminalWrite(data);
                }
            });
            
            // Handle terminal resize
            terminal.onResize(({ cols, rows }) => {
                if (window.electronAPI && window.electronAPI.terminalResize) {
                    window.electronAPI.terminalResize(cols, rows);
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
                        tabSize: 2,
                        extraKeys: {
                            'Ctrl-S': function(cm) {
                                saveFile(cm);
                            },
                            'Cmd-S': function(cm) {
                                saveFile(cm);
                            },
                            'Ctrl-O': function(cm) {
                                loadFile(cm);
                            },
                            'Cmd-O': function(cm) {
                                loadFile(cm);
                            }
                        }
                    });
                    console.log('CodeMirror editor created successfully');
                    
                    // File operations
                    async function saveFile(editor) {
                        const content = editor.getValue();
                        if (window.electronAPI && window.electronAPI.writeFile) {
                            try {
                                const result = await window.electronAPI.writeFile('/tmp/codemirror-file.js', content);
                                if (result.success) {
                                    console.log('File saved successfully');
                                    // Show status in footer
                                    const statusEl = document.querySelector('footer span');
                                    if (statusEl) {
                                        const originalText = statusEl.textContent;
                                        statusEl.textContent = 'File saved';
                                        setTimeout(() => {
                                            statusEl.textContent = originalText;
                                        }, 2000);
                                    }
                                } else {
                                    console.error('Failed to save file:', result.error);
                                }
                            } catch (error) {
                                console.error('Error saving file:', error);
                            }
                        }
                    }
                    
                    async function loadFile(editor) {
                        if (window.electronAPI && window.electronAPI.readFile) {
                            try {
                                const result = await window.electronAPI.readFile('/tmp/codemirror-file.js');
                                if (result.success) {
                                    editor.setValue(result.content);
                                    console.log('File loaded successfully');
                                    // Show status in footer
                                    const statusEl = document.querySelector('footer span');
                                    if (statusEl) {
                                        const originalText = statusEl.textContent;
                                        statusEl.textContent = 'File loaded';
                                        setTimeout(() => {
                                            statusEl.textContent = originalText;
                                        }, 2000);
                                    }
                                } else {
                                    console.error('Failed to load file:', result.error);
                                    // Try to create new file if it doesn't exist
                                    editor.setValue('// New file\nfunction hello() {\n  console.log("Hello CodeMirror!");\n}');
                                }
                            } catch (error) {
                                console.error('Error loading file:', error);
                            }
                        }
                    }
                };
                document.head.appendChild(jsMode);
            };
            document.head.appendChild(script);
        }
    }

    function initializeClaudeTerminal() {
        const claudeTerminalElement = document.getElementById('claude-terminal');
        claudeTerminal = new Terminal({
            cols: 80,
            rows: 24,
            fontSize: 14,
            fontFamily: 'Consolas, "Courier New", monospace',
            theme: {
                background: '#1e1e1e',
                foreground: '#ffffff'
            }
        });
        claudeTerminal.open(claudeTerminalElement);
        
        // Start the Claude terminal process
        if (window.electronAPI && window.electronAPI.claudeTerminalStart) {
            window.electronAPI.claudeTerminalStart().then(() => {
                console.log('Claude terminal process started');
            }).catch(error => {
                console.error('Failed to start Claude terminal:', error);
                claudeTerminal.write('Failed to start Claude terminal process\\r\\n');
            });
            
            // Listen for output from the Claude terminal process
            window.electronAPI.onClaudeTerminalOutput((data) => {
                claudeTerminal.write(data);
            });
            
            // Send input directly to PTY (no local echo needed)
            claudeTerminal.onData(data => {
                if (window.electronAPI && window.electronAPI.claudeTerminalWrite) {
                    window.electronAPI.claudeTerminalWrite(data);
                }
            });
            
            // Handle Claude terminal resize
            claudeTerminal.onResize(({ cols, rows }) => {
                if (window.electronAPI && window.electronAPI.claudeTerminalResize) {
                    window.electronAPI.claudeTerminalResize(cols, rows);
                }
            });
        } else {
            // Fallback to echo mode if no terminal API
            claudeTerminal.write('Claude Terminal API not available - echo mode\\r\\n$ ');
            let currentLine = '';
            claudeTerminal.onData(data => {
                if (data === '\\r') {
                    claudeTerminal.write('\\r\\n');
                    if (currentLine.trim()) {
                        claudeTerminal.write(`You typed: ${currentLine}\\r\\n`);
                    }
                    currentLine = '';
                    claudeTerminal.write('$ ');
                } else if (data === '\\u007f') {
                    if (currentLine.length > 0) {
                        currentLine = currentLine.slice(0, -1);
                        claudeTerminal.write('\\b \\b');
                    }
                } else {
                    currentLine += data;
                    claudeTerminal.write(data);
                }
            });
        }
    }

    // Initialize CodeMirror when editor pane is shown
    const editorTabBtn = document.querySelector('.top-tab-btn[data-pane="editor"]');
    if (editorTabBtn) {
        editorTabBtn.addEventListener('click', () => {
            setTimeout(() => {
                if (!codeMirrorEditor) {
                    initializeCodeMirror();
                    codeMirrorEditor = true; // Mark as initialized
                }
            }, 100);
        });
    }
    
    // Initialize terminal when terminal pane is shown
    const terminalTabBtn = document.querySelector('.top-tab-btn[data-pane="terminal"]');
    if (terminalTabBtn) {
        terminalTabBtn.addEventListener('click', () => {
            setTimeout(() => {
                if (!terminal) {
                    initializeTerminal();
                }
            }, 100);
        });
    }
    
    // Initialize Claude terminal when Claude pane is shown
    const claudeTabBtn = document.querySelector('.top-tab-btn[data-pane="claude"]');
    if (claudeTabBtn) {
        claudeTabBtn.addEventListener('click', () => {
            setTimeout(() => {
                if (!claudeTerminal) {
                    initializeClaudeTerminal();
                }
            }, 100);
        });
    }

    console.log('Application initialized');
});