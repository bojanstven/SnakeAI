let gamepadActive = false;
let lastGamepadActivity = 0;
const INACTIVITY_TIMEOUT = 60000; // 1 minute in milliseconds
let lastDirectionChange = { dx: 0, dy: 0, timestamp: 0 };
const DIRECTION_CHANGE_THRESHOLD = 100; // Minimum time (ms) between direction changes

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
        if (gamepad.buttons[12].pressed) { // Up
            newDy = -1;
            console.log("D-pad Up pressed");
        } else if (gamepad.buttons[13].pressed) { // Down
            newDy = 1;
            console.log("D-pad Down pressed");
        } else if (gamepad.buttons[14].pressed) { // Left
            newDx = -1;
            console.log("D-pad Left pressed");
        } else if (gamepad.buttons[15].pressed) { // Right
            newDx = 1;
            console.log("D-pad Right pressed");
        }

        // Change direction if it's different and enough time has passed
        if ((newDx !== 0 || newDy !== 0) && 
            (newDx !== lastDirectionChange.dx || newDy !== lastDirectionChange.dy) &&
            (now - lastDirectionChange.timestamp > DIRECTION_CHANGE_THRESHOLD)) {
            changeDirection(newDx, newDy);
            lastDirectionChange = { dx: newDx, dy: newDy, timestamp: now };
        }

        // Check other buttons and axes for activity
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

// Debug function to check connected gamepads
function logConnectedGamepads() {
    const gamepads = navigator.getGamepads();
    console.log("Connected gamepads:", gamepads);
}

// Call this function periodically to check gamepad status
setInterval(logConnectedGamepads, 5000); // Log every 5 seconds