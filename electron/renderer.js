const { contextBridge, ipcRenderer } = require('electron');

// Since contextIsolation is disabled, we can expose APIs directly to window
window.electronAPI = {
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getVersion: () => ipcRenderer.invoke('get-version'),
  minimize: () => ipcRenderer.invoke('minimize-window'),
  close: () => ipcRenderer.invoke('close-window'),
  
  // Event listeners
  onWindowShow: (callback) => ipcRenderer.on('window-show', callback),
  onWindowHide: (callback) => ipcRenderer.on('window-hide', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
};

window.addEventListener('keydown', (e) => {
  // Disabilita Ctrl+R
  if (e.ctrlKey && e.key === 'r') {
    e.preventDefault();
  }
  // Disabilita F5
  if (e.key === 'F5') {
    e.preventDefault();
  }
  // Disabilita Ctrl+Shift+R
  if (e.ctrlKey && e.shiftKey && e.key === 'r') {
    e.preventDefault();
  }
  // // Disabilita Ctrl+Shift+I
  // if (e.ctrlKey && e.shiftKey && e.key === 'I') {
  //   e.preventDefault();
  // }
});


window.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('electron-app');

  // Intercept fetch requests to handle asset paths
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string' && input.startsWith('/assets/')) {
      // Convert absolute asset paths to relative paths for custom protocol
      input = input.substring(1); // Remove leading slash
    }
    return originalFetch.call(this, input, init);
  };

  // Also intercept XMLHttpRequest for asset paths
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    if (typeof url === 'string' && url.startsWith('/assets/')) {
      url = url.substring(1); // Remove leading slash
    }
    return originalOpen.call(this, method, url, ...args);
  };

  const style = document.createElement('style');
  style.textContent = `
    .electron-app {
      /* Electron-specific styles here */
      -webkit-app-region: no-drag;
    }

    /* Make title bar draggable on macOS */
    .title-bar {
      -webkit-app-region: drag;
    }

    /* Prevent text selection in draggable areas */
    .title-bar {
      -webkit-user-select: none;
      user-select: none;
    }
  `;
  document.head.appendChild(style);
});
