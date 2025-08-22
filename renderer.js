// Check if scripts load
window.addEventListener('load', () => {
    console.log('Window loaded - Terminal available:', typeof Terminal);
    console.log('window.Terminal:', window.Terminal);
    console.log('AppBundle:', typeof AppBundle);
    console.log('TestBundle:', window.TestBundle);
    console.log('All scripts loaded');
});

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Split.js with nested approach
    let mainSplitInstance = null;
    let editorSplitInstance = null;
    let terminalClaudeSplitInstance = null;
    
    function initializeSplit() {
        if (typeof Split !== 'undefined') {
            console.log('Initializing Split.js...');
            
            // Destroy existing instances
            if (mainSplitInstance) {
                mainSplitInstance.destroy();
                mainSplitInstance = null;
            }
            if (editorSplitInstance) {
                editorSplitInstance.destroy();
                editorSplitInstance = null;
            }
            if (terminalClaudeSplitInstance) {
                terminalClaudeSplitInstance.destroy();
                terminalClaudeSplitInstance = null;
            }
            
            // Get main visible panes (excluding nested ones)
            const mainPanes = document.querySelectorAll('.main-container > .pane.active');
            console.log('Main panes:', mainPanes.length);
            
            if (mainPanes.length > 1) {
                const paneIds = Array.from(mainPanes).map(pane => `#${pane.id}`);
                console.log('Main split pane IDs:', paneIds);
                
                try {
                    // Main horizontal split
                    mainSplitInstance = Split(paneIds, {
                        sizes: Array(paneIds.length).fill(100 / paneIds.length),
                        minSize: Array(paneIds.length).fill(0),
                        gutterSize: 15,
                        cursor: 'col-resize',
                        onDragEnd: function(sizes) {
                            console.log('Main split drag ended, sizes:', sizes);
                        }
                    });
                    console.log('Main Split.js initialized successfully');
                    
                    // Nested vertical split for editor pane
                    const editorPane = document.getElementById('editor-pane');
                    const editorTopPane = document.getElementById('editor-top-pane');
                    const editorBottomPane = document.getElementById('editor-bottom-pane');
                    
                    console.log('Editor pane:', editorPane);
                    console.log('Editor top pane:', editorTopPane);
                    console.log('Editor bottom pane:', editorBottomPane);
                    console.log('Editor active?', editorPane && editorPane.classList.contains('active'));
                    
                    if (editorPane && editorPane.classList.contains('active') && editorTopPane && editorBottomPane) {
                        editorSplitInstance = Split(['#editor-top-pane', '#editor-bottom-pane'], {
                            sizes: [50, 50],
                            minSize: [0, 0],
                            gutterSize: 15,
                            direction: 'vertical',
                            cursor: 'row-resize',
                            onDragEnd: function(sizes) {
                                console.log('Editor split drag ended, sizes:', sizes);
                            }
                        });
                        console.log('Editor Split.js initialized successfully');
                    } else {
                        console.log('Editor split not initialized - missing elements or not active');
                    }
                    
                    // Nested vertical split for terminal-claude pane
                    const terminalClaudePane = document.getElementById('terminal-claude-pane');
                    const claudePane = document.getElementById('claude-pane');
                    const terminalPane = document.getElementById('terminal-pane');
                    
                    console.log('Terminal-Claude pane:', terminalClaudePane);
                    console.log('Claude pane:', claudePane);
                    console.log('Terminal pane:', terminalPane);
                    console.log('Terminal-Claude active?', terminalClaudePane && terminalClaudePane.classList.contains('active'));
                    
                    if (terminalClaudePane && terminalClaudePane.classList.contains('active') && claudePane && terminalPane) {
                        terminalClaudeSplitInstance = Split(['#claude-pane', '#terminal-pane'], {
                            sizes: [50, 50],
                            minSize: [0, 0],
                            gutterSize: 15,
                            direction: 'vertical',
                            cursor: 'row-resize',
                            onDragEnd: function(sizes) {
                                console.log('Terminal-Claude split drag ended, sizes:', sizes);
                            }
                        });
                        console.log('Terminal-Claude Split.js initialized successfully');
                    } else {
                        console.log('Terminal-Claude split not initialized - missing elements or not active');
                    }
                    
                } catch (error) {
                    console.error('Split.js error:', error);
                }
            } else {
                console.log('Only one main pane active, no split needed');
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

    // No pane toggling needed - all panes are always visible

    // File tree removed - editor pane is now empty

    // Browser controls removed - preview pane is now empty

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

    // Hide BrowserView by sending empty/invisible bounds
    function hideBrowserView() {
        if (window.electronAPI && window.electronAPI.sendBrowserMountBounds) {
            window.electronAPI.sendBrowserMountBounds({
                x: -1000,
                y: -1000,
                width: 0,
                height: 0
            });
        }
    }

    // Hide browser view immediately
    setTimeout(hideBrowserView, 100);


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

    // Initialize circle button functionality
    function initializeCircleButtons() {
        const circles = document.querySelectorAll('.circle');
        
        circles.forEach(circle => {
            circle.addEventListener('click', (e) => {
                const contentType = e.target.getAttribute('data-type');
                const pane = e.target.closest('.pane');
                const paneId = pane.id;
                
                console.log(`Selected ${contentType} for pane ${paneId}`);
                
                // Clear the pane and show selected content type
                pane.innerHTML = `<div class="selected-content">${contentType.toUpperCase()}</div>`;
                
                // Style the selected content
                const selectedDiv = pane.querySelector('.selected-content');
                selectedDiv.style.display = 'flex';
                selectedDiv.style.alignItems = 'center';
                selectedDiv.style.justifyContent = 'center';
                selectedDiv.style.height = '100%';
                selectedDiv.style.fontSize = '24px';
                selectedDiv.style.fontWeight = 'bold';
                selectedDiv.style.color = getContentColor(contentType);
            });
        });
    }
    
    function getContentColor(type) {
        switch(type) {
            case 'claude': return '#66ccff';
            case 'editor': return '#67ea94';
            case 'terminal': return '#ff6b6b';
            case 'preview': return '#ffd93d';
            default: return '#cccccc';
        }
    }
    
    // Initialize circle buttons
    setTimeout(initializeCircleButtons, 200);

    console.log('Application initialized');
});