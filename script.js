const board = document.querySelector('.board');
const startButton = document.querySelector(".btn-start")
const modal = document.querySelector(".modal")
const startGameModal = document.querySelector(".start-game")
const gameOverModal = document.querySelector(".game-over")
const restartButton = document.querySelector(".btn-restart")
const highScoreElement = document.querySelector("#high-score")
const scoreElement = document.querySelector("#score")
const timeElement = document.querySelector("#time")
const dirButtons = document.querySelectorAll(".btn-dir")
const blockHeight = 50
const blockWidth = 50

let highScore = localStorage.getItem("highScore") || 0
let score = 0
let time = `00-00`

highScoreElement.innerText = highScore

let cols = 0
let rows = 0
let intervalId = null;
let timerIntervalId = null;
const blocks = {}
let snake = [{ x: 1, y: 3 }]
let direction = 'down'
let food = null

// ---- board setup ----

function buildBoard() {
    board.innerHTML = ""
    for (const key in blocks) delete blocks[key]

    cols = Math.floor(board.clientWidth / blockWidth);
    rows = Math.floor(board.clientHeight / blockHeight);

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const block = document.createElement('div');
            block.classList.add("block")
            board.appendChild(block);
            blocks[`${row}-${col}`] = block
        }
    }
}

buildBoard()

// rebuild the grid if the window/orientation changes size, so rows/cols
// used by the game logic always match what's actually rendered.
let resizeTimeout = null
addEventListener("resize", () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
        // only safe to rebuild when a round isn't actively in progress,
        // otherwise the snake/food coordinates could fall outside the new grid
        if (intervalId) return
        buildBoard()
        snake = [{ x: 1, y: 3 }]
        direction = 'down'
        if (food) food = getRandomFoodPosition()
    }, 250)
})

// ---- helpers ----

function isOnSnake(pos) {
    return snake.some(segment => segment.x === pos.x && segment.y === pos.y)
}

function getRandomFoodPosition() {
    let pos
    do {
        pos = { x: Math.floor(Math.random() * rows), y: Math.floor(Math.random() * cols) }
    } while (isOnSnake(pos))
    return pos
}

function clearSnakeClasses() {
    snake.forEach(segment => {
        const block = blocks[`${segment.x}-${segment.y}`]
        if (block) block.classList.remove("fill", "snake-head", "snake-body")
    })
}

function drawSnake() {
    snake.forEach((segment, index) => {
        const block = blocks[`${segment.x}-${segment.y}`]
        if (!block) return
        if (index === 0) {
            block.classList.add("snake-head")
        } else {
            block.classList.add("snake-body")
        }
    })
}

function startTimer() {
    timerIntervalId = setInterval(() => {
        let [min, sec] = time.split("-").map(Number)
        if (sec == 59) {
            min += 1
            sec = 0
        } else {
            sec += 1
        }
        time = `${min}-${sec}`
        timeElement.innerText = time
    }, 1000)
}

function endGame() {
    clearInterval(intervalId)
    clearInterval(timerIntervalId)
    intervalId = null
    modal.style.display = "flex"
    startGameModal.style.display = "none"
    gameOverModal.style.display = "flex"
}

function setDirection(newDir) {
    const opposite = { up: "down", down: "up", left: "right", right: "left" }
    if (opposite[newDir] === direction) return // block reversing directly into yourself
    direction = newDir
}

// ---- game loop ----

function render() {
    let head = null

    if (direction === "left") {
        head = { x: snake[0].x, y: snake[0].y - 1 }
    } else if (direction === "right") {
        head = { x: snake[0].x, y: snake[0].y + 1 }
    } else if (direction === "down") {
        head = { x: snake[0].x + 1, y: snake[0].y }
    } else if (direction === "up") {
        head = { x: snake[0].x - 1, y: snake[0].y }
    }

    // wall collision
    if (head.x < 0 || head.x >= rows || head.y < 0 || head.y >= cols) {
        endGame()
        return;
    }

    const ateFood = head.x === food.x && head.y === food.y

    // self collision: if we're not eating, the tail segment will move away
    // this tick, so it's fine to move onto it. Only the rest of the body counts.
    const bodyToCheck = ateFood ? snake : snake.slice(0, snake.length - 1)
    const hitSelf = bodyToCheck.some(segment => segment.x === head.x && segment.y === head.y)
    if (hitSelf) {
        endGame()
        return;
    }

    clearSnakeClasses()

    if (ateFood) {
        blocks[`${food.x}-${food.y}`].classList.remove("food")
        snake.unshift(head)
        food = getRandomFoodPosition()
        blocks[`${food.x}-${food.y}`].classList.add("food")

        score += 10
        scoreElement.innerText = score

        if (score > highScore) {
            highScore = score
            localStorage.setItem("highScore", highScore.toString())
        }
    } else {
        snake.unshift(head)
        snake.pop()
    }

    drawSnake()
}

startButton.addEventListener("click", () => {
    modal.style.display = "none"
    food = getRandomFoodPosition()
    blocks[`${food.x}-${food.y}`].classList.add("food")
    drawSnake()
    intervalId = setInterval(() => { render() }, 300)
    startTimer()
})

restartButton.addEventListener("click", restartGame)

function restartGame() {
    if (food) blocks[`${food.x}-${food.y}`].classList.remove("food")
    clearSnakeClasses()

    score = 0
    time = `00-00`

    scoreElement.innerText = score
    timeElement.innerText = time
    highScoreElement.innerText = highScore

    modal.style.display = "none"
    direction = "down"
    snake = [{ x: 1, y: 3 }]
    food = getRandomFoodPosition()
    blocks[`${food.x}-${food.y}`].classList.add("food")
    drawSnake()

    intervalId = setInterval(() => { render() }, 300)
    startTimer()
}

// ---- input: keyboard ----

addEventListener("keydown", (event) => {
    if (event.key == "ArrowUp") {
        setDirection("up")
    } else if (event.key == "ArrowRight") {
        setDirection("right")
    } else if (event.key == "ArrowLeft") {
        setDirection("left")
    } else if (event.key == "ArrowDown") {
        setDirection("down")
    }
});

// ---- input: on-screen buttons (mobile) ----

dirButtons.forEach(btn => {
    btn.addEventListener("click", () => setDirection(btn.dataset.dir))
})

// ---- input: swipe gestures on the board (mobile) ----

let touchStartX = 0
let touchStartY = 0
const SWIPE_THRESHOLD = 20 // minimum px movement to count as a swipe, filters out taps

board.addEventListener("touchstart", (event) => {
    const touch = event.touches[0]
    touchStartX = touch.clientX
    touchStartY = touch.clientY
}, { passive: true })

board.addEventListener("touchend", (event) => {
    const touch = event.changedTouches[0]
    const dx = touch.clientX - touchStartX
    const dy = touch.clientY - touchStartY

    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return

    if (Math.abs(dx) > Math.abs(dy)) {
        setDirection(dx > 0 ? "right" : "left")
    } else {
        setDirection(dy > 0 ? "down" : "up")
    }
}, { passive: true })