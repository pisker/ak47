const socketIo = require('socket.io');
var games = [];

function gameEnded(game) {
    console.log('Game %s has ended', game.id);
    games = games.filter(g => g !== game);
}

function createGame(gameType, ...args) {
    var game;
    switch(gameType) {
        case 'kalaschnikow':
            game = require('./games/kalaschnikow/KalaschnikowGame.js')
            return new game(...args);
        default:
            return null;
    }
}

exports.attachServer = (server) => {
    const io = new socketIo(server);
    io.set('origins', '*:*');
    console.log('attached socket.io server');

    io.on('connection', (socket) => {
        console.log('connected socket %s', socket.id);
        socket.on('createGame', (typeName) => {
            if(games.find(g => g.hasSocket(socket)) !== undefined)
                return; // user is in a game already

            const game = createGame(typeName, io, gameEnded);
            if(game !== null) {
                console.log('socket %s created game %s %s', socket.id, typeName, game.id);
                game.joinSocket(socket);
                games.push(game);
            }

        });
        socket.on('joinGame', (gameId) => {
            if(games.find(g => g.hasSocket(socket)) !== undefined)
                return; // user is in a game already
            const game = games.find(g => g.id == gameId);
            if(game !== undefined) {
                game.joinSocket(socket);
            }
        });
        socket.on('disconnect', function close(evt) {
            console.log('disconnected socket %s', socket.id);
            games.forEach(game => game.clearSocket(socket));
        });
        
    });
};