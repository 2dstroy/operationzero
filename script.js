class OperationZeroGame {
    constructor() {
        this.gridSize = 10;
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.gameRunning = false;
        this.gamePaused = false;
        this.playerPosition = null;
        this.enemies = [];
        this.powerups = [];
        this.gameSpeed = 1000;
        this.difficulty = 1;

        this.initializeElements();
        this.createGrid();
        this.attachEventListeners();
    }

    initializeElements() {
        this.gameBoard = document.getElementById('gameBoard');
        this.scoreDisplay = document.getElementById('score');
        this.levelDisplay = document.getElementById('level');
        this.livesDisplay = document.getElementById('lives');
        this.gameStatusDisplay = document.getElementById('gameStatus');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
    }

    createGrid() {
        this.gameBoard.innerHTML = '';
        this.grid = {};

        for (let i = 0; i < this.gridSize * this.gridSize; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `cell-${i}`;
            cell.addEventListener('click', () => this.handleCellClick(i));
            this.gameBoard.appendChild(cell);
            this.grid[i] = { element: cell, type: 'empty' };
        }

        // Place player
        this.playerPosition = Math.floor(Math.random() * (this.gridSize * this.gridSize));
        this.updateCell(this.playerPosition, 'player', '🎮');

        // Place initial enemies
        this.spawnEnemies();
        
        // Place initial powerups
        this.spawnPowerups();
    }

    spawnEnemies() {
        this.enemies = [];
        const enemyCount = 2 + this.level;
        
        for (let i = 0; i < enemyCount; i++) {
            let pos;
            do {
                pos = Math.floor(Math.random() * (this.gridSize * this.gridSize));
            } while (pos === this.playerPosition || this.enemies.includes(pos));
            
            this.enemies.push(pos);
            this.updateCell(pos, 'enemy', '👾');
        }
    }

    spawnPowerups() {
        this.powerups = [];
        const powerupCount = 1 + Math.floor(this.level / 2);
        
        for (let i = 0; i < powerupCount; i++) {
            let pos;
            do {
                pos = Math.floor(Math.random() * (this.gridSize * this.gridSize));
            } while (
                pos === this.playerPosition ||
                this.enemies.includes(pos) ||
                this.powerups.includes(pos)
            );
            
            this.powerups.push(pos);
            this.updateCell(pos, 'powerup', '⭐');
        }
    }

    updateCell(position, type, symbol) {
        if (!this.grid[position]) return;

        const cell = this.grid[position].element;
        cell.className = 'cell';
        cell.textContent = '';

        if (type === 'empty') {
            this.grid[position].type = 'empty';
        } else {
            cell.classList.add(type);
            cell.textContent = symbol;
            this.grid[position].type = type;
        }
    }

    clearCell(position) {
        this.updateCell(position, 'empty', '');
    }

    handleCellClick(position) {
        if (!this.gameRunning || this.gamePaused) return;

        // Simple movement logic - move to adjacent cells
        const distance = this.getDistance(this.playerPosition, position);
        
        if (distance === 1) {
            this.movePlayer(position);
        }
    }

    getDistance(pos1, pos2) {
        const row1 = Math.floor(pos1 / this.gridSize);
        const col1 = pos1 % this.gridSize;
        const row2 = Math.floor(pos2 / this.gridSize);
        const col2 = pos2 % this.gridSize;

        return Math.max(Math.abs(row1 - row2), Math.abs(col1 - col2));
    }

    movePlayer(newPosition) {
        this.clearCell(this.playerPosition);
        this.playerPosition = newPosition;
        this.updateCell(this.playerPosition, 'player', '🎮');

        // Check collisions
        if (this.enemies.includes(newPosition)) {
            this.handleEnemyCollision();
        }

        if (this.powerups.includes(newPosition)) {
            this.handlePowerupCollision(newPosition);
        }

        // Check win condition
        if (this.enemies.length === 0) {
            this.levelUp();
        }
    }

    handleEnemyCollision() {
        this.lives--;
        this.livesDisplay.textContent = this.lives;

        if (this.lives <= 0) {
            this.gameOver();
        } else {
            this.gameStatusDisplay.textContent = 'Hit! Be careful...';
            setTimeout(() => {
                this.resetPlayerPosition();
            }, 500);
        }
    }

    handlePowerupCollision(position) {
        this.powerups = this.powerups.filter(p => p !== position);
        this.clearCell(position);
        this.score += 50 * this.level;
        this.scoreDisplay.textContent = this.score;
        this.gameStatusDisplay.textContent = 'Power-up collected! +50 points';
        
        // Remove a random enemy
        if (this.enemies.length > 0) {
            const enemyIndex = Math.floor(Math.random() * this.enemies.length);
            const enemyPos = this.enemies[enemyIndex];
            this.clearCell(enemyPos);
            this.enemies.splice(enemyIndex, 1);
            this.score += 100 * this.level;
            this.scoreDisplay.textContent = this.score;
            this.gameStatusDisplay.textContent = 'Enemy defeated! +100 points';
        }
    }

    resetPlayerPosition() {
        this.clearCell(this.playerPosition);
        this.playerPosition = Math.floor(Math.random() * (this.gridSize * this.gridSize));
        while (this.enemies.includes(this.playerPosition)) {
            this.playerPosition = Math.floor(Math.random() * (this.gridSize * this.gridSize));
        }
        this.updateCell(this.playerPosition, 'player', '🎮');
    }

    moveEnemies() {
        this.enemies.forEach((pos, index) => {
            this.clearCell(pos);
            
            // Simple AI - move towards player
            const row = Math.floor(pos / this.gridSize);
            const col = pos % this.gridSize;
            const playerRow = Math.floor(this.playerPosition / this.gridSize);
            const playerCol = this.playerPosition % this.gridSize;

            let newRow = row;
            let newCol = col;

            if (playerRow < row) newRow--;
            else if (playerRow > row) newRow++;

            if (playerCol < col) newCol--;
            else if (playerCol > col) newCol++;

            let newPos = newRow * this.gridSize + newCol;

            // Clamp to grid
            newPos = Math.max(0, Math.min(this.gridSize * this.gridSize - 1, newPos));

            this.enemies[index] = newPos;
            this.updateCell(newPos, 'enemy', '👾');

            // Check if enemy caught player
            if (newPos === this.playerPosition) {
                this.handleEnemyCollision();
            }
        });
    }

    levelUp() {
        this.level++;
        this.levelDisplay.textContent = this.level;
        this.difficulty += 0.5;
        this.gameSpeed = Math.max(400, 1000 - (this.level * 100));
        
        this.score += 200 * this.level;
        this.scoreDisplay.textContent = this.score;
        
        this.gameStatusDisplay.textContent = `Level ${this.level}! Game continues...`;
        
        this.createGrid();
        this.startGameLoop();
    }

    gameOver() {
        this.gameRunning = false;
        this.gamePaused = false;
        this.gameStatusDisplay.className = 'game-status game-over';
        this.gameStatusDisplay.textContent = `GAME OVER! Final Score: ${this.score}`;
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        clearInterval(this.gameLoopInterval);
    }

    startGame() {
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.difficulty = 1;
        this.gameSpeed = 1000;
        
        this.scoreDisplay.textContent = this.score;
        this.levelDisplay.textContent = this.level;
        this.livesDisplay.textContent = this.lives;
        
        this.gameRunning = true;
        this.gamePaused = false;
        this.gameStatusDisplay.className = 'game-status running';
        this.gameStatusDisplay.textContent = 'Game Running...';
        
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        
        this.createGrid();
        this.startGameLoop();
    }

    pauseGame() {
        if (!this.gameRunning) return;

        this.gamePaused = !this.gamePaused;

        if (this.gamePaused) {
            this.gameStatusDisplay.className = 'game-status paused';
            this.gameStatusDisplay.textContent = 'Game Paused';
            clearInterval(this.gameLoopInterval);
            this.pauseBtn.textContent = 'RESUME';
        } else {
            this.gameStatusDisplay.className = 'game-status running';
            this.gameStatusDisplay.textContent = 'Game Running...';
            this.pauseBtn.textContent = 'PAUSE';
            this.startGameLoop();
        }
    }

    resetGame() {
        this.gameRunning = false;
        this.gamePaused = false;
        clearInterval(this.gameLoopInterval);
        
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        
        this.scoreDisplay.textContent = this.score;
        this.levelDisplay.textContent = this.level;
        this.livesDisplay.textContent = this.lives;
        
        this.gameStatusDisplay.className = 'game-status';
        this.gameStatusDisplay.textContent = 'Press START or use Arrow Keys to play';
        
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.pauseBtn.textContent = 'PAUSE';
        
        this.createGrid();
    }

    startGameLoop() {
        clearInterval(this.gameLoopInterval);
        this.gameLoopInterval = setInterval(() => {
            if (this.gameRunning && !this.gamePaused) {
                this.moveEnemies();
            }
        }, this.gameSpeed);
    }

    attachEventListeners() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.pauseBtn.addEventListener('click', () => this.pauseGame());
        this.resetBtn.addEventListener('click', () => this.resetGame());

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (!this.gameRunning || this.gamePaused) return;

            const row = Math.floor(this.playerPosition / this.gridSize);
            const col = this.playerPosition % this.gridSize;
            let newPos = this.playerPosition;

            switch (e.key) {
                case 'ArrowUp':
                    if (row > 0) newPos = (row - 1) * this.gridSize + col;
                    break;
                case 'ArrowDown':
                    if (row < this.gridSize - 1) newPos = (row + 1) * this.gridSize + col;
                    break;
                case 'ArrowLeft':
                    if (col > 0) newPos = row * this.gridSize + (col - 1);
                    break;
                case 'ArrowRight':
                    if (col < this.gridSize - 1) newPos = row * this.gridSize + (col + 1);
                    break;
                default:
                    return;
            }

            if (newPos !== this.playerPosition) {
                this.movePlayer(newPos);
            }
        });
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new OperationZeroGame();
});
