/* =========================================================
   基本設定
========================================================= */

const COLS = 10;
const ROWS = 20;

/* =========================================================
   落下速度設定
========================================================= */

/*
 * 初期値
 *
 * 数字が大きいほど遅い
 *
 * 2000 = 2秒
 */

let dropSpeed = 2000;

/*
 * 長押し中の高速落下速度
 */

const FAST_DROP_SPEED = 80;

let normalDropSpeed = 2000;

let fastDropActive = false;

/* =========================================================
   ゲーム状態
========================================================= */

let board = [];

let score = 0;

let lines = 0;

let level = 1;

let gameOver = false;

let paused = false;

let dropTimer = null;

/*
 * =========================================================
 * ライン消去エフェクト・連鎖管理
 * =========================================================
 */

/*
 * ライン消去が連続した回数
 *
 * 例：
 * 1回目 → 1
 * 2回連続 → 2
 * 3回連続 → 3
 */
let clearChain = 0;


/*
 * ライン消去エフェクト処理中かどうか
 *
 * エフェクト中に次の操作が入らないようにする
 */
let clearEffectProcessing = false;

/* =========================================================
   現在のミノ
========================================================= */

let current = null;


/* 次のミノ */

let nextPiece = null;


/* =========================================================
   HOLD
========================================================= */

let holdPiece = null;

let holdUsed = false;


/* =========================================================
   一手戻す
========================================================= */

let history = [];

const MAX_HISTORY = 10;


/* =========================================================
   テトリミノ
========================================================= */

const PIECES = {

    I: {

        color: "I",

        shape: [

            [1,1,1,1]

        ]

    },


    O: {

        color: "O",

        shape: [

            [1,1],

            [1,1]

        ]

    },


    T: {

        color: "T",

        shape: [

            [0,1,0],

            [1,1,1]

        ]

    },


    S: {

        color: "S",

        shape: [

            [0,1,1],

            [1,1,0]

        ]

    },


    Z: {

        color: "Z",

        shape: [

            [1,1,0],

            [0,1,1]

        ]

    },


    J: {

        color: "J",

        shape: [

            [1,0,0],

            [1,1,1]

        ]

    },


    L: {

        color: "L",

        shape: [

            [0,0,1],

            [1,1,1]

        ]

    }

};


const PIECE_NAMES = [

    "I",
    "O",
    "T",
    "S",
    "Z",
    "J",
    "L"

];


/* =========================================================
   盤面作成
========================================================= */

function createBoard() {

    board = [];

    for (
        let y = 0;
        y < ROWS;
        y++
    ) {

        board[y] = [];

        for (
            let x = 0;
            x < COLS;
            x++
        ) {

            board[y][x] = null;

        }

    }

}


/* =========================================================
   盤面描画
========================================================= */

function drawBoard() {

    const boardElement =
        document.getElementById("board");


    if (!boardElement)
        return;


    /*
     * =====================================================
     * 通常の盤面描画を行う前に
     * 終了済みのラインエフェクトを解除
     *
     * これにより、
     *
     * ・固定ミノ
     * ・操作中のミノ
     * ・ゴーストミノ
     *
     * にエフェクトが残るのを防ぐ
     *
     * ※現在進行中のエフェクトについては
     *   clearLines()側で管理する
     * =====================================================
     */

    if (!clearEffectProcessing) {

        boardElement.classList.remove(
            "line-clear-effect",
            "combo-clear-effect",
            "chain-effect",
            "perfect-clear-effect"
        );


        boardElement
            .querySelectorAll(
                ".line-clear-row"
            )
            .forEach(
                element =>
                    element.remove()
            );


        delete boardElement.dataset.chain;
        delete boardElement.dataset.lines;

    }


        /*
     * =====================================================
     * 盤面セルを作成
     *
     * 200セルが存在しない場合は
     * 盤面を作り直す。
     * =====================================================
     */

    if (
        boardElement.children.length !==
        ROWS * COLS
    ) {

        boardElement.innerHTML = "";


        for (
            let y = 0;
            y < ROWS;
            y++
        ) {

            for (
                let x = 0;
                x < COLS;
                x++
            ) {

                const cell =
                    document.createElement("div");


                cell.className =
                    "cell";


                /*
                 * 背景を交互にする
                 */

                cell.classList.add(
                    x % 2 === 0
                        ? "even-column"
                        : "odd-column"
                );


                boardElement.appendChild(
                    cell
                );

            }

        }

    }


    /*
     * =====================================================
     * 既存セルの状態をリセット
     * =====================================================
     */

    const cells =
        boardElement.children;


    for (
        let i = 0;
        i < cells.length;
        i++
    ) {

        const cell =
            cells[i];


        /*
         * ghost以外の状態をリセット
         */

        cell.classList.remove(
            "filled",
            "ghost",
            "I",
            "O",
            "T",
            "S",
            "Z",
            "J",
            "L"
        );

    }


    /*
     * =====================================================
     * 固定ミノを描画
     * =====================================================
     */

    for (let y = 0; y < ROWS; y++) {

        for (let x = 0; x < COLS; x++) {

            const value =
                board[y][x];


            if (!value)
                continue;


            const index =
                y * COLS + x;


            const cell =
                cells[index];


            cell.classList.add(
                "filled"
            );


            cell.classList.add(
                value
            );

        }

    }


    /*
     * =====================================================
     * 現在のミノ＋ゴースト
     * =====================================================
     */

    drawCurrentPiece();

}


/* =========================================================
   現在のミノ描画
   ＋
   落下予測地点（ゴーストミノ）
========================================================= */

function drawCurrentPiece() {

    if (!current)
        return;


    const boardElement =
        document.getElementById("board");


    if (!boardElement)
        return;


    /*
     * =====================================================
     * まず落下予測地点を計算
     * =====================================================
     */

    let ghostY =
        current.y;


    while (
        !collision(
            current.x,
            ghostY + 1,
            current.shape
        )
    ) {

        ghostY++;

    }


    /*
     * =====================================================
     * 落下予測地点を描画
     * =====================================================
     */

    for (
        let y = 0;
        y < current.shape.length;
        y++
    ) {

        for (
            let x = 0;
            x < current.shape[y].length;
            x++
        ) {

            if (!current.shape[y][x])
                continue;


            const boardX =
                current.x + x;


            const boardY =
                ghostY + y;


            if (
                boardX >= 0 &&
                boardX < COLS &&
                boardY >= 0 &&
                boardY < ROWS
            ) {

                const index =
                    boardY * COLS +
                    boardX;


                const cell =
                    boardElement.children[index];


                if (!cell)
                    continue;


                /*
                 * 現在のミノと同じ場所なら
                 * ゴーストは表示しない
                 */

                if (
                    boardY >= current.y &&
                    boardY <
                        current.y +
                        current.shape.length &&
                    boardX >= current.x &&
                    boardX <
                        current.x +
                        current.shape[0].length
                ) {

                    /*
                     * 実際のミノを優先
                     */

                } else {

                    cell.classList.add("ghost");
                    cell.classList.add(current.color);

                }

            }

        }

    }


    /*
     * =====================================================
     * 現在操作中のミノを描画
     * =====================================================
     */

    for (
        let y = 0;
        y < current.shape.length;
        y++
    ) {

        for (
            let x = 0;
            x < current.shape[y].length;
            x++
        ) {

            if (!current.shape[y][x])
                continue;


            const boardX =
                current.x + x;


            const boardY =
                current.y + y;


            if (
                boardX >= 0 &&
                boardX < COLS &&
                boardY >= 0 &&
                boardY < ROWS
            ) {

                const index =
                    boardY * COLS +
                    boardX;


                const cell =
                    boardElement.children[index];


                if (!cell)
                    continue;


                cell.classList.remove(
                    "ghost"
                );


                cell.classList.add(
                    "filled"
                );


                cell.classList.add(
                    current.color
                );

            }

        }

    }

}


/* =========================================================
   ランダムなミノ
========================================================= */

function randomPiece() {

    const name =
        PIECE_NAMES[
            Math.floor(
                Math.random() *
                PIECE_NAMES.length
            )
        ];


    const data =
        PIECES[name];


    return {

        color: data.color,


        shape:
            data.shape.map(
                row => [...row]
            ),


        x:
            Math.floor(
                (
                    COLS -
                    data.shape[0].length
                ) / 2
            ),


        y: 0

    };

}


/* =========================================================
   ミノ生成
========================================================= */

function spawnPiece() {

    /*
     * NEXTを現在のミノにする
     */

    if (nextPiece) {

        current = {

            color:
                nextPiece.color,

            shape:
                nextPiece.shape.map(
                    row => [...row]
                ),

            x: 0,

            y: 0

        };

    } else {

        current =
            randomPiece();

    }


    /*
     * NEXTは必ず新しく作る
     */

    nextPiece =
        randomPiece();


    /*
     * 現在のミノを中央に配置
     */

    current.x =
        Math.floor(
            (
                COLS -
                current.shape[0].length
            ) / 2
        );


    current.y = 0;


    /*
     * NEXT表示を更新
     */

    drawNext();


    /*
     * ゲームオーバー判定
     */

    if (
        collision(
            current.x,
            current.y,
            current.shape
        )
    ) {

        endGame();

        return;

    }


    /*
     * =====================================================
     * 新しいミノが登場した状態を履歴に保存
     *
     * 「一手戻す」の基準点
     * =====================================================
     */

    saveHistory();


    /*
     * 盤面を更新
     */

    drawBoard();

}


/* =========================================================
   NEXT表示
========================================================= */

function drawPreview(containerId, piece) {

    const container =
        document.getElementById(containerId);

    if (!container)
        return;

    container.innerHTML = "";

    if (!piece)
        return;


    const shape = piece.shape;

    const pieceElement =
        document.createElement("div");

    pieceElement.className =
        "preview-piece";

    pieceElement.style.gridTemplateColumns =
        `repeat(${shape[0].length}, 14px)`;

    pieceElement.style.gridTemplateRows =
        `repeat(${shape.length}, 14px)`;


    for (
        let y = 0;
        y < shape.length;
        y++
    ) {

        for (
            let x = 0;
            x < shape[y].length;
            x++
        ) {

            if (!shape[y][x])
                continue;


            const block =
                document.createElement("div");

            block.className =
                "preview-block";

            block.classList.add(
                piece.color
            );


            /*
             * 重要
             *
             * 0のマスを飛ばしても
             * 本来の位置に表示する
             */

            block.style.gridColumn =
                String(x + 1);

            block.style.gridRow =
                String(y + 1);


            pieceElement.appendChild(
                block
            );

        }

    }


    container.appendChild(
        pieceElement
    );

}


/* =========================================================
   NEXT表示
========================================================= */

function drawNext() {

    drawPreview(
        "next",
        nextPiece
    );

}


/* =========================================================
   HOLD表示
========================================================= */

function drawHold() {

    drawPreview(
        "hold",
        holdPiece
    );

}

/* =========================================================
   HOLD
========================================================= */

function holdCurrentPiece() {

    if (
        gameOver ||
        clearEffectProcessing ||
        !current
    )
        return;


    /*
     * HOLDに何も入っていない場合
     */

    if (!holdPiece) {

    /*
     * 現在のミノをHOLDへ保存
     */

    holdPiece = {

        color:
            current.color,

        shape:
            current.shape.map(
                row => [...row]
            ),

        x: 0,

        y: 0

    };


    /*
     * NEXTを現在のミノにする
     */

    current = {

        color:
            nextPiece.color,

        shape:
            nextPiece.shape.map(
                row => [...row]
            ),

        x: 0,

        y: 0

    };


    /*
     * NEXTを新しく生成
     */

    nextPiece =
        randomPiece();

}


    /*
     * HOLDにすでにミノがある場合
     *
     * 現在のミノとHOLDを交換
     */

    else {

        const temp = {

            color:
                current.color,

            shape:
                current.shape.map(
                    row => [...row]
                ),

            x: 0,

            y: 0

        };


        current = {

            color:
                holdPiece.color,

            shape:
                holdPiece.shape.map(
                    row => [...row]
                ),

            x: 0,

            y: 0

        };


        holdPiece = temp;

    }


    /*
     * 現在のミノを中央に配置
     */

    current.x =
        Math.floor(
            (
                COLS -
                current.shape[0].length
            ) / 2
        );


    current.y = 0;


    /*
     * 画面更新
     */

    drawHold();

    drawNext();

    drawBoard();


    /*
     * 自動保存
     */

    saveGame();

}


/* =========================================================
   衝突判定
========================================================= */

function collision(
    x,
    y,
    shape
) {

    for (
        let sy = 0;
        sy < shape.length;
        sy++
    ) {

        for (
            let sx = 0;
            sx < shape[sy].length;
            sx++
        ) {

            if (!shape[sy][sx])
                continue;


            const boardX =
                x + sx;


            const boardY =
                y + sy;


            /*
             * 左右の壁
             */

            if (
                boardX < 0 ||
                boardX >= COLS
            ) {

                return true;

            }


            /*
             * 底
             */

            if (
                boardY >= ROWS
            ) {

                return true;

            }


            /*
             * 他のミノ
             */

            if (
                boardY >= 0 &&
                board[boardY][boardX]
            ) {

                return true;

            }

        }

    }


    return false;

}


/* =========================================================
   左右移動
========================================================= */

function moveHorizontal(
    direction
) {

    if (
        gameOver ||
        clearEffectProcessing ||
        !current
    )
        return;


    const newX =
        current.x +
        direction;


    if (
        !collision(
            newX,
            current.y,
            current.shape
        )
    ) {

        current.x =
            newX;


        drawBoard();


        /*
         * 現在のゲーム状態を自動保存
         *
         * ※一手戻す履歴には追加しない
         */

        saveGame();

    }

}


/* =========================================================
   下移動
========================================================= */

function moveDown() {

    if (
        gameOver ||
        clearEffectProcessing ||
        !current
    )
        return;


    if (
        !collision(
            current.x,
            current.y + 1,
            current.shape
        )
    ) {

        current.y++;


        drawBoard();


        saveGame();

    } else {

        lockPiece();

    }

}


/* =========================================================
   即着地
========================================================= */

function hardDrop() {

    if (
        gameOver ||
        clearEffectProcessing ||
        !current
    )
        return;


    while (
        !collision(
            current.x,
            current.y + 1,
            current.shape
        )
    ) {

        current.y++;

    }


    /*
     * 即座に固定
     */

    lockPiece();

}

/* =========================================================
   回転
   強力なねじ込み回転対応
========================================================= */

function rotatePiece() {

    if (
        gameOver ||
        clearEffectProcessing ||
        !current
    )
        return;


    /*
     * =====================================================
     * 現在の形を保存
     * =====================================================
     */

    const oldShape =
        current.shape;


    const height =
        oldShape.length;


    const width =
        oldShape[0].length;


    /*
     * =====================================================
     * 時計回りに90度回転
     * =====================================================
     */

    const newShape = [];


    for (
        let x = 0;
        x < width;
        x++
    ) {

        newShape[x] = [];


        for (
            let y = height - 1;
            y >= 0;
            y--
        ) {

            newShape[x].push(
                oldShape[y][x]
            );

        }

    }


    /*
     * =====================================================
     * 現在位置で回転できるなら
     * そのまま回転
     * =====================================================
     */

    if (
        !collision(
            current.x,
            current.y,
            newShape
        )
    ) {

        current.shape =
            newShape;


        drawBoard();

        saveGame();

        return;

    }


    /*
     * =====================================================
     * 強力なねじ込み回転
     *
     * 回転後の形が入る場所を
     * 現在位置の周囲から広範囲に探す。
     *
     * 最大4マスまで左右・上下に移動して確認。
     *
     * 「壁に近い」
     * 「床に近い」
     * 「ミノの隙間」
     *
     * などにもできるだけねじ込む。
     * =====================================================
     */

    const maxKick =
        4;


    const candidates = [];


    /*
     * =====================================================
     * 現在位置からの距離が近い順になるよう
     * 候補位置を作成
     *
     * まず近い場所を探し、
     * なければ遠い場所まで探す。
     * =====================================================
     */

    for (
        let distance = 1;
        distance <= maxKick;
        distance++
    ) {

        /*
         * 上下左右
         */

        const directions = [

            [0, -distance],

            [0, distance],

            [-distance, 0],

            [distance, 0]

        ];


        for (
            const offset of directions
        ) {

            candidates.push(
                offset
            );

        }


        /*
         * =================================================
         * 同じ距離の斜め方向も確認
         *
         * 例：
         *
         * 左上
         * 右上
         * 左下
         * 右下
         *
         * のような場所にもねじ込む。
         * =================================================
         */

        for (
            let dx = -distance;
            dx <= distance;
            dx++
        ) {

            for (
                let dy = -distance;
                dy <= distance;
                dy++
            ) {

                if (
                    dx === 0 ||
                    dy === 0
                )
                    continue;


                /*
                 * 現在の距離以内だけを追加
                 */

                if (
                    Math.max(
                        Math.abs(dx),
                        Math.abs(dy)
                    ) !== distance
                )
                    continue;


                candidates.push([
                    dx,
                    dy
                ]);

            }

        }

    }


    /*
     * =====================================================
     * 回転できる場所を探す
     * =====================================================
     */

    for (
        const offset of candidates
    ) {

        const newX =
            current.x +
            offset[0];


        const newY =
            current.y +
            offset[1];


        /*
         * 回転後の形が
         * その場所に完全に入るか確認
         */

        if (
            !collision(
                newX,
                newY,
                newShape
            )
        ) {

            /*
             * 位置を変更
             */

            current.x =
                newX;


            current.y =
                newY;


            /*
             * 回転後の形を適用
             */

            current.shape =
                newShape;


            /*
             * 画面更新
             */

            drawBoard();


            /*
             * 自動保存
             */

            saveGame();


            return;

        }

    }


    /*
     * =====================================================
     * ここまで来た場合
     *
     * 最大4マスの範囲内では
     * 回転後の形が入る場所がない。
     *
     * この場合は回転しない。
     * =====================================================
     */

}


/* =========================================================
   ミノ固定
========================================================= */

async function lockPiece() {

    /*
     * エフェクト処理中なら何もしない
     */

    if (clearEffectProcessing)
        return;


    /*
     * 現在のミノが存在しない場合
     */

    if (!current)
        return;


    /*
     * =====================================================
     * ミノを盤面へ固定
     * =====================================================
     */

    for (
        let y = 0;
        y < current.shape.length;
        y++
    ) {

        for (
            let x = 0;
            x < current.shape[y].length;
            x++
        ) {

            if (!current.shape[y][x])
                continue;


            const boardX =
                current.x + x;


            const boardY =
                current.y + y;


            if (
                boardX >= 0 &&
                boardX < COLS &&
                boardY >= 0 &&
                boardY < ROWS
            ) {

                board[boardY][boardX] =
                    current.color;

            }

        }

    }


    /*
     * =====================================================
     * 現在操作中のミノを消す
     * =====================================================
     */

    current = null;


    /*
     * 固定された盤面を表示
     */

    drawBoard();


    /*
     * =====================================================
     * ライン消去
     *
     * ラインが揃っていれば
     *
     * エフェクト
     * ↓
     * ライン消去
     * ↓
     * 盤面を詰める
     *
     * まで完了する。
     *
     * ラインがなければ
     * そのまま0が返る。
     * =====================================================
     */

    const cleared =
        await clearLines();


    /*
     * =====================================================
     * 次のミノを出す
     *
     * ライン消去エフェクトがある場合は
     * clearLines()のawaitが終わってから
     * 次のミノが登場する。
     * =====================================================
     */

    if (!gameOver) {

        spawnPiece();

        drawHold();

        drawNext();


        /*
         * 自動保存
         */

        saveGame();

    }

}


/* =========================================================
   ライン消去
   複数ラインは1本ずつ
   「エフェクト → 消去 → 盤面を詰める」
   の順番でテンポよく処理
========================================================= */

async function clearLines() {

    /*
     * =====================================================
     * まず、今回何ライン消えるかを確認
     *
     * ここではまだ消さない
     * =====================================================
     */

    const initialClearedRows = [];

    for (let y = ROWS - 1; y >= 0; y--) {

        let full = true;

        for (let x = 0; x < COLS; x++) {

            if (!board[y][x]) {

                full = false;
                break;

            }

        }

        if (full) {

            initialClearedRows.push(y);

        }

    }


    /*
     * =====================================================
     * ラインがない
     * =====================================================
     */

    if (initialClearedRows.length === 0) {

        clearChain = 0;

        return 0;

    }


    /*
     * =====================================================
     * 連鎖数を増やす
     * =====================================================
     */

    clearChain++;


    /*
     * =====================================================
     * ライン消去処理中
     *
     * エフェクト中の操作を禁止
     * =====================================================
     */

    clearEffectProcessing = true;


    /*
     * =====================================================
     * 今回消えるライン数
     * =====================================================
     */

    const clearCount =
        initialClearedRows.length;


    /*
     * =====================================================
     * 1ラインずつ高速処理
     *
     * エフェクト
     * ↓
     * 消去
     * ↓
     * 盤面を詰める
     * ↓
     * 次のライン
     *
     * 約2倍のテンポで処理
     * =====================================================
     */

    for (
        let i = 0;
        i < clearCount;
        i++
    ) {

        /*
         * =================================================
         * 現在の盤面から
         * 一番下にある完成ラインを探す
         * =================================================
         */

        let targetRow = -1;


        for (
            let y = ROWS - 1;
            y >= 0;
            y--
        ) {

            let full = true;

            for (
                let x = 0;
                x < COLS;
                x++
            ) {

                if (!board[y][x]) {

                    full = false;
                    break;

                }

            }


            if (full) {

                targetRow = y;

                break;

            }

        }


        /*
         * 念のため
         */

        if (targetRow === -1) {
            break;
        }


        /*
         * =================================================
         * 1ライン分のエフェクト
         *
         * 約2倍のスピード
         * =================================================
         */

        await showSingleLineClearEffect(
            targetRow,
            clearChain,
            i + 1,
            clearCount
        );


        /*
         * =================================================
         * エフェクト後にラインを削除
         * =================================================
         */

        board.splice(
            targetRow,
            1
        );


        /*
         * =================================================
         * 上に空行を1つ追加
         * =================================================
         */

        board.unshift(
            new Array(COLS).fill(null)
        );


        /*
         * =================================================
         * ライン消去直後の盤面を表示
         * =================================================
         */

        drawBoard();


        /*
         * =================================================
         * 次のラインまでの間隔
         *
         * 90ms → 45ms
         *
         * 約2倍のテンポ
         * =================================================
         */

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    45
                )
        );

    }


    /*
     * =====================================================
     * 消去ライン数
     * =====================================================
     */

    const cleared =
        clearCount;


    /*
     * =====================================================
     * スコア
     * =====================================================
     */

    lines += cleared;


    const scores = [
        0,
        100,
        300,
        500,
        800
    ];


    score +=
        scores[cleared] *
        level;


    /*
     * =====================================================
     * レベル
     * =====================================================
     */

    level =
        Math.floor(
            lines / 10
        ) + 1;


    updateInfo();


    /*
     * =====================================================
     * 全消し判定
     * =====================================================
     */

    let boardEmpty = true;


    for (
        let y = 0;
        y < ROWS;
        y++
    ) {

        for (
            let x = 0;
            x < COLS;
            x++
        ) {

            if (board[y][x]) {

                boardEmpty = false;
                break;

            }

        }


        if (!boardEmpty)
            break;

    }


    /*
     * =====================================================
     * 全消し
     * =====================================================
     */

    if (boardEmpty) {

        playPerfectClearEffect(
            clearChain
        );


        /*
         * 全消し演出も少し短縮
         *
         * 500ms → 300ms
         */

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    300
                )
        );

    }


        /*
     * =====================================================
     * エフェクト終了
     * =====================================================
     *
     * ここで盤面全体に残っている
     * エフェクト用クラスをすべて解除する。
     *
     * これを最後にも行うことで、
     * 複数ライン消去時にも
     * 光が残ることを防ぐ。
     */

    const boardElement =
        document.getElementById("board");


    if (boardElement) {

        /*
         * 盤面全体のエフェクトを解除
         */

        boardElement.classList.remove(
            "line-clear-effect",
            "combo-clear-effect",
            "chain-effect",
            "perfect-clear-effect"
        );


        /*
         * ラインそのもののエフェクトも
         * 念のためすべて削除
         */

        boardElement
            .querySelectorAll(
                ".line-clear-row"
            )
            .forEach(
                element =>
                    element.remove()
            );


        /*
         * エフェクト用データを解除
         */

        delete boardElement.dataset.chain;
        delete boardElement.dataset.lines;

    }


    /*
     * エフェクト処理終了
     */

    clearEffectProcessing = false;


    /*
     * =====================================================
     * 通常状態の盤面を完全に再描画
     *
     * 固定ミノ
     * 操作中のミノ
     * ゴーストミノ
     *
     * を通常表示へ戻す
     * =====================================================
     */

    drawBoard();


    /*
     * 自動保存
     */

    saveGame();


    return cleared;

}

/* =========================================================
   1ライン消去エフェクト

   高速化版

   エフェクト開始
   ↓
   光る
   ↓
   光り終わる
   ↓
   エフェクト削除
   ↓
   ライン消去
========================================================= */

async function showSingleLineClearEffect(
    row,
    chain,
    clearNumber,
    totalClearCount
) {

    const boardElement =
        document.getElementById("board");


    if (!boardElement)
        return;


    /*
     * =====================================================
     * エフェクトの長さ
     *
     * 170msの高速エフェクト
     * =====================================================
     */

    const effectDuration =
        170;


    /*
     * =====================================================
     * エフェクト開始前に
     * 前回のエフェクトを完全にリセット
     * =====================================================
     */

    boardElement.classList.remove(
        "line-clear-effect",
        "combo-clear-effect",
        "perfect-clear-effect",
        "chain-effect"
    );


    /*
     * 盤面に残っている
     * ラインエフェクト用要素を削除
     */

    boardElement
        .querySelectorAll(
            ".line-clear-row"
        )
        .forEach(
            element =>
                element.remove()
        );


    /*
     * =====================================================
     * CSSアニメーションを再スタート
     * =====================================================
     */

    void boardElement.offsetWidth;


    /*
     * =====================================================
     * 連鎖情報
     * =====================================================
     */

    const chainLevel =
        Math.min(
            chain,
            5
        );


    boardElement.dataset.chain =
        chainLevel;


    boardElement.dataset.lines =
        totalClearCount;


    /*
     * =====================================================
     * 盤面全体のエフェクト
     * =====================================================
     */

    if (
        clearNumber === 1 &&
        totalClearCount === 1
    ) {

        /*
         * 1ライン消去
         */

        boardElement.classList.add(
            "line-clear-effect"
        );

    }


    else if (
        totalClearCount > 1
    ) {

        /*
         * 複数ライン消去
         */

        boardElement.classList.add(
            "combo-clear-effect"
        );

    }


    /*
     * =====================================================
     * 2ライン目以降
     *
     * 連続消去エフェクト
     * =====================================================
     */

    if (
        clearNumber >= 2
    ) {

        boardElement.classList.add(
            "chain-effect"
        );

    }


    /*
     * =====================================================
     * ラインそのものの光
     * =====================================================
     */

    const rowElement =
        document.createElement("div");


    rowElement.className =
        "line-clear-row";


    /*
     * ラインの位置
     */

    rowElement.style.top =
        (
            row / ROWS * 100
        ) + "%";


    rowElement.style.height =
        (
            100 / ROWS
        ) + "%";


    /*
     * =====================================================
     * ラインエフェクト自身の
     * アニメーション速度
     * =====================================================
     */

    rowElement.style.animationDuration =
        effectDuration + "ms";


    /*
     * =====================================================
     * 連鎖情報
     * =====================================================
     */

    rowElement.dataset.chain =
        chainLevel;


    rowElement.dataset.lines =
        totalClearCount;


    rowElement.dataset.clearNumber =
        clearNumber;


    /*
     * 盤面へ追加
     */

    boardElement.appendChild(
        rowElement
    );


    /*
     * =====================================================
     * 効果音
     * =====================================================
     */

    playClearSound(
        clearNumber,
        chain
    );


    /*
     * =====================================================
     * エフェクトが完全に終わるまで待つ
     * =====================================================
     */

    await new Promise(
        resolve =>
            setTimeout(
                resolve,
                effectDuration
            )
    );


    /*
     * =====================================================
     * ラインエフェクトを削除
     * =====================================================
     */

    rowElement.remove();


    /*
     * =====================================================
     * 盤面側のエフェクトを解除
     * =====================================================
     */

    boardElement.classList.remove(
        "line-clear-effect",
        "combo-clear-effect",
        "chain-effect"
    );


    /*
     * =====================================================
     * エフェクト用データを解除
     * =====================================================
     */

    delete boardElement.dataset.chain;
    delete boardElement.dataset.lines;


    /*
     * =====================================================
     * 盤面を通常表示へ戻す
     *
     * 固定ミノ
     * ゴーストミノ
     * 操作中のミノ
     *
     * を再描画
     * =====================================================
     */

    drawBoard();


    /*
     * =====================================================
     * 次のラインまで少しだけ待つ
     * =====================================================
     */

    await new Promise(
        resolve =>
            setTimeout(
                resolve,
                10
            )
    );

}


/* =========================================================
   情報更新
========================================================= */

function updateInfo() {

    document.getElementById(
        "score"
    ).textContent =
        score;


    document.getElementById(
        "level"
    ).textContent =
        level;


    document.getElementById(
        "lines"
    ).textContent =
        lines;

}


/* =========================================================
   落下速度
========================================================= */

function getDropSpeed() {

    return dropSpeed;

}


/* =========================================================
   タイマー
========================================================= */

function restartTimer() {

    clearInterval(
        dropTimer
    );


    /*
     * ゲームオーバー中は落下させない
     */

    if (gameOver) {

        dropTimer = null;

        return;

    }


    /*
     * 一時停止中は
     * 自動落下だけ停止する
     *
     * 操作自体は禁止しない
     */

    if (paused) {

        dropTimer = null;

        return;

    }


    /*
     * 通常時は自動落下
     */

    dropTimer =
        setInterval(
            moveDown,
            getDropSpeed()
        );

}


/* =========================================================
   一手戻す用の履歴保存
========================================================= */

/*
 * 「一手」とは
 *
 * 現在のミノが設置されること
 *
 * とする。
 *
 * そのため、ミノが登場した時点の状態を保存する。
 */

function saveHistory() {

    history.push({

        /*
         * 設置される前の盤面
         */

        board:
            board.map(
                row => [...row]
            ),


        /*
         * スコア
         */

        score:
            score,


        /*
         * ライン数
         */

        lines:
            lines,


        /*
         * レベル
         */

        level:
            level,


        /*
         * 今から操作するミノ
         */

        current:
            current
                ? {

                    color:
                        current.color,

                    shape:
                        current.shape.map(
                            row => [...row]
                        ),

                    x:
                        current.x,

                    y:
                        current.y

                }
                : null,


        /*
         * NEXT
         */

        nextPiece:
            nextPiece
                ? {

                    color:
                        nextPiece.color,

                    shape:
                        nextPiece.shape.map(
                            row => [...row
                            ]
                        ),

                    x:
                        nextPiece.x,

                    y:
                        nextPiece.y

                }
                : null,


        /*
         * HOLD
         */

        holdPiece:
            holdPiece
                ? {

                    color:
                        holdPiece.color,

                    shape:
                        holdPiece.shape.map(
                            row => [...row]
                        ),

                    x:
                        holdPiece.x,

                    y:
                        holdPiece.y

                }
                : null,


        holdUsed:
            holdUsed

    });


    /*
     * 今回は1手だけ保存
     */

    if (
        history.length >
        MAX_HISTORY
    ) {

        history.shift();

    }

}


/* =========================================================
   一手戻す
========================================================= */

function undoMove() {

    if (gameOver)
        return;


    /*
     * 履歴がない場合
     */

    if (history.length === 0)
        return;


    /*
     * 現在の状態を履歴から取り除く
     *
     * 最後に保存された状態は
     * 現在操作中のミノが登場した状態
     */

    if (history.length > 1) {

        history.pop();

    }


    /*
     * 1つ前の状態を取得
     */

    const state =
        history[
            history.length - 1
        ];


    if (!state)
        return;


    /*
     * 盤面復元
     */

    board =
        state.board.map(
            row => [...row]
        );


    /*
     * スコア復元
     */

    score =
        state.score;


    /*
     * ライン数復元
     */

    lines =
        state.lines;


    /*
     * レベル復元
     */

    level =
        state.level;


    /*
     * 現在ミノ復元
     */

    current =
        state.current
            ? {

                color:
                    state.current.color,

                shape:
                    state.current.shape.map(
                        row => [...row]
                    ),

                x:
                    state.current.x,

                y:
                    state.current.y

            }
            : null;


    /*
     * NEXT復元
     */

    nextPiece =
        state.nextPiece
            ? {

                color:
                    state.nextPiece.color,

                shape:
                    state.nextPiece.shape.map(
                        row => [...row]
                    ),

                x:
                    state.nextPiece.x,

                y:
                    state.nextPiece.y

            }
            : null;


    /*
     * HOLD復元
     */

    holdPiece =
        state.holdPiece
            ? {

                color:
                    state.holdPiece.color,

                shape:
                    state.holdPiece.shape.map(
                        row => [...row]
                    ),

                x:
                    state.holdPiece.x,

                y:
                    state.holdPiece.y

            }
            : null;


    /*
     * HOLD状態
     */

    holdUsed =
        state.holdUsed || false;


    /*
     * 画面更新
     */

    updateInfo();

    drawBoard();

    drawHold();

    drawNext();


    /*
     * タイマー再開
     */

    restartTimer();


    /*
     * 自動保存
     */

    saveGame();

}

/* =========================================================
   自動保存
========================================================= */

const SAVE_KEY =
    "tetris_auto_save";


function saveGame() {

    try {

        const saveData = {

            board:
                board.map(
                    row => [...row]
                ),


            score:
                score,


            lines:
                lines,


            level:
                level,


            gameOver:
                gameOver,


            paused:
                paused,


            dropSpeed:
                dropSpeed,


            current:
                current
                    ? {

                        color:
                            current.color,

                        shape:
                            current.shape.map(
                                row => [...row]
                            ),

                        x:
                            current.x,

                        y:
                            current.y

                    }
                    : null,


            nextPiece:
                nextPiece
                    ? {

                        color:
                            nextPiece.color,

                        shape:
                            nextPiece.shape.map(
                                row => [...row]
                            ),

                        x:
                            nextPiece.x,

                        y:
                            nextPiece.y

                    }
                    : null,


            holdPiece:
                holdPiece
                    ? {

                        color:
                            holdPiece.color,

                        shape:
                            holdPiece.shape.map(
                                row => [...row]
                            ),

                        x:
                            holdPiece.x,

                        y:
                            holdPiece.y

                    }
                    : null,


            holdUsed:
                holdUsed,


            history:
                history.map(
                    state => ({

                        board:
                            state.board.map(
                                row => [...row]
                            ),

                        score:
                            state.score,

                        lines:
                            state.lines,

                        level:
                            state.level,

                        current:
                            state.current
                                ? {

                                    color:
                                        state.current.color,

                                    shape:
                                        state.current.shape.map(
                                            row => [...row]
                                        ),

                                    x:
                                        state.current.x,

                                    y:
                                        state.current.y

                                }
                                : null,

                        nextPiece:
                            state.nextPiece
                                ? {

                                    color:
                                        state.nextPiece.color,

                                    shape:
                                        state.nextPiece.shape.map(
                                            row => [...row]
                                        ),

                                    x:
                                        state.nextPiece.x,

                                    y:
                                        state.nextPiece.y

                                }
                                : null,

                        holdPiece:
                            state.holdPiece
                                ? {

                                    color:
                                        state.holdPiece.color,

                                    shape:
                                        state.holdPiece.shape.map(
                                            row => [...row]
                                        ),

                                    x:
                                        state.holdPiece.x,

                                    y:
                                        state.holdPiece.y

                                }
                                : null,

                        holdUsed:
                            state.holdUsed

                    })
                )

        };


        localStorage.setItem(
            SAVE_KEY,
            JSON.stringify(saveData)
        );

    } catch (error) {

        console.error(
            "自動保存に失敗しました:",
            error
        );

    }

}

/* =========================================================
   自動保存データ読み込み
========================================================= */

function loadGame() {

    try {

        const saved =
            localStorage.getItem(
                SAVE_KEY
            );


        if (!saved)
            return false;


        const data =
            JSON.parse(saved);


        if (
            !data ||
            !data.board ||
            !data.current
        ) {

            return false;

        }


        board =
            data.board.map(
                row => [...row]
            );


        score =
            data.score || 0;


        lines =
            data.lines || 0;


        level =
            data.level || 1;


        gameOver =
            data.gameOver || false;


        paused =
            data.paused || false;


        dropSpeed =
            data.dropSpeed || 2000;


        current =
            data.current
                ? {

                    color:
                        data.current.color,

                    shape:
                        data.current.shape.map(
                            row => [...row]
                        ),

                    x:
                        data.current.x,

                    y:
                        data.current.y

                }
                : null;


        nextPiece =
            data.nextPiece
                ? {

                    color:
                        data.nextPiece.color,

                    shape:
                        data.nextPiece.shape.map(
                            row => [...row]
                        ),

                    x:
                        data.nextPiece.x,

                    y:
                        data.nextPiece.y

                }
                : null;


        holdPiece =
            data.holdPiece
                ? {

                    color:
                        data.holdPiece.color,

                    shape:
                        data.holdPiece.shape.map(
                            row => [...row]
                        ),

                    x:
                        data.holdPiece.x,

                    y:
                        data.holdPiece.y

                }
                : null;


        holdUsed =
            data.holdUsed || false;


        history =
            Array.isArray(data.history)
                ? data.history
                : [];


        /*
         * 画面更新
         */

        updateInfo();

        drawBoard();

        drawHold();

        drawNext();


        /*
         * スライダーの表示も復元
         */

        const slider =
            document.getElementById(
                "speed-slider"
            );

        const value =
            document.getElementById(
                "speed-value"
            );


        if (slider) {

            slider.value =
                dropSpeed;

        }


        if (value) {

            value.textContent =
                dropSpeed + " ms";

        }


        /*
         * 一時停止ボタンの表示
         */

        const pauseButton =
            document.getElementById(
                "pause"
            );


        if (pauseButton) {

            pauseButton.textContent =
                paused
                    ? "▶"
                    : "Ⅱ";

        }


        /*
         * ゲームオーバーなら
         * ゲームオーバー画面も復元
         */

        if (gameOver) {

            document.getElementById(
                "final-score-number"
            ).textContent =
                score;


            document.getElementById(
                "game-over"
            ).style.display =
                "flex";

        }


        restartTimer();


        return true;


    } catch (error) {

        console.error(
            "自動保存データの読み込みに失敗しました:",
            error
        );


        return false;

    }

}

/* =========================================================
   ゲームオーバー
========================================================= */

function endGame() {

    gameOver = true;


    clearInterval(
        dropTimer
    );


    document.getElementById(
        "final-score-number"
    ).textContent =
        score;


    document.getElementById(
        "game-over"
    ).style.display =
        "flex";

}


/* =========================================================
   一時停止
========================================================= */

function togglePause() {

    if (gameOver)
        return;


    /*
     * 一時停止状態を切り替える
     */

    paused =
        !paused;


    /*
     * ボタン表示
     */

    const button =
        document.getElementById(
            "pause"
        );


    if (button) {

        button.textContent =
            paused
                ? "▶"
                : "Ⅱ";

    }


    /*
     * 一時停止中なら
     * 自動落下タイマーだけ停止
     *
     * 再開したらタイマー再開
     */

    restartTimer();


    /*
     * 自動保存
     */

    saveGame();

}


/* =========================================================
   ゲーム開始
========================================================= */

function startGame() {

    /*
     * 既存のタイマーを停止
     */

    clearInterval(
        dropTimer
    );


    dropTimer = null;


    /*
     * 盤面を新しく作る
     */

    createBoard();


    /*
     * ゲーム情報をリセット
     */

    score = 0;

    lines = 0;

    level = 1;


    /*
     * ゲーム状態
     */

    gameOver = false;

    paused = false;


    /*
     * HOLDをリセット
     */

    holdPiece = null;

    holdUsed = false;


    /*
     * 履歴をリセット
     */

    history = [];


    /*
     * NEXTを作る
     */

    nextPiece =
        randomPiece();


        /*
     * 最初のミノを出す
     */

    spawnPiece();


    /*
     * 盤面と現在のミノを確実に描画
     */

    drawBoard();


    /*
     * 情報を更新
     */

    updateInfo();


    /*
     * HOLD / NEXTを描画
     */

    drawHold();

    drawNext();


    /*
     * 一時停止ボタンを初期状態へ戻す
     */

    const pauseButton =
        document.getElementById(
            "pause"
        );


    if (pauseButton) {

        pauseButton.textContent =
            "Ⅱ";

    }


    /*
     * 自動落下開始
     */

    restartTimer();


    /*
     * 自動保存
     */

    saveGame();

}


/* =========================================================
   PCキーボード操作
========================================================= */

document.addEventListener(
    "keydown",
    function(event) {

        if (gameOver)
            return;


        /*
         * 左
         */

        if (
            event.key ===
            "ArrowLeft"
        ) {

            event.preventDefault();

            moveHorizontal(-1);

        }


        /*
         * 右
         */

        else if (
            event.key ===
            "ArrowRight"
        ) {

            event.preventDefault();

            moveHorizontal(1);

        }


        /*
         * 下
         */

        else if (
            event.key ===
            "ArrowDown"
        ) {

            event.preventDefault();

            moveDown();

        }


        /*
         * 回転
         */

        else if (
            event.key ===
            "ArrowUp"
        ) {

            event.preventDefault();

            rotatePiece();

        }


        /*
         * Space
         *
         * 一気に落とす機能を廃止
         *
         * Space = 一時停止
         */

        else if (
            event.code ===
            "Space"
        ) {

            event.preventDefault();

            togglePause();

        }


        /*
         * Z
         *
         * 一手戻す
         */

        else if (
            event.key.toLowerCase() ===
            "z"
        ) {

            event.preventDefault();

            undoMove();

        }


        /*
         * C
         *
         * HOLD
         */

        else if (
            event.key.toLowerCase() ===
            "c"
        ) {

            event.preventDefault();

            holdCurrentPiece();

        }


        /*
         * R
         *
         * リスタート
         */

        else if (
            event.key.toLowerCase() ===
            "r"
        ) {

            event.preventDefault();

            startGame();

        }

    }
);

/* =========================================================
   スマホ：HOLD表示枠をタップ
========================================================= */

const holdElement =
    document.getElementById("hold");


if (holdElement) {

    holdElement.addEventListener(
        "pointerdown",
        function(event) {

            event.preventDefault();

            /*
             * HOLD表示枠をタップしたら
             * HOLD操作
             */

            holdCurrentPiece();

        }
    );

}

/* =========================================================
   スマホ：一手戻す
========================================================= */

document.getElementById("undo")
    .addEventListener(
        "pointerdown",
        function(event) {

            event.preventDefault();

            undoMove();

        }
    );


/* =========================================================
   スマホ：一時停止
========================================================= */

document.getElementById("pause")
    .addEventListener(
        "pointerdown",
        function(event) {

            event.preventDefault();

            togglePause();

        }
    );

/* =========================================================
   スマホ：スワイプ操作
   指を画面につけたまま左右移動
========================================================= */

const boardElement =
    document.getElementById("board");


let touchStartX = 0;
let touchStartY = 0;


/*
 * 前回ミノを移動した位置
 *
 * 指を動かしている途中で
 * どこまで移動したかを記録する
 */

let lastMoveX = 0;


/*
 * 横方向の1マス移動に必要な距離
 * スワイプによる横移動距離調節
 * 小さくすると細かく移動しやすくなる
 */

const swipeDistance = 25;


/*
 * 指を盤面につけたとき
 */

boardElement.addEventListener(
    "pointerdown",
    function(event) {

        if (gameOver)
            return;


        /*
         * スマホの指操作を優先
         */

        event.preventDefault();


        touchStartX =
            event.clientX;


        touchStartY =
            event.clientY;


        /*
         * 移動距離の基準位置
         */

        lastMoveX =
            event.clientX;


        /*
         * 指を離すまで
         * この要素で操作を受け取る
         */

        if (
            boardElement.setPointerCapture
        ) {

            boardElement.setPointerCapture(
                event.pointerId
            );

        }

    }
);


/*
 * 指をつけたまま動かしている間
 */

boardElement.addEventListener(
    "pointermove",
    function(event) {

        if (gameOver)
            return;


        /*
         * =====================================================
         * 指を画面につけたまま
         * 横方向へ動かした距離
         * =====================================================
         */

        const dx =
            event.clientX -
            lastMoveX;


        const absX =
            Math.abs(dx);


        /*
         * 縦方向に動かした距離
         */

        const totalDy =
            Math.abs(
                event.clientY -
                touchStartY
            );


        /*
         * =====================================================
         * スワイプ判定
         *
         * 横方向へ一定以上動いた場合、
         * これは長押しではなくスワイプ操作と判断する。
         *
         * その時点で長押し判定タイマーをキャンセルする。
         * =====================================================
         */

        const totalDx =
            Math.abs(
                event.clientX -
                touchStartX
            );


        if (
            totalDx >= swipeDistance &&
            totalDx > totalDy
        ) {

            /*
             * 長押し判定をキャンセル
             */

            clearTimeout(
                boardLongPressTimer
            );


            boardLongPressTimer =
                null;


            /*
             * 万が一高速落下が開始していた場合も
             * スワイプ操作へ切り替える。
             */

            if (fastDropActive) {

                stopBoardLongPress();

            }

        }


        /*
         * =====================================================
         * 横移動
         *
         * 25px動くごとに1マス
         * =====================================================
         */

        if (
            absX >= swipeDistance &&
            absX > totalDy
        ) {

            const moveCount =
                Math.floor(
                    absX /
                    swipeDistance
                );


            /*
             * 左へ
             */

            if (dx < 0) {

                for (
                    let i = 0;
                    i < moveCount;
                    i++
                ) {

                    moveHorizontal(-1);

                }

            }


            /*
             * 右へ
             */

            else {

                for (
                    let i = 0;
                    i < moveCount;
                    i++
                ) {

                    moveHorizontal(1);

                }

            }


            /*
             * =================================================
             * 今回移動した分だけ
             * 基準位置を進める
             *
             * これにより
             * 指をつけたまま
             * さらに移動できる
             * =================================================
             */

            const usedDistance =
                moveCount *
                swipeDistance;


            if (dx < 0) {

                lastMoveX -=
                    usedDistance;

            } else {

                lastMoveX +=
                    usedDistance;

            }

        }

    }
);


/*
 * 指を離したとき
 */

boardElement.addEventListener(
    "pointerup",
    function(event) {

        if (gameOver)
            return;


        event.preventDefault();


        const dx =
            event.clientX -
            touchStartX;


        const dy =
            event.clientY -
            touchStartY;


        const absX =
            Math.abs(dx);


        const absY =
            Math.abs(dy);

            /*
             * 大きく下へスワイプ
             *
             * → 即着地
             */

const hardDropDistance = 100;


if (
    dy >= hardDropDistance &&
    absY > absX
) {

    hardDrop();

    return;

}

        /*
         * 指をほとんど動かさなかった場合
         *
         * → タップとして回転
         */

        const tapDistance = 15;


        if (
            absX < tapDistance &&
            absY < tapDistance
        ) {

            rotatePiece();

        }

    }
);


/*
 * 指をキャンセルした場合
 */

boardElement.addEventListener(
    "pointercancel",
    function(event) {

        if (
            boardElement.releasePointerCapture
        ) {

            try {

                boardElement.releasePointerCapture(
                    event.pointerId
                );

            } catch (error) {

                /*
                 * 何もしない
                 */

            }

        }

    }
);

/* =========================================================
   落下速度スライダー
========================================================= */

const speedSlider =
    document.getElementById(
        "speed-slider"
    );

const speedValue =
    document.getElementById(
        "speed-value"
    );


speedSlider.addEventListener(
    "input",
    function() {

        /*
         * スライダーの値を取得
         */

        dropSpeed =
            Number(
                speedSlider.value
            );


        /*
         * 画面表示
         */

        speedValue.textContent =
            dropSpeed + " ms";


        /*
         * ゲーム中なら
         * 新しい速度をすぐ反映
         */

        if (!gameOver) {

    restartTimer();

}

saveGame();

    }
);



/* =========================================================
   スマホ：リスタート
========================================================= */

document.getElementById("restart-mobile")
    .addEventListener(
        "pointerdown",
        function(event) {

            event.preventDefault();

            startGame();

        }
    );


/* =========================================================
   ゲームオーバー後のリスタート
========================================================= */

document.getElementById(
    "game-over-restart"
)
.addEventListener(
    "click",
    function() {

        document.getElementById(
            "game-over"
        ).style.display =
            "none";


        startGame();

    }
);

/* =========================================================
   ゲーム開始
========================================================= */

if (!loadGame()) {

    startGame();

}

/* =========================================================
   定期自動保存
========================================================= */

setInterval(
    function() {

        if (!gameOver) {

            saveGame();

        }

    },
    1000
);

/* =========================================================
   ライン消去・全消しエフェクト
========================================================= */

let effectAudioContext = null;


/*
 * 効果音用AudioContext
 */

function getAudioContext() {

    if (!effectAudioContext) {

        effectAudioContext =
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();

    }

    if (
        effectAudioContext.state ===
        "suspended"
    ) {

        effectAudioContext.resume();

    }

    return effectAudioContext;

}


/*
 * 効果音を鳴らす
 *
 * type
 * 1 = 通常ライン
 * 2 = 複数ライン
 * 3 = 全消し
 */

/* =========================================================
   キラキラ系ライン消去効果音
========================================================= */

function playClearSound(
    lineCount,
    chain
) {

    try {

        const ctx =
            getAudioContext();


        const now =
            ctx.currentTime;


        /*
         * ライン数＋連鎖数で
         * 音の高さを上げる
         */

        const lineBonus =
            (lineCount - 1) * 2;


        const chainBonus =
            Math.min(chain - 1, 5) * 2;


        /*
         * 基本音階
         *
         * 上に行くほど
         * 「キラキラ・盛り上がる」
         */

        const notes = [

            880,
            1046,
            1174,
            1318,
            1568,
            1760

        ];


        const noteCount =
            Math.min(
                3 + lineCount + chainBonus,
                notes.length
            );


        for (
            let i = 0;
            i < noteCount;
            i++
        ) {

            const frequency =
                notes[
                    Math.min(
                        i + lineBonus,
                        notes.length - 1
                    )
                ];


            const startTime =
                now +
                i * 0.055;


            /*
             * メイン音
             */

            const osc =
                ctx.createOscillator();


            const gain =
                ctx.createGain();


            osc.type =
                "sine";


            osc.frequency.setValueAtTime(
                frequency,
                startTime
            );


            osc.frequency.exponentialRampToValueAtTime(
                frequency * 1.08,
                startTime + 0.12
            );


            gain.gain.setValueAtTime(
                0.0001,
                startTime
            );


            gain.gain.exponentialRampToValueAtTime(
                0.12 +
                Math.min(chain, 5) * 0.015,
                startTime + 0.008
            );


            gain.gain.exponentialRampToValueAtTime(
                0.0001,
                startTime + 0.22
            );


            osc.connect(gain);

            gain.connect(
                ctx.destination
            );


            osc.start(
                startTime
            );


            osc.stop(
                startTime + 0.25
            );


            /*
             * 高いキラキラ音を追加
             */

            const sparkle =
                ctx.createOscillator();


            const sparkleGain =
                ctx.createGain();


            sparkle.type =
                "sine";


            sparkle.frequency.setValueAtTime(
                frequency * 2,
                startTime
            );


            sparkle.frequency.exponentialRampToValueAtTime(
                frequency * 2.5,
                startTime + 0.1
            );


            sparkleGain.gain.setValueAtTime(
                0.0001,
                startTime
            );


            sparkleGain.gain.exponentialRampToValueAtTime(
                0.045,
                startTime + 0.01
            );


            sparkleGain.gain.exponentialRampToValueAtTime(
                0.0001,
                startTime + 0.16
            );


            sparkle.connect(
                sparkleGain
            );

            sparkleGain.connect(
                ctx.destination
            );


            sparkle.start(
                startTime
            );


            sparkle.stop(
                startTime + 0.18
            );

        }


        /*
         * 連鎖2以上なら
         * 最後に上昇音を追加
         */

        if (chain >= 2) {

            const chainOsc =
                ctx.createOscillator();


            const chainGain =
                ctx.createGain();


            const startTime =
                now +
                noteCount * 0.055;


            chainOsc.type =
                "triangle";


            chainOsc.frequency.setValueAtTime(
                1000 + chain * 100,
                startTime
            );


            chainOsc.frequency.exponentialRampToValueAtTime(
                1800 + chain * 150,
                startTime + 0.22
            );


            chainGain.gain.setValueAtTime(
                0.0001,
                startTime
            );


            chainGain.gain.exponentialRampToValueAtTime(
                0.12,
                startTime + 0.01
            );


            chainGain.gain.exponentialRampToValueAtTime(
                0.0001,
                startTime + 0.35
            );


            chainOsc.connect(
                chainGain
            );

            chainGain.connect(
                ctx.destination
            );


            chainOsc.start(
                startTime
            );


            chainOsc.stop(
                startTime + 0.38
            );

        }

    } catch (error) {

        console.log(
            "キラキラ効果音を再生できませんでした",
            error
        );

    }

}

/* =========================================================
   全消しエフェクト
========================================================= */

function playPerfectClearEffect(
    chain
) {

    const boardElement =
        document.getElementById("board");


    if (!boardElement)
        return;


    boardElement.classList.add(
        "perfect-clear-effect"
    );


    boardElement.dataset.chain =
        Math.min(chain, 5);


    /*
     * 連鎖が高いほど
     * 全消し音も盛り上げる
     */

    try {

        const ctx =
            getAudioContext();


        const now =
            ctx.currentTime;


        const frequencies = [

            1046,
            1318,
            1568,
            2093,
            2637

        ];


        frequencies.forEach(
            function(
                frequency,
                index
            ) {

                const osc =
                    ctx.createOscillator();


                const gain =
                    ctx.createGain();


                const startTime =
                    now +
                    index * 0.08;


                osc.type =
                    "sine";


                osc.frequency.setValueAtTime(
                    frequency,
                    startTime
                );


                osc.frequency.exponentialRampToValueAtTime(
                    frequency * 1.2,
                    startTime + 0.25
                );


                gain.gain.setValueAtTime(
                    0.0001,
                    startTime
                );


                gain.gain.exponentialRampToValueAtTime(
                    0.16,
                    startTime + 0.01
                );


                gain.gain.exponentialRampToValueAtTime(
                    0.0001,
                    startTime + 0.45
                );


                osc.connect(gain);

                gain.connect(
                    ctx.destination
                );


                osc.start(
                    startTime
                );


                osc.stop(
                    startTime + 0.5
                );

            }
        );


    } catch (error) {

        console.log(
            "全消し効果音を再生できませんでした",
            error
        );

    }


    /*
     * アニメーション終了後にクラス削除
     */

    setTimeout(
        function() {

            boardElement.classList.remove(
                "perfect-clear-effect"
            );

        },
        900
    );

}

/* =========================================================
   スマホ：盤面長押し高速落下
========================================================= */

let boardLongPressTimer = null;

let fastDropTimer = null;


/*
 * 長押し開始
 */

boardElement.addEventListener(
    "pointerdown",
    function(event) {

        /*
         * ゲームオーバー中は何もしない
         */

        if (gameOver)
            return;


        /*
         * すでに長押し中なら何もしない
         */

        if (fastDropActive)
            return;


        /*
         * 長押し判定
         */

        boardLongPressTimer =
            setTimeout(
                function() {

                    /*
                     * =================================================
                     * 長押し開始
                     *
                     * スワイプによって長押し判定が
                     * キャンセルされていない場合のみ開始。
                     * =================================================
                     */

                    if (
                        gameOver ||
                        !current
                    ) {

                        return;

                    }


                    fastDropActive = true;


                    /*
                     * 現在の通常速度を保存
                     */

                    normalDropSpeed =
                        dropSpeed;


                    /*
                     * 高速落下速度
                     */

                    dropSpeed =
                        FAST_DROP_SPEED;


                    /*
                     * =================================================
                     * 一時停止中でも高速落下できるように
                     * 専用タイマーを使用する。
                     * =================================================
                     */

                    clearInterval(
                        fastDropTimer
                    );


                    fastDropTimer =
                        setInterval(
                            function() {

                                if (
                                    gameOver ||
                                    !current
                                ) {

                                    return;

                                }


                                /*
                                 * pausedでもmoveDown()は
                                 * 操作可能なのでそのまま実行
                                 */

                                moveDown();

                            },
                            FAST_DROP_SPEED
                        );

                },
                350
            );

    }
);


/*
 * 長押し終了
 */

function stopBoardLongPress() {

    /*
     * 長押し判定を解除
     */

    clearTimeout(
        boardLongPressTimer
    );


    boardLongPressTimer = null;


    /*
     * 高速タイマー停止
     */

    clearInterval(
        fastDropTimer
    );


    fastDropTimer = null;


    /*
     * 高速落下中だった場合
     */

    if (fastDropActive) {

        fastDropActive = false;


        /*
         * 通常速度へ戻す
         */

        dropSpeed =
            normalDropSpeed;


        /*
         * ゲームオーバーでなければ
         * 通常タイマーを再開
         */

        if (!gameOver) {

            restartTimer();

        }

    }

}


/*
 * 指を離した
 */

boardElement.addEventListener(
    "pointerup",
    stopBoardLongPress
);


/*
 * 指をキャンセルした
 */

boardElement.addEventListener(
    "pointercancel",
    stopBoardLongPress
);


/*
 * 指が盤面外へ出た
 */

boardElement.addEventListener(
    "pointerleave",
    stopBoardLongPress
);