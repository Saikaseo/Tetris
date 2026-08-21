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


/*
 * 現在のミノを
 * すでにHOLDしたか
 *
 * 1個のミノにつき1回だけHOLD可能
 */

let holdUsed = false;


/* =========================================================
   一手戻す
========================================================= */

let history = [];

const MAX_HISTORY = 1;


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


    /*
     * 新しいミノなので
     * HOLDを再び使用可能にする
     */

    holdUsed = false;


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

function drawNext() {

    const next =
        document.getElementById(
            "next"
        );


    /*
     * 中身を完全に消す
     */

    next.innerHTML = "";


    if (!nextPiece)
        return;


    /*
     * ミノを表示する専用要素
     */

    const piece =
        document.createElement(
            "div"
        );


    piece.className =
        "preview-piece";


    piece.classList.add(
        nextPiece.color
    );


    /*
     * ミノの形をCSS Gridとして表示
     */

    const shape =
        nextPiece.shape;


    piece.style.gridTemplateColumns =
        `repeat(${shape[0].length}, 1fr)`;


    piece.style.gridTemplateRows =
        `repeat(${shape.length}, 1fr)`;


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
                document.createElement(
                    "div"
                );


            block.className =
                "preview-block";


            block.classList.add(
                nextPiece.color
            );


            piece.appendChild(
                block
            );

        }

    }


    next.appendChild(
        piece
    );

}


/* =========================================================
   HOLD表示
========================================================= */

function drawHold() {

    const hold =
        document.getElementById(
            "hold"
        );


    if (!hold)
        return;


    /*
     * 中身を完全に消す
     */

    hold.innerHTML = "";


    if (!holdPiece)
        return;


    /*
     * ミノ専用の表示要素
     */

    const piece =
        document.createElement(
            "div"
        );


    piece.className =
        "preview-piece";


    piece.classList.add(
        holdPiece.color
    );


    /*
     * ミノの形
     */

    const shape =
        holdPiece.shape;


    piece.style.gridTemplateColumns =
        `repeat(${shape[0].length}, 1fr)`;


    piece.style.gridTemplateRows =
        `repeat(${shape.length}, 1fr)`;


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
                document.createElement(
                    "div"
                );


            block.className =
                "preview-block";


            block.classList.add(
                holdPiece.color
            );


            piece.appendChild(
                block
            );

        }

    }


    hold.appendChild(
        piece
    );

}


/* =========================================================
   HOLD
========================================================= */

function holdCurrentPiece() {

    if (gameOver || paused)
        return;


    /*
     * 1個のミノにつき1回だけ
     */

    if (holdUsed)
        return;


    holdUsed = true;


    /*
     * 初めてHOLDする場合
     */

    if (!holdPiece) {

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
         * NEXTから新しいミノ
         */

        current =
            nextPiece;


        nextPiece =
            randomPiece();

    }


    /*
     * すでにHOLDがある場合
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


        holdPiece =
            temp;

    }


    /*
     * 中央に配置
     */

    current.x =
        Math.floor(
            (
                COLS -
                current.shape[0].length
            ) / 2
        );


    current.y = 0;


    drawHold();

    drawNext();

    drawBoard();

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
        paused
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

    }

}


/* =========================================================
   下移動
========================================================= */

function moveDown() {

    if (
        gameOver ||
        paused
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

    } else {

        lockPiece();

    }

}


/* =========================================================
   回転
========================================================= */

function rotatePiece() {

    if (
        gameOver ||
        paused
    )
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


    /*
     * 新しいミノなので
     * HOLD可能
     */

    holdUsed = false;


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

    if (
        gameOver ||
        paused
    )
        return;


    if (
        history.length === 0
    )
        return;


    const state =
        history.pop();


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


    holdUsed =
        state.holdUsed;


    updateInfo();

    drawBoard();

    drawHold();

    drawNext();

    restartTimer();

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


    paused =
        !paused;


    const button =
        document.getElementById(
            "pause"
        );


    if (paused) {

        button.textContent =
            "▶";

    } else {

        button.textContent =
            "Ⅱ";

    }

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


    spawnPiece();


    updateInfo();


    drawBoard();

    drawHold();

    drawNext();


    /*
     * 一定速度で落下
     */

    restartTimer();

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
   スマホ：左
========================================================= */

document.getElementById("left")
    .addEventListener(
        "pointerdown",
        function(event) {

            event.preventDefault();

            moveHorizontal(-1);

        }
    );


/* =========================================================
   スマホ：右
========================================================= */

document.getElementById("right")
    .addEventListener(
        "pointerdown",
        function(event) {

            event.preventDefault();

            moveHorizontal(1);

        }
    );


/* =========================================================
   スマホ：下
========================================================= */

document.getElementById("down")
    .addEventListener(
        "pointerdown",
        function(event) {

            event.preventDefault();

            moveDown();

        }
    );


/* =========================================================
   スマホ：回転ボタン
========================================================= */

document.getElementById("rotate")
    .addEventListener(
        "pointerdown",
        function(event) {

            event.preventDefault();

            rotatePiece();

        }
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
   スマホ：盤面タップで回転
========================================================= */

document.getElementById("board")
    .addEventListener(
        "pointerdown",
        function(event) {

            /*
             * ゲームが動いているときだけ回転
             */

            if (
                gameOver ||
                paused
            )
                return;


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

    }
);

/* =========================================================
   リスタート
========================================================= */

document.getElementById("restart")
    .addEventListener(
        "click",
        function() {

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

startGame();