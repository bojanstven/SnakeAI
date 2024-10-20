const canvas = document.getElementById('game-area');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const highScoreElement = document.getElementById('high-score-value');
const wallModeButton = document.getElementById('wall-mode');
const aiModeButton = document.getElementById('ai-mode');
const gameAreaContainer = document.getElementById('game-area-container');
const version = 'v1'; // Change this to v2, v3, etc., for different versions.


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

let touchStartX = 0;
let touchStartY = 0;

let isPaused = false;

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

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
    } else {
        snake.pop();
    }
}

function checkCollision() {
    const head = snake[0];
    if (wallMode && (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount)) {
        gameOver = true;
    }

    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver = true;
            break;
        }
    }

    if (gameOver) {
        updateHighScore();
    }
}

function drawGameOver() {
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
    const storedHighScore = localStorage.getItem('snakeHighScore_${version}');
    highScore = storedHighScore ? parseInt(storedHighScore) : 0;
    highScoreElement.textContent = highScore;
}

function updateHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore_${version}', highScore);
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
    dx = newDx;
    dy = newDy;
}

document.addEventListener('keydown', (e) => {
    if (gameOver && e.code === 'Space') {
        initializeGame();
        return;
    }
    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            changeDirection(0, -1);
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            changeDirection(0, 1);
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            changeDirection(-1, 0);
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            changeDirection(1, 0);
            break;
    }
});

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
    if (aiMode || gameOver) return;

    let touchEndX = e.changedTouches[0].clientX;
    let touchEndY = e.changedTouches[0].clientY;

    let dx = touchEndX - touchStartX;
    let dy = touchEndY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
        changeDirection(dx > 0 ? 1 : -1, 0);
    } else {
        changeDirection(0, dy > 0 ? 1 : -1);
    }
}, false);

wallModeButton.addEventListener('click', () => {
    wallMode = !wallMode;
    wallModeButton.textContent = `🛡️ Walls`;
    wallModeButton.classList.toggle('clicked');
    gameAreaContainer.classList.toggle('walls-on', wallMode);
});

aiModeButton.addEventListener('click', () => {
    aiMode = !aiMode;
    aiModeButton.textContent = `🤖 Autoplay`;
    aiModeButton.classList.toggle('clicked');
});

function getGameSpeed() {
    return Math.max(150 - (level - 1), 50);
}

function gameLoop() {
    if (!isPaused) {
        drawGame();
    }
    setTimeout(gameLoop, getGameSpeed());
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

document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowUp':
            activateKey(1);
            changeDirection(0, -1);
            break;
        case 'ArrowDown':
            activateKey(2);
            changeDirection(0, 1);
            break;
        case 'ArrowLeft':
            activateKey(3);
            changeDirection(-1, 0);
            break;
        case 'ArrowRight':
            activateKey(4);
            changeDirection(1, 0);
            break;
        case 'w':
        case 'W':
            activateKey(5);
            changeDirection(0, -1);
            break;
        case 's':
        case 'S':
            activateKey(6);
            changeDirection(0, 1);
            break;
        case 'a':
        case 'A':
            activateKey(7);
            changeDirection(-1, 0);
            break;
        case 'd':
        case 'D':
            activateKey(8);
            changeDirection(1, 0);
            break;
         case 'Escape':
             if (gameOver) {
                  initializeGame();
               } else {
                isPaused = !isPaused;
             if (isPaused) {
                  drawPauseScreen();
        }
    }
    break;


    }
});

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
});




initializeGame();
gameLoop();