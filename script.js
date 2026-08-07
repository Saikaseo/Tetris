const SIZE = 4;

let board = [];
let score = 0;

let history = [];
const MAX_HISTORY = 3;

let nextTileId = 1;

// アニメーション中かどうか
let isAnimating = false;

const boardDiv = document.getElementById("board");


// ====================
// タイル作成
// ====================

function createTile(value){
    return {
        id: nextTileId++,
        value: value
    };
}


// ====================
// 盤面コピー
// ====================

function copyBoard(source){
    return source.map(row =>
        row.map(tile => {
            if(tile === null){
                return null;
            }

            return {
                id: tile.id,
                value: tile.value
            };
        })
    );
}


// ====================
// Undo用履歴
// ====================

function saveHistory(){
    history.push({
        board: copyBoard(board),
        score: score,
        nextTileId: nextTileId
    });

    if(history.length > MAX_HISTORY){
        history.shift();
    }
}


function undo(){

    if(isAnimating){
        return;
    }

    if(history.length === 0){
        return;
    }

    const last = history.pop();

    board = copyBoard(last.board);
    score = last.score;
    nextTileId = last.nextTileId;

    drawBoard();
}


// ====================
// 初期盤面
// ====================

function initBoard(){

    score = 0;
    history = [];
    board = [];

    for(let r = 0; r < SIZE; r++){

        board[r] = [];

        for(let c = 0; c < SIZE; c++){
            board[r][c] = null;
        }
    }

    addRandomTile();
    addRandomTile();

    drawBoard();
}


// ====================
// スコア
// ====================

function updateScore(){
    document.getElementById("score").textContent = score;
}


// ====================
// ランダムに2を追加
// ====================

function addRandomTile(){

    let empty = [];

    for(let r = 0; r < SIZE; r++){

        for(let c = 0; c < SIZE; c++){

            if(board[r][c] === null){

                empty.push({
                    r: r,
                    c: c
                });
            }
        }
    }

    if(empty.length === 0){
        return null;
    }

    const cell =
        empty[Math.floor(Math.random() * empty.length)];

    board[cell.r][cell.c] = createTile(2);

    return {
        r: cell.r,
        c: cell.c,
        id: board[cell.r][cell.c].id
    };
}


// ====================
// 通常盤面描画
// ====================

function drawBoard(newTileId = null){

    boardDiv.innerHTML = "";

    for(let r = 0; r < SIZE; r++){

        for(let c = 0; c < SIZE; c++){

            const tile =
                document.createElement("div");

            tile.className = "tile";

            const data = board[r][c];

            if(data !== null){

                tile.textContent = data.value;

                tile.classList.add(
                    "n" + data.value
                );

                if(data.id === newTileId){
                    tile.classList.add("tile-new");
                }
            }

            boardDiv.appendChild(tile);
        }
    }

    updateScore();
}


// ====================
// 1列を移動させる
// ====================
//
// direction:
// left / right / up / down
//
// 戻り値:
// 新しい列と、各タイルの移動情報
//

function processLine(line, direction){

// タイルと元の位置をセットで保持する
const tiles = [];
for(let i = 0; i < line.length; i++){
    if(line[i] !== null){
        tiles.push({
            tile: line[i],
            originalIndex: i
        });
    }
}
const result = [];
const movements = [];
let i = 0;
while(i < tiles.length){
    const current =
        tiles[i];
    // 次のタイルと合体する場合
    if(
        i + 1 < tiles.length &&
        tiles[i + 1].tile.value ===
        current.tile.value
    ){
        const next =
            tiles[i + 1];
        const mergedValue =
            current.tile.value * 2;
        score += mergedValue;
        // 合体後のタイル
        // 最初のタイルのIDを引き継ぐ
        const mergedTile = {
            id: current.tile.id,
            value: mergedValue
        };
        // 合体後の位置
        const targetIndex =
            result.length;
        result.push(mergedTile);
        // 1枚目の移動
        movements.push({
            id: current.tile.id,
            value: current.tile.value,
            fromIndex:
                current.originalIndex,
            targetIndex:
                targetIndex,
            merged: true
        });
        // 2枚目の移動
        movements.push({
            id: next.tile.id,
            value: next.tile.value,
            fromIndex:
                next.originalIndex,
            targetIndex:
                targetIndex,
            merged: true
        });
        i += 2;
    }else{
        // 通常移動
        const targetIndex =
            result.length;
        result.push(
            current.tile
        );
        movements.push({
            id: current.tile.id,
            value: current.tile.value,
            // ★ここが重要
            // 空白を詰める前の元の位置を使う
            fromIndex:
                current.originalIndex,
            targetIndex:
                targetIndex,
            merged: false
        });
        i++;
    }
}
// 4マスになるまで空白を追加
while(result.length < SIZE){
    result.push(null);
}
return {
    result: result,
    movements: movements
};

}


// ====================
// 盤面の座標取得
// ====================

function getLineCoordinates(direction, index){

    const coords = [];

    if(direction === "left"){

        for(let c = 0; c < SIZE; c++){

            coords.push({
                r: index,
                c: c
            });
        }
    }


    if(direction === "right"){

        for(let c = SIZE - 1; c >= 0; c--){

            coords.push({
                r: index,
                c: c
            });
        }
    }


    if(direction === "up"){

        for(let r = 0; r < SIZE; r++){

            coords.push({
                r: r,
                c: index
            });
        }
    }


    if(direction === "down"){

        for(let r = SIZE - 1; r >= 0; r--){

            coords.push({
                r: r,
                c: index
            });
        }
    }

    return coords;
}


// ====================
// 移動
// ====================

function move(direction){

    if(isAnimating){
        return;
    }

    const before = copyBoard(board);
    const beforeScore = score;

    const allMovements = [];

    // 移動後の盤面
    const newBoard = [];

    for(let r = 0; r < SIZE; r++){
        newBoard[r] = [];

        for(let c = 0; c < SIZE; c++){
            newBoard[r][c] = null;
        }
    }


    // 各行・列を処理
    for(let index = 0; index < SIZE; index++){

        const coords =
            getLineCoordinates(direction, index);

        const line =
            coords.map(pos => board[pos.r][pos.c]);

        const processed =
            processLine(line, direction);


        // 新しい盤面へ入れる
        for(let i = 0; i < SIZE; i++){

            const pos = coords[i];

            newBoard[pos.r][pos.c] =
                processed.result[i];
        }


        // 移動情報を座標へ変換
        processed.movements.forEach(function(movement){

            const from =
                coords[movement.fromIndex];

            const target =
                coords[movement.targetIndex];

            allMovements.push({

                id: movement.id,

                value: movement.value,

                fromR: from.r,
                fromC: from.c,

                targetR: target.r,
                targetC: target.c,

                merged: movement.merged
            });
        });
    }


    // 移動したか確認
    let moved = false;

    for(let r = 0; r < SIZE; r++){

        for(let c = 0; c < SIZE; c++){

            const beforeTile = before[r][c];
            const afterTile = newBoard[r][c];

            if(beforeTile === null && afterTile !== null){
                moved = true;
            }

            else if(beforeTile !== null && afterTile === null){
                moved = true;
            }

            else if(
                beforeTile !== null &&
                afterTile !== null
            ){

                if(
                    beforeTile.id !== afterTile.id ||
                    beforeTile.value !== afterTile.value
                ){
                    moved = true;
                }
            }
        }
    }


    // 動かなかった場合
    if(!moved){

        score = beforeScore;

        return;
    }


    // 履歴保存
    history.push({
        board: before,
        score: beforeScore,
        nextTileId: nextTileId
    });

    if(history.length > MAX_HISTORY){
        history.shift();
    }


    // スコア計算後の盤面
    board = newBoard;


    // 新しい2を追加
    const newTile =
        addRandomTile();


    // アニメーション
    animateMovement(
        before,
        allMovements,
        newTile
    );
}


// ====================
// 移動アニメーション
// ====================

function animateMovement(
before,
movements,
newTile
){

isAnimating = true;
// 最終盤面を表示
boardDiv.innerHTML = "";
// 移動するタイルのIDを取得
const movingIds = new Set();
movements.forEach(function(movement){
    movingIds.add(movement.id);
});
// 最終盤面
for(let r = 0; r < SIZE; r++){
    for(let c = 0; c < SIZE; c++){
        const tile =
            document.createElement("div");
        tile.className = "tile";
        const data = board[r][c];
        if(data !== null){

tile.textContent =
    data.value;
tile.classList.add(
    "n" + data.value
);
// 移動するタイルだけ隠す
// 新しく出る2はここでは隠さない
if(
    movingIds.has(data.id) &&
    (!newTile || data.id !== newTile.id)
){
    tile.classList.add("tile-hidden");
}

}
        boardDiv.appendChild(tile);
    }
}
// アニメーション用レイヤー
const movingLayer =
    document.createElement("div");
movingLayer.className = "moving-layer";
boardDiv.appendChild(movingLayer);
// 盤面サイズ
const boardWidth =
    boardDiv.clientWidth;
const padding = 10;
const gap = 10;
const cellSize =
    (
        boardWidth -
        padding * 2 -
        gap * 3
    ) / 4;
// 各タイルを移動
movements.forEach(function(movement){
    const tile =
        document.createElement("div");
    tile.className = "moving-tile";
    tile.textContent =
        movement.value;
    tile.classList.add(
        "n" + movement.value
    );
    // 移動前の位置
    const startX =
        padding +
        movement.fromC *
        (cellSize + gap);
    const startY =
        padding +
        movement.fromR *
        (cellSize + gap);
    // 移動後の位置
    const endX =
        padding +
        movement.targetC *
        (cellSize + gap);
    const endY =
        padding +
        movement.targetR *
        (cellSize + gap);
    tile.style.left =
        startX + "px";
    tile.style.top =
        startY + "px";
    movingLayer.appendChild(tile);
    // ブラウザに初期位置を確実に認識させる
    tile.getBoundingClientRect();
    // 次のフレームで移動
    requestAnimationFrame(function(){
        tile.style.transform =
            "translate(" +
            (endX - startX) +
            "px, " +
            (endY - startY) +
            "px)";
    });
});
// アニメーション終了
setTimeout(function(){

isAnimating = false;
drawBoard();

}, 180);
updateScore();

}


// ====================
// キーボード操作
// ====================

document.addEventListener(
    "keydown",
    function(e){

        switch(e.key){

            case "ArrowLeft":
                move("left");
                break;

            case "ArrowRight":
                move("right");
                break;

            case "ArrowUp":
                move("up");
                break;

            case "ArrowDown":
                move("down");
                break;
        }
    }
);


// ====================
// リスタート
// ====================

document
.getElementById("restart")
.addEventListener(
    "click",
    function(){

        if(isAnimating){
            return;
        }

        nextTileId = 1;

        initBoard();
    }
);


// ====================
// Undo
// ====================

document
.getElementById("undo")
.addEventListener(
    "click",
    undo
);


// ====================
// スマホスワイプ
// ====================

let touchStartX = 0;
let touchStartY = 0;


document.addEventListener(
    "touchstart",
    function(e){

        if(isAnimating){
            return;
        }

        touchStartX =
            e.changedTouches[0].screenX;

        touchStartY =
            e.changedTouches[0].screenY;

    },
    false
);


document.addEventListener(
    "touchend",
    function(e){

        if(isAnimating){
            return;
        }

        const touchEndX =
            e.changedTouches[0].screenX;

        const touchEndY =
            e.changedTouches[0].screenY;


        const diffX =
            touchEndX - touchStartX;

        const diffY =
            touchEndY - touchStartY;


        if(
            Math.abs(diffX) >
            Math.abs(diffY)
        ){

            if(diffX > 50){
                move("right");
            }

            else if(diffX < -50){
                move("left");
            }

        }else{

            if(diffY > 50){
                move("down");
            }

            else if(diffY < -50){
                move("up");
            }
        }

    },
    false
);


// ====================
// 開始
// ====================

initBoard();