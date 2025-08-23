# Octo

<div align="center">
  <img src="assets/logo.png" alt="Octo Logo" width="128" height="128">
  
  **A modern, integrated development environment built with Electron**
  
  *Code, browse, terminal, and git - all in one powerful workspace*
</div>

## ✨ Features

### 🗂️ **File Explorer**
- Browse project files and directories
- Quick file navigation and opening
- Integrated with git status indicators

### 📝 **Code Editor**
- Syntax highlighting for multiple languages
- Auto-save functionality
- Multiple file tabs with Golden Layout
- Support for JavaScript, Python, CSS, HTML, JSON, and more

### 🌐 **Integrated Browser**
- Built-in web preview
- Navigate with back/forward buttons
- Refresh and developer tools access
- Perfect for testing web applications

### 💻 **Terminal**
- Full terminal emulation with xterm.js
- Multiple terminal instances
- Real shell environment with complete PATH
- Automatic Claude CLI integration

### 🔧 **Git Integration**
- Visual git status display
- Stage/unstage files with one click
- Commit with custom messages
- Push/pull/sync operations
- Git history visualization with commit graph
- Branch information display
- Conflict resolution guidance

### 🎨 **Modern UI**
- Dark theme optimized for coding
- Resizable panels and layouts
- Font Awesome icons throughout
- Responsive design

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Git (for git integration features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd octo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

5. **Package the application**
   ```bash
   npm run dist
   ```

## 📦 Distribution

The app can be packaged for different platforms:

- **macOS**: `npm run dist:mac` - Creates `.dmg` and `.zip` files
- **Windows**: `npm run dist:win` - Creates `.exe` installer
- **Linux**: `npm run dist:linux` - Creates `.AppImage` and package files

## 🎯 Usage

### Setting Up Your Workspace

1. **Open Octo** and click the folder icon in the sidebar
2. **Select your project directory** using the browse button
3. **Start coding** by opening files from the explorer
4. **Use the terminal** for command-line operations
5. **Preview your work** in the integrated browser

### Git Workflow

1. **View Changes**: The git tab shows all modified, staged, and untracked files
2. **Stage Files**: Click on individual files to stage them
3. **Commit**: Write a commit message and click "COMMIT" or "COMMIT ALL"
4. **Sync**: Use PULL, PUSH, or SYNC buttons to synchronize with remote
5. **History**: Toggle git history to see recent commits with details

### Terminal Features

- **Multiple Terminals**: Create as many terminal instances as needed
- **Full Environment**: Complete access to your system's PATH and tools
- **Claude Integration**: Automatic Claude CLI terminal available
- **Real TTY**: Proper terminal emulation with all features

## 🛠️ Technical Details

### Built With
- **Electron**: Cross-platform desktop framework
- **Golden Layout**: Advanced window management
- **xterm.js**: Terminal emulation
- **CodeMirror**: Code editing capabilities
- **node-pty**: Real terminal processes
- **Font Awesome**: Icon library

### Architecture
- **Main Process**: Handles system integration, file operations, and git commands
- **Renderer Process**: Manages UI, layout, and user interactions
- **Preload Script**: Secure bridge between main and renderer processes

### Security
- **Context Isolation**: Enabled for security
- **Content Security Policy**: Implemented to prevent XSS
- **Sandboxed Renderer**: Restricted access to system resources

## 🔧 Configuration

### Project Settings
Settings are automatically saved to `localStorage`:
- Project path
- Layout configuration
- Editor preferences
- Git settings

### Environment Variables
The app respects your shell's environment variables and PATH, ensuring all your development tools are available.

## ⚠️ Data Safety

- **Auto-save**: Editor content is automatically saved
- **Refresh Protection**: Confirmation dialog prevents accidental data loss
- **Git Integration**: Built-in version control for code safety
- **Session Recovery**: Layout and open files are restored on restart

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Bug Reports & Feature Requests

Found a bug or have a feature idea? Please:

1. **Check existing issues** first
2. **Create a detailed issue** with steps to reproduce
3. **Include your system information** (OS, Node version, etc.)
4. **Add screenshots** if applicable

## 🎉 Acknowledgments

- **Electron Team** - For the amazing desktop framework
- **Golden Layout** - For the flexible window management
- **xterm.js Team** - For terminal emulation
- **Font Awesome** - For beautiful icons
- **All contributors** who help make Octo better

---

<div align="center">
  <strong>Happy Coding with Octo! 🐙</strong>
  
  Built with ❤️ using Electron
</div>