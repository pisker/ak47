const WebSocket = require('ws');
const Game = require('./Game.js');

var openConnections
var currentGame;
exports.startServer = (key, cert) => {
    var credentials = { key: key, cert: cert };
    var https = require('https');

    //pass in your credentials to create an https server
    var httpsServer = https.createServer(credentials);
    httpsServer.listen(8080);
    const wss = new WebSocket.Server({ server: httpsServer });
    currentGame = new Game(wss);
    console.log('starting wss server on port %d', 8080);
    wss.on('connection', function connection(ws) {
        ws.on('message', function incoming(message) {
            parseMessage(ws, message);
        });
        ws.on('close', function close(evt) {
            currentGame.clearPlayer(currentGame.getPlayerByWS(ws));
        });
        ws.send(JSON.stringify({ msg: 'hello' }));
    });
};

function parseMessage(ws, message) {
    console.log('received %s from %s', message, ws._socket.remoteAddress);
    const package = JSON.parse(message);
    const content = package.value;
    switch (package.msg) {
        case 'init':
            // called after client start up
            ws.send(JSON.stringify({ msg: 'game', value: { game: currentGame } }));
            break;
        case 'assignplayer': // value: seatIndex, name
            currentGame.assignPlayer(package.value.name, package.value.seatIndex, ws);
            break;
        case 'switchseat': // value: newSeatIndex
            var player = currentGame.getPlayerByWS(ws);
            if (ws != undefined) {
                var currentSeatIndex = currentGame.getSeatIndexByPlayer(player);
                currentGame.switchSeat(currentSeatIndex, package.value.newSeatIndex)
            }
            break;
        case 'start':
            currentGame.startGame();
            break;
        case 'stop':
            currentGame.stopGame();
            break;

        case 'placecup':
            const oldPlayer = currentGame.getPlayerByWS(ws);
            const newPlayer = currentGame.players.find(pre => pre.name == package.value.name);

            if (oldPlayer.seatIndex == currentGame.cup1Position)
                currentGame.cup1Position = newPlayer.seatIndex;
            else if (oldPlayer.seatIndex == currentGame.cup2Position)
                currentGame.cup2Position = newPlayer.seatIndex;
            currentGame.sendGameToPlayers();
            if (currentGame.cup1Position == currentGame.cup2Position) {
                newPlayer.getWs().send(JSON.stringify({ msg: 'drink!' }));
                setTimeout(() => {
                    for (let i = 1; i < currentGame.numberOfSeats; i++) {
                        const player = currentGame.players.find(p => p.seatIndex == (newPlayer.seatIndex + i) % currentGame.numberOfSeats);
                        if (player.isUsed) {
                            currentGame.cup1Position = player.seatIndex;
                            break;
                        }
                    }
                    currentGame.sendGameToPlayers();
                }, 500);
            }
            break;
        case 'sendoffer':
            const from = currentGame.getPlayerByWS(ws);
            const to = currentGame.players.find(p => p.name == content.name);
            if (from == null || to == null)
                return;

            to.getWs().send(JSON.stringify({ msg: 'gotoffer', value: { offer: content.offer, from: from.name } }));
            break;

        case 'sendanswer':
            const answerFrom = currentGame.getPlayerByWS(ws);
            const answerTo = currentGame.players.find(p => p.name == content.name);
            if (answerFrom == null || answerTo == null)
                return;

            answerTo.getWs().send(JSON.stringify({ msg: 'gotanswer', value: { answer: content.answer, from: answerFrom.name } }));
            break;
        default:
            console.log('message type %s is cannot be parsed', package.msg);
    }
}