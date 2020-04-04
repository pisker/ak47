import React, { Component } from 'react';
import io from 'socket.io-client'

import Game from './Game.js'

import './App.css';

const url = 'https://' + window.location.hostname + ':' + window.location.port;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      highlightBackground: false,
      isConnected: false,
      gameMode: 'lobby'
    };
    this.ignoreHashChange = false;
  }

  async componentDidMount() {
    this.socket = new io(url);
    this.socket.on('connect', () => {
      this.setState({ isConnected: true });
      const hash = window.location.hash;
      if (hash.length === 7) {
        const value = parseInt(hash.substr(1), 16);
        if (value !== undefined && value > 0) {
          // game id provided in hash
          this.socket.emit('joinGame', value);
        }
      }
      window.onhashchange = () => {
        if (!this.ignoreHashChange) {
          window.location.reload();
        } else
        this.ignoreHashChange = false;

      };
    });

    this.socket.on('gameMode', (mode) => {
      this.setState({ gameMode: mode });
    });

    this.socket.on('disconnect', () => {
      this.setState({ isConnected: false, gameMode: 'lobby' });
    });

  }

  onSetGameId(id) {
    const newHash = '#' + id.toString(16).toUpperCase();
    if (window.location.hash !== newHash) {
      this.ignoreHashChange = true;
      window.location.hash = newHash;
    }
  }

  createGame() {
    this.socket.emit('createGame', 'kalaschnikow');
  }

  highlightBackground() {
    this.setState({ highlightBackground: true });
  }

  unhighlightBackground() {
    this.setState({ highlightBackground: false });
  }

  getAppStyle() {
    if (this.state.highlightBackground)
      return { backgroundColor: '#8a0000' }
    else
      return {};
  }

  render() {
    return (
      <div className="App" style={this.getAppStyle()}>
        <header className="App-center">
          {this.renderContent()}
        </header>
      </div>
    );
  }

  renderContent() {
    if (this.state.isConnected) {
      switch (this.state.gameMode) {
        case 'lobby':
          return (
            <div>
              <p>Kalaschnikow Corona-Edition</p>
              <button onClick={() => this.createGame()}>Neues Spiel erstellen</button>
            </div>
          );
        case 'kalaschnikow':
          return (
            <Game socket={this.socket} highlight={() => this.highlightBackground()}
              unhighlight={() => this.unhighlightBackground()} onSetGameId={(id) => this.onSetGameId(id)} />
          );
        default:
          return (
            <p>Ohoh, das hätte nicht passieren dürfen..</p>
          );
      }

    } else {
      return (
        <p>Verbindung zum Server wird hergestellt</p>
      );
    }
  }
}

export default App;