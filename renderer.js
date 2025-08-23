// Check if scripts load
window.addEventListener('load', () => {
    console.log('Window loaded - Terminal available:', typeof Terminal);
    console.log('window.Terminal:', window.Terminal);
    console.log('Golden Layout available:', typeof GoldenLayout);
    console.log('jQuery available:', typeof $);
    console.log('All scripts loaded');
});

document.addEventListener('DOMContentLoaded', async () => {
    let goldenLayout = null;
    let contentInstances = {
        terminals: {},
        editors: {},
        previews: {}
    };

    // Component cleanup functions
    const cleanupFunctions = {};

    // Initialize Golden Layout
    function initializeGoldenLayout() {
        if (typeof GoldenLayout === 'undefined') {
            console.error('Golden Layout not loaded');
            return;
        }

        if (typeof $ === 'undefined') {
            console.error('jQuery not loaded');
            return;
        }

        const config = {
            settings: {
                showPopoutIcon: false,
                showMaximiseIcon: true,
                showCloseIcon: false,
                reorderEnabled: true,
                selectionEnabled: false
            },
            content: [{
                type: 'stack',
                content: []  // Start with empty tabs - users can create their own
            }]
        };

        // Try to load saved layout from localStorage
        const savedLayout = localStorage.getItem('octo-layout');
        if (savedLayout) {
            try {
                const parsedLayout = JSON.parse(savedLayout);
                console.log('Loading saved layout from localStorage');
                
                // Fix activeItemIndex to prevent out of bounds errors
                function fixActiveItemIndex(item) {
                    if (item.type === 'stack') {
                        const contentLength = item.content ? item.content.length : 0;
                        
                        // If stack is empty, remove activeItemIndex
                        if (contentLength === 0) {
                            delete item.activeItemIndex;
                            console.log('Removed activeItemIndex from empty stack');
                        }
                        // If activeItemIndex is out of bounds, fix it
                        else if (item.activeItemIndex !== undefined && item.activeItemIndex >= contentLength) {
                            const newIndex = contentLength - 1;
                            console.log(`Fixing activeItemIndex: ${item.activeItemIndex} -> ${newIndex}`);
                            item.activeItemIndex = newIndex;
                        }
                    }
                    
                    // Recursively fix nested items
                    if (item.content && Array.isArray(item.content)) {
                        item.content.forEach(fixActiveItemIndex);
                    }
                }
                
                // Fix the layout before using it
                if (parsedLayout.content) {
                    parsedLayout.content.forEach(fixActiveItemIndex);
                }
                
                config.content = parsedLayout.content;
            } catch (error) {
                console.error('Failed to parse saved layout:', error);
                localStorage.removeItem('octo-layout'); // Remove corrupted layout
            }
        }

        goldenLayout = new GoldenLayout(config, $('#golden-layout-container'));

        // Save layout to localStorage whenever it changes
        goldenLayout.on('stateChanged', function() {
            try {
                const state = goldenLayout.toConfig();
                localStorage.setItem('octo-layout', JSON.stringify(state));
                console.log('Layout saved to localStorage');
            } catch (error) {
                console.error('Failed to save layout:', error);
            }
        });

        // Register components with proper cleanup
        goldenLayout.registerComponent('preview', function(container, componentState) {
            if (!componentState.id) {
                componentState.id = 'preview-' + Date.now();
            }
            initializePreviewComponent(container, componentState, componentState.id);
        });

        goldenLayout.registerComponent('terminal', function(container, componentState) {
            // IMPORTANT: Use the saved ID if it exists, otherwise create a new one
            if (!componentState.id) {
                componentState.id = 'terminal-' + Date.now();
            }
            const id = componentState.id;
            initializeTerminalComponent(container, componentState, id);
        });


        goldenLayout.registerComponent('explorer', function(container, componentState) {
            if (!componentState.id) {
                componentState.id = 'explorer-' + Date.now();
            }
            initializeExplorerComponent(container, componentState, componentState.id);
        });

        goldenLayout.registerComponent('editor', function(container, componentState) {
            if (!componentState.id) {
                componentState.id = 'editor-' + Date.now();
            }
            initializeEditorComponent(container, componentState, componentState.id);
        });

        goldenLayout.registerComponent('git', function(container, componentState) {
            if (!componentState.id) {
                componentState.id = 'git-' + Date.now();
            }
            initializeGitComponent(container, componentState, componentState.id);
        });

        // Handle component destruction
        goldenLayout.on('componentDestroyed', function(component) {
            const componentId = component.config.componentState.id;
            if (cleanupFunctions[componentId]) {
                cleanupFunctions[componentId]();
                delete cleanupFunctions[componentId];
            }
        });

        goldenLayout.on('stateChanged', function() {
            // Update browser bounds after state changes - only for active browser
            setTimeout(() => {
                const activePreview = Object.values(contentInstances.previews).find(preview => preview && preview.isActive);
                if (activePreview && activePreview.updateBounds) {
                    activePreview.updateBounds();
                }
            }, 100);
        });

        goldenLayout.on('stackCreated', function(stack) {
            // Update browser bounds when items are dropped - only for active browser
            stack.header.on('itemsDropped', function() {
                setTimeout(() => {
                    const activePreview = Object.values(contentInstances.previews).find(preview => preview && preview.isActive);
                    if (activePreview && activePreview.updateBounds) {
                        activePreview.updateBounds();
                    }
                }, 200);
            });

            // Handle tab selection changes
            stack.on('activeContentItemChanged', function(contentItem) {
                const componentName = contentItem.config.componentName;
                const componentId = contentItem.config.componentState.id;
                
                console.log('Tab changed to:', componentName, componentId);
                
                // Handle browser view visibility
                if (componentName === 'preview') {
                    // Show browser view for preview tab
                    setTimeout(() => {
                        const preview = contentInstances.previews[componentId];
                        if (preview && preview.updateBounds) {
                            if (window.electronAPI && window.electronAPI.showBrowserView) {
                                window.electronAPI.showBrowserView();
                            }
                            preview.updateBounds();
                        }
                    }, 100);
                } else {
                    // Hide browser view for non-preview tabs
                    if (window.electronAPI && window.electronAPI.hideBrowserView) {
                        window.electronAPI.hideBrowserView();
                    }
                    
                    // Make sure all preview instances are marked as inactive
                    Object.values(contentInstances.previews).forEach(preview => {
                        if (preview) {
                            preview.isActive = false;
                        }
                    });
                }

                // Handle terminal initialization when tab becomes active (for restored tabs that weren't visible)
                if (componentName === 'terminal' && !contentInstances.terminals[componentId]) {
                    setTimeout(() => {
                        const terminalElement = document.getElementById(`terminal-${componentId}`);
                        if (terminalElement && terminalElement.offsetParent !== null) {
                            console.log('🔄 Lazy initializing terminal for active tab:', componentId);
                            // Re-run the terminal initialization for this component
                            const container = { getElement: () => $(terminalElement).parent() };
                            const componentState = { id: componentId };
                            
                            // Find the saved state if it exists
                            if (goldenLayout) {
                                function findComponentState(item) {
                                    if (item.type === 'component' && item.config?.componentState?.id === componentId) {
                                        return item.config.componentState;
                                    }
                                    if (item.contentItems) {
                                        for (let child of item.contentItems) {
                                            const state = findComponentState(child);
                                            if (state) return state;
                                        }
                                    }
                                    return null;
                                }
                                const savedState = findComponentState(goldenLayout.root);
                                if (savedState) {
                                    Object.assign(componentState, savedState);
                                }
                            }
                            
                            initializeTerminalComponent(container, componentState, componentId);
                        }
                    }, 100);
                }

            });
        });

        goldenLayout.on('itemDropped', function() {
            // Update browser bounds after dropping - only for active browser
            setTimeout(() => {
                const activePreview = Object.values(contentInstances.previews).find(preview => preview && preview.isActive);
                if (activePreview && activePreview.updateBounds) {
                    activePreview.updateBounds();
                }
            }, 300);
        });

        goldenLayout.init();
        
        console.log('Golden Layout initialized');
    }

    // Component initializers with proper cleanup
    function initializePreviewComponent(container, componentState, componentId) {
        const element = container.getElement();
        
        element.html(`
            <div id="preview-${componentId}" style="height: 100%; width: 100%; display: flex; flex-direction: column;">
                <div class="browser-header" style="height: 40px; background: #2d2d30; border-bottom: 1px solid #3e3e42; display: flex; align-items: center; padding: 0 12px; box-sizing: border-box; gap: 8px;">
                    <input type="text" id="url-input-${componentId}" placeholder="Enter URL..." style="flex: 1; height: 28px; background: #1e1e1e; color: #cccccc; border: 1px solid #3e3e42; border-radius: 4px; padding: 0 8px; font-size: 13px;">
                    <button id="reload-btn-${componentId}" title="Reload" style="height: 28px; width: 28px; background: #3c3c3c; border: 1px solid #3e3e42; color: #cccccc; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; border-radius: 4px;"><i class="fas fa-refresh"></i></button>
                    <button id="devtools-btn-${componentId}" title="DevTools" style="height: 28px; width: 28px; background: #3c3c3c; border: 1px solid #3e3e42; color: #cccccc; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; border-radius: 4px;"><i class="fas fa-wrench"></i></button>
                </div>
                <div class="browser-mount" id="browser-mount-${componentId}" style="width: 100%; flex: 1; position: relative; background: #f9f9f9; border: 2px dashed #ccc; overflow: hidden; box-sizing: border-box;">
                    <div class="browser-placeholder"><p>Loading browser...</p></div>
                </div>
            </div>
        `);

        const browserMount = element.find(`#browser-mount-${componentId}`)[0];
        const urlInput = element.find(`#url-input-${componentId}`)[0];
        const reloadBtn = element.find(`#reload-btn-${componentId}`)[0];
        const devtoolsBtn = element.find(`#devtools-btn-${componentId}`)[0];
        
        // URL input event handler
        if (urlInput) {
            urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const url = urlInput.value.trim();
                    if (url && window.electronAPI && window.electronAPI.navigateBrowser) {
                        window.electronAPI.navigateBrowser(url);
                        // Save URL to localStorage
                        localStorage.setItem('octo-preview-url', url);
                    }
                }
            });
            
            // Load saved URL if available
            const savedUrl = localStorage.getItem('octo-preview-url');
            if (savedUrl) {
                urlInput.value = savedUrl;
            }
        }
        
        // Reload button event handler
        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => {
                if (window.electronAPI && window.electronAPI.browserRefresh) {
                    window.electronAPI.browserRefresh();
                }
            });
        }
        
        // DevTools button event handler
        if (devtoolsBtn) {
            devtoolsBtn.addEventListener('click', () => {
                if (window.electronAPI && window.electronAPI.browserDevTools) {
                    window.electronAPI.browserDevTools();
                }
            });
        }
        
        // Listen for browser navigation to update URL input
        if (urlInput && window.electronAPI && window.electronAPI.onBrowserNavigated) {
            window.electronAPI.onBrowserNavigated((url) => {
                urlInput.value = url;
                localStorage.setItem('octo-preview-url', url);
            });
        }
        
        // Browser mount bounds update function
        function updateBrowserMountBounds() {
            if (!browserMount || !browserMount.getBoundingClientRect) return;
            
            const rect = browserMount.getBoundingClientRect();
            if (window.electronAPI && window.electronAPI.sendBrowserMountBounds && rect.width > 0 && rect.height > 0) {
                const adjustedBounds = {
                    x: Math.floor(rect.left + 2),
                    y: Math.floor(rect.top + 2), 
                    width: Math.floor(rect.width - 4),
                    height: Math.floor(rect.height - 4)
                };
                
                console.log(`Updating browser bounds for ${componentId}:`, adjustedBounds);
                window.electronAPI.sendBrowserMountBounds(adjustedBounds);
            }
        }

        // Global drag detection for better browser view management
        let isDragging = false;
        
        // Add global drag detection
        document.addEventListener('dragstart', function() {
            if (!isDragging) {
                const hasActiveBrowser = Object.values(contentInstances.previews).some(preview => preview && preview.isActive);
                if (hasActiveBrowser) {
                    isDragging = true;
                    console.log('Global drag started - hiding active browser view');
                    if (window.electronAPI && window.electronAPI.hideBrowserView) {
                        window.electronAPI.hideBrowserView();
                    }
                }
            }
        });
        
        document.addEventListener('dragend', function() {
            if (isDragging) {
                isDragging = false;
                console.log('Global drag ended - restoring active browser view');
                setTimeout(() => {
                    // Find and restore the active browser view
                    const activePreview = Object.values(contentInstances.previews).find(preview => preview && preview.isActive);
                    if (activePreview) {
                        if (window.electronAPI && window.electronAPI.showBrowserView) {
                            window.electronAPI.showBrowserView();
                        }
                        activePreview.updateBounds();
                    }
                }, 200);
            }
        });

        // Also listen for mouse events that might indicate dragging
        let mouseDownTime = 0;
        
        document.addEventListener('mousedown', function(e) {
            // Check if we're clicking on Golden Layout elements
            if (e.target.closest('.lm_header') || e.target.closest('.lm_tab')) {
                mouseDownTime = Date.now();
            }
        });
        
        document.addEventListener('mousemove', function(e) {
            // If mouse has been down for more than 100ms and moving, likely dragging
            if (mouseDownTime > 0 && (Date.now() - mouseDownTime > 100) && !isDragging) {
                if (e.target.closest('.lm_header') || e.target.closest('.lm_tab')) {
                    const hasActiveBrowser = Object.values(contentInstances.previews).some(preview => preview && preview.isActive);
                    if (hasActiveBrowser) {
                        isDragging = true;
                        console.log('Mouse drag detected - hiding active browser view');
                        if (window.electronAPI && window.electronAPI.hideBrowserView) {
                            window.electronAPI.hideBrowserView();
                        }
                    }
                }
            }
        });
        
        document.addEventListener('mouseup', function() {
            mouseDownTime = 0;
            if (isDragging) {
                isDragging = false;
                console.log('Mouse drag ended - restoring active browser view');
                setTimeout(() => {
                    // Find and restore the active browser view
                    const activePreview = Object.values(contentInstances.previews).find(preview => preview && preview.isActive);
                    if (activePreview) {
                        if (window.electronAPI && window.electronAPI.showBrowserView) {
                            window.electronAPI.showBrowserView();
                        }
                        activePreview.updateBounds();
                    }
                }, 200);
            }
        });

        // Initially hidden - will be shown when tab is selected
        console.log('Browser component initialized (hidden):', componentId);
        
        // Listen for container resize
        container.on('resize', updateBrowserMountBounds);

        // Listen for tab selection changes
        container.on('tab', function(tab) {
            // This component's tab was selected
            console.log('Browser tab selected:', componentId);
            showBrowserView();
        });

        container.on('hide', function() {
            // This component was hidden (another tab selected)
            console.log('Browser tab hidden:', componentId);
            hideBrowserView();
        });

        function showBrowserView() {
            console.log('Showing browser view for:', componentId);
            // Mark this as the active browser mount
            Object.values(contentInstances.previews).forEach(preview => {
                preview.isActive = false;
                if (preview.browserMount) {
                    preview.browserMount.classList.remove('active-browser-mount');
                }
            });
            
            if (browserMount) {
                browserMount.classList.add('active-browser-mount');
            }
            
            contentInstances.previews[componentId].isActive = true;
            
            if (window.electronAPI && window.electronAPI.showBrowserView) {
                window.electronAPI.showBrowserView();
                setTimeout(updateBrowserMountBounds, 100);
            }
        }

        function hideBrowserView() {
            console.log('Hiding browser view for:', componentId);
            contentInstances.previews[componentId].isActive = false;
            
            if (browserMount) {
                browserMount.classList.remove('active-browser-mount');
            }
            
            if (window.electronAPI && window.electronAPI.hideBrowserView) {
                window.electronAPI.hideBrowserView();
            }
        }

        contentInstances.previews[componentId] = { 
            browserMount, 
            updateBounds: updateBrowserMountBounds,
            isActive: false,
            show: showBrowserView,
            hide: hideBrowserView
        };

        // Cleanup function
        cleanupFunctions[componentId] = function() {
            if (contentInstances.previews[componentId]) {
                delete contentInstances.previews[componentId];
            }
            container.off('resize', updateBrowserMountBounds);
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

    function initializeTerminalComponent(container, componentState, componentId) {
        console.log(`🚀 Initializing terminal component: ${componentId}`, componentState);
        const element = container.getElement();
        
        element.html(`<div id="terminal-${componentId}" style="height: 100%; width: 100%;"></div>`);

        const terminalDiv = element.find(`#terminal-${componentId}`)[0];
        
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
        
        let isTerminalReady = false;
        
        // Add random delay for restored terminals to prevent race conditions
        const delay = componentId.includes('-') ? Math.random() * 200 + 100 : 100;
        setTimeout(() => {
            console.log(`🔍 Terminal ${componentId} div check:`, {
                exists: !!terminalDiv,
                visible: terminalDiv?.offsetParent !== null,
                parent: terminalDiv?.offsetParent
            });
            
            // If terminal is not visible, skip initialization - it will be initialized when tab becomes active
            if (terminalDiv && terminalDiv.offsetParent === null) {
                console.log(`⏳ Terminal ${componentId} not visible, will initialize when tab becomes active`);
                return;
            }
            
            if (terminalDiv && terminalDiv.offsetParent !== null) {
                terminal.open(terminalDiv);
                isTerminalReady = true;
                console.log(`✅ Terminal ${componentId} opened and ready`);
                
                contentInstances.terminals[componentId] = terminal;
                
                // Start the terminal process
                console.log(`📡 Starting terminal process for: ${componentId}`);
                if (window.electronAPI && window.electronAPI.terminalStart) {
                    window.electronAPI.terminalStart(componentId).then(() => {
                        console.log(`✅ Terminal process started successfully for: ${componentId}`);
                        
                        // Now that the process is started, set up the output listener
                        console.log(`👂 Setting up output listener for terminal: ${componentId}`);
                        const removeOutputListener = window.electronAPI.onTerminalOutput((terminalId, data) => {
                            console.log(`📥 Output received for terminal ${terminalId}, current terminal: ${componentId}, ready: ${isTerminalReady}`);
                            // Only process output for this specific terminal
                            if (terminalId === componentId && isTerminalReady && terminal) {
                                console.log(`✍️ Writing output to terminal ${componentId}:`, data);
                                terminal.write(data);
                            }
                        });
                        
                        // Store the remove function for cleanup
                        terminal._removeOutputListener = removeOutputListener;
                        
                        // Small delay to ensure TTY connection is fully established
                        setTimeout(() => {
                            // Change to project directory if set
                            const projectPath = localStorage.getItem('octo-project-path');
                            if (projectPath && projectPath.trim()) {
                                console.log('Changing terminal directory to:', projectPath);
                                window.electronAPI.terminalWrite(componentId, `cd "${projectPath}"\n`);
                            }
                            
                        }, 100); // Wait for TTY connection to stabilize
                        
                    }).catch(error => {
                        console.error('Failed to start terminal:', error);
                        if (isTerminalReady) {
                            terminal.write('Failed to start terminal process\r\n');
                        }
                    });
                    
                    // Send input
                    terminal.onData(data => {
                        console.log(`🔤 Terminal ${componentId} input:`, data);
                        if (window.electronAPI && window.electronAPI.terminalWrite) {
                            window.electronAPI.terminalWrite(componentId, data).then(result => {
                                console.log(`📨 Terminal ${componentId} write result:`, result);
                                
                                // If terminal is not running, try to restart it
                                if (!result.success && result.error && result.error.includes('not running')) {
                                    console.log(`🔄 Restarting dead terminal: ${componentId}`);
                                    terminal.write('\r\n🔄 Terminal disconnected, restarting...\r\n');
                                    
                                    // Restart the terminal process
                                    window.electronAPI.terminalStart(componentId).then(() => {
                                        console.log(`✅ Terminal ${componentId} restarted successfully`);
                                        terminal.write('✅ Terminal restarted successfully\r\n');
                                        
                                        // Re-send the input that failed
                                        window.electronAPI.terminalWrite(componentId, data);
                                    }).catch(error => {
                                        console.error(`❌ Failed to restart terminal ${componentId}:`, error);
                                        terminal.write('❌ Failed to restart terminal\r\n');
                                    });
                                }
                            }).catch(error => {
                                console.error(`❌ Terminal ${componentId} write error:`, error);
                            });
                        } else {
                            console.error(`❌ Terminal ${componentId} - terminalWrite not available`);
                        }
                    });
                    
                    // Handle resize
                    terminal.onResize(({ cols, rows }) => {
                        if (window.electronAPI && window.electronAPI.terminalResize) {
                            window.electronAPI.terminalResize(componentId, cols, rows);
                        }
                    });
                }
            }
        }, 100);

        // Resize terminal when container resizes
        function handleResize() {
            setTimeout(() => {
                if (isTerminalReady && terminal && terminal.fit) {
                    terminal.fit();
                }
            }, 50);
        }
        
        container.on('resize', handleResize);

        // Cleanup function
        cleanupFunctions[componentId] = function() {
            isTerminalReady = false;
            const term = contentInstances.terminals[componentId];
            if (term) {
                // Remove the output listener if it exists
                if (term._removeOutputListener) {
                    term._removeOutputListener();
                }
                term.dispose();
                delete contentInstances.terminals[componentId];
            }
            // Stop the terminal process
            if (window.electronAPI && window.electronAPI.terminalStop) {
                window.electronAPI.terminalStop(componentId);
            }
            container.off('resize', handleResize);
        };
    }


    function initializeExplorerComponent(container, componentState, componentId) {
        const element = container.getElement();
        
        element.html(`
            <div class="explorer-container" style="width: 100%; height: 100%; background: #252526; display: flex; flex-direction: column;">
                <div class="explorer-header" style="padding: 8px 12px; background: #2d2d30; border-bottom: 1px solid #3e3e42; display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="margin: 0; font-size: 12px; color: #cccccc; text-transform: uppercase; letter-spacing: 0.5px;">Explorer</h4>
                    <button class="refresh-btn" title="Refresh" style="background: none; border: none; color: #cccccc; cursor: pointer; font-size: 14px; padding: 4px; border-radius: 3px;">⟳</button>
                </div>
                <div class="file-tree" id="file-tree-${componentId}" style="flex: 1; padding: 8px; overflow-y: auto;">
                    <div class="loading" style="color: #858585; text-align: center; padding: 20px;">Loading files...</div>
                </div>
            </div>
        `);

        const fileTree = element.find(`#file-tree-${componentId}`)[0];
        const refreshBtn = element.find('.refresh-btn')[0];

        // Load file tree
        loadFileTree(componentId, fileTree);
        
        // Add refresh button functionality
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('Refreshing file tree');
                loadFileTree(componentId, fileTree);
            });
            
            // Add hover effect for refresh button
            refreshBtn.addEventListener('mouseenter', () => {
                refreshBtn.style.background = '#3e3e42';
            });
            refreshBtn.addEventListener('mouseleave', () => {
                refreshBtn.style.background = 'none';
            });
        }

        // Cleanup function
        cleanupFunctions[componentId] = function() {
            // Clean up any event listeners if needed
            console.log('Explorer component cleaned up:', componentId);
        };
    }

    function initializeGitComponent(container, componentState, componentId) {
        const element = container.getElement();
        
        element.html(`
            <div class="git-container" style="width: 100%; height: 100%; background: #252526; display: flex; flex-direction: column;">
                <div class="git-header" style="padding: 8px 12px; background: #2d2d30; border-bottom: 1px solid #3e3e42; display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="margin: 0; font-size: 12px; color: #cccccc; text-transform: uppercase; letter-spacing: 0.5px;">Git Status</h4>
                    <button class="refresh-git-btn" title="Refresh" style="background: none; border: none; color: #cccccc; cursor: pointer; font-size: 14px; padding: 4px; border-radius: 3px;">⟳</button>
                </div>
                <div class="git-content" style="flex: 1; padding: 12px; overflow-y: auto;">
                    <div class="git-status" id="git-status-${componentId}">
                        <div class="loading" style="color: #858585; text-align: center; padding: 20px;">Loading git status...</div>
                    </div>
                </div>
            </div>
        `);

        const gitStatus = element.find(`#git-status-${componentId}`)[0];
        const refreshBtn = element.find('.refresh-git-btn')[0];

        // Load git status
        loadGitStatus(componentId, gitStatus);
        
        // Add refresh button functionality
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('Refreshing git status');
                loadGitStatus(componentId, gitStatus);
            });
            
            // Add hover effect for refresh button
            refreshBtn.addEventListener('mouseenter', () => {
                refreshBtn.style.background = '#3e3e42';
            });
            refreshBtn.addEventListener('mouseleave', () => {
                refreshBtn.style.background = 'none';
            });
        }

        // Cleanup function
        cleanupFunctions[componentId] = function() {
            console.log('Git component cleaned up:', componentId);
        };
    }

    async function loadGitStatus(componentId, container) {
        if (!container) return;
        
        try {
            container.innerHTML = '<div class="loading" style="color: #858585; text-align: center; padding: 20px;">Loading git status...</div>';
            
            // Get project path
            const projectPath = localStorage.getItem('octo-project-path');
            if (!projectPath || !projectPath.trim()) {
                container.innerHTML = '<div class="error" style="color: #f48771; text-align: center; padding: 20px;">No project path set. Use Settings to configure.</div>';
                return;
            }

            // Check if git status command is available via Electron API
            if (window.electronAPI && window.electronAPI.runGitCommand) {
                const status = await window.electronAPI.runGitCommand('status --porcelain', projectPath);
                const branch = await window.electronAPI.runGitCommand('branch --show-current', projectPath);
                
                displayGitStatus(container, status, branch.trim());
            } else {
                container.innerHTML = '<div class="error" style="color: #f48771; text-align: center; padding: 20px;">Git commands not available</div>';
            }
            
        } catch (error) {
            console.error('Error loading git status:', error);
            container.innerHTML = '<div class="error" style="color: #f48771; text-align: center; padding: 20px;">Error loading git status</div>';
        }
    }

    function displayGitStatus(container, statusOutput, currentBranch) {
        let html = `
            <div class="git-branch" style="margin-bottom: 16px; padding: 8px; background: #2d2d30; border-radius: 4px;">
                <div style="color: #67ea94; font-weight: 600; font-size: 13px;">🌿 ${currentBranch || 'main'}</div>
            </div>
        `;

        if (!statusOutput || statusOutput.trim() === '') {
            html += '<div style="color: #67ea94; text-align: center; padding: 20px;">✅ Working tree clean</div>';
        } else {
            const lines = statusOutput.trim().split('\n');
            const modified = [];
            const untracked = [];
            const staged = [];

            lines.forEach(line => {
                if (line.length < 3) return;
                const status = line.substring(0, 2);
                const filename = line.substring(3);

                if (status[0] !== ' ') {
                    staged.push(filename);
                } else if (status[1] === 'M') {
                    modified.push(filename);
                } else if (status === '??') {
                    untracked.push(filename);
                }
            });

            if (staged.length > 0) {
                html += '<div class="git-section" style="margin-bottom: 12px;">';
                html += '<div style="color: #67ea94; font-weight: 600; font-size: 12px; margin-bottom: 6px;">📦 STAGED CHANGES</div>';
                staged.forEach(file => {
                    html += `<div style="color: #67ea94; font-size: 11px; padding: 2px 0; font-family: monospace;">+ ${file}</div>`;
                });
                html += '</div>';
            }

            if (modified.length > 0) {
                html += '<div class="git-section" style="margin-bottom: 12px;">';
                html += '<div style="color: #f48771; font-weight: 600; font-size: 12px; margin-bottom: 6px;">📝 CHANGES</div>';
                modified.forEach(file => {
                    html += `<div style="color: #f48771; font-size: 11px; padding: 2px 0; font-family: monospace;">M ${file}</div>`;
                });
                html += '</div>';
            }

            if (untracked.length > 0) {
                html += '<div class="git-section" style="margin-bottom: 12px;">';
                html += '<div style="color: #858585; font-weight: 600; font-size: 12px; margin-bottom: 6px;">❓ UNTRACKED FILES</div>';
                untracked.forEach(file => {
                    html += `<div style="color: #858585; font-size: 11px; padding: 2px 0; font-family: monospace;">? ${file}</div>`;
                });
                html += '</div>';
            }
        }

        container.innerHTML = html;
    }

    function initializeEditorComponent(container, componentState, componentId) {
        const element = container.getElement();
        
        element.html(`<div id="editor-${componentId}" class="editor-main" style="height: 100%; width: 100%;"></div>`);

        const editorDiv = element.find(`#editor-${componentId}`)[0];
        let editor = null;
        
        loadCodeMirror(() => {
            console.log('Attempting to initialize CodeMirror for', componentId);
            console.log('editorDiv exists:', !!editorDiv);
            console.log('editorDiv offsetParent:', editorDiv?.offsetParent);
            
            if (editorDiv) {
                try {
                    editor = CodeMirror(editorDiv, {
                        value: `;; Editor ${componentId}\n;; Start coding here!\n`,
                        mode: 'clojure',
                        theme: 'dracula',
                        lineNumbers: true,
                        autoCloseBrackets: true,
                        matchBrackets: true,
                        indentUnit: 2,
                        tabSize: 2,
                        viewportMargin: Infinity
                    });
                    
                    contentInstances.editors[componentId] = { editor };
                    console.log('CodeMirror editor successfully initialized for', componentId);
                    
                    // Refresh the editor after a brief delay to ensure it's rendered properly
                    setTimeout(() => {
                        if (editor) {
                            editor.refresh();
                            editor.setSize(null, '100%');
                            console.log('Editor refreshed and sized');
                        }
                    }, 100);
                    
                    // Also refresh when the tab becomes active
                    setTimeout(() => {
                        if (editor) {
                            editor.refresh();
                            editor.setSize(null, '100%');
                        }
                    }, 500);
                } catch (error) {
                    console.error('Failed to initialize CodeMirror:', error);
                }
            } else {
                console.error('editorDiv not found for', componentId);
            }
        });
        
        // Force refresh when container resizes
        function handleResize() {
            setTimeout(() => {
                if (editor) {
                    editor.refresh();
                    editor.setSize(null, '100%');
                }
            }, 10);
        }
        
        container.on('resize', handleResize);

        // Cleanup function
        cleanupFunctions[componentId] = function() {
            if (contentInstances.editors[componentId]) {
                if (contentInstances.editors[componentId].editor) {
                    // CodeMirror cleanup
                    const cmElement = contentInstances.editors[componentId].editor.getWrapperElement();
                    if (cmElement && cmElement.parentNode) {
                        cmElement.parentNode.removeChild(cmElement);
                    }
                }
                delete contentInstances.editors[componentId];
            }
            container.off('resize', handleResize);
        };
    }

    // Helper functions (keeping existing implementations)
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
        console.log('openFile called:', filePath, paneId);
        
        try {
            const content = await window.electronAPI.readTextFile(filePath);
            
            // Check content size after reading
            const maxSize = 1024 * 1024; // 1MB limit
            const contentSize = new Blob([content]).size;
            
            if (contentSize > maxSize) {
                const sizeInMB = (contentSize / (1024 * 1024)).toFixed(2);
                alert(`File is too large to open (${sizeInMB}MB). Maximum size is 1MB.`);
                return;
            }
            const fileName = filePath.split('/').pop();
            
            // Create a new editor tab
            const editorId = 'editor-' + Date.now();
            
            const newItemConfig = {
                type: 'component',
                componentName: 'editor',
                componentState: { 
                    id: editorId,
                    filePath: filePath,
                    fileName: fileName 
                },
                title: fileName
            };
            
            // Find any available stack to add the editor tab to
            if (goldenLayout && goldenLayout.root) {
                function findStack(item) {
                    if (item.type === 'stack') {
                        return item;
                    }
                    if (item.contentItems && item.contentItems.length > 0) {
                        for (let child of item.contentItems) {
                            const stack = findStack(child);
                            if (stack) return stack;
                        }
                    }
                    return null;
                }
                
                const targetStack = findStack(goldenLayout.root);
                
                if (targetStack) {
                    targetStack.addChild(newItemConfig);
                    
                    // Wait for the component to be created and then set its content
                    setTimeout(async () => {
                        const editorInstance = contentInstances.editors[editorId];
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
                            
                            // Force refresh and focus
                            setTimeout(() => {
                                editorInstance.editor.refresh();
                                editorInstance.editor.focus();
                                editorInstance.editor.setSize(null, '100%');
                            }, 50);
                            
                            console.log(`Successfully opened file: ${filePath} with mode: ${mode}`);
                        }
                    }, 200);
                    
                    // Switch to the new tab
                    setTimeout(() => {
                        if (targetStack.contentItems.length > 0) {
                            const newTab = targetStack.contentItems[targetStack.contentItems.length - 1];
                            targetStack.setActiveContentItem(newTab);
                        }
                    }, 100);
                } else {
                    console.error('No stack found to add editor tab to');
                }
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
        const settingsBtn = document.getElementById('settings-btn');
        const devtoolsBtn = document.getElementById('devtools-btn');
        const refreshBtn = document.getElementById('refresh-btn');
        
        // Track script running state
        let isScriptRunning = false;
        
        // Check if there's a saved script and update button appearance
        function updateScriptButtonAppearance() {
            const savedScript = localStorage.getItem('octo-script');
            if (savedScript && savedScript.trim()) {
                // Script is available - make play button green
                if (playBtn && !isScriptRunning) {
                    playBtn.classList.add('ready');
                    playBtn.title = 'Run Script';
                }
            } else {
                // No script - reset play button
                if (playBtn) {
                    playBtn.classList.remove('ready');
                    playBtn.classList.remove('running');
                    playBtn.title = 'Play';
                }
            }
        }
        
        // Switch to terminal tab
        function focusTerminalTab() {
            if (goldenLayout && goldenLayout.root) {
                function findTerminalTab(item) {
                    if (item.type === 'component' && item.config.componentName === 'terminal') {
                        return item;
                    }
                    if (item.contentItems && item.contentItems.length > 0) {
                        for (let child of item.contentItems) {
                            const terminal = findTerminalTab(child);
                            if (terminal) return terminal;
                        }
                    }
                    return null;
                }
                
                const terminalTab = findTerminalTab(goldenLayout.root);
                if (terminalTab && terminalTab.parent) {
                    terminalTab.parent.setActiveContentItem(terminalTab);
                }
            }
        }
        
        if (playBtn) {
            updateScriptButtonAppearance();
            
            playBtn.addEventListener('click', () => {
                if (isScriptRunning) {
                    // Stop the script
                    console.log('Stopping script');
                    isScriptRunning = false;
                    
                    // Send Ctrl+C to terminal to stop the running process
                    if (window.electronAPI && window.electronAPI.terminalWrite) {
                        window.electronAPI.terminalWrite('\x03'); // Ctrl+C
                    }
                    
                    // Reset button appearance
                    playBtn.innerHTML = '▶';
                    playBtn.classList.remove('running');
                    playBtn.classList.add('ready');
                    playBtn.title = 'Run Script';
                } else {
                    // Run the script
                    const savedScript = localStorage.getItem('octo-script');
                    if (savedScript && savedScript.trim()) {
                        console.log('Running saved script');
                        isScriptRunning = true;
                        
                        // Change button to stop
                        playBtn.innerHTML = '■';
                        playBtn.classList.remove('ready');
                        playBtn.classList.add('running');
                        playBtn.title = 'Stop Script';
                        
                        // Focus terminal tab
                        focusTerminalTab();
                        
                        // Wait a bit for terminal to focus, then change directory and run script
                        setTimeout(() => {
                            const projectPath = localStorage.getItem('octo-project-path');
                            if (projectPath && projectPath.trim()) {
                                console.log('Changing to project directory before running script:', projectPath);
                                if (window.electronAPI && window.electronAPI.terminalWrite) {
                                    window.electronAPI.terminalWrite(`cd "${projectPath}"\n`);
                                    
                                    // Wait for cd command to complete, then run the script
                                    setTimeout(() => {
                                        runSavedScript();
                                    }, 500);
                                }
                            } else {
                                // No project path set, just run the script
                                runSavedScript();
                            }
                        }, 200);
                    } else {
                        console.log('No script saved');
                        alert('No script saved. Use Settings to add a script.');
                    }
                }
            });
        }
        
        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                console.log('Settings button clicked - showing popup');
                showSettingsPopup(e.target);
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
            let devToolsOpen = false;
            
            // Function to switch to browser tab
            function focusBrowserTab() {
                if (goldenLayout && goldenLayout.root) {
                    function findBrowserTab(item) {
                        if (item.type === 'component' && item.config.componentName === 'preview') {
                            return item;
                        }
                        if (item.contentItems && item.contentItems.length > 0) {
                            for (let child of item.contentItems) {
                                const browser = findBrowserTab(child);
                                if (browser) return browser;
                            }
                        }
                        return null;
                    }
                    
                    const browserTab = findBrowserTab(goldenLayout.root);
                    if (browserTab && browserTab.parent) {
                        browserTab.parent.setActiveContentItem(browserTab);
                        return true;
                    }
                }
                return false;
            }
            
            devtoolsBtn.addEventListener('click', () => {
                console.log('DevTools button clicked - switching to browser and toggling DevTools');
                
                // First switch to browser tab
                const browserFound = focusBrowserTab();
                
                // Wait a bit for tab switch, then toggle DevTools
                setTimeout(() => {
                    if (window.electronAPI && window.electronAPI.browserDevTools) {
                        window.electronAPI.browserDevTools();
                        
                        // Toggle the button state
                        devToolsOpen = !devToolsOpen;
                        if (devToolsOpen) {
                            devtoolsBtn.classList.add('active');
                            devtoolsBtn.title = 'Close DevTools';
                        } else {
                            devtoolsBtn.classList.remove('active');
                            devtoolsBtn.title = 'Open DevTools';
                        }
                    }
                }, browserFound ? 100 : 0);
            });
            
            // Initialize title
            devtoolsBtn.title = 'Open DevTools';
        }

    }

    // Add all the missing popup and script functions
    function showSettingsPopup(buttonElement) {
        // Remove any existing popup
        const existingPopup = document.querySelector('.settings-popup');
        if (existingPopup) {
            existingPopup.remove();
        }
        
        // Create popup
        const popup = document.createElement('div');
        popup.className = 'settings-popup';
        
        // Position it near the button
        const rect = buttonElement.getBoundingClientRect();
        popup.style.left = rect.right + 10 + 'px';
        popup.style.top = rect.top + 'px';
        
        // Get saved values
        const savedScript = localStorage.getItem('octo-script') || '';
        const savedProjectPath = localStorage.getItem('octo-project-path') || '';
        const savedPreviewUrl = localStorage.getItem('octo-preview-url') || '';
        
        popup.innerHTML = `
            <div class="settings-popup-content">
                <h3>Settings</h3>
                
                <div class="settings-section">
                    <h4>Project Path</h4>
                    <div class="settings-input-group">
                        <input type="text" id="project-path-input" placeholder="/path/to/project" value="${savedProjectPath.replace(/"/g, '&quot;')}">
                        <button class="btn btn-secondary" id="browse-project-btn">Browse</button>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h4>Preview URL</h4>
                    <input type="text" id="preview-url-input" placeholder="http://localhost:3000" value="${savedPreviewUrl.replace(/"/g, '&quot;')}">
                </div>
                
                <div class="settings-section">
                    <h4>Script</h4>
                    <textarea id="script-input" placeholder="Enter script commands...">${savedScript}</textarea>
                </div>
                
                <div class="settings-popup-buttons">
                    <button class="btn btn-secondary" id="cancel-settings-btn">Cancel</button>
                    <button class="btn btn-primary" id="save-settings-btn">Save</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Add event handlers
        const projectInput = popup.querySelector('#project-path-input');
        const previewInput = popup.querySelector('#preview-url-input');
        const scriptInput = popup.querySelector('#script-input');
        const browseBtn = popup.querySelector('#browse-project-btn');
        const cancelBtn = popup.querySelector('#cancel-settings-btn');
        const saveBtn = popup.querySelector('#save-settings-btn');
        
        browseBtn.addEventListener('click', async () => {
            if (window.electronAPI && window.electronAPI.selectDirectory) {
                const path = await window.electronAPI.selectDirectory();
                if (path) {
                    projectInput.value = path;
                }
            }
        });
        
        cancelBtn.addEventListener('click', () => {
            popup.remove();
        });
        
        saveBtn.addEventListener('click', () => {
            // Save all settings
            localStorage.setItem('octo-project-path', projectInput.value);
            localStorage.setItem('octo-preview-url', previewInput.value);
            localStorage.setItem('octo-script', scriptInput.value);
            
            // Update play button appearance if script is saved
            const playBtn = document.getElementById('play-btn');
            if (scriptInput.value.trim()) {
                if (playBtn && !playBtn.classList.contains('running')) {
                    playBtn.classList.add('ready');
                    playBtn.title = 'Run Script';
                }
            } else {
                if (playBtn) {
                    playBtn.classList.remove('ready');
                    playBtn.classList.remove('running');
                    playBtn.title = 'Play';
                }
            }
            
            // Navigate browser if preview URL is set
            if (previewInput.value.trim()) {
                if (window.electronAPI && window.electronAPI.navigateBrowser) {
                    window.electronAPI.navigateBrowser(previewInput.value);
                }
            }
            
            popup.remove();
            showSaveNotification('Settings saved');
        });
        
        // Close on click outside
        setTimeout(() => {
            const clickOutside = (e) => {
                if (!popup.contains(e.target) && e.target !== buttonElement) {
                    popup.remove();
                    document.removeEventListener('click', clickOutside);
                }
            };
            document.addEventListener('click', clickOutside);
        }, 10);
    }
    
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

    // Helper functions for reinitializing components when tabs become active
    function initializeTerminalForActiveTab(componentId, terminalElement) {
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
        
        terminal.open(terminalElement);
        contentInstances.terminals[componentId] = terminal;
        
        // Start the terminal process
        if (window.electronAPI && window.electronAPI.terminalStart) {
            window.electronAPI.terminalStart().then(() => {
                console.log('Terminal process started for active tab:', componentId);
                
                // Change to project directory if set
                const projectPath = localStorage.getItem('octo-project-path');
                if (projectPath && projectPath.trim()) {
                    console.log('Changing terminal directory to:', projectPath);
                    window.electronAPI.terminalWrite(`cd "${projectPath}"\n`);
                }
            }).catch((error) => {
                console.error('Failed to start terminal process for active tab:', error);
            });
        }
        
        // Handle data from terminal
        if (window.electronAPI && window.electronAPI.onTerminalOutput) {
            window.electronAPI.onTerminalOutput((data) => {
                if (terminal) {
                    terminal.write(data);
                }
            });
        }
        
        // Handle user input
        terminal.onData(data => {
            if (window.electronAPI && window.electronAPI.terminalWrite) {
                window.electronAPI.terminalWrite(data);
            }
        });
    }

    function saveActiveFile() {
        if (goldenLayout && goldenLayout.root) {
            function findActiveTab(item) {
                if (item.type === 'stack' && item.getActiveContentItem()) {
                    return item.getActiveContentItem();
                }
                if (item.contentItems && item.contentItems.length > 0) {
                    for (let child of item.contentItems) {
                        const activeTab = findActiveTab(child);
                        if (activeTab) return activeTab;
                    }
                }
                return null;
            }
            
            const activeTab = findActiveTab(goldenLayout.root);
            
            if (activeTab && activeTab.config.componentName === 'editor') {
                const componentId = activeTab.config.componentState.id;
                const editorInstance = contentInstances.editors[componentId];
                
                if (editorInstance && editorInstance.editor) {
                    const content = editorInstance.editor.getValue();
                    const filePath = activeTab.config.componentState.filePath;
                    const fileName = activeTab.config.title;
                    
                    if (filePath) {
                        // Save existing file
                        if (window.electronAPI && window.electronAPI.writeTextFile) {
                            window.electronAPI.writeTextFile(filePath, content)
                                .then(() => {
                                    showSaveNotification(`Saved ${fileName}`);
                                })
                                .catch((error) => {
                                    console.error('Error saving file:', error);
                                    showSaveNotification(`Failed to save ${fileName}`, true);
                                });
                        } else {
                            showSaveNotification('Save function not available', true);
                        }
                    } else {
                        // New file - prompt for save location
                        showSaveNotification('Use Save As for new files', true);
                    }
                } else {
                    showSaveNotification('No editor content to save', true);
                }
            } else {
                showSaveNotification('No editor tab active', true);
            }
        }
    }

    function closeActiveTab() {
        if (goldenLayout && goldenLayout.root) {
            function findActiveTab(item) {
                if (item.type === 'stack' && item.getActiveContentItem()) {
                    return item.getActiveContentItem();
                }
                if (item.contentItems && item.contentItems.length > 0) {
                    for (let child of item.contentItems) {
                        const activeTab = findActiveTab(child);
                        if (activeTab) return activeTab;
                    }
                }
                return null;
            }
            
            const activeTab = findActiveTab(goldenLayout.root);
            
            if (activeTab) {
                const componentName = activeTab.config.componentName;
                console.log('Closing active tab:', componentName, activeTab.config.title);
                
                // Don't close if it's the last tab or if it's a core component that shouldn't be closed
                const parentStack = activeTab.parent;
                if (parentStack && parentStack.contentItems.length > 1) {
                    activeTab.remove();
                } else {
                    console.log('Cannot close the last remaining tab');
                }
            } else {
                console.log('No active tab found to close');
            }
        }
    }

    function createNewExplorerTab() {
        const explorerId = 'explorer-' + Date.now();
        
        const newItemConfig = {
            type: 'component',
            componentName: 'explorer',
            componentState: { 
                id: explorerId
            },
            title: 'Explorer'
        };
        
        // Find any available stack to add the explorer tab to
        if (goldenLayout && goldenLayout.root) {
            function findStack(item) {
                if (item.type === 'stack') {
                    return item;
                }
                if (item.contentItems && item.contentItems.length > 0) {
                    for (let child of item.contentItems) {
                        const stack = findStack(child);
                        if (stack) return stack;
                    }
                }
                return null;
            }
            
            const stack = findStack(goldenLayout.root);
            if (stack) {
                stack.addChild(newItemConfig);
                console.log('Explorer tab added to existing stack');
            } else {
                console.error('No stack found to add explorer tab to');
            }
        }
    }

    function createNewBrowserTab() {
        const browserId = 'preview-' + Date.now();
        
        const newItemConfig = {
            type: 'component',
            componentName: 'preview',
            componentState: { 
                id: browserId
            },
            title: 'Browser'
        };
        
        // Find any available stack to add the browser tab to
        if (goldenLayout && goldenLayout.root) {
            function findStack(item) {
                if (item.type === 'stack') {
                    return item;
                }
                if (item.contentItems && item.contentItems.length > 0) {
                    for (let child of item.contentItems) {
                        const stack = findStack(child);
                        if (stack) return stack;
                    }
                }
                return null;
            }
            
            const stack = findStack(goldenLayout.root);
            if (stack) {
                stack.addChild(newItemConfig);
                console.log('Browser tab added to existing stack');
            } else {
                console.error('No stack found to add browser tab to');
            }
        }
    }

    function createNewTerminalTab() {
        const terminalId = 'terminal-' + Date.now();
        
        const newItemConfig = {
            type: 'component',
            componentName: 'terminal',
            componentState: { 
                id: terminalId
            },
            title: 'Terminal'
        };
        
        // Find any available stack to add the terminal tab to
        if (goldenLayout && goldenLayout.root) {
            function findStack(item) {
                if (item.type === 'stack') {
                    return item;
                }
                if (item.contentItems && item.contentItems.length > 0) {
                    for (let child of item.contentItems) {
                        const stack = findStack(child);
                        if (stack) return stack;
                    }
                }
                return null;
            }
            
            const targetStack = findStack(goldenLayout.root);
            
            if (targetStack) {
                targetStack.addChild(newItemConfig);
                
                // Switch to the new tab
                setTimeout(() => {
                    if (targetStack.contentItems.length > 0) {
                        const newTab = targetStack.contentItems[targetStack.contentItems.length - 1];
                        targetStack.setActiveContentItem(newTab);
                    }
                }, 100);
                
                console.log('New terminal tab created');
            } else {
                console.error('No stack found to add terminal tab to');
            }
        }
    }


    function createNewGitTab() {
        const gitId = 'git-' + Date.now();
        
        const newItemConfig = {
            type: 'component',
            componentName: 'git',
            componentState: { 
                id: gitId
            },
            title: 'Git Status'
        };
        
        // Find any available stack to add the git tab to
        if (goldenLayout && goldenLayout.root) {
            function findStack(item) {
                if (item.type === 'stack') {
                    return item;
                }
                if (item.contentItems && item.contentItems.length > 0) {
                    for (let child of item.contentItems) {
                        const stack = findStack(child);
                        if (stack) return stack;
                    }
                }
                return null;
            }
            
            const targetStack = findStack(goldenLayout.root);
            
            if (targetStack) {
                targetStack.addChild(newItemConfig);
                
                // Switch to the new tab
                setTimeout(() => {
                    if (targetStack.contentItems.length > 0) {
                        const newTab = targetStack.contentItems[targetStack.contentItems.length - 1];
                        targetStack.setActiveContentItem(newTab);
                    }
                }, 100);
                
                console.log('New git tab created in stack:', targetStack);
            } else {
                console.error('No stack found to add git tab to');
            }
        }
    }

    function createNewEditorTab() {
        const editorId = 'editor-' + Date.now();
        const editorCount = Object.keys(contentInstances.editors).length + 1;
        
        const newItemConfig = {
            type: 'component',
            componentName: 'editor',
            componentState: { 
                id: editorId
            },
            title: `Editor ${editorCount}`
        };
        
        // Find any available stack to add the editor tab to
        if (goldenLayout && goldenLayout.root) {
            function findStack(item) {
                if (item.type === 'stack') {
                    return item;
                }
                if (item.contentItems && item.contentItems.length > 0) {
                    for (let child of item.contentItems) {
                        const stack = findStack(child);
                        if (stack) return stack;
                    }
                }
                return null;
            }
            
            const targetStack = findStack(goldenLayout.root);
            
            if (targetStack) {
                targetStack.addChild(newItemConfig);
                
                // Switch to the new tab
                setTimeout(() => {
                    if (targetStack.contentItems.length > 0) {
                        const newTab = targetStack.contentItems[targetStack.contentItems.length - 1];
                        targetStack.setActiveContentItem(newTab);
                    }
                }, 100);
                
                console.log('New editor tab created in stack:', targetStack);
            } else {
                console.error('No stack found to add editor tab to');
            }
        }
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

    // File save notification system
    function showSaveNotification(message, isError = false) {
        // Remove any existing notification
        const existing = document.querySelector('.save-notification');
        if (existing) {
            existing.remove();
        }
        
        // Create new notification
        const notification = document.createElement('div');
        notification.className = 'save-notification' + (isError ? ' error' : '');
        notification.textContent = message;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Hide and remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Cmd+W (Mac) or Ctrl+W (Windows/Linux) to close active tab
        if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
            e.preventDefault();
            closeActiveTab();
        }
        
        // Cmd+S (Mac) or Ctrl+S (Windows/Linux) to save active file
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            saveActiveFile();
        }
        
        // Cmd/Ctrl + Shift + R to reset saved layout
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'R') {
            e.preventDefault();
            if (confirm('Reset saved layout? This will clear all tabs and restart fresh.')) {
                localStorage.removeItem('octo-layout');
                window.location.reload();
            }
        }
    });

    // Initialize tab navigation
    function initializeTabNavigation() {
        const explorerBtn = document.getElementById('explorer-tab-btn');
        const previewBtn = document.getElementById('preview-tab-btn');
        const terminalBtn = document.getElementById('terminal-tab-btn');
        const gitBtn = document.getElementById('git-tab-btn');
        
        // Function to find and switch to a specific tab
        function switchToTab(componentName) {
            if (goldenLayout && goldenLayout.root) {
                function findTab(item, targetComponent) {
                    if (item.type === 'component' && item.config.componentName === targetComponent) {
                        return item;
                    }
                    if (item.contentItems && item.contentItems.length > 0) {
                        for (let child of item.contentItems) {
                            const tab = findTab(child, targetComponent);
                            if (tab) return tab;
                        }
                    }
                    return null;
                }
                
                const targetTab = findTab(goldenLayout.root, componentName);
                if (targetTab && targetTab.parent) {
                    targetTab.parent.setActiveContentItem(targetTab);
                    return true;
                }
            }
            return false;
        }
        
        // Function to update active tab button
        function updateActiveTabButton(activeComponent) {
            // Remove active class from all tab buttons
            document.querySelectorAll('.sidebar-tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to the current tab button
            const buttonMap = {
                'explorer': explorerBtn,
                'preview': previewBtn,
                'terminal': terminalBtn,
                'git': gitBtn
            };
            
            if (buttonMap[activeComponent]) {
                buttonMap[activeComponent].classList.add('active');
            }
        }
        
        // Add click handlers
        if (explorerBtn) {
            explorerBtn.addEventListener('click', () => {
                createNewExplorerTab();
                updateActiveTabButton('explorer');
            });
        }
        
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                createNewBrowserTab();
                updateActiveTabButton('preview');
            });
        }
        
        if (terminalBtn) {
            terminalBtn.addEventListener('click', () => {
                // Always create new terminal
                createNewTerminalTab();
                updateActiveTabButton('terminal');
            });
        }
        
        
        if (gitBtn) {
            gitBtn.addEventListener('click', () => {
                // Create new git tab instead of switching to existing one
                createNewGitTab();
            });
        }
        
        // Listen to tab changes and update button states
        if (goldenLayout) {
            goldenLayout.on('stackCreated', function(stack) {
                stack.on('activeContentItemChanged', function(contentItem) {
                    const componentName = contentItem.config.componentName;
                    updateActiveTabButton(componentName);
                });
            });
        }
        
        // Set initial active tab (Claude by default since activeItemIndex is 1)
        setTimeout(() => {
            updateActiveTabButton('claude');
        }, 500);
    }

    // Initialize everything
    setTimeout(() => {
        initializeGoldenLayout();
        initializeHeaderButtons();
        initializeTabNavigation();
    }, 200);

    console.log('Application initialized with Golden Layout');
});