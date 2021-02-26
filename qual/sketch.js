const gameStates = {
    LOADING: 0,
    MENU: 1,
    INGAME: 2,
    PAUSED: 3
};
const padding = 25;

let dom = {};
let fffForwardFont;
let moveSound;
let fallSound;
let clearSound;
let tritrisSound;

let volume = getSavedValue('volume', 75);
let settings = {
    oldGraphics: getSavedValue('oldGraphics', false),
    showGridLines: getSavedValue('showGridLines', true),
    showKeys: getSavedValue('showKeys', false),
    showStats: true //Stats are always shown for competitive
}

let piecesJSON;
let piecesImage; //The entire spritesheet
let pieceImages = []; //A 2d array of all the individual triangles
let game;
let gameState = gameStates.LOADING;

const month = new Date().getMonth();
const year = new Date().getYear(); //It will be a new set of scores each month
const gameSaveName = `${month}/${year}qual`;
const gameStatus = {
    NOT_STARTED: 0,
    INPROGRESS: 1,
    FINISHED: 2,
    DISCONNECTED: 3 //If they close the page mid-game
};
let games = new Array(5);
for (let i = 0; i < 5; i++) {
    games[i] = {
        score: -1,
        lines: -1,
        startLevel: -1,
        date: -1,
        status: gameStatus.NOT_STARTED
    };
}
let currentGame = 0;
if (localStorage.hasOwnProperty(gameSaveName)) {
    games = JSON.parse(localStorage.getItem(gameSaveName));
    for (let i = 0; i < games.length; i++) {
        if (games[i].status == gameStatus.NOT_STARTED) { //Resume on whichever game they have not started
            currentGame = i;
            break;
        }
        if (i == games.length-1) {
            //All games finished
            currentGame = 5;
        }
    }
} else {
    localStorage.setItem(gameSaveName, JSON.stringify(games));
}

const keyboardMap = [ //From https://stackoverflow.com/questions/1772179/get-character-value-from-keycode-in-javascript-then-trim
  '','','','CANCEL','','','HELP','','BACK_SPACE','TAB','','','CLEAR','ENTER','ENTER_SPECIAL','','SHIFT','CONTROL','ALT','PAUSE','CAPS_LOCK','KANA','EISU','JUNJA','FINAL','HANJA','','ESCAPE','CONVERT','NONCONVERT','ACCEPT','MODECHANGE','SPACE','PAGE_UP','PAGE_DOWN','END','HOME','LEFT ARROW','UP ARROW','RIGHT ARROW','DOWN ARROW','SELECT','PRINT','EXECUTE','PRINTSCREEN','INSERT','DELETE','','0','1','2','3','4','5','6','7','8','9','COLON','SEMICOLON','LESS_THAN','EQUALS','GREATER_THAN','QUESTION_MARK','AT','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','OS_KEY','','CONTEXT_MENU','','SLEEP','NUMPAD0','NUMPAD1','NUMPAD2','NUMPAD3','NUMPAD4','NUMPAD5','NUMPAD6','NUMPAD7','NUMPAD8','NUMPAD9','MULTIPLY','ADD','SEPARATOR','SUBTRACT','DECIMAL','DIVIDE','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12','F13','F14','F15','F16','F17','F18','F19','F20','F21','F22','F23','F24','','','','','','','','','NUM_LOCK','SCROLL_LOCK','WIN_OEM_FJ_JISHO','WIN_OEM_FJ_MASSHOU','WIN_OEM_FJ_TOUROKU','WIN_OEM_FJ_LOYA','WIN_OEM_FJ_ROYA','','','','','','','','','','CIRCUMFLEX','EXCLAMATION','DOUBLE_QUOTE','HASH','DOLLAR','PERCENT','AMPERSAND','UNDERSCORE','OPEN_PAREN','CLOSE_PAREN','ASTERISK','PLUS','PIPE','HYPHEN_MINUS','OPEN_CURLY_BRACKET','CLOSE_CURLY_BRACKET','TILDE','','','','','VOLUME_MUTE','VOLUME_DOWN','VOLUME_UP','','','SEMICOLON','EQUALS','COMMA','MINUS','PERIOD','SLASH','BACK_QUOTE','','','','','','','','','','','','','','','','','','','','','','','','','','','OPEN_BRACKET','BACK_SLASH','CLOSE_BRACKET','QUOTE','','META','ALTGR','','WIN_ICO_HELP','WIN_ICO_00','','WIN_ICO_CLEAR','','','WIN_OEM_RESET','WIN_OEM_JUMP','WIN_OEM_PA1','WIN_OEM_PA2','WIN_OEM_PA3','WIN_OEM_WSCTRL','WIN_OEM_CUSEL','WIN_OEM_ATTN','WIN_OEM_FINISH','WIN_OEM_COPY','WIN_OEM_AUTO','WIN_OEM_ENLW','WIN_OEM_BACKTAB','ATTN','CRSEL','EXSEL','EREOF','PLAY','ZOOM','','PA1','WIN_OEM_CLEAR',''
];
let controls = getSavedValue('controls', {
    counterClock: 90, //Z
    clock: 88, //X
    left: 37, //Left arrow
    right: 39, //Right arrow
    down: 40, //Down arrow
    start: 13, //Enter
    restart: 27 //Escape
});

let keyImg = {};

function preload() {
    piecesJSON = loadJSON('../assets/pieces.json');
    fffForwardFont = loadFont('../assets/fff-forward.ttf');
    moveSound = new Sound('../assets/move.wav');
    fallSound = new Sound('../assets/fall.wav');
    clearSound = new Sound('../assets/clear.wav');
    tritrisSound = new Sound('../assets/tritris.wav');

    keyImg.left = loadImage('../assets/leftKey.png');
    keyImg.right = loadImage('../assets/rightKey.png');
    keyImg.down = loadImage('../assets/downKey.png');
    keyImg.z = loadImage('../assets/zKey.png');
    keyImg.x = loadImage('../assets/xKey.png');

    piecesImage = loadImage('../assets/piecesImage.png');
}

function setup() {
    pieceImages = loadPieces(piecesImage); //This will take some time, so it run before setting gameState to MENU

    gameState = gameStates.MENU;
    createCanvas(windowWidth, windowHeight);
    textFont(fffForwardFont);
    game = createGame(0);
    game.currentPiece = null;
    game.nextPiece = null;

    dom.recordsDiv = select('#records');
    dom.recordsDiv.style('visibility: visible');

    dom.titleDiv = select('#title');
    dom.titleDiv.style('visibility: visible');

    dom.playDiv = select('#play');
    dom.playDiv.style('visibility: visible');

    dom.level = select('#level');
    if (localStorage.hasOwnProperty('startLevel')) {
        dom.level.value(localStorage.getItem('startLevel'));
    }
    dom.level.changed(() => {
        localStorage.setItem('startLevel', dom.level.value());
    });
    dom.newGame = select('#newGame');
    dom.newGame.mousePressed(() => {
        newGame();
    });

    dom.volume = select('#volume');
    dom.volume.value(volume);
    dom.volume.changed(updateVolume);
    function updateVolume() {
        if (game) {
            game.playClearSound = false;
            game.playFallSound = false;
            game.playMoveSound = false;
        }
        volume = dom.volume.value();
        localStorage.setItem('volume', volume);

        moveSound.setVolume(volume / 100);
        fallSound.setVolume(volume / 100);
        clearSound.setVolume(volume / 100);
        tritrisSound.setVolume(volume / 100);
    };
    updateVolume();

    dom.games = [];
    for (let i = 0; i < 5; i++) {
        dom.games.push(select('#game' + i));
    }
    dom.avgOf2 = select('#avgOf2');
    dom.levelLabel = select('#levelLabel');

    dom.resetScores = select('#resetScores');
    dom.resetScores.mousePressed(() => {
        if (gameState == gameStates.INGAME) {
            alert('You cannot reset during a game!');
            return;
        }
        if (!confirm('Are you sure you want to reset your scores? This cannot be undone.'))
            return;
        games = new Array(5);
        for (let i = 0; i < 5; i++) {
            games[i] = {
                score: -1,
                lines: -1,
                startLevel: -1,
                date: -1,
                status: gameStatus.NOT_STARTED
            };
        }
        currentGame = 0;
        localStorage.setItem(gameSaveName, JSON.stringify(games));
        updateDisplay();
    });
    updateDisplay();

    resizeDOM();
    showGame(true);
}

function draw() {
    if (gameState == gameStates.MENU) {
        cursor();
        return;
    }

    if (gameState == gameStates.INGAME) {
        game.update();
        showGame(false); //Show the game, (and it's not paused)
        if (!game.alive) { //Game has just ended!
            gameState = gameStates.MENU;
            dom.playDiv.show();

            if (!game.practice)
                setHighScores(game.score, game.lines, false);

            games[currentGame].status = gameStatus.FINISHED;
            games[currentGame].score = game.score;
            games[currentGame].lines = game.lines;
            games[currentGame].startLevel = game.startLevel;
            localStorage.setItem(gameSaveName, JSON.stringify(games));
            currentGame++;

            updateDisplay();
        }
    } else if (gameState == gameStates.PAUSED) {
        showGame(true); //If paused, show empty grid
        fill(255);
        stroke(0);
        textSize(30);
        textAlign(CENTER, CENTER);
        text('PAUSED', width/2, height/3);
    }
}

function updateDisplay() {
    if (currentGame == 5) {
        dom.levelLabel.elt.innerText = 'Congrats! Your qualification is complete!';
        dom.level.style('visibility: hidden');
        dom.newGame.style('visibility: hidden');
    } else {
        dom.levelLabel.elt.innerText = 'Level: ';
        dom.level.style('visibility: visible');
        dom.newGame.style('visibility: visible');
    }
    for (let i = 0; i < 5; i++) {
        if (gameState == gameStates.INGAME && currentGame == i) {
            dom.games[i].addClass('currentGame');
        } else {
            dom.games[i].removeClass('currentGame');
        }
        if (i < games.length) {
            let gameText = '--';
            if (games[i].status == gameStatus.FINISHED || games[i].status == gameStatus.DISCONNECTED) {
                gameText = formatScore(games[i].score);
            }
            dom.games[i].elt.innerText = `Game ${i+1}: ${gameText}`;
        }
    }
    let scores = games.filter(g => g.score > -1).map(g => g.score).sort((a, b) => b - a);
    if (scores.length >= 2) {
        const avgOf2 = (scores[0] + scores[1]) / 2;
        let formatted = formatScore(Math.floor(avgOf2));
        if (avgOf2 % 1 == 0.5) formatted += '.5';
        dom.avgOf2.elt.innerText = `Qual Score: ${formatted}`;
    } else {
        dom.avgOf2.elt.innerText = `Qual Score: --`;
    }
}

function newGame() {
    if (gameState == gameStates.LOADING) return;
    if (currentGame >= 5) {
        alert('You have already played your 5 games!');
        return;
    }
    const gameNumber = ['first', 'second', 'third', 'fourth', 'fifth'][currentGame];
    let level = parseInt(dom.level.value());
    if (isNaN(level)) level = 0;
    if (level < 0) level = 0;
    if (level > 29) level = 29;
    if (level >= 20 && level <= 28) level = 19; //Can only start on 0-19 or 29
    if (!confirm(`Are you sure you want to start your ${gameNumber} game on level ${level}?`))
        return;

    game = createGame(level);
    gameState = gameStates.INGAME;

    games[currentGame].status = gameStatus.INPROGRESS;
    games[currentGame].date = Date.now();
    localStorage.setItem(gameSaveName, JSON.stringify(games));

    updateDisplay();
    dom.playDiv.hide();
}

function keyPressed() {
    if (keyCode == controls.start) {
        //Enter key is pressed
        if (gameState == gameStates.INGAME) {
            gameState = gameStates.PAUSED;
            game.redraw = true;
        } else if (gameState == gameStates.PAUSED) {
            gameState = gameStates.INGAME;
            game.redraw = true;
        } else if (gameState == gameStates.MENU) {
            newGame();
        }
    }
}

window.onbeforeunload = () => {
    if (gameState == gameStates.INGAME || gameState == gameStates.PAUSED) {
        if (currentGame < 5 && games[currentGame].status == gameStatus.INPROGRESS && game) {
            games[currentGame].score = game.score;
            games[currentGame].lines = game.lines;
            games[currentGame].startLevel = game.startLevel;
            games[currentGame].status = gameStatus.DISCONNECTED;
            localStorage.setItem(gameSaveName, JSON.stringify(games));
        }
        return 'Are you sure you want to exit the page during a game? You will not be able to continue this game.';
    }
}
