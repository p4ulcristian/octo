// Check if scripts load
window.addEventListener('load', () => {
    console.log('Window loaded - Terminal available:', typeof Terminal);
    console.log('window.Terminal:', window.Terminal);
    console.log('Golden Layout available:', typeof GoldenLayout);
    console.log('All scripts loaded');
});

document.addEventListener('DOMContentLoaded', async () => {
    let goldenLayout = null;
    let contentInstances = {
        terminals: {},
        claudeTerminals: {},
        editors: {},
        previews: {}
    };

    // Initialize Golden Layout
    function initializeGoldenLayout() {
        if (typeof GoldenLayout === 'undefined') {
            console.error('Golden Layout not loaded');
            return;
        }

        const config = {
            settings: {
                showPopoutIcon: false,
                showMaximiseIcon: true,
                showCloseIcon: false
            },
            content: [{
                type: 'row',
                content: [{
                    type: 'column',
                    width: 60,
                    content: [{
                        type: 'component',
                        componentName: 'preview',
                        componentState: { label: 'Browser' },
                        title: 'Browser',
                        height: 60
                    }, {
                        type: 'component',
                        componentName: 'claude',
                        componentState: { label: 'Claude' },
                        title: 'Claude'
                    }]
                }, {
                    type: 'column',
                    content: [{
                        type: 'component',
                        componentName: 'terminal',
                        componentState: { label: 'Terminal' },
                        title: 'Terminal',
                        height: 60
                    }, {
                        type: 'component',
                        componentName: 'editor',
                        componentState: { label: 'Editor' },
                        title: 'Editor'
                    }]
                }]
            }]
        };

        goldenLayout = new GoldenLayout(config, document.getElementById('golden-layout-container'));

        // Register components
        goldenLayout.registerComponent('preview', function(container, componentState) {
            initializePreviewComponent(container, componentState);
        });

        goldenLayout.registerComponent('terminal', function(container, componentState) {
            initializeTerminalComponent(container, componentState);
        });

        goldenLayout.registerComponent('claude', function(container, componentState) {
            initializeClaudeComponent(container, componentState);
        });

        goldenLayout.registerComponent('editor', function(container, componentState) {
            initializeEditorComponent(container, componentState);
        });

        goldenLayout.init();
        
        console.log('Golden Layout initialized');
    }

    // Component initializers
    function initializePreviewComponent(container, componentState) {
        const paneId = 'preview-' + Date.now();
        const element = container.getElement();
        
        element.css({
            height: '100%',
            width: '100%'
        });
        
        element.html(`
            <div id="preview-${paneId}" style="height: 100%; width: 100%;">
                <div class="browser-mount" id="browser-mount-${paneId}" style="width: 100%; height: 100%; position: relative; background: #f9f9f9; border: 2px dashed #ccc; overflow: hidden; box-sizing: border-box;">
                    <div class="browser-placeholder"><p>Loading browser...</p></div>
                </div>
            </div>
        `);

        const browserMount = element.find(`#browser-mount-${paneId}`)[0];
        
        // Browser mount bounds update function
        function updateBrowserMountBounds() {
            const rect = browserMount.getBoundingClientRect();
            if (window.electronAPI && window.electronAPI.sendBrowserMountBounds && rect.width > 0 && rect.height > 0) {
                const adjustedBounds = {
                    x: Math.floor(rect.left + 2),
                    y: Math.floor(rect.top + 2),
                    width: Math.floor(rect.width - 4),
                    height: Math.floor(rect.height - 4)
                };
                
                console.log(`Updating browser bounds for ${paneId}:`, adjustedBounds);
                window.electronAPI.sendBrowserMountBounds(adjustedBounds);
            }
        }

        // Clear any existing active browser mounts
        Object.values(contentInstances.previews).forEach(preview => {
            if (preview && preview.browserMount) {
                preview.browserMount.classList.remove('active-browser-mount');
            }
        });

        // Mark this as the active browser mount
        browserMount.classList.add('active-browser-mount');
        
        // Update bounds after layout is ready
        setTimeout(updateBrowserMountBounds, 500);
        
        // Listen for container resize
        container.on('resize', () => {
            setTimeout(updateBrowserMountBounds, 100);
        });

        contentInstances.previews[paneId] = { 
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
            }, 1000);
        }
    }

    function initializeTerminalComponent(container, componentState) {
        const paneId = 'terminal-' + Date.now();
        const element = container.getElement();
        
        element.css({
            height: '100%',
            width: '100%'
        });
        
        element.html(`<div id="terminal-${paneId}" style="height: 100%; width: 100%;"></div>`);

        const terminalDiv = element.find(`#terminal-${paneId}`)[0];
        
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
            
            // Listen for output
            window.electronAPI.onTerminalOutput((data) => {
                terminal.write(data);
            });
            
            // Send input
            terminal.onData(data => {
                if (window.electronAPI && window.electronAPI.terminalWrite) {
                    window.electronAPI.terminalWrite(data);
                }
            });
            
            // Handle resize
            terminal.onResize(({ cols, rows }) => {
                if (window.electronAPI && window.electronAPI.terminalResize) {
                    window.electronAPI.terminalResize(cols, rows);
                }
            });
        }

        // Resize terminal when container resizes
        container.on('resize', () => {
            setTimeout(() => {
                if (terminal.fit) {
                    terminal.fit();
                }
            }, 50);
        });
    }

    function initializeClaudeComponent(container, componentState) {
        const paneId = 'claude-' + Date.now();
        const element = container.getElement();
        
        element.css({
            height: '100%',
            width: '100%'
        });
        
        element.html(`<div id="claude-${paneId}" style="height: 100%; width: 100%;"></div>`);

        const claudeDiv = element.find(`#claude-${paneId}`)[0];
        
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
            
            // Listen for output
            window.electronAPI.onClaudeTerminalOutput((data) => {
                claudeTerminal.write(data);
            });
            
            // Send input
            claudeTerminal.onData(data => {
                if (window.electronAPI && window.electronAPI.claudeTerminalWrite) {
                    window.electronAPI.claudeTerminalWrite(data);
                }
            });
            
            // Handle resize
            claudeTerminal.onResize(({ cols, rows }) => {
                if (window.electronAPI && window.electronAPI.claudeTerminalResize) {
                    window.electronAPI.claudeTerminalResize(cols, rows);
                }
            });
        }

        // Resize terminal when container resizes
        container.on('resize', () => {
            setTimeout(() => {
                if (claudeTerminal.fit) {
                    claudeTerminal.fit();
                }
            }, 50);
        });
    }

    function initializeEditorComponent(container, componentState) {
        const paneId = 'editor-' + Date.now();
        const element = container.getElement();
        
        element.css({
            height: '100%',
            width: '100%',
            display: 'flex'
        });
        
        element.html(`
            <div class="editor-sidebar" style="width: 250px; border-right: 1px solid #333;">
                <div class="sidebar-header" style="padding: 8px; border-bottom: 1px solid #333;">
                    <h4 style="margin: 0; font-size: 14px;">Explorer</h4>
                    <button class="refresh-btn" title="Refresh" style="float: right; background: none; border: none; color: #fff; cursor: pointer;">⟳</button>
                </div>
                <div class="file-tree" id="file-tree-${paneId}" style="padding: 8px; overflow-y: auto; height: calc(100% - 40px);">
                    <div class="loading">Loading files...</div>
                </div>
            </div>
            <div id="editor-${paneId}" class="editor-main" style="flex: 1; height: 100%;"></div>
        `);

        const sidebar = element.find('.editor-sidebar')[0];
        const editorDiv = element.find(`#editor-${paneId}`)[0];
        const fileTree = element.find(`#file-tree-${paneId}`)[0];
        const refreshBtn = element.find('.refresh-btn')[0];

        // Load file tree
        loadFileTree(paneId, fileTree);
        
        // Add refresh button functionality
        refreshBtn.addEventListener('click', () => loadFileTree(paneId, fileTree));
        
        // Initialize CodeMirror
        loadCodeMirror(() => {
            const editor = CodeMirror(editorDiv, {
                value: `;; Editor in ${paneId}\n;; Select a file from the explorer to edit\n(println "Hello from Octo!")`,
                mode: 'clojure',
                theme: 'dracula',
                lineNumbers: true,
                autoCloseBrackets: true,
                matchBrackets: true,
                indentUnit: 2,
                tabSize: 2,
                viewportMargin: Infinity
            });
            
            // Force refresh when container resizes
            container.on('resize', () => {
                setTimeout(() => {
                    editor.refresh();
                    editor.setSize(null, '100%');
                }, 10);
            });
            
            contentInstances.editors[paneId] = { editor, fileTree };
            console.log('CodeMirror editor initialized for', paneId);
        });
    }

    // Helper functions
    function loadCodeMirror(callback) {
        if (window.CodeMirror) {
            callback();
            return;
        }

        // Load CSS
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

        // Load JS
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js';
        script.onload = () => {
            // Load language modes
            const modes = [
                'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/clojure/clojure.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/css/css.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/xml/xml.min.js'
            ];
            
            let loaded = 0;
            modes.forEach(src => {
                const modeScript = document.createElement('script');
                modeScript.src = src;
                modeScript.onload = () => {
                    loaded++;
                    if (loaded === modes.length) {
                        callback();
                    }
                };
                document.head.appendChild(modeScript);
            });
        };
        document.head.appendChild(script);
    }

    async function loadFileTree(paneId, fileTreeContainer) {
        const projectPath = localStorage.getItem('octo-project-path');
        
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

    function renderFileTree(files, container, paneId, level = 0) {
        if (!files || files.length === 0) {
            if (level === 0) {
                container.innerHTML = '<div class="empty">No files found</div>';
            }
            return;
        }
        
        // Sort: directories first, then files
        files.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });
        
        const fileList = document.createElement('div');
        fileList.className = level === 0 ? 'file-list' : 'file-sublist';
        
        files.forEach(file => {
            if (file.name.startsWith('.')) return; // Skip hidden files
            
            const fileItem = document.createElement('div');
            fileItem.className = `file-item ${file.isDirectory ? 'directory' : 'file'}`;
            fileItem.style.paddingLeft = `${8 + (level * 16)}px`;
            fileItem.style.cursor = 'pointer';
            fileItem.style.padding = '2px 8px';
            fileItem.style.marginBottom = '2px';
            fileItem.dataset.path = file.path;
            fileItem.dataset.expanded = 'false';
            
            const expandIcon = file.isDirectory ? 
                '<span class="expand-icon">▶</span>' : 
                '<span class="expand-icon"></span>';
            
            fileItem.innerHTML = `
                ${expandIcon}
                <span class="file-icon">${file.isDirectory ? '📁' : '📄'}</span>
                <span class="file-name">${file.name}</span>
            `;
            
            fileItem.addEventListener('mouseover', () => {
                fileItem.style.backgroundColor = '#333';
            });
            
            fileItem.addEventListener('mouseout', () => {
                fileItem.style.backgroundColor = 'transparent';
            });
            
            if (file.isDirectory) {
                fileItem.addEventListener('click', () => toggleDirectory(fileItem, paneId));
            } else {
                fileItem.addEventListener('click', () => openFile(file.path, paneId));
            }
            
            fileList.appendChild(fileItem);
        });
        
        if (level === 0) {
            container.innerHTML = '';
        }
        container.appendChild(fileList);
    }

    async function openFile(filePath, paneId) {
        try {
            const content = await window.electronAPI.readTextFile(filePath);
            const editorInstance = contentInstances.editors[paneId];
            if (editorInstance && editorInstance.editor) {
                editorInstance.editor.setValue(content);
                
                // Set mode based on file extension
                const ext = filePath.split('.').pop().toLowerCase();
                let mode = 'javascript';
                switch(ext) {
                    case 'js': mode = 'javascript'; break;
                    case 'ts': mode = 'javascript'; break;
                    case 'html': mode = 'xml'; break;
                    case 'css': mode = 'css'; break;
                    case 'json': mode = 'javascript'; break;
                    case 'clj': case 'cljs': case 'cljc': case 'edn': mode = 'clojure'; break;
                    default: mode = 'text';
                }
                editorInstance.editor.setOption('mode', mode);
                
                console.log(`Opened file: ${filePath}`);
            }
        } catch (error) {
            console.error('Error opening file:', error);
            alert(`Error opening file: ${error.message}`);
        }
    }

    async function toggleDirectory(directoryItem, paneId) {
        const path = directoryItem.dataset.path;
        const isExpanded = directoryItem.dataset.expanded === 'true';
        const expandIcon = directoryItem.querySelector('.expand-icon');
        
        if (isExpanded) {
            // Collapse directory
            directoryItem.dataset.expanded = 'false';
            expandIcon.textContent = '▶';
            
            // Remove all child items
            let nextSibling = directoryItem.nextElementSibling;
            while (nextSibling && nextSibling.classList.contains('file-sublist')) {
                const toRemove = nextSibling;
                nextSibling = nextSibling.nextElementSibling;
                toRemove.remove();
            }
        } else {
            // Expand directory
            try {
                directoryItem.dataset.expanded = 'true';
                expandIcon.textContent = '▼';
                
                const files = await window.electronAPI.listFiles(path);
                if (files && files.length > 0) {
                    const level = (directoryItem.style.paddingLeft.replace('px', '') - 8) / 16 + 1;
                    const subContainer = document.createElement('div');
                    const editorInstance = contentInstances.editors[paneId];
                    renderFileTree(files, subContainer, paneId, level);
                    
                    // Insert after the directory item
                    directoryItem.parentNode.insertBefore(subContainer.firstChild, directoryItem.nextSibling);
                }
            } catch (error) {
                console.error('Error loading directory:', error);
                expandIcon.textContent = '▶';
                directoryItem.dataset.expanded = 'false';
            }
        }
    }

    // Initialize header buttons (keeping existing functionality)
    function initializeHeaderButtons() {
        const playBtn = document.getElementById('play-btn');
        const scriptBtn = document.getElementById('script-btn');
        const devtoolsBtn = document.getElementById('devtools-btn');
        const refreshBtn = document.getElementById('refresh-btn');
        const projectPathBtn = document.getElementById('project-path-btn');
        const previewUrlBtn = document.getElementById('preview-url-btn');
        
        // Check if there's a saved script and update button appearance
        function updateScriptButtonAppearance() {
            const savedScript = localStorage.getItem('octo-script');
            if (savedScript && savedScript.trim()) {
                if (scriptBtn) {
                    scriptBtn.style.background = '#67ea94';
                    scriptBtn.style.color = '#1e1e1e';
                    scriptBtn.title = 'Script (saved)';
                }
                
                // Also update play button when script is available
                if (playBtn) {
                    playBtn.style.background = '#67ea94';
                    playBtn.style.color = '#1e1e1e';
                    playBtn.title = 'Run Script';
                }
            } else {
                if (scriptBtn) {
                    scriptBtn.style.background = '';
                    scriptBtn.style.color = '';
                    scriptBtn.title = 'Script';
                }
                
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

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('Refresh button clicked - refreshing browser');
                if (window.electronAPI && window.electronAPI.browserRefresh) {
                    window.electronAPI.browserRefresh();
                }
            });
        }

        if (devtoolsBtn) {
            devtoolsBtn.addEventListener('click', () => {
                console.log('DevTools button clicked - toggling DevTools');
                if (window.electronAPI && window.electronAPI.browserDevTools) {
                    window.electronAPI.browserDevTools();
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

    // Add all the missing popup and script functions
    function showScriptPopup(buttonElement, updateButtonCallback) {
        // Remove any existing popup
        const existingPopup = document.querySelector('.script-popup');
        if (existingPopup) {
            existingPopup.remove();
            if (window.electronAPI && window.electronAPI.showBrowserView) {
                window.electronAPI.showBrowserView();
            }
            return;
        }
        
        if (window.electronAPI && window.electronAPI.hideBrowserView) {
            window.electronAPI.hideBrowserView();
        }
        
        const savedScript = localStorage.getItem('octo-script') || '';
        
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
        
        const buttonRect = buttonElement.getBoundingClientRect();
        const popupContent = popup.querySelector('.script-popup-content');
        popupContent.style.position = 'fixed';
        popupContent.style.top = (buttonRect.bottom + 5) + 'px';
        popupContent.style.left = buttonRect.left + 'px';
        popupContent.style.zIndex = '10000';
        
        const saveBtn = popup.querySelector('#script-save-btn');
        const cancelBtn = popup.querySelector('#script-cancel-btn');
        const textarea = popup.querySelector('#script-textarea');
        
        saveBtn.addEventListener('click', () => {
            const scriptContent = textarea.value;
            localStorage.setItem('octo-script', scriptContent);
            
            saveBtn.textContent = 'Saved!';
            saveBtn.style.background = '#67ea94';
            setTimeout(() => {
                popup.remove();
                if (updateButtonCallback) updateButtonCallback();
                if (window.electronAPI && window.electronAPI.showBrowserView) {
                    window.electronAPI.showBrowserView();
                }
            }, 500);
        });
        
        cancelBtn.addEventListener('click', () => {
            popup.remove();
            if (window.electronAPI && window.electronAPI.showBrowserView) {
                window.electronAPI.showBrowserView();
            }
        });
        
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target) && e.target !== buttonElement) {
                popup.remove();
                if (window.electronAPI && window.electronAPI.showBrowserView) {
                    window.electronAPI.showBrowserView();
                }
                document.removeEventListener('click', closePopup);
            }
        });
        
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
        
        if (activeTerminals.length > 0) {
            const [paneId] = activeTerminals[0];
            executeScriptInTerminal(paneId, savedScript);
        } else {
            console.log('No active terminals found');
        }
    }
    
    function executeScriptInTerminal(paneId, script) {
        if (window.electronAPI && window.electronAPI.terminalWrite) {
            console.log(`Executing script in terminal ${paneId}:`, script);
            window.electronAPI.terminalWrite(script + '\n');
        } else {
            console.log('Terminal API not available');
        }
    }

    function showProjectPathPopup(buttonElement) {
        const existingPopup = document.querySelector('.project-path-popup');
        if (existingPopup) {
            existingPopup.remove();
            return;
        }
        
        if (window.electronAPI && window.electronAPI.hideBrowserView) {
            window.electronAPI.hideBrowserView();
        }
        
        const savedPath = localStorage.getItem('octo-project-path') || '';
        
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
        
        const buttonRect = buttonElement.getBoundingClientRect();
        const popupContent = popup.querySelector('.project-path-popup-content');
        popupContent.style.position = 'fixed';
        popupContent.style.top = (buttonRect.bottom + 5) + 'px';
        popupContent.style.left = buttonRect.left + 'px';
        popupContent.style.zIndex = '10000';
        
        const saveBtn = popup.querySelector('#project-path-save-btn');
        const cancelBtn = popup.querySelector('#project-path-cancel-btn');
        const browseBtn = popup.querySelector('#project-path-browse-btn');
        const input = popup.querySelector('#project-path-input');
        
        saveBtn.addEventListener('click', () => {
            const pathContent = input.value;
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
            if (window.electronAPI && window.electronAPI.selectFolder) {
                try {
                    const selectedPath = await window.electronAPI.selectFolder();
                    if (selectedPath) {
                        input.value = selectedPath;
                    }
                } catch (error) {
                    console.error('Error selecting folder:', error);
                }
            }
        });
        
        cancelBtn.addEventListener('click', () => {
            popup.remove();
            if (window.electronAPI && window.electronAPI.showBrowserView) {
                window.electronAPI.showBrowserView();
            }
        });
        
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
        const existingPopup = document.querySelector('.preview-url-popup');
        if (existingPopup) {
            existingPopup.remove();
            return;
        }
        
        if (window.electronAPI && window.electronAPI.hideBrowserView) {
            window.electronAPI.hideBrowserView();
        }
        
        const savedUrl = localStorage.getItem('octo-preview-url') || 'http://localhost:3000';
        
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
        
        const buttonRect = buttonElement.getBoundingClientRect();
        const popupContent = popup.querySelector('.preview-url-popup-content');
        popupContent.style.position = 'fixed';
        popupContent.style.top = (buttonRect.bottom + 5) + 'px';
        popupContent.style.left = buttonRect.left + 'px';
        popupContent.style.zIndex = '10000';
        
        const saveBtn = popup.querySelector('#preview-url-save-btn');
        const goBtn = popup.querySelector('#preview-url-go-btn');
        const cancelBtn = popup.querySelector('#preview-url-cancel-btn');
        const input = popup.querySelector('#preview-url-input');
        
        saveBtn.addEventListener('click', () => {
            const urlContent = input.value;
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

    // Load system information
    if (window.electronAPI) {
        try {
            const versions = window.electronAPI.getVersions();
            const appVersion = await window.electronAPI.getAppVersion();
            console.log('System info loaded:', versions, appVersion);
        } catch (error) {
            console.error('Error loading system info:', error);
        }
    }

    // Initialize everything
    setTimeout(() => {
        initializeGoldenLayout();
        initializeHeaderButtons();
    }, 200);

    console.log('Application initialized with Golden Layout');
});