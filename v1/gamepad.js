let gamepadIndex = null;

const BUTTON_PAUSE = 8;  // Minus button
const BUTTON_PLAY = 9;   // Plus button
const DPAD_UP = 12;
const DPAD_DOWN = 13;
const DPAD_LEFT = 14;
const DPAD_RIGHT = 15;

let previousButtonStates = [];

window.addEventListener('gamepadconnected', (e) => {
    gamepadIndex = e.gamepad.index;
    console.log('Gamepad connected:', e.gamepad);
    
    // Initialize previous button states array
    previousButtonStates = Array(e.gamepad.buttons.length).fill(false);
});

window.addEventListener('gamepaddisconnected', (e) => {
    if (e.gamepad.index === gamepadIndex) {
        gamepadIndex = null;
        console.log('Gamepad disconnected:', e.gamepad);
    }
});

function handleGamepadInput() {
    if (gamepadIndex === null) return;

    const gamepad = navigator.getGamepads()[gamepadIndex];
    if (!gamepad) return;

    // Check and log button presses
    for (let i = 0; i < gamepad.buttons.length; i++) {
        const buttonPressed = gamepad.buttons[i].pressed;

        if (buttonPressed && !previousButtonStates[i]) {
            console.log(`Button ${i} pressed`);
 
 // if button release need to be logged, enable this part
 //       } else if (!buttonPressed && previousButtonStates[i]) {
 //           console.log(`Button ${i} released`);
 
}

        previousButtonStates[i] = buttonPressed;  // Update button state
    }
}

function gameLoop() {
    handleGamepadInput();
    requestAnimationFrame(gameLoop);  // Loop to check for inputs continuously
}

gameLoop();
