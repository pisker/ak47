import React, { Component } from 'react';

import './Game.css';
import Player from './Player';
import Cup from './Cup';
import s1 from './sounds/offenbacher.mp3';
import s2 from './sounds/prost.mp3';
import s3 from './sounds/trinken.mp3';

class Game extends Component {
    constructor(props) {
        super(props);
        this.state = {
            currentGame: null,
            ownplayer: null,
            showSeatSelection: true,
            switchSeatSelection: false,
            width: 0,
            height: 0,
            tableRadius: 0,
            errorMessage: null,
        };
        this.playerRefs = [];
        //this.wsURL = 'wss://' + window.location.hostname + ':8080'
        this.wsURL = 'wss://90.186.171.119:8080'
        this.ws = new WebSocket(this.wsURL);
        this.updateWindowDimensions = this.updateWindowDimensions.bind(this);
        this.drinkingSounds = [];
        this.drinkingSounds[0] = new Audio(s1);
        this.drinkingSounds[1] = new Audio(s2);
        this.drinkingSounds[2] = new Audio(s3);
        this.cameraError = false;
    }

    componentDidMount() {
        this.updateWindowDimensions();
        window.addEventListener('resize', this.updateWindowDimensions);
        navigator.mediaDevices.getUserMedia({ audio: true, video: { width: {max: 480}}})
            .then((stream) => {
                window.ownStream = stream;
                console.log(stream);
                if(this.ws.readyState === 1)
                    this.ws.send(JSON.stringify({ msg: 'init' }));
            })
            .catch((err) => {
                if(this.state.errorMessage === null) {
                 //this.setState({ errorMessage: 'Webcam: ' + err.message });
                }
                 console.log(err);
                 this.cameraError = true;
                 if(this.ws.readyState === 1)
                    this.ws.send(JSON.stringify({ msg: 'init' }));
            });
        this.ws.onopen = () => {
            console.log('WS connected');
            if(window.ownStream !== undefined || this.cameraError)
                this.ws.send(JSON.stringify({ msg: 'init' }));
        }
        this.ws.onerror = (err) => {
            const link = 'https://' + window.location.hostname + ':8080';
            this.setState({
                errorMessage: 'Fehler bei der Verbindung mit dem Server. Bitte navigiere zu folgender Adresse und aktzeptiere das Zertifikat: ' + link
            });
            console.log(err);
        }
        this.ws.onclose = () => {
            console.log('WS closed, try reconnect');
            this.ws = new WebSocket(this.wsURL);
        }
        this.ws.onmessage = (evt) => { this.parseMessage(evt) };
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.updateWindowDimensions);
    }

    updateWindowDimensions() {
        this.setState({
            width: window.innerWidth, height: window.innerHeight,
            tableRadius: Math.min(window.innerHeight, window.innerWidth) / 3
        });
    }

    parseMessage(evt) {
        //console.log('received: ' + evt.data);
        var packet = JSON.parse(evt.data);
        switch (packet.msg) {
            case 'game':
                this.setState({
                    currentGame: packet.value.game,
                    ownplayer: packet.value.game.players[packet.value.ownplayerIndex]
                });
                break;
            case 'gotoffer':
                const from = packet.value.from;
                const offer = packet.value.offer;
                const playerFrom = this.playerRefs.find(p => p.props.name == from);
                if (playerFrom !== null) {
                    playerFrom.gotOffer(offer);
                }
                break;
            case 'sendoffers':
                this.playerRefs.forEach(p => {
                    if (p.props.isUsed && !p.props.isOwnPlayer)
                        p.sendOffer();
                });
                break;
            case 'gotanswer':
                const answerFrom = packet.value.from;
                const answer = packet.value.answer;
                const answerPlayerFrom = this.playerRefs.find(p => p.props.name == answerFrom);
                if (answerPlayerFrom !== null) {
                    answerPlayerFrom.gotAnswer(answer);
                }
                break;
            case 'drink!':
                this.props.highlight();
                console.log(this.drinkingSounds);
                this.drinkingSounds[Math.round(Math.random() * 2)].play();
                setTimeout(() => {
                    this.props.unhighlight();
                }, 1000);
                break;
            default:
                console.log('could not parse message ' + packet.msg);
                break;
        }

    }

    sendOffer(player, offer) {
        this.ws.send(JSON.stringify({ msg: 'sendoffer', value: { name: player.name, offer: offer } }));
    }

    sendAnswer(player, answer) {
        this.ws.send(JSON.stringify({ msg: 'sendanswer', value: { name: player.name, answer: answer } }));
    }

    handlePlayerClick(player) {
        if (this.state.showSeatSelection || this.state.switchSeatSelection) {
            this.chooseSeat(player.seatIndex); // player selected seat
            return;
        }
        if (player.isUsed &&
            player !== this.state.ownplayer &&
            this.state.ownplayer !== undefined &&
            (this.state.currentGame.cup1Position === this.state.ownplayer.seatIndex || this.state.currentGame.cup2Position === this.state.ownplayer.seatIndex)) {
            this.ws.send(JSON.stringify({ msg: 'placecup', value: { name: player.name } }));
        }
    }

    chooseSeat(index) {
        console.log('selected %d', index);
        if (this.state.showSeatSelection) {
            this.setState({ showSeatSelection: false });
            var name = window.prompt('Spielername eingeben:', '');
            this.ws.send(JSON.stringify({ msg: 'assignplayer', value: { seatIndex: index, name: name } }));

        }
        else if (this.state.switchSeatSelection) {
            this.setState({ switchSeatSelection: false });
            this.ws.send(JSON.stringify({ msg: 'switchseat', value: { newSeatIndex: index } }));
        }
        else {

        }
    }

    startGame() {
        this.ws.send(JSON.stringify({ msg: 'start', value: { numberOfSeats: 5 } }));
    }

    stopGame() {
        this.ws.send(JSON.stringify({ msg: 'stop', value: { numberOfSeats: 5 } }));
    }

    render() {
        if (this.state.currentGame == null)
            return (
                <p>{this.state.errorMessage === null ? 'Spiel lädt..' : this.state.errorMessage}</p>
            );
        else if (!this.state.currentGame.gameStarted) {
            return (
                <div className='startScreen'>
                    <span>Kalaschnikow Corona-Edition</span>
                    <button onClick={() => this.startGame()}>Spiel starten</button>
                </div>
            );
        }
        else
            return (
                <div className='game noselect'>
                    <div className='circle-center-outer'>
                        <div className='circle-center-inner'>
                            <span>Kalaschnikow<br />Corona-Edition</span><br />
                        </div>
                    </div>
                    <div className='circle-container-outer'>
                        <div className='circle-container-inner' style={{ width: this.state.tableRadius * 2 + 'px', height: this.state.tableRadius * 2 + 'px' }}>
                            {this.state.currentGame.players.map((player) => this.renderPlayer(player))}
                            <Cup key='cup1' visible={true} seatIndex={this.state.currentGame.cup1Position} numberOfSeats={this.state.currentGame.numberOfSeats} circleRadius={this.state.tableRadius / 1.5 + 'px'} />
                            <Cup key='cup2' visible={true} seatIndex={this.state.currentGame.cup2Position} numberOfSeats={this.state.currentGame.numberOfSeats} circleRadius={this.state.tableRadius / 1.5 + 'px'} />
                        </div>
                    </div>

                    <div className='controlPanel'>
                        <button onClick={() => this.stopGame()}>Spiel beenden</button><br />
                        {this.renderSwitchSeatButton()}
                    </div>
                </div>
            );
    }

    renderSwitchSeatButton() {

        if (!this.state.showSeatSelection) {
            if (this.state.switchSeatSelection) {
                return (
                    <div>
                        <button onClick={() => this.setState({ switchSeatSelection: false })}>Platztausch abbrechen</button><br />
                        <p>Spieler zum Platztausch auswählen</p>
                    </div>
                );
            }
            else {
                return (
                    <button onClick={() => this.setState({ switchSeatSelection: true })}>Plätze tauschen</button>
                );
            }
        }
        return null;
    }

    renderPlayer(player) {


        var itemRadius = Math.round(this.state.tableRadius * 2 * Math.PI /
            (this.state.currentGame.numberOfSeats * 2.5));
        itemRadius = Math.min(itemRadius, this.state.tableRadius / 2);
        var circleRadius = this.state.tableRadius + 'px';

        var angle = Math.round(player.seatIndex / this.state.currentGame.numberOfSeats * 360);
        var transform = 'rotate(' + angle + 'deg) translate(' + circleRadius + ') rotate(-' + angle + 'deg)';

        return (
            <div key={player.name} className='circle-item' style={{
                margin: -itemRadius + 'px',
                width: itemRadius * 2 + 'px',
                height: itemRadius * 2 + 'px',
                transform: transform
            }}>
                <Player ref={(ref) => { this.playerRefs[player.seatIndex] = ref; }}
                    onClick={() => this.handlePlayerClick(player)}
                    onSendOffer={(offer) => this.sendOffer(player, offer)}
                    onSendAnswer={(answer) => this.sendAnswer(player, answer)}
                    showSeatSelection={this.state.showSeatSelection} isUsed={player.isUsed}
                    name={player.name} seatIndex={player.seatIndex} isOwnPlayer={player === this.state.ownplayer}
                />
            </div>
        );

    }
}

export default Game;