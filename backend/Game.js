const Player = require('./Player.js');
const assert = require('assert').strict;

class Game {
    #wss = null;
    constructor(wss) {
        this.players = [new Player(0)];
        this.gameStarted = false;
        this.numberOfSeats = 1;
        this.cup1Position = 0;
        this.cup2Position = 1;
        this.#wss = wss;
    }


    assignPlayer(name, seatIndex, ws) {
        //assert(seatIndex >= 0 && seatIndex < this.numberOfSeats);
        assert(this.getPlayerByWS(ws) == undefined);
        const player = this.players.find(p => !p.isUsed);
        if (player.isUsed == false) {
            player.name = name;
            player.setWs(ws);
            player.isUsed = true;

            this.numberOfSeats++;
            this.players.push(new Player(this.numberOfSeats - 1)); // add new player

            this.sendGameToPlayers();

            // tell new player to make WebRTC offers to all other players!
            ws.send(JSON.stringify({msg: 'sendoffers'}));
        }
        else {
            console.log('seat index %d is used by player %s and cannot be used by %s', seatIndex, this.players[seatIndex].name, name);
        }
    }

    clearPlayer(player) {
        if (player == undefined)
            return;
        this.players = this.players.filter(pre => pre != player);
        this.numberOfSeats--;
        if(this.cup1Position == player.seatIndex || this.cup2Position == player.seatIndex) {
            for (let i = 1; i < this.numberOfSeats; i++) {
                const player = this.players.find(p => p.seatIndex == i % this.numberOfSeats);
                if (player !== undefined && player.isUsed) {
                    if(this.cup1Position == player.seatIndex)
                    this.cup1Position = player.seatIndex;
                        else
                        this.cup2Position = player.seatIndex;
                    break;
                }
            }
        }
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].seatIndex > player.seatIndex)
                this.players[i].seatIndex--;
        }
        console.log('cleared player, now %d seats and %d players', this.numberOfSeats, this.players.length);
        this.sendGameToPlayers();
    }

    startGame() {
        this.gameStarted = true;

        this.sendGameToPlayers();
    }

    stopGame() {
        this.gameStarted = false;
        this.sendGameToPlayers();
    }

    sendGameToPlayers() {
        this.#wss.clients.forEach((ws) => {
            ws.send(JSON.stringify({ msg: 'game', value: { game: this, ownplayerIndex: this.players.indexOf(this.getPlayerByWS(ws)) } }));
        });
    }

    switchSeat(oldSeatIndex, newSeatIndex) {
        assert(oldSeatIndex >= 0 && oldSeatIndex < this.numberOfSeats);
        assert(newSeatIndex >= 0 && newSeatIndex < this.numberOfSeats);

        var oldPlayer = this.players.find(p => p.seatIndex == oldSeatIndex);
        var newPlayer = this.players.find(p => p.seatIndex == newSeatIndex);

        if (oldPlayer == undefined || newPlayer == undefined)
            return;
        oldPlayer.seatIndex = newSeatIndex;
        newPlayer.seatIndex = oldSeatIndex;

        const oldCup1Position = this.cup1Position;
        const oldCup2Position = this.cup2Position;

        if (oldCup1Position == oldSeatIndex)
            this.cup1Position = newSeatIndex;

        if (oldCup2Position == oldSeatIndex)
            this.cup2Position = newSeatIndex;

        if (oldCup1Position == newSeatIndex)
            this.cup1Position = oldSeatIndex;

        if (oldCup2Position == newSeatIndex)
            this.cup2Position = oldSeatIndex;
        this.sendGameToPlayers();
    }

    get activePlayers() {
        return this.players.filter(p => p.isUsed);
    }

    getPlayerByWS(ws) {
        return this.players.find(player => player.getWs() == ws);
    }

    getSeatIndexByPlayer(player) {
        return player.seatIndex;
    }
}

module.exports = Game;