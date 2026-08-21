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

const MAX_HISTORY = 2;


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


            cell.className = "cell";


            /*
             * 偶数列・奇数列で色分け
             */

            if (x % 2 === 0) {

                cell.classList.add(
                    "even-column"
                );

            } else {

                cell.classList.add(
                    "odd-column"
                );

            }


            /*
             * 固定されたミノ
             */

            if (board[y][x]) {

                cell.classList.add(
                    "filled"
                );

                cell.classList.add(
                    board[y][x]
                );

            }


            boardElement.appendChild(
                cell
            );

        }

    }


    drawCurrentPiece();

}


/* =========================================================
   現在のミノ描画
========================================================= */

function drawCurrentPiece() {

    if (!current)
        return;


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
                    document.getElementById(
                        "board"
                    ).children[index];


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

    current =
        nextPiece ||
        randomPiece();


    nextPiece =
        randomPiece();


    current.x =
        Math.floor(
            (
                COLS -
                current.shape[0].length
            ) / 2
        );


    current.y = 0;


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
     * ★重要
     *
     * ミノが登場した瞬間を
     * 「一手戻す」の基準として保存
     */

    saveHistory();

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

    if (gameOver)
        return;


    /*
     * HOLDに何も入っていない場合
     */

    if (!holdPiece) {

        /*
         * 現在のミノをHOLDへ
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
         * NEXTのミノを現在のミノにする
         */

        current = nextPiece;


        /*
         * NEXTを新しく作る
         */

        nextPiece = randomPiece();

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

    if (gameOver)
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

saveGame();

    }

}


/* =========================================================
   下移動
========================================================= */

function moveDown() {

    if (gameOver)
        return;


    /*
     * 一時停止中は下移動しない
     */

    if (paused)
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
   回転
========================================================= */

function rotatePiece() {

    if (gameOver)
    return;


    const oldShape =
        current.shape;


    const height =
        oldShape.length;


    const width =
        oldShape[0].length;


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
     * 通常の回転
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
     * 壁際なら少しずらす
     */

    const offsets = [

        -1,
        1,
        -2,
        2

    ];


    for (
        const offset of offsets
    ) {

        if (
            !collision(
                current.x + offset,
                current.y,
                newShape
            )
        ) {

            current.x +=
                offset;


            current.shape =
    newShape;


drawBoard();

saveGame();

return;

        }

    }

}


/* =========================================================
   ミノ固定
========================================================= */

function lockPiece() {


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

            if (
                !current.shape[y][x]
            )
                continue;


            const boardX =
                current.x + x;


            const boardY =
                current.y + y;


            if (
                boardY >= 0 &&
                boardY < ROWS
            ) {

                board[boardY][boardX] =
                    current.color;

            }

        }

    }


    clearLines();


    spawnPiece();


    drawBoard();

    drawHold();

}


/* =========================================================
   ライン消去
========================================================= */

function clearLines() {

    let cleared = 0;


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

            board.splice(
                y,
                1
            );


            board.unshift(
                new Array(COLS)
                    .fill(null)
            );


            cleared++;


            y++;

        }

    }


    if (cleared > 0) {

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
         * レベル表示だけ変更
         *
         * 落下速度は変化しない
         */

        level =
            Math.floor(
                lines / 10
            ) + 1;


        updateInfo();

    }

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
     * ゲームオーバー中・一時停止中は
     * 自動落下タイマーを動かさない
     */

    if (gameOver || paused) {

        dropTimer = null;

        return;

    }


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
     * 現在のミノが登場した直後の状態を
     * 1つ前の履歴として復元する
     */

    if (history.length < 2)
        return;


    /*
     * 現在のミノの履歴を削除
     */

    history.pop();


    /*
     * 1つ前のミノの
     * 登場直後の状態
     */

    const state =
        history[
            history.length - 1
        ];


    board =
        state.board.map(
            row => [...row]
        );


    score =
        state.score;


    lines =
        state.lines;


    level =
        state.level;


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
     * HOLD回数制限は使用しない
     */

    holdUsed = false;


    updateInfo();

    drawBoard();

    drawHold();

    drawNext();

    restartTimer();


    /*
     * 一手戻した状態を保存
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


    const button =
        document.getElementById(
            "pause"
        );


    /*
     * ボタン表示を変更
     */

    if (button) {

        button.textContent =
            paused
                ? "▶"
                : "Ⅱ";

    }


    /*
     * 一時停止ならタイマー停止
     * 再開ならタイマー再スタート
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

    clearInterval(
        dropTimer
    );


    createBoard();


    score = 0;

    lines = 0;

    level = 1;


    gameOver = false;

    paused = false;


    /*
     * HOLDリセット
     */

    holdPiece = null;

    holdUsed = false;


    /*
     * 履歴リセット
     */

    history = [];


    /*
     * NEXT作成
     */

    nextPiece =
        randomPiece();


    /*
     * 最初のミノを作成
     */

    spawnPiece();


    /*
     * 情報表示
     */

    updateInfo();


    /*
     * 盤面・HOLD・NEXTを描画
     */

    drawBoard();

    drawHold();

    drawNext();


    /*
     * 一時停止ボタンを初期状態に戻す
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
   スマホ：下ボタン
   長押し対応
========================================================= */

const downButton =
    document.getElementById("down");


let downInterval = null;

let downTimeout = null;


/*
 * ボタンを押した
 */

downButton.addEventListener(
    "pointerdown",
    function(event) {

        event.preventDefault();


        /*
         * まず1回動かす
         */

        moveDown();


        /*
         * すぐには連続移動させず、
         * 少し長押ししたら連続移動開始
         */

        downTimeout =
            setTimeout(
                function() {

                    downInterval =
                        setInterval(
                            function() {

                                moveDown();

                            },
                            80
                        );

                },
                300
            );

    }
);


/*
 * 長押し終了
 */

function stopDownButton() {

    clearTimeout(
        downTimeout
    );

    clearInterval(
        downInterval
    );

    downTimeout = null;

    downInterval = null;

}


downButton.addEventListener(
    "pointerup",
    stopDownButton
);


downButton.addEventListener(
    "pointercancel",
    stopDownButton
);


downButton.addEventListener(
    "pointerleave",
    stopDownButton
);

/* =========================================================
   スマホ：HOLD
========================================================= */

document.getElementById("hold-button")
    .addEventListener(
        "pointerdown",
        function(event) {

            event.preventDefault();

            holdCurrentPiece();

        }
    );


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
========================================================= */

const boardElement =
    document.getElementById("board");


let touchStartX = 0;
let touchStartY = 0;


/*
 * 盤面を押した位置を記録
 */

boardElement.addEventListener(
    "pointerdown",
    function(event) {

        if (
            gameOver ||
            paused
        )
            return;


        touchStartX =
            event.clientX;

        touchStartY =
            event.clientY;

    }
);


/*
 * 盤面から指を離したとき
 */

boardElement.addEventListener(
    "pointerup",
    function(event) {

        if (
            gameOver ||
            paused
        )
            return;


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


        const swipeDistance = 30;


        /*
         * 左右スワイプ
         */

        if (
            absX >= swipeDistance &&
            absX > absY
        ) {

            if (dx < 0) {

                moveHorizontal(-1);

            } else {

                moveHorizontal(1);

            }

            return;

        }


        /*
         * 上下方向のスワイプ
         *
         * 下スワイプ = 下移動
         */

        if (
            absY >= swipeDistance &&
            absY > absX
        ) {

            if (dy > 0) {

                moveDown();

            }

            return;

        }


        /*
         * ほとんど動かしていない場合は
         * 今まで通りタップ回転
         */

        rotatePiece();

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