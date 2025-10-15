# 🎨 Worxed Stream Manager - Dual Theme System

## 🔥 **Theme 1: Fiery Industrial** (Your Custom Schema)

```css
/* FIERY INDUSTRIAL THEME */
:root[data-theme="fiery"] {
  /* Primary Colors (Core Brand) */
  --primary-neon-fire: #FF4C00;      /* Main accent, highlights, text glow */
  --secondary-ember: #FF7518;         /* Hover states, animations */
  
  /* Secondary / Accent Colors */
  --accent-amber: #FFA040;            /* Soft accents, panel highlights */
  --accent-rust: #5C2E1B;             /* Frames, dividers, borders */
  
  /* Neutrals (Backgrounds & Base) */
  --bg-charcoal: #1C1A1A;             /* Main background */
  --bg-deep: #0A0A0A;                 /* Deep shadows */
  --bg-muted: #3A3A3A;                /* Subtle text, inactive */
  
  /* Optional Extras (Special Effects) */
  --glow-yellow: #FFD15C;             /* Follower alerts */
  --crimson-warning: #A10000;         /* Warnings, raid alerts */
  
  /* Text Colors */
  --text-primary: #FFFFFF;
  --text-secondary: #FFA040;
  --text-muted: #3A3A3A;
  --text-glow: #FF4C00;
  
  /* Interactive States */
  --hover-glow: rgba(255, 76, 0, 0.3);
  --active-glow: rgba(255, 117, 24, 0.5);
  --border-rust: rgba(92, 46, 27, 0.8);
  
  /* Shadows & Effects */
  --shadow-fire: 0 0 20px rgba(255, 76, 0, 0.4);
  --shadow-ember: 0 0 15px rgba(255, 117, 24, 0.3);
  --gradient-bg: linear-gradient(135deg, #1C1A1A 0%, #0A0A0A 100%);
  --gradient-panel: linear-gradient(145deg, #1C1A1A 0%, #5C2E1B 100%);
}
```

## ⚡ **Theme 2: Electric Neo-Tokyo**

```css
/* ELECTRIC NEO-TOKYO THEME */
:root[data-theme="neo-tokyo"] {
  /* Primary Colors */
  --primary-neon-fire: #FF0080;       /* Electric pink/magenta */
  --secondary-ember: #00D4FF;         /* Cyber blue */
  
  /* Secondary / Accent Colors */
  --accent-amber: #39FF14;            /* Matrix green */
  --accent-rust: #6C5CE7;             /* Electric purple */
  
  /* Neutrals (Backgrounds & Base) */
  --bg-charcoal: #0A0A0F;             /* Deep space black */
  --bg-deep: #151521;                 /* Dark purple-gray */
  --bg-muted: #1F1F2E;                /* Medium dark */
  
  /* Optional Extras (Special Effects) */
  --glow-yellow: #FFFF00;             /* Electric yellow */
  --crimson-warning: #FF3864;         /* Hot pink warnings */
  
  /* Text Colors */
  --text-primary: #FFFFFF;
  --text-secondary: #B8BCC8;
  --text-muted: #6B7280;
  --text-glow: #FF0080;
  
  /* Interactive States */
  --hover-glow: rgba(255, 0, 128, 0.3);
  --active-glow: rgba(0, 212, 255, 0.4);
  --border-rust: rgba(108, 92, 231, 0.3);
  
  /* Shadows & Effects */
  --shadow-fire: 0 0 20px rgba(255, 0, 128, 0.4);
  --shadow-ember: 0 0 15px rgba(0, 212, 255, 0.3);
  --gradient-bg: linear-gradient(135deg, #0A0A0F 0%, #151521 100%);
  --gradient-panel: linear-gradient(145deg, #151521 0%, #1F1F2E 100%);
}
```

## 🎨 **Universal Component Styles**

```css
/* THEME-AGNOSTIC COMPONENT STYLES */
.dashboard-container {
  background: var(--gradient-bg);
  color: var(--text-primary);
  min-height: 100vh;
  font-family: 'Montserrat', sans-serif;
}

.panel {
  background: var(--gradient-panel);
  border: 2px solid var(--accent-rust);
  border-radius: 8px;
  padding: 20px;
  box-shadow: var(--shadow-fire);
  transition: all 0.3s ease;
}

.panel:hover {
  box-shadow: var(--shadow-ember);
  border-color: var(--primary-neon-fire);
}

.header-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2.5em;
  color: var(--primary-neon-fire);
  text-shadow: var(--shadow-fire);
  letter-spacing: 2px;
}

.alert-text {
  font-family: 'VT323', monospace;
  color: var(--text-glow);
  text-shadow: 0 0 8px var(--primary-neon-fire);
  font-size: 1.2em;
}

.button-primary {
  background: var(--primary-neon-fire);
  color: var(--bg-deep);
  border: 2px solid var(--secondary-ember);
  padding: 12px 24px;
  border-radius: 6px;
  font-family: 'Orbitron', monospace;
  font-weight: bold;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-fire);
}

.button-primary:hover {
  background: var(--secondary-ember);
  box-shadow: var(--shadow-ember);
  transform: translateY(-2px);
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-amber);
  box-shadow: 0 0 12px var(--accent-amber);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { 
    box-shadow: 0 0 12px var(--accent-amber);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 0 20px var(--primary-neon-fire);
    transform: scale(1.1);
  }
}

.theme-switcher {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.theme-toggle {
  background: var(--bg-muted);
  border: 2px solid var(--accent-rust);
  color: var(--text-primary);
  padding: 10px 15px;
  border-radius: 25px;
  cursor: pointer;
  font-family: 'Orbitron', monospace;
  transition: all 0.3s ease;
}

.theme-toggle:hover {
  background: var(--primary-neon-fire);
  color: var(--bg-deep);
  box-shadow: var(--shadow-fire);
}
```

## 🔧 **Theme Switcher JavaScript**

```javascript
class ThemeManager {
  constructor() {
    this.currentTheme = localStorage.getItem('worxed-theme') || 'fiery';
    this.initializeTheme();
    this.createThemeSwitcher();
  }

  initializeTheme() {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'fiery' ? 'neo-tokyo' : 'fiery';
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    localStorage.setItem('worxed-theme', this.currentTheme);
    this.updateSwitcherText();
  }

  createThemeSwitcher() {
    const switcher = document.createElement('div');
    switcher.className = 'theme-switcher';
    switcher.innerHTML = `
      <button class="theme-toggle" onclick="themeManager.toggleTheme()">
        <span id="theme-text">${this.getThemeText()}</span>
      </button>
    `;
    document.body.appendChild(switcher);
  }

  getThemeText() {
    return this.currentTheme === 'fiery' ? '🔥 FIERY' : '⚡ NEO-TOKYO';
  }

  updateSwitcherText() {
    const themeText = document.getElementById('theme-text');
    if (themeText) {
      themeText.textContent = this.getThemeText();
    }
  }
}

// Initialize theme manager
const themeManager = new ThemeManager();
```

## 📱 **Implementation Example HTML**

```html
<!DOCTYPE html>
<html lang="en" data-theme="fiery">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Worxed Stream Manager</title>
    
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue:wght@400&family=Montserrat:wght@300;400;500;700&family=Orbitron:wght@400;700;900&family=VT323&display=swap" rel="stylesheet">
    
    <!-- Theme Styles -->
    <link rel="stylesheet" href="themes.css">
</head>
<body>
    <div class="dashboard-container">
        <header>
            <h1 class="header-title">WORXED STREAM MANAGER</h1>
            <div class="status-indicator"></div>
        </header>
        
        <main class="dashboard-grid">
            <div class="panel">
                <h2 class="alert-text">STREAM CONTROLS</h2>
                <button class="button-primary">Start Stream</button>
                <button class="button-primary">Test Alert</button>
            </div>
            
            <div class="panel">
                <h2 class="alert-text">LIVE STATS</h2>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Followers</span>
                        <span class="stat-value">1,234</span>
                    </div>
                </div>
            </div>
        </main>
    </div>
    
    <script src="theme-manager.js"></script>
</body>
</html>
```

## 🎯 **Visual Comparison**

| Element | Fiery Industrial | Electric Neo-Tokyo |
|---------|------------------|-------------------|
| **Main BG** | Charcoal (#1C1A1A) | Deep Space (#0A0A0F) |
| **Primary Accent** | Neon Fire (#FF4C00) | Electric Pink (#FF0080) |
| **Secondary** | Ember Orange (#FF7518) | Cyber Blue (#00D4FF) |
| **Highlight** | Amber Gold (#FFA040) | Matrix Green (#39FF14) |
| **Vibe** | Industrial/Rust/Fire | Cyberpunk/Neon/Future |

Would you like me to implement this dual theme system into your current stream manager dashboard? I can start with updating the main `index.html` file!