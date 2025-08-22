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
    
    // Add global click listener to detect clicks on browser areas
    
    // Initialize circle button functionality
    function initializeCircleButtons() {
        const circles = document.querySelectorAll('.circle');
        
        circles.forEach(circle => {
            circle.addEventListener('click', (e) => {
                const contentType = e.target.getAttribute('data-type');
                const pane = e.target.closest('.pane');
                const paneId = pane.id;
                
                console.log(`Selected ${contentType} for pane ${paneId}`);
                
                
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
                
                // Change to project directory if set
                const projectPath = localStorage.getItem('octo-project-path');
                if (projectPath && projectPath.trim()) {
                    console.log('Changing terminal directory to:', projectPath);
                    window.electronAPI.terminalWrite(`cd "${projectPath}"\n`);
                }
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
                
                // Change to project directory if set
                const projectPath = localStorage.getItem('octo-project-path');
                if (projectPath && projectPath.trim()) {
                    console.log('Changing Claude terminal directory to:', projectPath);
                    window.electronAPI.claudeTerminalWrite(`cd "${projectPath}"\n`);
                }
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
        const editorContainer = document.createElement('div');
        editorContainer.id = `editor-container-${paneId}`;
        editorContainer.style.height = '100%';
        editorContainer.style.width = '100%';
        editorContainer.style.display = 'flex';
        pane.appendChild(editorContainer);
        
        // Create file explorer sidebar
        const sidebar = document.createElement('div');
        sidebar.className = 'editor-sidebar';
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h4>Explorer</h4>
                <button class="refresh-btn" title="Refresh">⟳</button>
            </div>
            <div class="file-tree" id="file-tree-${paneId}">
                <div class="loading">Loading files...</div>
            </div>
        `;
        editorContainer.appendChild(sidebar);
        
        // Create editor area
        const editorDiv = document.createElement('div');
        editorDiv.id = `editor-${paneId}`;
        editorDiv.className = 'editor-main';
        editorDiv.style.flex = '1';
        editorDiv.style.height = '100%';
        editorContainer.appendChild(editorDiv);
        
        // Load file tree
        loadFileTree(paneId);
        
        // Add refresh button functionality
        const refreshBtn = sidebar.querySelector('.refresh-btn');
        refreshBtn.addEventListener('click', () => loadFileTree(paneId));
        
        // Create CodeMirror editor
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js';
        script.onload = () => {
            const jsMode = document.createElement('script');
            jsMode.src = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js';
            jsMode.onload = () => {
                const editor = CodeMirror(editorDiv, {
                    value: `// Editor in ${paneId}\n// Select a file from the explorer to edit`,
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
        
        // Navigate to saved preview URL if available
        const savedUrl = localStorage.getItem('octo-preview-url');
        if (savedUrl && savedUrl.trim()) {
            console.log('Navigating to saved preview URL:', savedUrl);
            setTimeout(() => {
                if (window.electronAPI && window.electronAPI.navigateBrowser) {
                    window.electronAPI.navigateBrowser(savedUrl);
                }
            }, 1000); // Delay to ensure browser view is ready
        }
        
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
    
    async function loadFileTree(paneId) {
        const projectPath = localStorage.getItem('octo-project-path');
        const fileTreeContainer = document.getElementById(`file-tree-${paneId}`);
        
        if (!projectPath || !projectPath.trim()) {
            fileTreeContainer.innerHTML = `
                <div class="no-project">
                    <p>No project path set</p>
                    <p>Use the 📁 button to set project path</p>
                </div>
            `;
            return;
        }
        
        try {
            fileTreeContainer.innerHTML = '<div class="loading">Loading files...</div>';
            const files = await window.electronAPI.listFiles(projectPath);
            renderFileTree(files, fileTreeContainer, paneId);
        } catch (error) {
            console.error('Error loading file tree:', error);
            fileTreeContainer.innerHTML = `
                <div class="error">
                    <p>Error loading files</p>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
    
    function renderFileTree(files, container, paneId) {
        if (!files || files.length === 0) {
            container.innerHTML = '<div class="empty">No files found</div>';
            return;
        }
        
        // Sort: directories first, then files
        files.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });
        
        const fileList = document.createElement('div');
        fileList.className = 'file-list';
        
        files.forEach(file => {
            if (file.name.startsWith('.')) return; // Skip hidden files
            
            const fileItem = document.createElement('div');
            fileItem.className = `file-item ${file.isDirectory ? 'directory' : 'file'}`;
            fileItem.innerHTML = `
                <span class="file-icon">${file.isDirectory ? '📁' : '📄'}</span>
                <span class="file-name">${file.name}</span>
            `;
            
            if (!file.isDirectory) {
                fileItem.addEventListener('click', () => openFile(file.path, paneId));
                fileItem.style.cursor = 'pointer';
            }
            
            fileList.appendChild(fileItem);
        });
        
        container.innerHTML = '';
        container.appendChild(fileList);
    }
    
    async function openFile(filePath, paneId) {
        try {
            const content = await window.electronAPI.readTextFile(filePath);
            const editor = contentInstances.editors[paneId];
            if (editor) {
                editor.setValue(content);
                
                // Set mode based on file extension
                const ext = filePath.split('.').pop().toLowerCase();
                let mode = 'javascript';
                switch(ext) {
                    case 'js': mode = 'javascript'; break;
                    case 'ts': mode = 'javascript'; break; // Basic JS highlighting
                    case 'html': mode = 'xml'; break;
                    case 'css': mode = 'css'; break;
                    case 'json': mode = 'javascript'; break;
                    case 'md': mode = 'markdown'; break;
                    default: mode = 'text';
                }
                editor.setOption('mode', mode);
                
                console.log(`Opened file: ${filePath}`);
            }
        } catch (error) {
            console.error('Error opening file:', error);
            alert(`Error opening file: ${error.message}`);
        }
    }
    
    function showScriptPopup(buttonElement, updateButtonCallback) {
        // Remove any existing popup
        const existingPopup = document.querySelector('.script-popup');
        if (existingPopup) {
            existingPopup.remove();
            // Show browser view again when closing popup
            if (window.electronAPI && window.electronAPI.showBrowserView) {
                window.electronAPI.showBrowserView();
            }
            return; // Toggle behavior - close if already open
        }
        
        // Hide browser view temporarily so popup can be seen
        if (window.electronAPI && window.electronAPI.hideBrowserView) {
            window.electronAPI.hideBrowserView();
        }
        
        // Load existing script from localStorage
        const savedScript = localStorage.getItem('octo-script') || '';
        
        // Create popup
        const popup = document.createElement('div');
        popup.className = 'script-popup';
        popup.innerHTML = `
            <div class="script-popup-content">
                <h3>Script Editor</h3>
                <textarea id="script-textarea" placeholder="Enter your script here...">${savedScript}</textarea>
                <div class="script-popup-buttons">
                    <button id="script-save-btn" class="btn btn-primary">Save</button>
                    <button id="script-cancel-btn" class="btn btn-secondary">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Position popup relative to button
        const buttonRect = buttonElement.getBoundingClientRect();
        console.log('Button position:', buttonRect);
        
        // Position the popup content directly
        const popupContent = popup.querySelector('.script-popup-content');
        popupContent.style.position = 'fixed';
        popupContent.style.top = (buttonRect.bottom + 5) + 'px';
        popupContent.style.left = buttonRect.left + 'px';
        popupContent.style.zIndex = '10000';
        
        // Add event listeners
        const saveBtn = popup.querySelector('#script-save-btn');
        const cancelBtn = popup.querySelector('#script-cancel-btn');
        const textarea = popup.querySelector('#script-textarea');
        
        saveBtn.addEventListener('click', () => {
            const scriptContent = textarea.value;
            console.log('Saving script:', scriptContent);
            
            // Save to localStorage
            localStorage.setItem('octo-script', scriptContent);
            
            // Show success feedback
            saveBtn.textContent = 'Saved!';
            saveBtn.style.background = '#67ea94';
            setTimeout(() => {
                popup.remove();
                // Update button appearance after saving
                if (updateButtonCallback) {
                    updateButtonCallback();
                }
                // Show browser view again when closing popup
                if (window.electronAPI && window.electronAPI.showBrowserView) {
                    window.electronAPI.showBrowserView();
                }
            }, 500);
        });
        
        cancelBtn.addEventListener('click', () => {
            popup.remove();
            // Show browser view again when closing popup
            if (window.electronAPI && window.electronAPI.showBrowserView) {
                window.electronAPI.showBrowserView();
            }
        });
        
        // Close popup when clicking outside
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target) && e.target !== buttonElement) {
                popup.remove();
                // Show browser view again when closing popup
                if (window.electronAPI && window.electronAPI.showBrowserView) {
                    window.electronAPI.showBrowserView();
                }
                document.removeEventListener('click', closePopup);
            }
        });
        
        // Focus textarea
        textarea.focus();
    }
    
    function runSavedScript() {
        const savedScript = localStorage.getItem('octo-script');
        if (!savedScript || !savedScript.trim()) {
            console.log('No script to run');
            return;
        }
        
        console.log('Running script:', savedScript);
        
        // Find an active terminal to run the script in
        const activeTerminals = Object.entries(contentInstances.terminals).filter(([paneId, terminal]) => terminal);
        
        if (activeTerminals.length === 0) {
            console.log('No active terminals found - creating one in first available pane');
            // Find the first available pane and create a terminal
            const panes = ['editor-top-pane', 'claude-pane', 'editor-bottom-pane', 'terminal-pane'];
            const firstPane = document.getElementById(panes[0]);
            if (firstPane) {
                // Clear and initialize terminal in first pane
                firstPane.innerHTML = '';
                initializeTerminalInPane(firstPane, panes[0]);
                
                // Wait a moment for terminal to initialize, then run script
                setTimeout(() => {
                    executeScriptInTerminal(panes[0], savedScript);
                }, 1000);
            }
        } else {
            // Use the first active terminal
            const [paneId] = activeTerminals[0];
            executeScriptInTerminal(paneId, savedScript);
        }
    }
    
    function executeScriptInTerminal(paneId, script) {
        if (window.electronAPI && window.electronAPI.terminalWrite) {
            // Write the script to the terminal
            console.log(`Executing script in terminal ${paneId}:`, script);
            window.electronAPI.terminalWrite(script + '\n');
        } else {
            console.log('Terminal API not available');
        }
    }
    
    function showProjectPathPopup(buttonElement) {
        // Remove any existing popup
        const existingPopup = document.querySelector('.project-path-popup');
        if (existingPopup) {
            existingPopup.remove();
            return;
        }
        
        // Hide browser view temporarily
        if (window.electronAPI && window.electronAPI.hideBrowserView) {
            window.electronAPI.hideBrowserView();
        }
        
        // Load existing project path from localStorage
        const savedPath = localStorage.getItem('octo-project-path') || '';
        
        // Create popup
        const popup = document.createElement('div');
        popup.className = 'project-path-popup';
        popup.innerHTML = `
            <div class="project-path-popup-content">
                <h3>Project Path</h3>
                <div class="project-path-input-group">
                    <input type="text" id="project-path-input" placeholder="Enter project path..." value="${savedPath}">
                    <button id="project-path-browse-btn" class="btn btn-secondary">Browse</button>
                </div>
                <div class="project-path-popup-buttons">
                    <button id="project-path-save-btn" class="btn btn-primary">Save</button>
                    <button id="project-path-cancel-btn" class="btn btn-secondary">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Position popup relative to button
        const buttonRect = buttonElement.getBoundingClientRect();
        const popupContent = popup.querySelector('.project-path-popup-content');
        popupContent.style.position = 'fixed';
        popupContent.style.top = (buttonRect.bottom + 5) + 'px';
        popupContent.style.left = buttonRect.left + 'px';
        popupContent.style.zIndex = '10000';
        
        // Add event listeners
        const saveBtn = popup.querySelector('#project-path-save-btn');
        const cancelBtn = popup.querySelector('#project-path-cancel-btn');
        const browseBtn = popup.querySelector('#project-path-browse-btn');
        const input = popup.querySelector('#project-path-input');
        
        saveBtn.addEventListener('click', () => {
            const pathContent = input.value;
            console.log('Saving project path:', pathContent);
            localStorage.setItem('octo-project-path', pathContent);
            
            saveBtn.textContent = 'Saved!';
            saveBtn.style.background = '#67ea94';
            setTimeout(() => {
                popup.remove();
                if (window.electronAPI && window.electronAPI.showBrowserView) {
                    window.electronAPI.showBrowserView();
                }
            }, 500);
        });
        
        browseBtn.addEventListener('click', async () => {
            console.log('Browse button clicked - opening folder dialog');
            if (window.electronAPI && window.electronAPI.selectFolder) {
                try {
                    const selectedPath = await window.electronAPI.selectFolder();
                    if (selectedPath) {
                        input.value = selectedPath;
                        console.log('Selected folder:', selectedPath);
                    }
                } catch (error) {
                    console.error('Error selecting folder:', error);
                }
            } else {
                console.log('selectFolder API not available');
            }
        });
        
        cancelBtn.addEventListener('click', () => {
            popup.remove();
            if (window.electronAPI && window.electronAPI.showBrowserView) {
                window.electronAPI.showBrowserView();
            }
        });
        
        // Close popup when clicking outside
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target) && e.target !== buttonElement) {
                popup.remove();
                if (window.electronAPI && window.electronAPI.showBrowserView) {
                    window.electronAPI.showBrowserView();
                }
                document.removeEventListener('click', closePopup);
            }
        });
        
        input.focus();
    }
    
    function showPreviewUrlPopup(buttonElement) {
        // Remove any existing popup
        const existingPopup = document.querySelector('.preview-url-popup');
        if (existingPopup) {
            existingPopup.remove();
            return;
        }
        
        // Hide browser view temporarily
        if (window.electronAPI && window.electronAPI.hideBrowserView) {
            window.electronAPI.hideBrowserView();
        }
        
        // Load existing preview URL from localStorage
        const savedUrl = localStorage.getItem('octo-preview-url') || 'http://localhost:3000';
        
        // Create popup
        const popup = document.createElement('div');
        popup.className = 'preview-url-popup';
        popup.innerHTML = `
            <div class="preview-url-popup-content">
                <h3>Preview URL</h3>
                <input type="text" id="preview-url-input" placeholder="Enter preview URL..." value="${savedUrl}">
                <div class="preview-url-popup-buttons">
                    <button id="preview-url-save-btn" class="btn btn-primary">Save</button>
                    <button id="preview-url-go-btn" class="btn btn-secondary">Go</button>
                    <button id="preview-url-cancel-btn" class="btn btn-secondary">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Position popup relative to button
        const buttonRect = buttonElement.getBoundingClientRect();
        const popupContent = popup.querySelector('.preview-url-popup-content');
        popupContent.style.position = 'fixed';
        popupContent.style.top = (buttonRect.bottom + 5) + 'px';
        popupContent.style.left = buttonRect.left + 'px';
        popupContent.style.zIndex = '10000';
        
        // Add event listeners
        const saveBtn = popup.querySelector('#preview-url-save-btn');
        const goBtn = popup.querySelector('#preview-url-go-btn');
        const cancelBtn = popup.querySelector('#preview-url-cancel-btn');
        const input = popup.querySelector('#preview-url-input');
        
        saveBtn.addEventListener('click', () => {
            const urlContent = input.value;
            console.log('Saving preview URL:', urlContent);
            localStorage.setItem('octo-preview-url', urlContent);
            
            saveBtn.textContent = 'Saved!';
            saveBtn.style.background = '#67ea94';
            setTimeout(() => {
                popup.remove();
                if (window.electronAPI && window.electronAPI.showBrowserView) {
                    window.electronAPI.showBrowserView();
                }
            }, 500);
        });
        
        goBtn.addEventListener('click', () => {
            const urlContent = input.value;
            console.log('Navigating to:', urlContent);
            if (window.electronAPI && window.electronAPI.navigateBrowser) {
                window.electronAPI.navigateBrowser(urlContent);
            }
            popup.remove();
            if (window.electronAPI && window.electronAPI.showBrowserView) {
                window.electronAPI.showBrowserView();
            }
        });
        
        cancelBtn.addEventListener('click', () => {
            popup.remove();
            if (window.electronAPI && window.electronAPI.showBrowserView) {
                window.electronAPI.showBrowserView();
            }
        });
        
        // Close popup when clicking outside
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target) && e.target !== buttonElement) {
                popup.remove();
                if (window.electronAPI && window.electronAPI.showBrowserView) {
                    window.electronAPI.showBrowserView();
                }
                document.removeEventListener('click', closePopup);
            }
        });
        
        input.focus();
        input.select();
    }
    
    // Initialize header buttons
    function initializeHeaderButtons() {
        const playBtn = document.getElementById('play-btn');
        const scriptBtn = document.getElementById('script-btn');
        const devtoolsBtn = document.getElementById('devtools-btn');
        const projectPathBtn = document.getElementById('project-path-btn');
        const previewUrlBtn = document.getElementById('preview-url-btn');
        
        // Check if there's a saved script and update button appearance
        function updateScriptButtonAppearance() {
            const savedScript = localStorage.getItem('octo-script');
            if (savedScript && savedScript.trim()) {
                scriptBtn.style.background = '#67ea94';
                scriptBtn.style.color = '#1e1e1e';
                scriptBtn.title = 'Script (saved)';
                
                // Also update play button when script is available
                if (playBtn) {
                    playBtn.style.background = '#67ea94';
                    playBtn.style.color = '#1e1e1e';
                    playBtn.title = 'Run Script';
                }
            } else {
                scriptBtn.style.background = '';
                scriptBtn.style.color = '';
                scriptBtn.title = 'Script';
                
                // Reset play button when no script
                if (playBtn) {
                    playBtn.style.background = '';
                    playBtn.style.color = '';
                    playBtn.title = 'Play';
                }
            }
        }
        
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                console.log('Play button clicked - running saved script');
                runSavedScript();
            });
        }
        
        if (scriptBtn) {
            updateScriptButtonAppearance();
            
            scriptBtn.addEventListener('click', (e) => {
                console.log('Script button clicked - showing popup');
                showScriptPopup(e.target, updateScriptButtonAppearance);
            });
        }
        
        if (devtoolsBtn) {
            devtoolsBtn.addEventListener('click', () => {
                console.log('DevTools button clicked - toggling DevTools');
                if (window.electronAPI && window.electronAPI.browserDevTools) {
                    window.electronAPI.browserDevTools();
                } else {
                    console.log('DevTools API not available');
                }
            });
        }
        
        if (projectPathBtn) {
            projectPathBtn.addEventListener('click', (e) => {
                console.log('Project Path button clicked - showing popup');
                showProjectPathPopup(e.target);
            });
        }
        
        if (previewUrlBtn) {
            previewUrlBtn.addEventListener('click', (e) => {
                console.log('Preview URL button clicked - showing popup');
                showPreviewUrlPopup(e.target);
            });
        }
    }

    // Initialize circle buttons and pane click handlers
    setTimeout(() => {
        initializeCircleButtons();
        initializePaneClickHandlers();
        initializeHeaderButtons();
        initializeDefaultLayout();
    }, 200);
    
    function initializeDefaultLayout() {
        console.log('Setting up default layout...');
        
        // Top Left: Browser (preview)
        const topLeftPane = document.getElementById('editor-top-pane');
        if (topLeftPane) {
            topLeftPane.innerHTML = '';
            initializePreviewInPane(topLeftPane, 'editor-top-pane');
        }
        
        // Top Right: Terminal
        const topRightPane = document.getElementById('claude-pane');
        if (topRightPane) {
            topRightPane.innerHTML = '';
            initializeTerminalInPane(topRightPane, 'claude-pane');
        }
        
        // Bottom Left: Claude
        const bottomLeftPane = document.getElementById('editor-bottom-pane');
        if (bottomLeftPane) {
            bottomLeftPane.innerHTML = '';
            initializeClaudeInPane(bottomLeftPane, 'editor-bottom-pane');
        }
        
        // Bottom Right: Editor
        const bottomRightPane = document.getElementById('terminal-pane');
        if (bottomRightPane) {
            bottomRightPane.innerHTML = '';
            initializeEditorInPane(bottomRightPane, 'terminal-pane');
        }
        
        console.log('Default layout initialized');
    }

    console.log('Application initialized');
});