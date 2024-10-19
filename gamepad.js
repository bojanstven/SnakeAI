let gamepadActive = false;
let lastGamepadActivity = 0;
const INACTIVITY_TIMEOUT = 60000; // 1 minute in milliseconds
let lastDirectionChange = { dx: 0, dy: 0, timestamp: 0 };
const DIRECTION_CHANGE_THRESHOLD = 30; // Minimum time (ms) between direction changes
const JOYSTICK_THRESHOLD = 0.5; // Threshold for joystick input

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

        // Check left joystick input
        const leftJoystickX = gamepad.axes[0];
        const leftJoystickY = gamepad.axes[1];

        // Check right joystick input
        const rightJoystickX = gamepad.axes[2];
        const rightJoystickY = gamepad.axes[3];

        // Function to process joystick input
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

        // Process left joystick
        const leftJoystickInput = processJoystickInput(leftJoystickX, leftJoystickY);
        // Process right joystick
        const rightJoystickInput = processJoystickInput(rightJoystickX, rightJoystickY);

        // Prioritize joystick input over D-pad
        if (leftJoystickInput.dx !== 0 || leftJoystickInput.dy !== 0) {
            newDx = leftJoystickInput.dx;
            newDy = leftJoystickInput.dy;
        } else if (rightJoystickInput.dx !== 0 || rightJoystickInput.dy !== 0) {
            newDx = rightJoystickInput.dx;
            newDy = rightJoystickInput.dy;
        }

        // Change direction if it's different and enough time has passed
        if ((newDx !== 0 || newDy !== 0) && 
            (newDx !== lastDirectionChange.dx || newDy !== lastDirectionChange.dy) &&
            (now - lastDirectionChange.timestamp > DIRECTION_CHANGE_THRESHOLD)) {
            changeDirection(newDx, newDy);
            lastDirectionChange = { dx: newDx, dy: newDy, timestamp: now };
        }

        // Minus button - Pause game (only if not already paused and not game over)
        if (gamepad.buttons[8].pressed && !gamepad.buttons[8].wasPressed && !isPaused && !gameOver) {
            console.log("Minus button pressed - Pausing game");
            isPaused = true;
            drawPauseScreen();
        }

        // Plus, A, B, X, or Y button - Unpause or restart game
        if ((gamepad.buttons[9].pressed && !gamepad.buttons[9].wasPressed) || // Plus
            (gamepad.buttons[0].pressed && !gamepad.buttons[0].wasPressed) || // A
            (gamepad.buttons[1].pressed && !gamepad.buttons[1].wasPressed) || // B
            (gamepad.buttons[2].pressed && !gamepad.buttons[2].wasPressed) || // X
            (gamepad.buttons[3].pressed && !gamepad.buttons[3].wasPressed)) { // Y
            console.log("Plus, A, B, X, or Y button pressed - Unpausing/Restarting game");
            if (gameOver) {
                initializeGame();
            } else if (isPaused) {
                isPaused = false;
            }
        }

        // R or ZR button - Toggle autoplay
        if ((gamepad.buttons[5].pressed && !gamepad.buttons[5].wasPressed) ||
            (gamepad.buttons[7].pressed && !gamepad.buttons[7].wasPressed)) {
            aiMode = !aiMode;
            if (aiMode) {
                console.log("R or ZR button pressed - Starting autoplay");
                aiModeButton.classList.add('clicked');
            } else {
                console.log("R or ZR button pressed - Stopping autoplay");
                aiModeButton.classList.remove('clicked');
            }
        }

        // L or ZL button - Toggle wall mode
        if ((gamepad.buttons[4].pressed && !gamepad.buttons[4].wasPressed) ||
            (gamepad.buttons[6].pressed && !gamepad.buttons[6].wasPressed)) {
            wallMode = !wallMode;
            if (wallMode) {
                console.log("L or ZL button pressed - Activating walls");
                wallModeButton.classList.add('clicked');
                gameAreaContainer.classList.add('walls-on');
            } else {
                console.log("L or ZL button pressed - Removing walls");
                wallModeButton.classList.remove('clicked');
                gameAreaContainer.classList.remove('walls-on');
            }
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