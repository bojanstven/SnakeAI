// Canvas and game elements
const canvas = document.getElementById('game-area');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const highScoreElement = document.getElementById('high-score-value');
const wallModeButton = document.getElementById('wall-mode');
const aiModeButton = document.getElementById('ai-mode');
const gameAreaContainer = document.getElementById('game-area-container');
const version = 'v2.7'; // Google Fonts Material Icons

// Audio elements
const pauseSound = document.getElementById('pauseSound');
const unpauseSound = document.getElementById('unpauseSound');
const wallOnSound = document.getElementById('wallOnSound');
const wallOffSound = document.getElementById('wallOffSound');
const autoplayOnSound = document.getElementById('autoplayOnSound');
const autoplayOffSound = document.getElementById('autoplayOffSound');
const eatSound = document.getElementById('eatSound');
const gameOverSound = document.getElementById('gameOverSound');
const gamepadSound = document.getElementById('gamepadSound');

// Game state variables
const gridSize = 20;
const tileCount = 18;
let snake;
let food;
let dx = 0;
let dy = 0;
let score = 0;
let level = 1;
let wallMode = false;
let aiMode = false;
let gameOver = false;
let highScore = 0;
let isPaused = false;
let gameOverSoundPlayed = false;

// Gamepad variables
let gamepadActive = false;
let lastGamepadActivity = 0;
const INACTIVITY_TIMEOUT = 60000; // 1 minute in milliseconds
let lastDirectionChange = { dx: 0, dy: 0, timestamp: 0 };
const DIRECTION_CHANGE_THRESHOLD = 16; // Minimum time (ms) between direction changes
const JOYSTICK_THRESHOLD = 0.5; // Threshold for joystick input

// Touch variables
let touchStartX = 0;
let touchStartY = 0;

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
}

function initializeGame() {
    const startX = Math.floor(Math.random() * tileCount);
    const startY = Math.floor(Math.random() * tileCount);
    snake = [
        {x: startX, y: startY},
        {x: startX - 1, y: startY},
        {x: startX - 2, y: startY}
    ];
    generateFood();
    dx = 1;
    dy = 0;
    score = 0;
    level = 1;
    gameOver = false;
    gameOverSoundPlayed = false;

    loadHighScore();
    updateScore();
}

function generateFood() {
    do {
        food = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
    } while (snake.some(segment => segment.x === food.x && segment.y === food.y));
}

function toggleWallMode() {
    console.log(`🐍 Wall mode ${!wallMode ? 'activated' : 'deactivated'}`);
    wallMode = !wallMode;
    wallModeButton.innerHTML = '<i class="material-icons">security</i> Walls';
    wallModeButton.classList.toggle('clicked', wallMode);
    gameAreaContainer.classList.toggle('walls-on', wallMode);
    
    // Play appropriate sound based on wall mode state
    (wallMode ? wallOnSound : wallOffSound).play()
        .then(() => console.log(`🔊 Sound Wall mode ${wallMode ? 'on' : 'off'}`))
        .catch(error => console.log('🔇 Sound Wall mode sound failed:', error));
}

function toggleAIMode() {
    console.log(`🐍 AI mode ${!aiMode ? 'activated' : 'deactivated'}`);
    aiMode = !aiMode;
    aiModeButton.innerHTML = '<i class="material-icons">rocket_launch</i> Autoplay';
    aiModeButton.classList.toggle('clicked', aiMode);
    
    // Play appropriate sound based on AI mode state
    (aiMode ? autoplayOnSound : autoplayOffSound).play()
        .then(() => console.log(`🔊 Sound AI mode ${aiMode ? 'on' : 'off'}`))
        .catch(error => console.log('🔇 Sound AI mode sound failed:', error));
}

// Gamepad initialization and handling
function initGamepad() {
    window.addEventListener("gamepadconnected", (e) => {
        console.log("Gamepad connected:", e.gamepad.id);
        gamepadActive = true;
        pressGamepadButton();
        gamepadSound.play().catch(error => console.log("Audio playback failed:", error));
    });

    window.addEventListener("gamepaddisconnected", (e) => {
        console.log("Gamepad disconnected:", e.gamepad.id);
        gamepadActive = false;
        unpressGamepadButton();
    });
}

function pressGamepadButton() {
    const gamepadModeButton = document.getElementById('gamepad-mode');
    if (gamepadModeButton) {
        gamepadModeButton.classList.add('clicked');
        lastGamepadActivity = Date.now();
    }
}

function unpressGamepadButton() {
    const gamepadModeButton = document.getElementById('gamepad-mode');
    if (gamepadModeButton) {
        gamepadModeButton.classList.remove('clicked');
    }
}

function checkGamepadActivity() {
    const now = Date.now();
    if (gamepadActive && now - lastGamepadActivity > INACTIVITY_TIMEOUT) {
        unpressGamepadButton();
    } else if (now - lastGamepadActivity <= INACTIVITY_TIMEOUT) {
        pressGamepadButton();
    }
}

function handleGamepadInput() {
    const gamepads = navigator.getGamepads();
    if (!gamepads) return;

    for (const gamepad of gamepads) {
        if (!gamepad) continue;

        const now = Date.now();
        let newDx = 0;
        let newDy = 0;

        // Get potential new direction from inputs
        if (gamepad.buttons[12].pressed) {
            newDy = -1; // Up
            if (newDy !== dy) console.log('🎮 Gamepad: D-pad UP pressed');
        } else if (gamepad.buttons[13].pressed) {
            newDy = 1; // Down
            if (newDy !== dy) console.log('🎮 Gamepad: D-pad DOWN pressed');
        } else if (gamepad.buttons[14].pressed) {
            newDx = -1; // Left
            if (newDx !== dx) console.log('🎮 Gamepad: D-pad LEFT pressed');
        } else if (gamepad.buttons[15].pressed) {
            newDx = 1; // Right
            if (newDx !== dx) console.log('🎮 Gamepad: D-pad RIGHT pressed');
        }
        
// Process joysticks only if D-pad isn't being used
if (newDx === 0 && newDy === 0) {
    const leftJoystickInput = processJoystickInput(gamepad.axes[0], gamepad.axes[1]);
    const rightJoystickInput = processJoystickInput(gamepad.axes[2], gamepad.axes[3]);

    if (leftJoystickInput.dx !== 0 || leftJoystickInput.dy !== 0) {
        newDx = leftJoystickInput.dx;
        newDy = leftJoystickInput.dy;
        if (newDx !== dx || newDy !== dy) {
            let direction = '';
            if (newDx === 1) direction = 'RIGHT';
            else if (newDx === -1) direction = 'LEFT';
            else if (newDy === -1) direction = 'UP';
            else if (newDy === 1) direction = 'DOWN';
            console.log(`Gamepad: Left stick moved ${direction}`);
        }
    } else if (rightJoystickInput.dx !== 0 || rightJoystickInput.dy !== 0) {
        newDx = rightJoystickInput.dx;
        newDy = rightJoystickInput.dy;
        if (newDx !== dx || newDy !== dy) {
            let direction = '';
            if (newDx === 1) direction = 'RIGHT';
            else if (newDx === -1) direction = 'LEFT';
            else if (newDy === -1) direction = 'UP';
            else if (newDy === 1) direction = 'DOWN';
            console.log(`Gamepad: Right stick moved ${direction}`);
        }
    }
}
        // Process movement if direction changed
        if ((newDx !== dx || newDy !== dy) && (newDx !== 0 || newDy !== 0)) {
            changeDirection(newDx, newDy);
            lastDirectionChange = { dx: newDx, dy: newDy, timestamp: now };
        }

        // L or ZL button - Toggle wall mode
        if ((gamepad.buttons[4].pressed && !gamepad.buttons[4].wasPressed) ||
            (gamepad.buttons[6].pressed && !gamepad.buttons[6].wasPressed)) {
            console.log('🎮 Gamepad: L/ZL pressed');
            toggleWallMode();
        }

        // R or ZR button - Toggle autoplay
        if ((gamepad.buttons[5].pressed && !gamepad.buttons[5].wasPressed) ||
            (gamepad.buttons[7].pressed && !gamepad.buttons[7].wasPressed)) {
            console.log('🎮 Gamepad: R/ZR pressed');
            toggleAIMode();
        }

// Minus or Plus button - Toggle pause
if ((gamepad.buttons[8].pressed && !gamepad.buttons[8].wasPressed) ||
    (gamepad.buttons[9].pressed && !gamepad.buttons[9].wasPressed)) {
    console.log('🎮 Gamepad: Minus/Plus pressed');
    if (!gameOver) {
        isPaused = !isPaused;
        if (isPaused) {
            console.log('🐍 Game paused via gamepad');
            drawPauseScreen();
            pauseSound.play().catch(error => console.log("Audio playback failed:", error));
        } else {
            console.log('🐍 Game unpaused via gamepad');
            unpauseSound.play().catch(error => console.log("Audio playback failed:", error));
        }
    }
}
        // A, B, X, or Y button - Unpause or restart game
        if ((gamepad.buttons[0].pressed && !gamepad.buttons[0].wasPressed) ||
            (gamepad.buttons[1].pressed && !gamepad.buttons[1].wasPressed) ||
            (gamepad.buttons[2].pressed && !gamepad.buttons[2].wasPressed) ||
            (gamepad.buttons[3].pressed && !gamepad.buttons[3].wasPressed)) {
            console.log('🎮 Gamepad: A/B/X/Y pressed');
            if (gameOver) {
                initializeGame();
            } else if (isPaused) {
                isPaused = false;
                unpauseSound.play().catch(error => console.log("Audio playback failed:", error));
            }
        }

        // Update button states
        gamepad.buttons.forEach((button, index) => {
            button.wasPressed = button.pressed;
        });

        // Update activity status
        if (gamepad.buttons.some(button => button.pressed) || 
            gamepad.axes.some(axis => Math.abs(axis) > 0.1)) {
            gamepadActive = true;
            lastGamepadActivity = now;
            pressGamepadButton();
        }
    }
}

function processJoystickInput(x, y) {
    if (Math.abs(x) > Math.abs(y)) {
        if (x < -JOYSTICK_THRESHOLD) return { dx: -1, dy: 0 };
        else if (x > JOYSTICK_THRESHOLD) return { dx: 1, dy: 0 };
    } else {
        if (y < -JOYSTICK_THRESHOLD) return { dx: 0, dy: -1 };
        else if (y > JOYSTICK_THRESHOLD) return { dx: 0, dy: 1 };
    }
    return { dx: 0, dy: 0 };
}

// Game rendering functions
function drawGame() {
    clearCanvas();
    if (gameOver) {
        drawGameOver();
        return;
    }
    if (isPaused) {
        drawPauseScreen();
        return;
    }
    if (aiMode) {
        moveAI();
    }
    moveSnake();
    drawFood();
    drawSnake();
    checkCollision();
    updateScore();
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawSnake() {
    const segmentSize = canvas.width / tileCount;
    ctx.fillStyle = 'black';
    snake.forEach(segment => {
        ctx.fillRect(segment.x * segmentSize, segment.y * segmentSize, segmentSize - 1, segmentSize - 1);
    });
}

function drawFood() {
    const segmentSize = canvas.width / tileCount;
    ctx.fillStyle = 'red';
    ctx.fillRect(food.x * segmentSize, food.y * segmentSize, segmentSize - 1, segmentSize - 1);
}

function moveSnake() {
    const head = {x: snake[0].x + dx, y: snake[0].y + dy};
    
    if (!wallMode) {
        head.x = (head.x + tileCount) % tileCount;
        head.y = (head.y + tileCount) % tileCount;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score++;
        updateLevel();
        generateFood();
        
        eatSound.currentTime = 0;
        eatSound.play()
        .then(() => console.log('🔊 Sound Food eaten'))
        .catch(error => console.log('🔇 Sound Food eaten sound failed:', error));

    } else {
        snake.pop();
    }
}

// Check wall collision
function checkCollision() {
    const head = snake[0];
    if (wallMode && (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount)) {
        console.log('🐍 Snake hit wall');
        gameOver = true;
    }

    // Check self collision - possible at length 4 and above
    for (let i = 3; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            console.log('🐍 Snake hit itself');
            gameOver = true;
            break;
        }
    }

    if (gameOver) {
        updateHighScore();
    }
}

function drawGameOver() {
    if (!gameOverSoundPlayed) {
        gameOverSound.play()
            .then(() => console.log('🔊 Sound Game over'))
            .catch(error => console.log('🔇 Sound Game over sound failed:', error));
        gameOverSoundPlayed = true;
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = `${canvas.width / 15}px Roboto`;
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - canvas.width / 15);
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + canvas.width / 30);
    ctx.font = `${canvas.width / 25}px Roboto`;
    ctx.fillText('Tap or Press Esc / Space to Restart', canvas.width / 2, canvas.height / 2 + canvas.width / 10);
}

function updateScore() {
    scoreElement.textContent = `Score: ${score}`;
    levelElement.textContent = `Level: ${level}`;
}

function updateLevel() {
    level = Math.min(99, Math.floor(score / 5) + 1);
}

function loadHighScore() {
    const storedHighScore = localStorage.getItem(`snakeHighScore_${version}`);
    highScore = storedHighScore ? parseInt(storedHighScore) : 0;
    highScoreElement.textContent = highScore;
}

function updateHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem(`snakeHighScore_${version}`, highScore);
        highScoreElement.textContent = highScore;
    }
}

function moveAI() {
    const head = snake[0];
    const possibleMoves = [
        {dx: 0, dy: -1},  // up
        {dx: 0, dy: 1},   // down
        {dx: -1, dy: 0},  // left
        {dx: 1, dy: 0}    // right
    ];

    let bestMove = null;
    let maxScore = -Infinity;

    for (const move of possibleMoves) {
        const newX = (head.x + move.dx + tileCount) % tileCount;
        const newY = (head.y + move.dy + tileCount) % tileCount;

        if (snake.some(segment => segment.x === newX && segment.y === newY)) {
            continue;
        }

        const score = evaluateMove(newX, newY);
        if (score > maxScore) {
            maxScore = score;
            bestMove = move;
        }
    }

    if (bestMove) {
        dx = bestMove.dx;
        dy = bestMove.dy;
    }
}

function evaluateMove(x, y) {
    const distanceToFood = Math.abs(x - food.x) + Math.abs(y - food.y);
    const distanceToWall = Math.min(x, y, tileCount - 1 - x, tileCount - 1 - y);
    const distanceToTail = Math.min(...snake.slice(1).map(segment => Math.abs(x - segment.x) + Math.abs(y - segment.y)));

    return -distanceToFood + distanceToWall + distanceToTail;
}

function changeDirection(newDx, newDy) {
    if (aiMode || gameOver) return;
    if ((newDx === 1 && dx === -1) || (newDx === -1 && dx === 1) ||
        (newDy === 1 && dy === -1) || (newDy === -1 && dy === 1)) {
        return;
    }
    
    let direction = '';
    if (newDx === 1) direction = 'RIGHT';
    else if (newDx === -1) direction = 'LEFT';
    else if (newDy === -1) direction = 'UP';
    else if (newDy === 1) direction = 'DOWN';
    
    console.log(`🐍 Direction changed to: ${direction}`);
    dx = newDx;
    dy = newDy;
}

function drawPauseScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = `${canvas.width / 15}px Roboto`;
    ctx.textAlign = 'center';
    ctx.fillText('Paused', canvas.width / 2, canvas.height / 2 - canvas.width / 15);
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + canvas.width / 30);
    ctx.font = `${canvas.width / 25}px Roboto`;
    ctx.fillText('Tap or Press Esc to Continue', canvas.width / 2, canvas.height / 2 + canvas.width / 10);
}

function activateKey(keyIndex) {
    const keyElement = document.querySelector(`.key:nth-child(${keyIndex})`);
    if (keyElement) {
        keyElement.classList.add('active');
        setTimeout(() => keyElement.classList.remove('active'), 200);
    }
}

function getGameSpeed() {
    return Math.max(180 - (level - 1) * 5, 50);
}
// Event listeners
document.addEventListener('keydown', (e) => {
    if (gameOver && (e.code === 'Space' || e.key === 'Escape')) {
        console.log('🐍 Game restarted via keyboard');
        initializeGame();
        return;
    }

    switch (e.key) {
        case 'ArrowUp':
            console.log('↗️ Keyboard: UP arrow pressed');
            activateKey(1);
            changeDirection(0, -1);
            break;
        case 'ArrowDown':
            console.log('↗️ Keyboard: DOWN arrow pressed');
            activateKey(2);
            changeDirection(0, 1);
            break;
        case 'ArrowLeft':
            console.log('↗️ Keyboard: LEFT arrow pressed');
            activateKey(3);
            changeDirection(-1, 0);
            break;
        case 'ArrowRight':
            console.log('↗️ Keyboard: RIGHT arrow pressed');
            activateKey(4);
            changeDirection(1, 0);
            break;
        case 'w':
        case 'W':
            console.log('🔠 Keyboard: W pressed');
            activateKey(5);
            changeDirection(0, -1);
            break;
        case 's':
        case 'S':
            console.log('🔠 Keyboard: S pressed');
            activateKey(6);
            changeDirection(0, 1);
            break;
        case 'a':
        case 'A':
            console.log('🔠 Keyboard: A pressed');
            activateKey(7);
            changeDirection(-1, 0);
            break;
        case 'd':
        case 'D':
            console.log('🔠 Keyboard: D pressed');
            activateKey(8);
            changeDirection(1, 0);
            break;
        case 'Enter':
            console.log('🔠 Keyboard: Enter pressed - toggling AI mode');
            toggleAIMode();
            break;
        case 'Shift':
            if (e.location === KeyboardEvent.DOM_KEY_LOCATION_LEFT) {
                console.log('🔠 Keyboard: Left Shift pressed - toggling wall mode');
                toggleWallMode();
            }
            break;
            case 'Escape':
                 if (!gameOver) {
                 isPaused = !isPaused;
                 console.log(`🐍 Game ${isPaused ? 'paused' : 'unpaused'} via Esc key`);
                 (isPaused ? pauseSound : unpauseSound).play()
                     .then(() => console.log(`🔊 Sound Game ${isPaused ? 'pause' : 'unpause'}`))
                     .catch(error => console.log('🔇 Sound Game pause sound failed:', error));
                         isPaused && drawPauseScreen();
                }
                break;    }
});

// Mouse/touch event listeners
wallModeButton.addEventListener('click', toggleWallMode);
aiModeButton.addEventListener('click', toggleAIMode);

canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    if (gameOver) {
        initializeGame();
    }
}, false);

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, false);

canvas.addEventListener('touchend', (e) => {
    if (gameOver) {
        initializeGame();
        return;
    }
    if (isPaused) {
        isPaused = false;
        return;
    }
    if (aiMode) return;

    let touchEndX = e.changedTouches[0].clientX;
    let touchEndY = e.changedTouches[0].clientY;

    let dx = touchEndX - touchStartX;
    let dy = touchEndY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
        changeDirection(dx > 0 ? 1 : -1, 0);
        activateKey(dx > 0 ? 4 : 3);
    } else {
        changeDirection(0, dy > 0 ? 1 : -1);
        activateKey(dy > 0 ? 2 : 1);
    }
}, false);

// Initialization
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
initGamepad();

function gamepadInputLoop() {
    handleGamepadInput();
    setTimeout(gamepadInputLoop, 16); // Check inputs every 16ms (approximately 60 times per second)
}

function gameLoop() {
    checkGamepadActivity();
    if (!isPaused) {
        drawGame();
    }
    setTimeout(gameLoop, getGameSpeed());
}

function updateVersionInfo() {
    const versionElement = document.getElementById('version-number');
    if (versionElement) {
        versionElement.textContent = version;
    }
    document.title = `Snake AI Game ${version}`;
}

document.addEventListener('DOMContentLoaded', updateVersionInfo);

initializeGame();
gameLoop();
gamepadInputLoop();