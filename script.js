// Canvas and game elements
const canvas = document.getElementById('game-area');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const highScoreElement = document.getElementById('high-score-value');
const wallModeButton = document.getElementById('wall-mode');
const aiModeButton = document.getElementById('ai-mode');
const gameAreaContainer = document.getElementById('game-area-container');
const version = 'v3.6'; // replaced materials icons with svg


// Add dynamic styles for game container
const style = document.createElement('style');
style.textContent = `
    #game-area-container {
        transition: transform 0.6s;
        transform-style: preserve-3d;
        perspective: 1000px;
    }
`;
document.head.appendChild(style);



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
let soundEnabled = true;


// Game state variables
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
let screenTransitioning = false;
let settingsPanelVisible = false;



// Gamepad variables
let gamepadActive = false;
let lastGamepadActivity = 0;
const INACTIVITY_TIMEOUT = 60000; // 1 minute in milliseconds
const JOYSTICK_THRESHOLD = 0.5; // Threshold for joystick input


// Touch variables
let touchStartX = 0;
let touchStartY = 0;
let wasTwoFingerTouch = false;



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
    // Remove the old innerHTML setting and just toggle the class
    wallModeButton.classList.toggle('clicked', wallMode);
    gameAreaContainer.classList.toggle('walls-on', wallMode);
    
    // Play appropriate sound based on wall mode state
    if (soundEnabled) {
        (wallMode ? wallOnSound : wallOffSound).play()
            .then(() => console.log(`🔊 Sound Wall mode ${wallMode ? 'on' : 'off'}`))
            .catch(error => console.log('🔇 Sound Wall mode sound failed:', error));
    }
}

function toggleAIMode() {
    console.log(`🐍 AI mode ${!aiMode ? 'activated' : 'deactivated'}`);
    aiMode = !aiMode;
    // Remove the old innerHTML setting and just toggle the class
    aiModeButton.classList.toggle('clicked', aiMode);
    
    // Play appropriate sound based on AI mode state
    if (soundEnabled) {
        (aiMode ? autoplayOnSound : autoplayOffSound).play()
            .then(() => console.log(`🔊 Sound AI mode ${aiMode ? 'on' : 'off'}`))
            .catch(error => console.log('🔇 Sound AI mode sound failed:', error));
    }
}


function toggleSettingsPanel() {
    settingsPanelVisible = !settingsPanelVisible;
    const gameAreaContainer = document.getElementById('game-area-container');
    const settingsBtn = document.getElementById('btnSettings');
    
    if (settingsPanelVisible) {
        gameAreaContainer.style.transform = 'rotateY(180deg)';
        settingsBtn.classList.add('clicked');
        console.log('⚙️ Settings panel revealed');
    } else {
        gameAreaContainer.style.transform = 'rotateY(0deg)';
        settingsBtn.classList.remove('clicked');
        console.log('⚙️ Settings panel hidden');
    }
}



// Gamepad initialization and handling
function initGamepad() {
    window.addEventListener("gamepadconnected", (e) => {
        console.log("Gamepad connected:", e.gamepad.id);
        gamepadActive = true;
        pressGamepadButton();
        soundEnabled && gamepadSound.play().catch(error => console.log("Audio playback failed:", error));
        vibrateOnConnect(e.gamepad);  // Add initial connection vibration
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
        console.log('🎮 Gamepad: Disconnected due to inactivity');
        gamepadActive = false;  // Add this line
        unpressGamepadButton();
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
                    console.log(`🎮 Gamepad: Left stick moved ${direction}`);
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
                    console.log(`🎮 Gamepad: Right stick moved ${direction}`);
                }
            }
        }

        // Process movement if direction changed
        if ((newDx !== dx || newDy !== dy) && (newDx !== 0 || newDy !== 0)) {
            changeDirection(newDx, newDy);
            lastDirectionChange = { dx: newDx, dy: newDy, timestamp: now };
        }

        // L button - Toggle wall mode
        if (gamepad.buttons[4].pressed && !gamepad.buttons[4].wasPressed) {
            console.log('🎮 Gamepad: L pressed - toggling wall mode');
            toggleWallMode();
        }

        // ZL button - Toggle sound
        if (gamepad.buttons[6].pressed && !gamepad.buttons[6].wasPressed) {
            console.log('🎮 Gamepad: ZL pressed - toggling sound');
            toggleSound('gamepad');
        }

        // R button - Toggle autoplay
        if (gamepad.buttons[5].pressed && !gamepad.buttons[5].wasPressed) {
            console.log('🎮 Gamepad: R pressed - toggling autoplay');
            toggleAIMode();
        }

        // ZR button - Toggle settings panel
        if (gamepad.buttons[7].pressed && !gamepad.buttons[7].wasPressed) {
            console.log('🎮 Gamepad: ZR pressed - toggling settings panel');
            toggleSettingsPanel();
        }



        // Minus or Plus button - Toggle pause
        if ((gamepad.buttons[8].pressed && !gamepad.buttons[8].wasPressed) ||
            (gamepad.buttons[9].pressed && !gamepad.buttons[9].wasPressed)) {
            console.log('🎮 Gamepad: Minus/Plus pressed');
            if (!gameOver) {
                isPaused = !isPaused;
                if (isPaused) {
                    console.log('🐍 Game paused via gamepad');
                    console.log('🔊 Sound Game pause');
                    drawPauseScreen();
                    soundEnabled && pauseSound.play().catch(error => console.log("Audio playback failed:", error));
                } else {
                    console.log('🐍 Game unpaused via gamepad');
                    console.log('🔊 Sound Game unpause');
                    soundEnabled && unpauseSound.play().catch(error => console.log("Audio playback failed:", error));
                }
                vibrateOnPauseToggle(gamepad);
            }
        }

        // A, B, X, or Y button - Unpause or restart game
        if ((gamepad.buttons[0].pressed && !gamepad.buttons[0].wasPressed) ||
            (gamepad.buttons[1].pressed && !gamepad.buttons[1].wasPressed) ||
            (gamepad.buttons[2].pressed && !gamepad.buttons[2].wasPressed) ||
            (gamepad.buttons[3].pressed && !gamepad.buttons[3].wasPressed)) {
            console.log('🎮 Gamepad: A/B/X/Y pressed');
            if (gameOver) {
                console.log('🐍 Game restarted via gamepad');
                initializeGame();
            } else if (isPaused) {
                isPaused = false;
                console.log('🐍 Game unpaused via gamepad button');
                console.log('🔊 Sound Game unpause');
                unpauseSound.play().catch(error => console.log("Audio playback failed:", error));
                vibrateOnPauseToggle(gamepad);
            }
        }

        // Update button states
        gamepad.buttons.forEach((button, index) => {
            button.wasPressed = button.pressed;
        });

        // Update activity status
        if (gamepad.buttons.some(button => button.pressed) || 
            gamepad.axes.some(axis => Math.abs(axis) > 0.1)) {
            if (!gamepadActive) {
                console.log('🎮 Gamepad connected:', gamepad.id);
                gamepadActive = true;
                const gamepadModeButton = document.getElementById('gamepad-mode');
                gamepadModeButton.classList.add('clicked');
                gamepadSound.play().catch(error => console.log("Audio playback failed:", error));
                vibrateOnConnect(gamepad);
            }
            lastGamepadActivity = now;
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


// adding support for Gamepad vibration
function vibrateGamepad(gamepad, duration, weakMag, strongMag) {
    if (!gamepadActive) return;  // No vibration if not active
    if (gamepad && gamepad.vibrationActuator && gamepad.vibrationActuator.type === 'dual-rumble') {
        gamepad.vibrationActuator.playEffect('dual-rumble', {
            duration: duration,
            startDelay: 0,
            weakMagnitude: weakMag,
            strongMagnitude: strongMag
        }).catch(error => console.log('🎮 Vibration failed:', error));
    }
}

function vibrateOnEatFood(gamepad) {
    vibrateGamepad(gamepad, 200, 0.2, 0.5);
    console.log('🎮 Vibration: Food eaten');
}

function vibrateOnGameOver(gamepad) {
    vibrateGamepad(gamepad, 1000, 0.9, 0.8);
    console.log('🎮 Vibration: Game Over');
}

function vibrateOnPauseToggle(gamepad) {
    // First pulse: short and sharp (like a dot)
    vibrateGamepad(gamepad, 100, 0.3, 0.4);
    
    // Wait a bit, then second pulse: longer and stronger (like a dash)
    setTimeout(() => {
        vibrateGamepad(gamepad, 200, 0.4, 0.5);
        console.log('🎮 Vibration: Pause toggle');
    }, 150); // 150ms delay between pulses
}

function vibrateOnConnect(gamepad) {
    vibrateGamepad(gamepad, 150, 0.8, 0.9);  // Short but powerful
    console.log('🎮 Vibration: Gamepad connected');
}


// Game rendering functions
function drawGame() {
    clearCanvas();
    if (gameOver) {
        drawGameOver();
        screenTransitioning = true;  // Screen is showing game over
        return;
    }
    
    // Screen has transitioned from game over to active game
    if (screenTransitioning) {
        screenTransitioning = false;
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
    const bodyCutPercentage = 0.09;
    const shadowOffset = 5;
    const headCurveRadius = segmentSize * 0.99;  // 30% curve radius
    
    snake.forEach((segment, index) => {
        if (index === 0) {  // Head
            const x = segment.x * segmentSize;
            const y = segment.y * segmentSize;
            const size = segmentSize - 1;
            let radii;
 
            // Determine corner radii based on direction
            if (dx === 1) {  // Right
                radii = [0, headCurveRadius, headCurveRadius, 0];
            } else if (dx === -1) {  // Left
                radii = [headCurveRadius, 0, 0, headCurveRadius];
            } else if (dy === -1) {  // Up
                radii = [headCurveRadius, headCurveRadius, 0, 0];
            } else {  // Down
                radii = [0, 0, headCurveRadius, headCurveRadius];
            }
 
            // Draw shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.beginPath();
            ctx.roundRect(x + shadowOffset, y + shadowOffset, size, size, radii);
            ctx.fill();
 
            // Draw head
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.roundRect(x, y, size, size, radii);
            ctx.fill();
 
        } else {  // Body and tail
            const cut = segmentSize * bodyCutPercentage;
            const offset = cut / 2;
            const x = segment.x * segmentSize + offset;
            const y = segment.y * segmentSize + offset;
            const size = segmentSize - cut - 1;
            
            // Draw shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(x + shadowOffset, y + shadowOffset, size, size);
            
            // Draw segment
            ctx.fillStyle = '#262626';
            ctx.fillRect(x, y, size, size);
        }
    });
 }


 function drawFood() {
    const segmentSize = canvas.width / tileCount;
    const shadowOffset = 5;  // Same as snake shadow
    
    // Draw shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';  // Same shadow opacity as snake
    ctx.fillRect(
        food.x * segmentSize + shadowOffset, 
        food.y * segmentSize + shadowOffset, 
        segmentSize - 1, 
        segmentSize - 1
    );
    
    // Draw food
    ctx.fillStyle = 'red';
    ctx.fillRect(
        food.x * segmentSize, 
        food.y * segmentSize, 
        segmentSize - 1, 
        segmentSize - 1
    );
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

        // Add vibration when eating food
        const gamepads = navigator.getGamepads();
        if (gamepads && gamepads[0]) {
            vibrateOnEatFood(gamepads[0]);
        }        
        
        eatSound.currentTime = 0;
        soundEnabled && eatSound.play()
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
        const gamepads = navigator.getGamepads();
        if (gamepads && gamepads[0]) {
            vibrateOnGameOver(gamepads[0]);
        }
    }

    // Check self collision - possible at length 4 and above
    for (let i = 3; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            console.log('🐍 Snake hit itself');
            gameOver = true;
            const gamepads = navigator.getGamepads();
            if (gamepads && gamepads[0]) {
                vibrateOnGameOver(gamepads[0]);
            }
            break;
        }
    }

    if (gameOver) {
        updateHighScore();
    }
}

function drawGameOver() {
    if (!gameOverSoundPlayed) {
        soundEnabled && gameOverSound.play()
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
    
    // Only update direction and log if it actually changes
    if (newDx !== dx || newDy !== dy) {
        let direction = '';
        if (newDx === 1) direction = 'RIGHT';
        else if (newDx === -1) direction = 'LEFT';
        else if (newDy === -1) direction = 'UP';
        else if (newDy === 1) direction = 'DOWN';
        
        console.log(`🐍 Direction changed to: ${direction}`);
    }
    
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



function getGameSpeed() {
    return Math.max(180 - (level - 1) * 5, 50);
}



function toggleSound(source = 'click') {
    console.log(`${soundEnabled ? '🔇' : '🔊'} Sounds ${!soundEnabled ? 'enabled' : 'disabled'} by ${source}`);
    soundEnabled = !soundEnabled;
    const btnSound = document.getElementById('btnSound');
    const soundIcon = btnSound.querySelector('img');
    soundIcon.src = soundEnabled ? 'svg/volume_up.svg' : 'svg/volume_off.svg';
    btnSound.classList.toggle('clicked', !soundEnabled);
}


// Event listeners


document.getElementById('btnSound').addEventListener('click', () => toggleSound('click'));



document.getElementById('btnSettings').addEventListener('click', () => {
    console.log('🖱️ Settings button clicked');
    toggleSettingsPanel();
});



document.addEventListener('keydown', (e) => {
    if (gameOver && (e.code === 'Space' || e.key === 'Escape')) {
        console.log('🐍 Game restarted via keyboard');
        initializeGame();
        return;
    }

    if (e.key.toLowerCase() === 'm') {
        toggleSound('keyboard');
    }

    switch (e.key) {
        case 'ArrowUp':
            console.log('↗️ Keyboard: UP arrow pressed');
            changeDirection(0, -1);
            break;
        case 'ArrowDown':
            console.log('↗️ Keyboard: DOWN arrow pressed');
            changeDirection(0, 1);
            break;
        case 'ArrowLeft':
            console.log('↗️ Keyboard: LEFT arrow pressed');
            changeDirection(-1, 0);
            break;
        case 'ArrowRight':
            console.log('↗️ Keyboard: RIGHT arrow pressed');
            changeDirection(1, 0);
            break;
        case 'w':
        case 'W':
            console.log('🔠 Keyboard: W pressed');
            changeDirection(0, -1);
            break;
        case 's':
        case 'S':
            console.log('🔠 Keyboard: S pressed');
            changeDirection(0, 1);
            break;
        case 'a':
        case 'A':
            console.log('🔠 Keyboard: A pressed');
            changeDirection(-1, 0);
            break;
        case 'd':
        case 'D':
            console.log('🔠 Keyboard: D pressed');
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
        case '.':
            console.log('⌨️ Keyboard: Dot key pressed - toggling settings panel');
            toggleSettingsPanel();
            break;
        case 'Escape':
            if (!gameOver) {
                isPaused = !isPaused;
                console.log(`🐍 Game ${isPaused ? 'paused' : 'unpaused'} via Esc key`);
                (isPaused ? pauseSound : unpauseSound).play()
                    .then(() => console.log(`🔊 Sound Game ${isPaused ? 'pause' : 'unpause'}`))
                    .catch(error => console.log('🔇 Sound Game pause sound failed:', error));
                isPaused && drawPauseScreen();
                
                // Add vibration feedback for keyboard pause
                const gamepads = navigator.getGamepads();
                if (gamepads && gamepads[0]) {
                    vibrateOnPauseToggle(gamepads[0]);
                }
            }
            break;
    }
});


// Mouse/touch event listeners
wallModeButton.addEventListener('click', toggleWallMode);
aiModeButton.addEventListener('click', toggleAIMode);

document.getElementById('gamepad-mode').addEventListener('click', () => {
    const gamepadModeButton = document.getElementById('gamepad-mode');
    gamepadModeButton.classList.remove('clicked');
    gamepadActive = false;
    console.log('🎮 Gamepad: Manually disconnected');
});


document.getElementById('close-settings').addEventListener('click', () => {
    console.log('⚙️ Settings panel closed via back button');
    toggleSettingsPanel();
});


canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2 && !gameOver && !screenTransitioning) {  // Track two-finger touch, prevent during game over
        e.preventDefault();
        wasTwoFingerTouch = true;
    } else if (e.touches.length === 1) {  // Single finger touch
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        if (gameOver) {
            console.log('👆 Game restarted via touch');
            initializeGame();
        }
    }
}, false);


canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });


// Update touch end handler to handle both two-finger taps and single-finger swipes
canvas.addEventListener('touchend', (e) => {
    if (wasTwoFingerTouch && !gameOver && !screenTransitioning) {
        e.preventDefault();
        isPaused = !isPaused;
        console.log(`👆 Game ${isPaused ? 'paused' : 'unpaused'} via two-finger tap`);
        
        if (isPaused) {
            drawPauseScreen();
            console.log('🔊 Sound Game pause');
            pauseSound.play().catch(error => console.log("Audio playback failed:", error));
        } else {
            console.log('🔊 Sound Game unpause');
            unpauseSound.play().catch(error => console.log("Audio playback failed:", error));
        }

        // Trigger vibration on the gamepad if connected
        const gamepads = navigator.getGamepads();
        if (gamepads && gamepads[0] && gamepadEnabled) {
            vibrateOnPauseToggle(gamepads[0]);
        }
        
        wasTwoFingerTouch = false;
    } else if (!wasTwoFingerTouch && e.changedTouches.length === 1 && !gameOver) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
    
        if (Math.abs(dx) > Math.abs(dy)) {
            const direction = dx > 0 ? 'RIGHT' : 'LEFT';
            console.log(`👆 Swipe ${direction} detected`);
            changeDirection(dx > 0 ? 1 : -1, 0);
        } else {
            const direction = dy > 0 ? 'DOWN' : 'UP';
            console.log(`👆 Swipe ${direction} detected`);
            changeDirection(0, dy > 0 ? 1 : -1);
        }
    }
    
    
}, false);



canvas.addEventListener('touchcancel', () => {
    wasTwoFingerTouch = false;
}, false);


// Initialization
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
initGamepad();

// Add the focus/tab prevention code here
document.querySelectorAll('button, [tabindex]').forEach(element => {
    element.tabIndex = -1;
});

document.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
}, true);

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