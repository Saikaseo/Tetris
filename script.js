/* 基本設定 */
const COLS = 10;
const ROWS = 20;

/* 落下速度調整　初期値
 * 数字が大きいほど遅い
 * 2000 = 2秒 */
let dropSpeed = 2000;
const FAST_DROP_SPEED = 80;
let normalDropSpeed = 2000;
let fastDropActive = false;

/* スマホタッチ操作状態 */
let horizontalSwipeActive = false;
let immediateDropActive = false;
let touchMoved = false;

/* ゲーム状態 */
let board = [];
let score = 0;
let lines = 0;
let level = 1;
let gameOver = false;
let paused = false;
let dropTimer = null;

/* ライン消去エフェクト・連鎖管理 */
let clearChain = 0;
let clearEffectProcessing = false;

/* 現在のミノ */
let current = null;
let nextPiece = null;

/* HOLD */
let holdPiece = null;
let holdUsed = false;

/* 一手戻す */
let history = [];
const MAX_HISTORY = 10;

/* テトリミノ */
const PIECES = {I: {color: "I",shape: [[1,1,1,1]]},O: {color: "O",shape: [[1,1],[1,1]]},T: {color: "T",shape: [[0,1,0],[1,1,1]]},S: {color: "S",shape: [[0,1,1],[1,1,0]]},Z: {color: "Z",shape: [[1,1,0],[0,1,1]]},J: {color: "J",shape: [[1,0,0],[1,1,1]]},L: {color: "L",shape: [[0,0,1],[1,1,1]]}};
const PIECE_NAMES = ["I","O","T","S","Z","J","L"];

/* 盤面作成 */
function createBoard() {board = [];for (let y = 0;y < ROWS;y++) {board[y] = [];for (let x = 0;x < COLS;x++) {board[y][x] = null;}}}

/* 盤面描画 */
function drawBoard() {
    const boardElement = document.getElementById("board");
    if (!boardElement)return;
    if (!clearEffectProcessing) {
        boardElement.classList.remove("line-clear-effect","combo-clear-effect","chain-effect","perfect-clear-effect");
        boardElement
            .querySelectorAll(".line-clear-row")
            .forEach(element =>element.remove());
        delete boardElement.dataset.chain;
        delete boardElement.dataset.lines;
    }
    if (boardElement.children.length !==ROWS * COLS) {boardElement.innerHTML = "";for (let y = 0;y < ROWS;y++) {for (let x = 0;x < COLS;x++) {const cell = document.createElement("div");cell.className = "cell";cell.classList.add(x % 2 === 0 ? "even-column" : "odd-column");boardElement.appendChild(cell);}}}
    const cells = boardElement.children;
    for (let i = 0; i < cells.length; i++) {const cell = cells[i];cell.classList.remove("filled","ghost","I","O","T","S","Z","J","L");}
    for (let y = 0; y < ROWS; y++) {for (let x = 0; x < COLS; x++) {const value = board[y][x];if (!value) continue;const index = y * COLS + x;const cell = cells[index];cell.classList.add("filled");cell.classList.add(value);}}drawCurrentPiece();
}

/* 現在のミノ描画＋ゴーストミノ */
function drawCurrentPiece() {
    if (!current) return;
    const boardElement = document.getElementById("board");
    if (!boardElement) return;
    let ghostY = current.y;
    while (!collision(current.x,ghostY + 1,current.shape)) {ghostY++;}
    for (let y = 0;y < current.shape.length;y++) {
        for (let x = 0;x < current.shape[y].length;x++) {
            if (!current.shape[y][x]) continue;
            const boardX = current.x + x;
            const boardY = ghostY + y;
            if (boardX >= 0 && boardX < COLS && boardY >= 0 && boardY < ROWS) {const index = boardY * COLS + boardX;const cell = boardElement.children[index];if (!cell) continue;if (boardY >= current.y && boardY < current.y + current.shape.length && boardX >= current.x && boardX < current.x + current.shape[0].length) {} else {cell.classList.add("ghost");cell.classList.add(current.color);}}
        }
    }
    for (let y = 0; y < current.shape.length; y++) {for (let x = 0; x < current.shape[y].length; x++) {if (!current.shape[y][x]) continue;const boardX = current.x + x;const boardY = current.y + y;if (boardX >= 0 && boardX < COLS && boardY >= 0 && boardY < ROWS ) {const index = boardY * COLS + boardX;const cell = boardElement.children[index];if (!cell) continue;cell.classList.remove("ghost");cell.classList.add("filled");cell.classList.add(current.color);}}}
}

/* ランダムなミノ */
function randomPiece() {const name = PIECE_NAMES[Math.floor(Math.random() *PIECE_NAMES.length)];const data =PIECES[name];return {color: data.color,shape:data.shape.map(row => [...row]),x:Math.floor((COLS - data.shape[0].length) / 2),y: 0};}

/* ミノ生成 */
function spawnPiece() {if (nextPiece) {current = {color:nextPiece.color,shape:nextPiece.shape.map(row => [...row]),x: 0,y: 0};} else {current = randomPiece();}nextPiece = randomPiece();current.x =Math.floor((COLS - current.shape[0].length) / 2);current.y = 0;drawNext();if (collision(current.x,current.y,current.shape)) {endGame();return;}saveHistory();drawBoard();}

/* NEXT */
function drawPreview(containerId, piece) {
    const container = document.getElementById(containerId);
    if (!container)return;
    container.innerHTML = "";
    if (!piece)return;
    const shape = piece.shape;
    const pieceElement = document.createElement("div");
    pieceElement.className = "preview-piece";
    pieceElement.style.gridTemplateColumns = `repeat(${shape[0].length}, 14px)`;
    pieceElement.style.gridTemplateRows =`repeat(${shape.length}, 14px)`;
    for (let y = 0; y < shape.length; y++) {for (let x = 0; x < shape[y].length; x++) {if (!shape[y][x])continue;const block = document.createElement("div");block.className = "preview-block";block.classList.add(piece.color);block.style.gridColumn = String(x + 1);block.style.gridRow = String(y + 1);pieceElement.appendChild(block);}}container.appendChild(pieceElement);
}

/* NEXT */
function drawNext() {drawPreview("next",nextPiece);}

/* HOLD */
function drawHold() {drawPreview("hold",holdPiece);}

/* HOLD */
function holdCurrentPiece() {
    if (gameOver || clearEffectProcessing || !current)return;
    if (!holdPiece) {holdPiece = {color:current.color,shape:current.shape.map(row => [...row]),x: 0, y: 0};current = {color:nextPiece.color,shape:nextPiece.shape.map(row => [...row]),x: 0, y: 0};nextPiece = randomPiece();}
    else {const temp = {color:current.color,shape:current.shape.map(row => [...row]),x: 0, y: 0};current = {color:holdPiece.color,shape:holdPiece.shape.map(row => [...row]),x: 0, y: 0};holdPiece = temp;}
    current.x =Math.floor((COLS - current.shape[0].length) / 2);
    current.y = 0;
    drawHold();drawNext();drawBoard();saveGame();
}

/* 衝突判定 */
function collision(x,y,shape) {for (let sy = 0; sy < shape.length; sy++) {for (let sx = 0; sx < shape[sy].length; sx++) {if (!shape[sy][sx]) continue;const boardX = x + sx;const boardY = y + sy;if (boardX < 0 || boardX >= COLS) {return true;}if (boardY >= ROWS) {return true;}if (boardY >= 0 && board[boardY][boardX]) {return true;}}}return false;}

/* 左右移動 */
function moveHorizontal(direction) {if (gameOver || clearEffectProcessing || !current)return;const newX = current.x + direction;if (!collision(newX,current.y,current.shape)) {current.x = newX;drawBoard();saveGame();}}

/* 下移動 */
function moveDown() {if (gameOver || clearEffectProcessing || !current)return;if (!collision(current.x,current.y + 1,current.shape)) {current.y++;drawBoard();saveGame();} else {lockPiece();}}

/* 即着地 */
function hardDrop() {if (gameOver || clearEffectProcessing || !current)return;while (!collision(current.x,current.y + 1,current.shape)) {current.y++;}lockPiece();}

/* ねじ込み回転 */
function rotatePiece() {
    if (gameOver || clearEffectProcessing || !current)return;
    const oldShape = current.shape;
    const height = oldShape.length;
    const width = oldShape[0].length;
    const newShape = [];
    for (let x = 0; x < width; x++) {newShape[x] = [];for (let y = height - 1; y >= 0; y--) {newShape[x].push(oldShape[y][x]);}}
    if (!collision(current.x,current.y,newShape)) {current.shape = newShape;drawBoard();saveGame();return;}
    const maxKick =4;
    const candidates = [];
    for (let distance = 1; distance <= maxKick; distance++) {
        const directions = [[0, -distance],[0, distance],[-distance, 0],[distance, 0]];
        for (const offset of directions) {candidates.push(offset);}
        for (let dx = -distance; dx <= distance; dx++) {for (let dy = -distance; dy <= distance; dy++) {if (dx === 0 || dy === 0)continue;if (Math.max(Math.abs(dx),Math.abs(dy)) !== distance)continue;candidates.push([dx,dy]);}}
    }
    for (const offset of candidates) {const newX = current.x + offset[0];const newY = current.y + offset[1];if (!collision(newX,newY,newShape)) {current.x = newX;current.y = newY;current.shape = newShape;drawBoard();saveGame();return;}}
}

/* ミノ固定 */
async function lockPiece() {
    if (clearEffectProcessing)return;
    if (!current)return;
    for (let y = 0; y < current.shape.length; y++) {for (let x = 0; x < current.shape[y].length; x++) {if (!current.shape[y][x])continue;const boardX = current.x + x;const boardY = current.y + y;if (boardX >= 0 && boardX < COLS && boardY >= 0 && boardY < ROWS) {board[boardY][boardX] = current.color;}}}
    current = null;
    drawBoard();
    const cleared = await clearLines();
    if (!gameOver) {spawnPiece();drawHold();drawNext();saveGame();}
}

/* ライン消去 */
async function clearLines() {
    const initialClearedRows = [];
    for (let y = ROWS - 1; y >= 0; y--) {let full = true;for (let x = 0; x < COLS; x++) {if (!board[y][x]) {full = false; break;}}if (full) {initialClearedRows.push(y);}}
    if (initialClearedRows.length === 0) {clearChain = 0;return 0;}
    clearChain++;
    clearEffectProcessing = true;
    const clearCount = initialClearedRows.length;
    for (let i = 0; i < clearCount; i++) {
        let targetRow = -1;
        for (let y = ROWS - 1; y >= 0; y--) {let full = true;for (let x = 0; x < COLS; x++) {if (!board[y][x]) {full = false;break;}}if (full) {targetRow = y;break;}}
        if (targetRow === -1) {break;}
        await showSingleLineClearEffect(targetRow,clearChain,i + 1,clearCount);
        board.splice(targetRow,1);
        board.unshift(new Array(COLS).fill(null));
        drawBoard();
        await new Promise(resolve =>setTimeout(resolve,45));
    }
    const cleared = clearCount;
    lines += cleared;
    const scores = [0,100,300,500,800];
    score += scores[cleared] * level;
    level = Math.floor(lines / 10) + 1;
    updateInfo();
    let boardEmpty = true;
    for (let y = 0; y < ROWS; y++) {for (let x = 0; x < COLS; x++) {if (board[y][x]) {boardEmpty = false; break;}}if (!boardEmpty)break;}
    if (boardEmpty) {playPerfectClearEffect(clearChain);await new Promise(resolve => setTimeout(resolve,300));}
    const boardElement = document.getElementById("board");
    if (boardElement) {boardElement.classList.remove("line-clear-effect","combo-clear-effect","chain-effect","perfect-clear-effect");boardElement.querySelectorAll(".line-clear-row").forEach(element => element.remove());delete boardElement.dataset.chain;delete boardElement.dataset.lines;}
    clearEffectProcessing = false;
    drawBoard();saveGame();return cleared;
}

/* 1ライン消去エフェクト */
async function showSingleLineClearEffect(row,chain,clearNumber,totalClearCount) {
    const boardElement = document.getElementById("board");
    if (!boardElement)return;
    const effectDuration = 170;
    boardElement.classList.remove("line-clear-effect","combo-clear-effect","perfect-clear-effect","chain-effect");
    boardElement
        .querySelectorAll(".line-clear-row")
        .forEach(element => element.remove());
    void boardElement.offsetWidth;
    const chainLevel = Math.min(chain,5);
    boardElement.dataset.chain = chainLevel;
    boardElement.dataset.lines = totalClearCount;
    if (clearNumber === 1 && totalClearCount === 1) {boardElement.classList.add("line-clear-effect");}
    else if (totalClearCount > 1) {boardElement.classList.add("combo-clear-effect");}
    if (clearNumber >= 2) {boardElement.classList.add("chain-effect");}
    const rowElement = document.createElement("div");
    rowElement.className = "line-clear-row";
    rowElement.style.top =(row / ROWS * 100) + "%";
    rowElement.style.height =(100 / ROWS) + "%";
    rowElement.style.animationDuration = effectDuration + "ms";
    rowElement.dataset.chain = chainLevel;
    rowElement.dataset.lines = totalClearCount;
    rowElement.dataset.clearNumber = clearNumber;
    boardElement.appendChild(rowElement);
    await playClearSound(clearNumber,chain);
    await new Promise(resolve => setTimeout(resolve,effectDuration));
    rowElement.remove();
    boardElement.classList.remove("line-clear-effect","combo-clear-effect","chain-effect");
    delete boardElement.dataset.chain;
    delete boardElement.dataset.lines;
    drawBoard();
    await new Promise(resolve => setTimeout(resolve,10));
}

/* 情報更新 */
function updateInfo() {document.getElementById("score").textContent = score;document.getElementById("level").textContent = level;document.getElementById("lines").textContent = lines;}

/* 落下速度 */
function getDropSpeed() {return dropSpeed;}

/* タイマー */
function restartTimer() {clearInterval(dropTimer);if (gameOver) {dropTimer = null;return;}if (paused) {dropTimer = null;return;}dropTimer =setInterval(moveDown,getDropSpeed());}

/* 一手戻す用の履歴保存 */
function saveHistory() {
    history.push({
        board:board.map(row => [...row]),
        score:score,
        lines:lines,
        level:level,
        current:current ? {color:current.color,shape:current.shape.map(row => [...row]),x:current.x,y:current.y}: null,
        nextPiece:nextPiece ? {color:nextPiece.color,shape:nextPiece.shape.map(row => [...row]),x:nextPiece.x,y:nextPiece.y}: null,
        holdPiece:holdPiece ? {color:holdPiece.color,shape:holdPiece.shape.map(row => [...row]),x:holdPiece.x,y:holdPiece.y}: null,
        holdUsed:holdUsed
    });if (history.length > MAX_HISTORY) {history.shift();}
}

/* 一手戻す */
function undoMove() {
    if (gameOver)return;
    if (history.length === 0)return;
    if (history.length > 1) {history.pop();}
    const state = history[history.length - 1];
    if (!state)return;
    board = state.board.map(row => [...row]);
    score = state.score;
    lines = state.lines;
    level = state.level;
    current = state.current ? {color:state.current.color,shape:state.current.shape.map(row => [...row]),x: state.current.x,y: state.current.y}: null;
    nextPiece = state.nextPiece ? {color:state.nextPiece.color,shape:state.nextPiece.shape.map(row => [...row]),x: state.nextPiece.x,y: state.nextPiece.y}: null;
    holdPiece = state.holdPiece ? {color:state.holdPiece.color,shape:state.holdPiece.shape.map(row => [...row]),x: state.holdPiece.x,y: state.holdPiece.y}: null;
    holdUsed = state.holdUsed || false;
    updateInfo();drawBoard();drawHold();drawNext();restartTimer();saveGame();
}

/* 自動保存 */
const SAVE_KEY = "tetris_auto_save";
function saveGame() {
    try {const saveData = {
        board:board.map(row => [...row]),
        score:score,
        lines:lines,
        level:level,
        gameOver:gameOver,
        paused:paused,
        dropSpeed:dropSpeed,
        current:current ? {color:current.color,shape:current.shape.map(row => [...row]),x:current.x,y:current.y}: null,
        nextPiece:nextPiece ? {color:nextPiece.color,shape:nextPiece.shape.map(row => [...row]),x: nextPiece.x,y:nextPiece.y}: null,
        holdPiece:holdPiece ? {color:holdPiece.color,shape:holdPiece.shape.map(row => [...row]),x:holdPiece.x,y:holdPiece.y}: null,
        holdUsed:holdUsed,
        history:history.map(state => ({
            board:state.board.map(row => [...row]),
            score:state.score,
            lines:state.lines,
            level:state.level,
            current:state.current ? {color:state.current.color,shape:state.current.shape.map(row => [...row]),x:state.current.x,y:state.current.y}: null,
            nextPiece:state.nextPiece ? {color:state.nextPiece.color,shape:state.nextPiece.shape.map(row => [...row]),x:state.nextPiece.x,y:state.nextPiece.y}: null,
            holdPiece:state.holdPiece ? {color:state.holdPiece.color,shape:state.holdPiece.shape.map(row => [...row]),x:state.holdPiece.x,y:state.holdPiece.y}: null,
            holdUsed:state.holdUsed
        })
        )
    };localStorage.setItem(SAVE_KEY,JSON.stringify(saveData));
    } catch (error) {console.error("自動保存に失敗しました:",error);}
}

/* 自動保存データ読み込み */
function loadGame() {
    try {
        const saved =localStorage.getItem(SAVE_KEY);
        if (!saved)return false;
        const data =JSON.parse(saved);
        if (!data || !data.board || !data.current) {return false;}
        board =data.board.map(row => [...row]);
        score = data.score || 0;
        lines = data.lines || 0;
        level = data.level || 1;
        gameOver = data.gameOver || false;
        paused = data.paused || false;
        dropSpeed = data.dropSpeed || 2000;
        current = data.current ? {color:data.current.color,shape:data.current.shape.map(row => [...row]),x:data.current.x,y:data.current.y}: null;
        nextPiece = data.nextPiece ? {color:data.nextPiece.color,shape:data.nextPiece.shape.map( row => [...row]),x:data.nextPiece.x,y:data.nextPiece.y}: null;
        holdPiece = data.holdPiece ? {color:data.holdPiece.color,shape:data.holdPiece.shape.map(row => [...row]),x:data.holdPiece.x,y:data.holdPiece.y}: null;
        holdUsed = data.holdUsed || false;
        history = Array.isArray(data.history) ? data.history: [];
        updateInfo();drawBoard();drawHold();drawNext();
        const slider = document.getElementById("speed-slider");
        const value = document.getElementById("speed-value");
        if (slider) {slider.value = dropSpeed;}
        if (value) {value.textContent = dropSpeed + " ms";}
        const pauseButton = document.getElementById("pause");
        if (pauseButton) {pauseButton.textContent = paused ? "▶" : "Ⅱ";}
        if (gameOver) {document.getElementById("final-score-number").textContent = score;document.getElementById("game-over").style.display = "flex";}
        restartTimer();
        return true;
    } catch (error) {console.error("自動保存データの読み込みに失敗しました:",error);return false;}
}

/* ゲームオーバー */
function endGame() {gameOver = true;clearInterval(dropTimer);document.getElementById("final-score-number").textContent = score;document.getElementById("game-over").style.display = "flex";}

/* 一時停止 */
function togglePause() {if (gameOver)return;paused = !paused;const button = document.getElementById("pause");if (button) {button.textContent = paused ? "▶" : "Ⅱ";}restartTimer();saveGame();}

/* リスタート確認 */
function showRestartConfirm() {if (gameOver) {return;}const restartConfirm = document.getElementById("restart-confirm");if (!restartConfirm) {return;}restartConfirm.style.display = "flex";}
function hideRestartConfirm() {const restartConfirm = document.getElementById("restart-confirm");if (!restartConfirm) {return;}restartConfirm.style.display = "none";}
function confirmRestartGame() {hideRestartConfirm();startGame();}

/* ゲーム開始 */

function startGame() {clearInterval(dropTimer);dropTimer = null;createBoard();score = 0;lines = 0;level = 1;gameOver = false;paused = false;holdPiece = null;holdUsed = false;history = [];nextPiece =randomPiece();spawnPiece();drawBoard();updateInfo();drawHold();drawNext();const pauseButton = document.getElementById("pause");if (pauseButton) {pauseButton.textContent = "Ⅱ";}restartTimer();saveGame();}

/* PCキーボード操作 */
document.addEventListener("keydown",
    function(event) {const restartConfirm = document.getElementById("restart-confirm");
        if (restartConfirm && restartConfirm.style.display === "flex") {if (event.key === "Escape") {event.preventDefault();hideRestartConfirm();return;}if (event.key === "Enter") {event.preventDefault();confirmRestartGame();return;}return;}
        if (gameOver) {if (event.key === "Enter") {event.preventDefault();document.getElementById("game-over").style.display = "none";startGame();}return;}
        if (event.key === "ArrowLeft") {event.preventDefault();moveHorizontal(-1);}
        else if (event.key === "ArrowRight") {event.preventDefault();moveHorizontal(1);}
        else if (event.key === "ArrowDown") {event.preventDefault();moveDown();}
        else if (event.key === "ArrowUp") {event.preventDefault();rotatePiece();}
        else if (event.code === "Space") {event.preventDefault();togglePause();}
        else if (event.key.toLowerCase() === "z") {event.preventDefault();undoMove();}
        else if (event.key.toLowerCase() === "c") {event.preventDefault();holdCurrentPiece();}
        else if (event.key.toLowerCase() === "r") {event.preventDefault();showRestartConfirm();}
    }
);

/* スマホ：HOLD表示枠をタップ */
const holdElement = document.getElementById("hold");
if (holdElement) {holdElement.addEventListener("pointerdown",function(event) {event.preventDefault();holdCurrentPiece();});}

/* スマホ：一手戻す */
document.getElementById("undo")
    .addEventListener("pointerdown",function(event) {event.preventDefault();undoMove();});

/* スマホ：一時停止 */
document.getElementById("pause")
    .addEventListener("pointerdown",function(event) {event.preventDefault();togglePause();});

/* スマホ：スワイプ操作 */
const boardElement = document.getElementById("board");
let touchStartX = 0;
let touchStartY = 0;
let lastMoveX = 0;
const swipeDistance = 20;
const horizontalIntentDistance = 8;
const hardDropDistance = 100;
const tapDistance = 15;

/* 指を盤面につけたとき */
boardElement.addEventListener("pointerdown",function(event) {if (gameOver)return;event.preventDefault();horizontalSwipeActive = false;immediateDropActive = false;touchMoved = false;touchStartX = event.clientX;touchStartY = event.clientY;lastMoveX = event.clientX;if (boardElement.setPointerCapture) {try {boardElement.setPointerCapture(event.pointerId);} catch (error) {}}});

/* 指をつけたまま動かしている間 */
boardElement.addEventListener("pointermove",
    function(event) {
        if (gameOver)return;
        if (immediateDropActive)return;
        const totalDx = event.clientX - touchStartX;
        const totalDy = event.clientY - touchStartY;
        const absTotalDx = Math.abs(totalDx);
        const absTotalDy = Math.abs(totalDy);
        if (absTotalDx > 3 || absTotalDy > 3) {touchMoved = true;}
        if (absTotalDx >= horizontalIntentDistance && absTotalDx > absTotalDy) {horizontalSwipeActive = true;clearTimeout(boardLongPressTimer);boardLongPressTimer =null;if (fastDropActive) {stopBoardLongPress();}}
        if (!horizontalSwipeActive) {return;}
        const dx = event.clientX - lastMoveX;
        const absX = Math.abs(dx);
        if (absX < swipeDistance || absX <= absTotalDy) {return;}
        const moveCount = Math.floor(absX / swipeDistance);
        if (dx < 0) {for (let i = 0;i < moveCount;i++) {moveHorizontal(-1);}}
        else {for (let i = 0;i < moveCount;i++) {moveHorizontal(1);}}
        const usedDistance = moveCount * swipeDistance;
        if (dx < 0) {lastMoveX -= usedDistance;} else {lastMoveX += usedDistance;}

    }
);

/* 指を離したとき */
boardElement.addEventListener("pointerup",
    function(event) {if (gameOver)return;
        event.preventDefault();
        stopBoardLongPress();
        const dx = event.clientX - touchStartX;
        const dy = event.clientY - touchStartY;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        if (!immediateDropActive && dy >= hardDropDistance && absY > absX) {immediateDropActive = true;horizontalSwipeActive = false;hardDrop();setTimeout(function() {immediateDropActive = false;},0);return;}
        if (horizontalSwipeActive) {horizontalSwipeActive =false;return;}
        if (!touchMoved &&absX < tapDistance &&absY < tapDistance) {rotatePiece();}
        horizontalSwipeActive = false;
        touchMoved = false;
    }
);

/* 指をキャンセルした場合 */
boardElement.addEventListener("pointercancel",function(event) {stopBoardLongPress();horizontalSwipeActive = false;immediateDropActive = false;touchMoved = false;if (boardElement.releasePointerCapture) {try {boardElement.releasePointerCapture(event.pointerId);} catch (error) {}}});

/* 落下速度スライダー */
const speedSlider = document.getElementById("speed-slider");
const speedValue = document.getElementById("speed-value");
speedSlider.addEventListener("input",function() {dropSpeed = Number(speedSlider.value);speedValue.textContent = dropSpeed + " ms";if (!gameOver) {restartTimer();}saveGame();});

/* 音声設定 */
const bgmVolumeSlider = document.getElementById("bgm-volume-slider");
const bgmVolumeValue = document.getElementById("bgm-volume-value");
const seVolumeSlider = document.getElementById("se-volume-slider");
const seVolumeValue = document.getElementById("se-volume-value");
if (bgmVolumeSlider) {bgmVolumeSlider.addEventListener("input",function() {bgmVolume = Number(bgmVolumeSlider.value) / 100;if (bgmGainNode) {bgmGainNode.gain.value = bgmVolume;}if (bgmVolumeValue) {bgmVolumeValue.textContent = Math.round(bgmVolume * 100) + "%";}saveAudioSettings();});}
if (seVolumeSlider) {seVolumeSlider.addEventListener("input",function() {seVolume = Number(seVolumeSlider.value) / 100;if (seGainNode) {seGainNode.gain.value = seVolume;}if (seVolumeValue) {seVolumeValue.textContent = Math.round(seVolume * 100) + "%";}saveAudioSettings();});}
const audioRestartButton = document.getElementById("audio-restart");
let audioMuted = false;
if (audioRestartButton) {audioRestartButton.addEventListener("pointerdown",async function(event) {event.preventDefault();if (audioMuted) {audioMuted = false;stopBGM();await reloadAudio();audioRestartButton.textContent = "🔇 OFF";}else {audioMuted = true;await stopAllAudio();audioRestartButton.textContent = "🔊 ON";}});}
if (audioRestartButton) {audioRestartButton.textContent = "🔇 OFF";}

/* スマホ：リスタート */
document.getElementById("restart-mobile")
    .addEventListener("pointerdown",function(event) {event.preventDefault();showRestartConfirm();});

/* リスタート確認画面のボタン */
const restartCancelButton = document.getElementById("restart-cancel");
const restartConfirmButton = document.getElementById("restart-confirm-button");
if (restartCancelButton) {restartCancelButton.addEventListener("pointerdown",function(event) {event.preventDefault();hideRestartConfirm();});}
if (restartConfirmButton) {restartConfirmButton.addEventListener("pointerdown",function(event) {event.preventDefault();confirmRestartGame();});}

/* ゲームオーバー後のリスタート */
document.getElementById("game-over-restart")
.addEventListener("click",function() {document.getElementById("game-over").style.display = "none";startGame();});

/* 音声システム */
let effectAudioContext = null;
let bgmGainNode = null;
let seGainNode = null;
let bgmTimer = null;
let bgmPlaying = false;

/*音量調整 0.0 ～ 1.0 */
let bgmVolume = 0.15;
let seVolume = 0.70;
const AUDIO_SAVE_KEY = "tetris_audio_settings";

/* AudioContext取得 */
function getAudioContext() {if (!effectAudioContext) {const AudioContextClass = window.AudioContext || window.webkitAudioContext;if (!AudioContextClass)return null;effectAudioContext = new AudioContextClass();seGainNode = effectAudioContext.createGain();seGainNode.gain.value = seVolume;seGainNode.connect(effectAudioContext.destination);bgmGainNode = effectAudioContext.createGain();bgmGainNode.gain.value = bgmVolume;bgmGainNode.connect(effectAudioContext.destination);}if (effectAudioContext.state === "suspended") {effectAudioContext.resume().catch(() => {});}return effectAudioContext;}

/* 効果音用Gain */
function getSEGain() {const ctx = getAudioContext();if (!ctx || !seGainNode)return null;seGainNode.gain.value = audioMuted ? 0 : seVolume;return seGainNode;}

/* BGM用Gain */
function getBGMGain() {const ctx = getAudioContext();if (!ctx || !bgmGainNode)return null;bgmGainNode.gain.value = audioMuted ? 0 : bgmVolume;return bgmGainNode;}

/* BGM 楽曲編集エリア
 * 音程 → 周波数変換表 */
const BGM_FREQUENCIES = {
    "C3": 130.81,"D3": 146.83,"E3": 164.81,"F3": 174.61,"G3": 196.00,"G3#": 207.65,"A3": 220.00,"B3": 246.94,
    "C4": 261.63,"D4": 293.66,"E4": 329.63,"F4": 349.23,"G4": 392.00,"G4#": 415.30,"A4": 440.00,"B4": 493.88,
    "C5": 523.25,"D5": 587.33,"E5": 659.25,"F5": 698.46,"G5": 783.99,"A5": 880.00,"B5": 987.77,
    "C6": 1046.50,"D6": 1174.66,"E6": 1318.51,"F6": 1396.91,"G6": 1567.98,"A6": 1760.00,"B6": 1975.53
};

/* note→ 音程
 * length→ その音を鳴らす長さ（秒）
 * 例：{note: "C4",length: 0.25},「C4を0.25秒」
 * 休符：{note: "REST",length: 0.25},「0.25秒休む」 */
const BGM_SONG = [

    {note: "E4", length: 0.5},
    {note: "B3", length: 0.25},
    {note: "C4", length: 0.25},
    {note: "D4", length: 0.5},

    {note: "C4", length: 0.25},
    {note: "B3", length: 0.25},
    {note: "A3", length: 0.5},

    {note: "A3", length: 0.25},
    {note: "C4", length: 0.25},
    {note: "E4", length: 0.5},

    {note: "D4", length: 0.25},
    {note: "C4", length: 0.25},
    {note: "B3", length: 0.5},

    {note: "B3", length: 0.25},
    {note: "C4", length: 0.25},
    {note: "D4", length: 0.5},

    {note: "E4", length: 0.5},
    {note: "C4", length: 0.5},
    {note: "A3", length: 0.5},
    {note: "A3", length: 0.5},

    {note: "REST", length: 0.5},
    {note: "REST", length: 0.25},

    {note: "D4", length: 0.5},
    {note: "F4", length: 0.25},
    {note: "A4", length: 0.5},

    {note: "G4", length: 0.25},
    {note: "F4", length: 0.25},
    {note: "E4", length: 0.75},

    {note: "C4", length: 0.25},
    {note: "E4", length: 0.5},
    {note: "D4", length: 0.25},
    {note: "C4", length: 0.25},

    {note: "B3", length: 0.5},
    {note: "B3", length: 0.25},
    {note: "C4", length: 0.25},
    {note: "D4", length: 0.5},

    {note: "E4", length: 0.5},
    {note: "C4", length: 0.5},
    {note: "A3", length: 0.5},
    {note: "A3", length: 0.5},
    {note: "REST", length: 0.5},


    {note: "E4", length: 0.5},
    {note: "B3", length: 0.25},
    {note: "C4", length: 0.25},
    {note: "D4", length: 0.5},

    {note: "C4", length: 0.25},
    {note: "B3", length: 0.25},
    {note: "A3", length: 0.5},

    {note: "A3", length: 0.25},
    {note: "C4", length: 0.25},
    {note: "E4", length: 0.5},

    {note: "D4", length: 0.25},
    {note: "C4", length: 0.25},
    {note: "B3", length: 0.5},

    {note: "B3", length: 0.25},
    {note: "C4", length: 0.25},
    {note: "D4", length: 0.5},

    {note: "E4", length: 0.5},
    {note: "C4", length: 0.5},
    {note: "A3", length: 0.5},
    {note: "A3", length: 0.5},

    {note: "REST", length: 0.5},
    {note: "REST", length: 0.25},


    {note: "D4", length: 0.5},
    {note: "F4", length: 0.25},
    {note: "A4", length: 0.5},

    {note: "G4", length: 0.25},
    {note: "F4", length: 0.25},
    {note: "E4", length: 0.75},

    {note: "C4", length: 0.25},
    {note: "E4", length: 0.5},
    {note: "D4", length: 0.25},
    {note: "C4", length: 0.25},

    {note: "B3", length: 0.5},
    {note: "B3", length: 0.25},
    {note: "C4", length: 0.25},
    {note: "D4", length: 0.5},

    {note: "E4", length: 0.5},
    {note: "C4", length: 0.5},
    {note: "A3", length: 0.5},
    {note: "A3", length: 0.5},
    {note: "REST", length: 0.5},


    {note: "E4", length: 1},
    {note: "C4", length: 1},
    {note: "D4", length: 1},
    {note: "B3", length: 1},

    {note: "C4", length: 1},
    {note: "A3", length: 1},
    {note: "G3#", length: 1},
    {note: "B3", length: 1},

    {note: "E4", length: 1},
    {note: "C4", length: 1},
    {note: "D4", length: 1},
    {note: "B3", length: 1},

    {note: "C4", length: 0.5},
    {note: "E4", length: 0.5},
    {note: "A4", length: 1},
    {note: "G4#", length: 1.5},
    {note: "REST", length: 0.5}

];

const BGM_LOOP_LENGTH = BGM_SONG.reduce(function(total,noteData) {return total + noteData.length;},0);
function playBGMNote(frequency,startTime,duration) {
    const ctx = getAudioContext();
    const gain = getBGMGain();
    if (!ctx || !gain)return;
    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(frequency,startTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.015,startTime + duration);
    noteGain.gain.setValueAtTime(0.0001,startTime);
    noteGain.gain.exponentialRampToValueAtTime(0.18,startTime + Math.min(0.015,duration * 0.2));
    const releaseTime =Math.max(startTime + 0.02,startTime + duration - 0.02);
    noteGain.gain.exponentialRampToValueAtTime(0.0001,releaseTime);
    osc.connect(noteGain);
    noteGain.connect(gain);
    osc.start(startTime);
    osc.stop(startTime + duration);
}
function scheduleBGM() {const ctx = getAudioContext();if (!ctx)return;const startTime = ctx.currentTime + 0.03;let currentTime = startTime;BGM_SONG.forEach(function(noteData) {if (noteData.note !== "REST") {const frequency =BGM_FREQUENCIES[noteData.note];if (typeof frequency === "number") {playBGMNote(frequency,currentTime,noteData.length);}}currentTime +=noteData.length;});}
function startBGM() {if (audioMuted)return;const ctx = getAudioContext();if (!ctx)return;if (bgmPlaying)return;bgmPlaying = true;scheduleBGM();bgmTimer = setInterval(function() {if (audioMuted || document.hidden || !bgmPlaying) {return;}scheduleBGM();},BGM_LOOP_LENGTH * 1000);}
function stopBGM() {bgmPlaying = false;clearInterval(bgmTimer);bgmTimer = null;}

/* 音声を再開 */
async function resumeAudio() {try {if (audioMuted)return;const ctx = getAudioContext();if (!ctx)return;if (ctx.state === "suspended") {await ctx.resume();}if (!bgmPlaying) {startBGM();}} catch (error) {console.log("音声を再開できませんでした",error);}}

/* 音声設定保存 */
function saveAudioSettings() {try {localStorage.setItem(AUDIO_SAVE_KEY,JSON.stringify({bgmVolume:bgmVolume,seVolume:seVolume}));} catch (error) {console.log("音声設定の保存に失敗しました",error);}}

/* 音声設定読み込み */
function loadAudioSettings() {try {const saved = localStorage.getItem(AUDIO_SAVE_KEY);if (saved) {const data = JSON.parse(saved);if (typeof data.bgmVolume === "number") {bgmVolume = Math.max(0,Math.min(1,data.bgmVolume));}if (typeof data.seVolume === "number") {seVolume = Math.max(0,Math.min(1,data.seVolume));}}} catch (error) {console.log("音声設定の読み込みに失敗しました",error);}updateAudioControls();}

/* 音声システムを完全に再読み込み */
async function reloadAudio() {try {stopBGM();const oldAudioContext = effectAudioContext;effectAudioContext = null;bgmGainNode = null;seGainNode = null;bgmStarted = false;bgmStartTime = 0;if (oldAudioContext &&oldAudioContext.state !== "closed") {await oldAudioContext.close();}const ctx = getAudioContext();if (!ctx) {return;}if (ctx.state === "suspended") {await ctx.resume();}if (bgmGainNode) {bgmGainNode.gain.value = bgmVolume;}if (seGainNode) {seGainNode.gain.value = seVolume;}startBGM();} catch (error) {console.log("音声の完全再読み込みに失敗しました:",error);}}

/* すべての音を停止 */
async function stopAllAudio() {try {stopBGM();const oldAudioContext = effectAudioContext;effectAudioContext = null;bgmGainNode = null;seGainNode = null;bgmStarted = false;bgmStartTime = 0;if (oldAudioContext &&oldAudioContext.state !== "closed") {await oldAudioContext.close();}} catch (error) {console.log("音声停止に失敗しました:",error);}}

/* 音声スライダー表示更新 */
function updateAudioControls() {const bgmSlider = document.getElementById("bgm-volume-slider");const bgmValue = document.getElementById("bgm-volume-value");const seSlider = document.getElementById("se-volume-slider");const seValue = document.getElementById("se-volume-value");const bgmPercent = Math.round(bgmVolume * 100);const sePercent = Math.round(seVolume * 100);if (bgmSlider)bgmSlider.value = bgmPercent;if (bgmValue)bgmValue.textContent = bgmPercent + "%";if (seSlider)seSlider.value = sePercent;if (seValue)seValue.textContent = sePercent + "%";if (bgmGainNode)bgmGainNode.gain.value = bgmVolume;if (seGainNode)seGainNode.gain.value = seVolume;}

/* キラキラ系ライン消去効果音 */
function playClearSound(lineCount,chain) {
    try {
        const ctx = getAudioContext();
        const gainNode = getSEGain();
        if (!ctx || !gainNode)return;
        const now = ctx.currentTime;
        const notes = [880,988,1046,1174,1318,1396,1568,1760,1975,2093,2349];
        const lineBonus = (lineCount - 1) * 2;
        const chainBonus = Math.min(Math.max(chain - 1,0),10) * 1;
        const noteCount = Math.min(3 +lineCount +chainBonus,notes.length);
        for (let i = 0;i < noteCount;i++) {
            const noteIndex = Math.min(i +lineBonus +chainBonus,notes.length - 1);
            const frequency = notes[noteIndex];
            const startTime = now + i * 0.055;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(frequency,startTime);
            osc.frequency.exponentialRampToValueAtTime(frequency * 1.08,startTime + 0.12);
            gain.gain.setValueAtTime(0.0001,startTime);
            gain.gain.exponentialRampToValueAtTime(0.12 +Math.min(chain,10) * 0.012,startTime + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.0001,startTime + 0.22);
            osc.connect(gain);
            gain.connect(gainNode);
            osc.start(startTime);
            osc.stop(startTime + 0.25);
            const sparkle = ctx.createOscillator();
            const sparkleGain = ctx.createGain();
            sparkle.type = "sine";
            sparkle.frequency.setValueAtTime(frequency * 2,startTime);
            sparkle.frequency.exponentialRampToValueAtTime(frequency * 2.5,startTime + 0.1);
            sparkleGain.gain.setValueAtTime(0.0001,startTime);
            sparkleGain.gain.exponentialRampToValueAtTime(0.045,startTime + 0.01);
            sparkleGain.gain.exponentialRampToValueAtTime(0.0001,startTime + 0.16);
            sparkle.connect(sparkleGain);
            sparkleGain.connect(gainNode);
            sparkle.start(startTime);
            sparkle.stop(startTime + 0.18);
        }
        if (chain >= 2) {
            const chainOsc = ctx.createOscillator();
            const chainGain = ctx.createGain();
            const startTime = now + noteCount * 0.055;
            chainOsc.type = "triangle";
            chainOsc.frequency.setValueAtTime(1000 + chain * 100,startTime);
            chainOsc.frequency.exponentialRampToValueAtTime(1900 + Math.min(chain,10) * 150,startTime + 0.22);
            chainGain.gain.setValueAtTime(0.0001,startTime);
            chainGain.gain.exponentialRampToValueAtTime(0.12,startTime + 0.01);
            chainGain.gain.exponentialRampToValueAtTime(0.0001,startTime + 0.35);
            chainOsc.connect(chainGain);
            chainGain.connect(gainNode);
            chainOsc.start(startTime);
            chainOsc.stop(startTime + 0.38);
        }
    } catch (error) {console.log("キラキラ効果音を再生できませんでした",error);}
}

/* 全消しエフェクト */
function playPerfectClearEffect(chain) {
    const boardElement = document.getElementById("board");
    if (!boardElement)return;
    boardElement.classList.add("perfect-clear-effect");
    boardElement.dataset.chain = Math.min(chain,10);
    try {
        const ctx = getAudioContext();
        const gainNode = getSEGain();
        if (!ctx || !gainNode)return;
        const now = ctx.currentTime;
        const frequencies = [1046,1174,1318,1396,1568,1760,1975,2093,2349];
        frequencies.forEach(
            function(
                frequency,index) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const startTime = now + index * 0.07;
                osc.type = "sine";
                osc.frequency.setValueAtTime(frequency,startTime);
                osc.frequency.exponentialRampToValueAtTime(frequency * 1.2,startTime + 0.25);
                gain.gain.setValueAtTime(0.0001,startTime);
                gain.gain.exponentialRampToValueAtTime(0.16,startTime + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.0001,startTime + 0.45);
                osc.connect(gain);
                gain.connect(gainNode);
                osc.start(startTime);
                osc.stop(startTime + 0.5);
            }
        );
    } catch (error) {console.log("全消し効果音を再生できませんでした",error);}
    setTimeout(function() {boardElement.classList.remove("perfect-clear-effect");},900);
}

/* スマホ：盤面長押し高速落下 */
let boardLongPressTimer = null;
let fastDropTimer = null;
boardElement.addEventListener("pointerdown",
    function(event) {
        if (gameOver)return;
        clearTimeout(boardLongPressTimer);
        boardLongPressTimer = null;
        if (fastDropActive)return;
        horizontalSwipeActive = false;
        immediateDropActive = false;
        touchMoved = false;
        boardLongPressTimer = setTimeout(
            function() {
                if (gameOver || !current || horizontalSwipeActive || immediateDropActive || touchMoved) {boardLongPressTimer = null;return;}
                fastDropActive = true;
                normalDropSpeed = dropSpeed;
                dropSpeed = FAST_DROP_SPEED;
                clearInterval(fastDropTimer);
                fastDropTimer =setInterval(function() {if (horizontalSwipeActive || immediateDropActive) {stopBoardLongPress();return;}if (gameOver || !current) {stopBoardLongPress();return;}moveDown();},FAST_DROP_SPEED);
            },350
        );

    }
);


/* 長押し終了 */
function stopBoardLongPress() {clearTimeout(boardLongPressTimer);boardLongPressTimer = null;clearInterval(fastDropTimer);fastDropTimer = null;if (fastDropActive) {fastDropActive = false;dropSpeed = normalDropSpeed;if (!gameOver) {restartTimer();}}}

/* 指を離した */
boardElement.addEventListener("pointerup",function() {stopBoardLongPress();});

/* 指をキャンセル */
boardElement.addEventListener("pointercancel",function() {stopBoardLongPress();});

/* 指が盤面外へ出た */
boardElement.addEventListener("pointerleave",function() {stopBoardLongPress();});

/* スマホ・タブ復帰時の音声復旧 */
document.addEventListener("visibilitychange",function() {if (!document.hidden) {resumeAudio();} else {clearInterval(bgmTimer);bgmTimer = null;}});
window.addEventListener("pageshow",function() {resumeAudio();});
document.addEventListener("pointerdown",function() {resumeAudio();},{passive: true});
document.addEventListener("keydown",function() {resumeAudio().catch(function(error) {console.log("キー操作による音声開始に失敗しました:",error);});},{passive: true});

/* ゲーム開始 */
loadAudioSettings();
const gameLoaded = loadGame();
if (!gameLoaded) {startGame();}
resumeAudio().catch(function(error) {console.log("初期音声開始待機:",error);});

/* 定期自動保存 */
setInterval(function() {if (!gameOver) {saveGame();}},1000);