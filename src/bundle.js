// Bundle entry point for xterm and other dependencies
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';

// Expose Terminal globally for the renderer
window.Terminal = Terminal;

console.log('Bundle loaded, Terminal available:', typeof Terminal);
console.log('Terminal class:', Terminal);

// Export for webpack
export { Terminal };