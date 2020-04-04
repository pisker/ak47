const Player = require('./Player.js');
const assert = require('assert').strict;

class KalaschnikowGame {
    #io;
    constructor(io, onGameEnded) {
        this.id = Math.round(Math.random() * Math.pow(2, 24)); // 24 bit identifier
        this.#io = io;
        this.onGameEnded = onGameEnded;
        this.players = [];
        this.cups = [0, 0];
        this.gameStarted = false;
        this.maxSeats = 15;
    }

    hasSocket(socket) {
        return this.players.filter(p => p.id === socket.id) > 0;
    }

    joinSocket(socket) {
        if (this.players.length < this.maxSeats) {

            const player = new Player(socket.id, this.players.length);
            this.players.push(player);

            socket.join(this.id); // join socket to game room
            socket.on('setPlayerName', (name) => { this.callHandleFunction(this.handleSetPlayerName, socket, name) });
            socket.on('switchSeat', (newSeat) => { this.callHandleFunction(this.handleSwitchSeat, socket, newSeat) });
            socket.on('moveCup', (newIndex) => { this.callHandleFunction(this.handleMoveCup, socket, newIndex) });
            socket.on('init', () => { this.callHandleFunction(this.handleInit, socket) });

            // WebRTC:
            socket.on('requestOffer', (receiverId) => { this.callHandleFunction(this.handleRequestOffer, socket, receiverId) });
            socket.on('sendOffer', (receiverId, offer) => { this.callHandleFunction(this.handleSendOffer, socket, receiverId, offer) });
            socket.on('sendAnswer', (receiverId, answer) => { this.callHandleFunction(this.handleSendAnswer, socket, receiverId, answer) });
            socket.on('sendCandidate', (receiverId, candidate) => { this.callHandleFunction(this.handleSendCandidate, socket, receiverId, candidate) });

            socket.emit('gameMode', 'kalaschnikow');
            this.resendGame();
            console.log('player %s has joined game %s', player.id, this.id);
        }
    }

    clearSocket(socket) {
        const player = this.getPlayerFromSocket(socket);
        if (player !== undefined) {
            
            const cups = this.cupsOfPlayer(player);
            if (cups.length !== 0) {
                this.passCupsToNextPlayer(player, cups);
            }
            for (let i = player.seatIndex+1; i < this.players.length; i++) {
                this.players[i].seatIndex--;
            }

            for (let i = 0; i < this.cups.length; i++) {
                if(this.cups[i] > player.seatIndex)
                    this.cups[i]--;
            }

            this.players = this.players.filter(p => p !== player); // remove from list
            this.resendGame();
            console.log('player %s has left game %s', player.id, this.id);

            if(this.players.length === 0) {
                this.onGameEnded(this);
            }
        }
    }

    //#region message handlers
    callHandleFunction(f, ...args) {
        try {
             f.apply(this, args);
        } catch (error) {
            console.log('Error in handle func %s from game %s. Arguments: ', f, args);
            console.error(error);
        }
    }

    handleInit(socket) {
        const player = this.getPlayerFromSocket(socket);
        if(player === undefined) return;

        socket.emit('game', this);
    }

    handleRequestOffer(socket, receiverId) {
        const receiver = this.players.find(p => p.id === receiverId);
        if(receiver === undefined) return;

        const sender = this.getPlayerFromSocket(socket);
        if(sender === undefined) return;
        
        socket.to(receiverId).emit('offerrequested', sender.id);
    }

    handleSendOffer(socket, receiverId, offer) {
        const receiver = this.players.find(p => p.id === receiverId);
        if(receiver === undefined) return;

        const sender = this.getPlayerFromSocket(socket);
        if(sender === undefined) return;
        
        socket.to(receiverId).emit('gotoffer', sender.id, offer);
    }

    handleSendAnswer(socket, receiverId, answer) {
        const receiver =this.players.find(p => p.id === receiverId);
        if(receiver === undefined) return;

        const sender = this.getPlayerFromSocket(socket);
        if(sender === undefined) return;
        
        socket.to(receiverId).emit('gotanswer', sender.id, answer);
    }

    handleSendCandidate(socket, receiverId, candidate) {
        const receiver =this.players.find(p => p.id === receiverId);
        if(receiver === undefined) return;

        const sender = this.getPlayerFromSocket(socket);
        if(sender === undefined) return;
        socket.to(receiverId).emit('gotcandidate', sender.id, candidate);
    }

    handleMoveCup(socket, newIndex) {
        console.log('move cup');
        if(newIndex < 0 || newIndex >= this.players.length) return;

        const player = this.getPlayerFromSocket(socket);
        if (player === undefined) return;

        const playerCups = this.cupsOfPlayer(player);
        console.log(playerCups);
        if(playerCups !== undefined && playerCups.length >= 1)
            this.cups[playerCups[0]] = newIndex; // pass 1 of players cup to new index
        
        const cupsMatch = this.cups.filter(cupIndex => cupIndex === newIndex);
        console.log(cupsMatch);
        if(cupsMatch.length >= 2) { // two cups match at new index
            const newPlayer = this.players.find(p => p.seatIndex === newIndex);
            this.#io.to(newPlayer.id).emit('drink!');
            setTimeout(() => { // automatically pass cup to next player after timeout
                this.passCupsToNextPlayer(newPlayer, cupsMatch.slice(1));
                this.resendGame();
            }, 500);
        }
        this.resendGame();
    }

    handleSetPlayerName(socket, name) {
        const player = this.getPlayerFromSocket(socket);
        if (player === undefined) return;

        player.name = name;
        this.resendGame();
    }

    handleSwitchSeat(socket, newSeatIndex) {
        const player1 = this.getPlayerFromSocket(socket);
        if (player1 === undefined) return;
        if (newSeatIndex < 0 || newSeatIndex >= this.players.length) {
            console.log('game %s player %s invalid switch seat. index: %d', this, player1, newSeatIndex);
            return;
        }
        const player2 = this.players[newSeatIndex];
        const player1Cups = this.cupsOfPlayer(player1);
        const player2Cups = this.cupsOfPlayer(player2);

        player2.seatIndex = player1.seatIndex; // switch players
        player1.seatIndex = newSeatIndex;

        player1Cups.forEach(i => { // let players take cups with them
            this.cups[i] = player1.seatIndex;
        });

        player2Cups.forEach(i => {
            this.cups[i] = player2.seatIndex;
        });

        this.sortPlayers();
        this.resendGame();
    }
    //#endregion

    //#region helpers
    resendGame() {
        this.#io.to(this.id).emit('game', this);
    }

    cupsOfPlayer(player) {
        // return: array of cup indices
        var indices = [];
        for (let i = 0; i < this.cups.length; i++) {
            if(this.cups[i] === player.seatIndex)
                indices.push(i);
        }
        return indices;
    }

    passCupsToNextPlayer(player, cups) {
        for (let i = 1; i < this.players.length && cups.length > 0; i++) {
            const nextPlayer = this.players[(player.seatIndex+i)%this.players.length];
            const cupIndex = cups.shift();
            this.cups[cupIndex] = nextPlayer.seatIndex;
        }
    }

    getPlayerFromSocket(socket) {
        return this.players.find(p => p.id === socket.id);
    }

    sortPlayers() {
        this.players.sort((p1, p2) => p1.seatIndex - p2.seatIndex);
    }
    //#endregion
}

module.exports = KalaschnikowGame;