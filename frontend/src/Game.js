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
            game: null,
            switchSeatSelection: false,
            width: 0,
            height: 0,
            tableRadius: 0,
            errorMessage: null,
            cameraError: false,
            muted: false
        };
        this.playerRefs = [];
        this.socket = props.socket;
        this.firstRender = true;

        this.updateWindowDimensions = this.updateWindowDimensions.bind(this);
        this.drinkingSounds = [];
        this.drinkingSounds[0] = new Audio(s1);
        this.drinkingSounds[1] = new Audio(s2);
        this.drinkingSounds[2] = new Audio(s3);
    }

    componentDidMount() {
        this.updateWindowDimensions();
        window.addEventListener('resize', this.updateWindowDimensions);

        this.socket.on('game', (game) => {
            this.setState({ game: game });
        });

        this.socket.on('drink!', (game) => {
            this.props.highlight();
            try {
                this.drinkingSounds[Math.floor(Math.random() * 3)].play();
            } catch (error) { }
            setTimeout(() => {
                this.props.unhighlight();
            }, 1000);
        })
        
        this.socket.on('offerrequested', (senderId) => {
            const player = this.playerRefs.find(ref => ref.props.id === senderId);
            if (player === undefined) return null;
            player.sendOffer();
        });
        this.socket.on('gotoffer', (senderId, offer) => {
            const player = this.playerRefs.find(ref => ref.props.id === senderId);
            if (player === undefined) return null;
            player.gotOffer(offer);
        });

        this.socket.on('gotanswer', (senderId, answer) => {
            const player = this.playerRefs.find(ref => ref.props.id === senderId);
            if (player === undefined) return null;
            player.gotAnswer(answer);
        });

        this.socket.on('gotcandidate', (senderId, candidate) => {
            const player = this.playerRefs.find(ref => ref.props.id === senderId);
            if (player === undefined) return null;
            player.gotCandidate(candidate);
        });

        navigator.mediaDevices.getUserMedia({ audio: true, video: true })
            .then((stream) => {
                this.setState({ ownStream: stream });
            })
            .catch((err) => {
                this.setState({ ownStream: null });
                console.log(err);
            });
        this.socket.emit('init');
    }

    componentDidUpdate() {
        if (this.firstRender && this.state.game !== null) {
            this.firstRender = false;
            // called after first render after game has been loaded.
            // refs to players are set now!
            this.props.onSetGameId(this.state.game.id);

            this.socket.emit('setPlayerName', prompt('Spielername:'));
        }
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

    handlePlayerClick(player) {
        if (this.state.switchSeatSelection) {
            this.socket.emit('switchSeat', player.seatIndex);
            this.setState({ switchSeatSelection: false });
            return;
        }
        if (player.id === this.socket.id)
            return; // own player clicked

        const ownPlayer = this.state.game.players.find(p => p.id === this.socket.id);
        const game = this.state.game;
        if (ownPlayer === undefined) this.socket.close(); // no own player, ohoh
        if (game.cups.find(cup => cup === ownPlayer.seatIndex) === undefined) return; // player does not have any cup
        console.log('move cup');
        this.socket.emit('moveCup', player.seatIndex);
    }

    render() {
        if (this.state.game == null)
            return (
                <p>{this.state.errorMessage === null ? 'Spiel lädt..' : this.state.errorMessage}</p>
            );
        else
            return (
                <div className='game noselect'>
                    <div className='circle-container-outer'>
                        <div className='circle-container-inner' style={{ width: this.state.tableRadius * 2 + 'px', height: this.state.tableRadius * 2 + 'px' }}>
                            {this.state.game.players.map((player) => this.renderPlayer(player))}
                            <Cup key='cup1' visible={true} seatIndex={this.state.game.cups[0]} numberOfSeats={this.state.game.players.length} circleRadius={this.state.tableRadius / 1.5 + 'px'} />
                            <Cup key='cup2' visible={true} seatIndex={this.state.game.cups[1]} numberOfSeats={this.state.game.players.length} circleRadius={this.state.tableRadius / 1.5 + 'px'} />
                            <div className='circle-center-outer'>
                        <div className='circle-center-inner'>
                            <span>Kalaschnikow<br />Corona-Edition</span><br />
                        </div>
                    </div>
                        </div>
                    </div>

                    <div className='controlPanel'>
                        {this.renderSwitchSeatButton()}<br/>
                         <button onClick={() => this.setState({muted: !this.state.muted})}>{this.state.muted ? 'Stummschaltung aufheben' : 'Stumm schalten'}</button>
                    </div>
                </div>
            );
    }

    renderSwitchSeatButton() {

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

    renderPlayer(player) {
        const smallerWindowSize = Math.min(this.state.width, this.state.height);
        //const itemRadius = Math.round(this.state.tableRadius * 2 * Math.PI /
        //    (this.state.game.players.length * 2.5)); // by perimeter
        var itemRadius = Math.PI * smallerWindowSize / (this.state.game.players.length*2.5+2*Math.PI);
        itemRadius = Math.min(itemRadius, smallerWindowSize / (3*2)); // or by dividing window in 3 parts
        const circleRadius = (smallerWindowSize - 2*itemRadius)/2 + 'px';
        const angle = Math.round(player.seatIndex / this.state.game.players.length * 360);
        const transform = 'rotate(' + angle + 'deg) translate(' + circleRadius + ') rotate(-' + angle + 'deg)';

        return (
            <div key={player.id} className='circle-item' style={{
                margin: -itemRadius + 'px',
                width: itemRadius * 2 + 'px',
                height: itemRadius * 2 + 'px',
                transform: transform
            }}>
                <Player ref={(ref) => { this.playerRefs[player.seatIndex] = ref; }}
                    onClick={() => this.handlePlayerClick(player)}
                    id={player.id} socket={this.socket}
                    name={player.name} seatIndex={player.seatIndex} muted={this.state.muted}
                    isOwnPlayer={player.id === this.socket.id} ownStream={this.state.ownStream}
                    shouldSendOffers={this.firstRender && (player.id !== this.socket.id)}
                />
            </div>
        );

    }
}

export default Game;