// AI logic for Snake game

/**
 * Evaluates the best move for the AI
 * @returns {Object} The best move as {dx, dy}
 */


function moveAI() {
    const head = snake[0];
    
    // Clear all previous key highlights first
    for (let i = 1; i <= 4; i++) {
        deactivateKey(i);
    }

    const possibleMoves = [
        {dx: 0, dy: -1, name: 'UP'},
        {dx: 0, dy: 1, name: 'DOWN'},
        {dx: -1, dy: 0, name: 'LEFT'},
        {dx: 1, dy: 0, name: 'RIGHT'}
    ];

    let bestMove = null;
    let maxScore = -Infinity;

    for (const move of possibleMoves) {
        const newX = (head.x + move.dx + tileCount) % tileCount;
        const newY = (head.y + move.dy + tileCount) % tileCount;

        if (snake.some(segment => segment.x === newX && segment.y === newY)) {
            console.log(`🤖 ${move.name} would hit snake - skipping`);
            continue;
        }

        const score = evaluateMove(newX, newY);
        console.log(`🤖 Evaluating ${move.name}: score ${score}`);
        
        if (score > maxScore) {
            maxScore = score;
            bestMove = move;
        }
    }

    if (bestMove) {
        // Only update direction and highlight if we're actually changing direction
        if (bestMove.dx !== dx || bestMove.dy !== dy) {
            console.log(`🤖 Changing direction to ${bestMove.name} (score: ${maxScore})`);
            
            // Highlight the appropriate key
            let keyToDeactivate;
            if (bestMove.dx === 1) {
                activateKey(4);      // right
                keyToDeactivate = 4;
            } else if (bestMove.dx === -1) {
                activateKey(3);      // left
                keyToDeactivate = 3;
            } else if (bestMove.dy === -1) {
                activateKey(1);      // up
                keyToDeactivate = 1;
            } else if (bestMove.dy === 1) {
                activateKey(2);      // down
                keyToDeactivate = 2;
            }
            
            dx = bestMove.dx;
            dy = bestMove.dy;

            // Deactivate the key after 150ms
            setTimeout(() => {
                if (keyToDeactivate) {
                    deactivateKey(keyToDeactivate);
                }
            }, 450);

        } else {
            console.log(`🤖 Continuing ${bestMove.name} (score: ${maxScore})`);
        }
    } else {
        console.log('🤖 No valid moves found!');
    }
}


/**
 * Evaluates a potential move
 * @param {number} x - The x-coordinate of the potential move
 * @param {number} y - The y-coordinate of the potential move
 * @returns {number} The score for the potential move
 */
function evaluateMove(x, y) {
    const distanceToFood = Math.abs(x - food.x) + Math.abs(y - food.y);
    const distanceToWall = wallMode ? Math.min(x, y, tileCount - 1 - x, tileCount - 1 - y) : 0;
    const distanceToTail = Math.min(...snake.slice(1).map(segment => Math.abs(x - segment.x) + Math.abs(y - segment.y)));

    // Prioritize moving towards food, staying away from walls (if wall mode is on), and avoiding the tail
    let score = -distanceToFood * 2 + distanceToTail;
    
    if (wallMode) {
        score += distanceToWall * 3; // Increase the weight of wall avoidance when wall mode is on
    }

    return score;
}

/**
 * Checks if the AI is about to collide with a wall or itself
 * @param {number} newX - The potential new x-coordinate
 * @param {number} newY - The potential new y-coordinate
 * @returns {boolean} True if collision is imminent, false otherwise
 */
function checkAICollision(newX, newY) {
    if (wallMode && (newX < 0 || newX >= tileCount || newY < 0 || newY >= tileCount)) {
        return true;
    }

    return snake.some(segment => segment.x === newX && segment.y === newY);
}

/**
 * Finds the safest direction for the AI to move
 * @returns {Object} The safest move as {dx, dy}
 */
function findSafeDirection() {
    const head = snake[0];
    const possibleMoves = [
        {dx: 0, dy: -1},  // up
        {dx: 0, dy: 1},   // down
        {dx: -1, dy: 0},  // left
        {dx: 1, dy: 0}    // right
    ];

    let bestMove = null;
    let maxSpace = -1;

    for (const move of possibleMoves) {
        let newX = head.x + move.dx;
        let newY = head.y + move.dy;

        if (!wallMode) {
            newX = (newX + tileCount) % tileCount;
            newY = (newY + tileCount) % tileCount;
        }

        if (!checkAICollision(newX, newY)) {
            const space = calculateFreeSpace(newX, newY);
            if (space > maxSpace) {
                maxSpace = space;
                bestMove = move;
            }
        }
    }

    return bestMove || {dx: 0, dy: 0}; // If no safe move is found, stay in place
}

/**
 * Calculates the amount of free space in a given direction
 * @param {number} startX - The starting x-coordinate
 * @param {number} startY - The starting y-coordinate
 * @returns {number} The amount of free space
 */
function calculateFreeSpace(startX, startY) {
    let space = 0;
    let x = startX;
    let y = startY;

    while (!checkAICollision(x, y)) {
        space++;
        x += dx;
        y += dy;

        if (!wallMode) {
            x = (x + tileCount) % tileCount;
            y = (y + tileCount) % tileCount;
        }
    }

    return space;
}

