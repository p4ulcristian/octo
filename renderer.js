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
                            setTimeout(updateAllBrowserMounts, 100);
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
                                setTimeout(updateAllBrowserMounts, 100);
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
                                setTimeout(updateAllBrowserMounts, 100);
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

    // Function to update active browser mount bounds
    function updateAllBrowserMounts() {
        Object.values(contentInstances.previews).forEach(preview => {
            if (preview && preview.updateBounds && preview.browserMount && preview.browserMount.classList.contains('active-browser-mount')) {
                preview.updateBounds();
            }
        });
    }

    // Add window resize listener to update browser mounts
    window.addEventListener('resize', () => {
        setTimeout(updateAllBrowserMounts, 100);
    });


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

    // Content instances for each type
    const contentInstances = {
        terminals: {},
        claudeTerminals: {},
        editors: {},
        previews: {}
    };
    
    // Active pane tracking
    let activePaneId = null;
    let activePaneType = null;
    
    function updateTopBar(paneId, contentType) {
        const topBarElement = document.getElementById('active-pane-name');
        if (topBarElement) {
            const paneName = getPaneName(paneId);
            const displayText = `${paneName} - ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`;
            topBarElement.textContent = displayText;
            activePaneId = paneId;
            activePaneType = contentType;
        }
    }
    
    function getPaneName(paneId) {
        switch(paneId) {
            case 'editor-top-pane': return 'Top Left';
            case 'claude-pane': return 'Top Right';
            case 'editor-bottom-pane': return 'Bottom Left';
            case 'terminal-pane': return 'Bottom Right';
            default: return paneId;
        }
    }
    
    function selectPane(paneId, contentType = null) {
        // Remove selection from all panes
        const allPanes = document.querySelectorAll('#editor-top-pane, #claude-pane, #editor-bottom-pane, #terminal-pane');
        allPanes.forEach(pane => pane.classList.remove('selected'));
        
        // Select the clicked pane
        const targetPane = document.getElementById(paneId);
        if (targetPane) {
            targetPane.classList.add('selected');
            
            // Update top bar with current content or default
            const displayType = contentType || getActiveContentType(paneId) || 'Empty';
            updateTopBar(paneId, displayType);
        }
    }
    
    function getActiveContentType(paneId) {
        // Check what content is currently in the pane
        if (contentInstances.terminals[paneId]) return 'terminal';
        if (contentInstances.claudeTerminals[paneId]) return 'claude';
        if (contentInstances.editors[paneId]) return 'editor';
        if (contentInstances.previews[paneId]) return 'preview';
        return null;
    }
    
    function initializePaneClickHandlers() {
        const panes = document.querySelectorAll('#editor-top-pane, #claude-pane, #editor-bottom-pane, #terminal-pane');
        
        panes.forEach(pane => {
            pane.addEventListener('click', (e) => {
                // Don't select if clicking on a circle button
                if (e.target.closest('.circle')) return;
                
                selectPane(pane.id);
            });
        });
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
                
                // Select the pane and update top bar
                selectPane(paneId, contentType);
                
                // Clear the pane
                pane.innerHTML = '';
                
                // Initialize the appropriate content
                switch(contentType) {
                    case 'terminal':
                        initializeTerminalInPane(pane, paneId);
                        break;
                    case 'claude':
                        initializeClaudeInPane(pane, paneId);
                        break;
                    case 'editor':
                        initializeEditorInPane(pane, paneId);
                        break;
                    case 'preview':
                        initializePreviewInPane(pane, paneId);
                        break;
                }
            });
        });
    }
    
    function initializeTerminalInPane(pane, paneId) {
        const terminalDiv = document.createElement('div');
        terminalDiv.id = `terminal-${paneId}`;
        terminalDiv.style.height = '100%';
        terminalDiv.style.width = '100%';
        pane.appendChild(terminalDiv);
        
        const terminal = new Terminal({
            cols: 80,
            rows: 24,
            fontSize: 14,
            fontFamily: 'Consolas, "Courier New", monospace',
            theme: {
                background: '#1e1e1e',
                foreground: '#ffffff'
            }
        });
        
        terminal.open(terminalDiv);
        contentInstances.terminals[paneId] = terminal;
        
        // Start the terminal process
        if (window.electronAPI && window.electronAPI.terminalStart) {
            window.electronAPI.terminalStart().then(() => {
                console.log('Terminal process started for', paneId);
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
    
    function initializeClaudeInPane(pane, paneId) {
        const claudeDiv = document.createElement('div');
        claudeDiv.id = `claude-${paneId}`;
        claudeDiv.style.height = '100%';
        claudeDiv.style.width = '100%';
        pane.appendChild(claudeDiv);
        
        const claudeTerminal = new Terminal({
            cols: 80,
            rows: 24,
            fontSize: 14,
            fontFamily: 'Consolas, "Courier New", monospace',
            theme: {
                background: '#1e1e1e',
                foreground: '#66ccff'
            }
        });
        
        claudeTerminal.open(claudeDiv);
        contentInstances.claudeTerminals[paneId] = claudeTerminal;
        
        // Start the Claude terminal process
        if (window.electronAPI && window.electronAPI.claudeTerminalStart) {
            window.electronAPI.claudeTerminalStart().then(() => {
                console.log('Claude terminal process started for', paneId);
            }).catch(error => {
                console.error('Failed to start Claude terminal:', error);
                claudeTerminal.write('Failed to start Claude terminal process\r\n');
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
            claudeTerminal.write('Claude Terminal API not available - echo mode\r\n$ ');
            let currentLine = '';
            claudeTerminal.onData(data => {
                if (data === '\r') {
                    claudeTerminal.write('\r\n');
                    if (currentLine.trim()) {
                        claudeTerminal.write(`You typed: ${currentLine}\r\n`);
                    }
                    currentLine = '';
                    claudeTerminal.write('$ ');
                } else if (data === '\u007f') {
                    if (currentLine.length > 0) {
                        currentLine = currentLine.slice(0, -1);
                        claudeTerminal.write('\b \b');
                    }
                } else {
                    currentLine += data;
                    claudeTerminal.write(data);
                }
            });
        }
    }
    
    function initializeEditorInPane(pane, paneId) {
        const editorDiv = document.createElement('div');
        editorDiv.id = `editor-${paneId}`;
        editorDiv.style.height = '100%';
        editorDiv.style.width = '100%';
        pane.appendChild(editorDiv);
        
        // Create CodeMirror editor
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js';
        script.onload = () => {
            const jsMode = document.createElement('script');
            jsMode.src = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js';
            jsMode.onload = () => {
                const editor = CodeMirror(editorDiv, {
                    value: `// Editor in ${paneId}\nfunction hello() {\n  console.log("Hello from ${paneId}!");\n}`,
                    mode: 'javascript',
                    theme: 'dracula',
                    lineNumbers: true,
                    autoCloseBrackets: true,
                    matchBrackets: true,
                    indentUnit: 2,
                    tabSize: 2
                });
                contentInstances.editors[paneId] = editor;
                console.log('CodeMirror editor initialized for', paneId);
            };
            document.head.appendChild(jsMode);
        };
        document.head.appendChild(script);
        
        // Load CSS if not already loaded
        if (!document.querySelector('link[href*="codemirror.min.css"]')) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css';
            document.head.appendChild(cssLink);
            
            const themeCss = document.createElement('link');
            themeCss.rel = 'stylesheet';
            themeCss.href = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/dracula.min.css';
            document.head.appendChild(themeCss);
        }
    }
    
    function initializePreviewInPane(pane, paneId) {
        const previewDiv = document.createElement('div');
        previewDiv.id = `preview-${paneId}`;
        previewDiv.style.height = '100%';
        previewDiv.style.width = '100%';
        pane.appendChild(previewDiv);
        
        // Create browser controls (commented out for now)
        // const browserControls = document.createElement('div');
        // browserControls.className = 'browser-controls';
        // browserControls.innerHTML = `
        //     <button class="btn-icon" title="Back">←</button>
        //     <button class="btn-icon" title="Forward">→</button>
        //     <button class="btn-icon" title="Refresh">⟳</button>
        //     <input type="text" class="url-bar" value="https://localhost/customize" placeholder="Enter URL...">
        //     <button class="btn btn-primary">Go</button>
        //     <button class="btn btn-secondary">DevTools</button>
        // `;
        // previewDiv.appendChild(browserControls);
        
        // Create browser mount area (takes full pane since no controls)
        const browserMount = document.createElement('div');
        browserMount.className = 'browser-mount';
        browserMount.id = `browser-mount-${paneId}`;
        browserMount.style.width = '100%';
        browserMount.style.height = '100%';
        browserMount.style.position = 'relative';
        browserMount.style.background = '#f9f9f9';
        browserMount.style.border = '2px dashed #ccc';
        browserMount.style.overflow = 'hidden';
        browserMount.style.boxSizing = 'border-box';
        browserMount.innerHTML = '<div class="browser-placeholder"><p>Loading browser...</p></div>';
        previewDiv.appendChild(browserMount);
        
        // Send browser mount bounds for this specific pane
        function updateBrowserMountBounds() {
            const rect = browserMount.getBoundingClientRect();
            if (window.electronAPI && window.electronAPI.sendBrowserMountBounds && rect.width > 0 && rect.height > 0) {
                // Adjust bounds to account for borders and padding
                const adjustedBounds = {
                    x: Math.floor(rect.left + 2), // Account for 2px dashed border
                    y: Math.floor(rect.top + 2),  // Account for 2px dashed border
                    width: Math.floor(rect.width - 4), // Subtract both borders (2px each side)
                    height: Math.floor(rect.height - 4) // Subtract both borders (2px each side)
                };
                
                console.log(`Updating browser bounds for ${paneId}:`, adjustedBounds);
                window.electronAPI.sendBrowserMountBounds(adjustedBounds);
            }
        }
        
        // Clear any existing active browser mounts (only one can be active)
        Object.values(contentInstances.previews).forEach(preview => {
            if (preview && preview.browserMount) {
                preview.browserMount.classList.remove('active-browser-mount');
            }
        });
        
        // Mark this as the active browser mount
        browserMount.classList.add('active-browser-mount');
        
        // Update bounds after a short delay to ensure proper positioning
        setTimeout(updateBrowserMountBounds, 200);
        
        contentInstances.previews[paneId] = { 
            previewDiv, 
            browserMount, 
            updateBounds: updateBrowserMountBounds,
            isActive: true
        };
        
        console.log('Preview with browser controls initialized for', paneId);
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
    
    // Initialize circle buttons and pane click handlers
    setTimeout(() => {
        initializeCircleButtons();
        initializePaneClickHandlers();
    }, 200);

    console.log('Application initialized');
});