<img width="1601" height="988" alt="image" src="https://github.com/user-attachments/assets/f7a5ab6d-28eb-4faf-854a-4a0047f0773a" /># 📚 Inkwell - AI-Powered Book Reader

> **A fully AI-coded desktop book reading application built entirely through vibe coding**

![Inkwell](https://img.shields.io/badge/Built%20With-AI-purple?style=for-the-badge)
![Electron](https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=Electron&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

## 🎯 The Story Behind Inkwell

This is my **second fully AI-coded project**, created entirely through conversational programming using **Cursor** and **OpenClaw**.

The inspiration struck while I was following [Andrej Karpathy](https://github.com/karpathy) (co-founder of OpenAI). I came across a book reader repository in his work, and it sparked an idea: *Could I build a complete desktop application using only AI, without writing code manually?* 

What made this particularly exciting was that I had **never built a React application before**—or in this case, an Electron app. I wanted to push the boundaries of what's possible with AI-assisted development. The concept of "vibe coding"—where you describe what you want and AI generates the entire implementation—was completely new to me. This project became a personal experiment in that direction.

Instead of learning Electron, PDF rendering, EPUB parsing, or desktop app architecture traditionally, I described my vision in plain English, and AI turned those descriptions into working code. Every feature, every UI component, every interaction—all created through conversation.

## ✨ Features

### 📖 Multi-Format Support
- **PDF**: Full PDF rendering with page navigation and zoom
- **EPUB**: Native EPUB reader with page flip animations
- **TXT**: Clean text reading experience with custom fonts
- **MOBI/AZW/AZW3**: Support for Kindle formats (attempts direct rendering)
- **FB2**: FictionBook format support

### 🎨 Beautiful Dark UI
- Modern dark theme with purple accent colors
- macOS-style window controls (colored dots)
- Glassmorphism effects and smooth animations
- Professional book library grid layout
- Sidebar with book spines for quick access

### 📝 Reading Features
- **Highlights**: Three color options (Yellow, Green, Pink)
- **Notes**: Add personal notes while reading
- **Reading Progress**: Auto-saves position, visual progress bars
- **Font Controls**: Adjustable font size and zoom levels
- **Dark Mode**: Invert colors for comfortable night reading

### ⏰ Built-in Pomodoro Timer
- Focus mode for distraction-free reading
- Customizable work/break intervals
- Visual circular progress indicator
- Session counter
- Calming sound notification

### 🤖 AI Integration
- **ChatGPT Integration**: Manual text input for AI assistance
- Ask questions about your reading
- Get explanations and summaries

### 💾 Smart Storage
- SQLite database for book metadata
- Automatic reading position sync
- Persistent highlights and notes
- Books organized in sidebar and grid views

## 🛠️ Tech Stack

- **Electron**: Cross-platform desktop framework
- **PDF.js**: Mozilla's PDF rendering engine
- **epub.js**: EPUB book rendering library
- **better-sqlite3**: Fast SQLite database
- **Font Awesome**: Beautiful icons
- **Web Audio API**: Synthesized calming sounds

## 🚀 Installation & Usage

### Prerequisites
```bash
Node.js v16+ required
```

### Setup
```bash
# Clone the repository
git clone https://github.com/abhijeet-0165/inkwell.git
cd inkwell

# Install dependencies
npm install

# Start the application
npm start
```

### Adding Books
1. Click the **"+ Add Books"** button
2. Select PDF, EPUB, TXT, MOBI, or other supported formats
3. Books appear in your library instantly

### Reading Experience
- **Open a book**: Click any book card in the grid
- **Navigate**: Use arrow buttons or keyboard shortcuts
- **Highlight**: Click the highlighter button, paste text, choose color
- **Ask ChatGPT**: Click the robot button, paste your question
- **Take Notes**: Click the notes icon in the toolbar
- **Pomodoro**: Click the clock icon to start a focus session

## 🎨 Screenshots

<img width="1601" height="988" alt="image" src="https://github.com/user-attachments/assets/3e426f54-7be3-4395-b25f-dde9d3df2f5a" />


## 🧪 The Vibe Coding Process

This entire project was built through **conversational AI programming**:

1. **Description**: "I want a dark-themed book reader with purple accents"
2. **AI Response**: Complete HTML, CSS, and JavaScript code
3. **Iteration**: "Add a Pomodoro timer panel with circular progress"
4. **AI Response**: Full implementation with animations
5. **Refinement**: "Make the grid layout responsive and fix card sizes"
6. **AI Response**: Updated CSS with proper constraints

No manual coding. No Stack Overflow. No documentation hunting. Just pure conversational software development.

### Tools Used
- **OpenClaw**: AI-powered development environment
- **Cursor**: AI code editor
- **Claude**: AI assistant for code generation

## 🏗️ Project Structure

```
inkwell/
├── main.js              # Electron main process
├── preload.js           # Preload scripts for IPC
├── package.json         # Dependencies
├── renderer/
│   ├── index.html       # Main UI structure
│   ├── style.css        # Complete styling (dark theme)
│   ├── app.js           # Frontend logic
│   └── lib/
│       ├── pdf.min.js           # PDF.js library
│       ├── pdf.worker.min.js    # PDF.js worker
│       ├── epub.min.js          # EPUB.js library
│       ├── fa.min.css           # Font Awesome styles
│       └── webfonts/            # Font Awesome fonts
└── assets/              # App icons
```

## 🌟 What I Learned

- **AI can build complete applications**: Not just snippets, but entire functional apps
- **Vibe coding is real**: Describe features in plain English, get working code
- **Iteration is key**: Refining through conversation produces better results
- **New territory**: Built an Electron app without prior React/Electron experience
- **AI handles complexity**: PDF rendering, SQLite, IPC—all generated through conversation

## 🔮 Future Ideas

- [ ] Cloud sync for reading positions
- [ ] Book collections and tags
- [ ] Reading statistics and streaks
- [ ] Text-to-speech integration
- [ ] More ChatGPT features (summaries, character analysis)
- [ ] Mobile companion app
- [ ] Book recommendations

## 👨💻 About Me

**Abhijeet Singh**  
3rd Year Computer Science Student | Chitkara University  
Specialization: Cyber Security

- 🌐 Portfolio: [abhijeet911.netlify.app](https://abhijeet911.netlify.app)
- 💼 LinkedIn: [abhijeet-singh](https://linkedin.com/in/abhijeet-singh)
- 📧 Email: hme13139@gmail.com
- 🐙 GitHub: [@abhijeet-0165](https://github.com/abhijeet-0165)

## 📜 License

MIT License - feel free to use, modify, and distribute.

## 🙏 Acknowledgments

- **Andrej Karpathy**: For the inspiration through his book reader project
- **OpenAI**: For creating the foundation of AI assistance
- **OpenClaw & Cursor**: For making vibe coding possible
- **PDF.js & epub.js**: For excellent open-source libraries

---

**Built with 💜 by [Abhijeet singh](https://github.com/abhijeet-0165) • No manual coding • Pure vibe energy**
