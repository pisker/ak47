class Player {
    #ws = null; // privat
    constructor(seatIndex) {
        this.name = 'empty';
        this.isUsed = false;
        this.seatIndex = seatIndex;
    }

    getWs() {
        return this.#ws;
    }

    setWs(value) {
        this.#ws = value;
    }
}

module.exports = Player;