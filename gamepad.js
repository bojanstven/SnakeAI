let gamepadActive = false;
let lastGamepadActivity = 0;
const INACTIVITY_TIMEOUT = 60000; // 1 minute in milliseconds
let lastDirectionChange = { dx: 0, dy: 0, timestamp: 0 };
const DIRECTION_CHANGE_THRESHOLD = 30; // Minimum time (ms) between direction changes

function initGamepad() {
    window.addEventListener("gamepadconnected", (e) => {
        console.log("Gamepad connected:", e.gamepad.id);
        gamepadActive = true;
        pressGamepadButton();
    });

    window.addEventListener("gamepaddisconnected", (e) => {
        console.log("Gamepad disconnected:", e.gamepad.id);
        gamepadActive = false;
        unpressGamepadButton();
    });
}

function pressGamepadButton() {
    const gamepadModeButton = document.getElementById('gamepad-mode');
    gamepadModeButton.classList.add('clicked');
    lastGamepadActivity = Date.now();
}

function unpressGamepadButton() {
    const gamepadModeButton = document.getElementById('gamepad-mode');
    gamepadModeButton.classList.remove('clicked');
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

        // Check D-pad (assumes D-pad is mapped to the first 4 buttons)
        if (gamepad.buttons[12].pressed) newDy = -1; // Up
        else if (gamepad.buttons[13].pressed) newDy = 1; // Down
        else if (gamepad.buttons[14].pressed) newDx = -1; // Left
        else if (gamepad.buttons[15].pressed) newDx = 1; // Right

        // Change direction if it's different and enough time has passed
        if ((newDx !== 0 || newDy !== 0) && 
            (newDx !== lastDirectionChange.dx || newDy !== lastDirectionChange.dy) &&
            (now - lastDirectionChange.timestamp > DIRECTION_CHANGE_THRESHOLD)) {
            changeDirection(newDx, newDy);
            lastDirectionChange = { dx: newDx, dy: newDy, timestamp: now };
        }

        // Minus button - Pause game
        if (gamepad.buttons[8].pressed && !gamepad.buttons[8].wasPressed) {
            console.log("Minus button pressed - Pausing game");
            isPaused = true;
            drawPauseScreen();
        }

        // Plus button or L/ZL/R/ZR - Unpause or restart game
        if ((gamepad.buttons[9].pressed && !gamepad.buttons[9].wasPressed) ||
            (gamepad.buttons[4].pressed && !gamepad.buttons[4].wasPressed) ||
            (gamepad.buttons[5].pressed && !gamepad.buttons[5].wasPressed) ||
            (gamepad.buttons[6].pressed && !gamepad.buttons[6].wasPressed) ||
            (gamepad.buttons[7].pressed && !gamepad.buttons[7].wasPressed)) {
            console.log("Plus or L/ZL/R/ZR button pressed - Unpausing/Restarting game");
            if (gameOver) {
                initializeGame();
            } else if (isPaused) {
                isPaused = false;
            }
        }

        // R button - Start autoplay
        if (gamepad.buttons[5].pressed && !gamepad.buttons[5].wasPressed) {
            console.log("R button pressed - Starting autoplay");
            aiMode = true;
            aiModeButton.classList.add('clicked');
        }

        // ZR button - Stop autoplay
        if (gamepad.buttons[7].pressed && !gamepad.buttons[7].wasPressed) {
            console.log("ZR button pressed - Stopping autoplay");
            aiMode = false;
            aiModeButton.classList.remove('clicked');
        }

        // L button - Activate walls
        if (gamepad.buttons[4].pressed && !gamepad.buttons[4].wasPressed) {
            console.log("L button pressed - Activating walls");
            wallMode = true;
            wallModeButton.classList.add('clicked');
            gameAreaContainer.classList.add('walls-on');
        }

        // ZL button - Remove walls
        if (gamepad.buttons[6].pressed && !gamepad.buttons[6].wasPressed) {
            console.log("ZL button pressed - Removing walls");
            wallMode = false;
            wallModeButton.classList.remove('clicked');
            gameAreaContainer.classList.remove('walls-on');
        }

        // Update wasPressed state for all buttons
        gamepad.buttons.forEach((button, index) => {
            button.wasPressed = button.pressed;
        });

        // Check for any activity
        if (gamepad.buttons.some(button => button.pressed) || 
            gamepad.axes.some(axis => Math.abs(axis) > 0.1)) {
            gamepadActive = true;
            lastGamepadActivity = now;
            pressGamepadButton();
        }
    }
}

// Initialize gamepad support
initGamepad();

// Use requestAnimationFrame for smoother gameplay
function gamepadLoop() {
    handleGamepadInput();
    checkGamepadActivity();
    requestAnimationFrame(gamepadLoop);
}

gamepadLoop();