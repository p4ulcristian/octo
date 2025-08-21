document.addEventListener('DOMContentLoaded', async () => {
    const versions = window.electronAPI.getVersions();
    document.getElementById('node-version').textContent = versions.node;
    document.getElementById('chrome-version').textContent = versions.chrome;
    document.getElementById('electron-version').textContent = versions.electron;
    
    const appVersion = await window.electronAPI.getAppVersion();
    document.getElementById('app-version').textContent = appVersion;

    updateTime();
    setInterval(updateTime, 1000);

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

        addLogEntry(`Showing dialog with message: "${message}"`, 'info');
        
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
            addLogEntry('Menu action: New file', 'info');
            messageInput.value = '';
            outputLog.innerHTML = '';
        } else if (event.channel === 'menu-open') {
            addLogEntry(`Menu action: Open file - ${data}`, 'info');
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

    addLogEntry('Application initialized successfully', 'success');
});