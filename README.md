# Operation Zero - Web Game

A fun and engaging web-based grid game built with HTML, CSS, and JavaScript.

## 🎮 Game Overview

Operation Zero is a strategic grid-based game where you must avoid enemies while collecting power-ups to defeat them. Navigate the 10x10 grid, survive encounters, and progress through increasingly difficult levels.

## 🎯 How to Play

### Objective
- Defeat all enemies on each level to progress
- Avoid direct collision with enemies (you only have 3 lives!)
- Collect power-ups (⭐) to gain an advantage

### Controls
- **Arrow Keys** - Move your character (🎮) up, down, left, right
- **Mouse Click** - Click on adjacent cells to move
- **START GAME** - Begin a new game
- **PAUSE** - Pause/resume the game
- **RESET** - Reset the game to initial state

### Game Elements
- 🎮 **Player** - Your character (blue)
- 👾 **Enemies** - Red aliens trying to catch you
- ⭐ **Power-ups** - Blue stars that remove a random enemy

## 📊 Scoring System

- **Base Score**: 10 points per second survived
- **Power-up Bonus**: 50 points per collected power-up
- **Enemy Defeat**: 100 points per enemy defeated by power-up
- **Level Bonus**: Points increase with each level

## 🎚️ Difficulty Progression

Each level increases:
- Number of enemies
- Enemy movement speed
- Scoring multiplier
- Challenge intensity

## 🚀 Game Features

- ✨ Smooth grid-based movement
- 🤖 AI-controlled enemies with pathfinding
- 🎨 Beautiful gradient UI with animations
- 📱 Responsive design (works on mobile and desktop)
- ⌨️ Keyboard and mouse controls
- 🏆 Progressive difficulty scaling
- 💫 Visual effects and feedback

## 💻 Technical Details

### Built With
- **HTML5** - Semantic structure
- **CSS3** - Modern styling with gradients and animations
- **Vanilla JavaScript** - Pure JS game logic, no dependencies

### Game Architecture
- `OperationZeroGame` class - Main game controller
- Grid-based coordinate system (0-99 for 10x10)
- Event-driven input handling
- Game loop interval system

## 🎮 Installation

1. Clone or download this repository
2. Open `index.html` in a modern web browser
3. Click "START GAME" and enjoy!

No build tools or dependencies required - it's pure vanilla web technologies!

## 🛠️ Customization

You can easily customize the game by modifying `script.js`:

```javascript
// Change grid size
this.gridSize = 10; // Default: 10x10

// Adjust initial game speed (milliseconds)
this.gameSpeed = 1000; // Default: 1000ms

// Change initial lives
this.lives = 3; // Default: 3

// Modify difficulty scaling
this.gameSpeed = Math.max(400, 1000 - (this.level * 100));
```

## 📈 Future Enhancements

Potential features to add:
- Different game modes (Survival, Time Attack, etc.)
- Power-up variety (Shield, Speed Boost, etc.)
- Sound effects and music
- High score leaderboard (with localStorage)
- Different visual themes
- Mobile-optimized touch controls
- Multiple player support
- Boss levels

## 📄 License

Feel free to use, modify, and distribute this game freely!

## 🤝 Contributing

Improvements and suggestions are welcome! Feel free to fork and submit pull requests.

---

**Ready to play?** Open `index.html` in your browser and start the game now! 🚀
