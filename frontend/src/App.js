import React, { Component } from 'react';

import Game from './Game.js'

import './App.css';


class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      highlightBackground: false
    };
  }

  async componentDidMount() {

  }

  highlightBackground() {
    this.setState({highlightBackground: true});
  }

  unhighlightBackground() {
    this.setState({highlightBackground: false});
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
          <Game highlight={() => this.highlightBackground()} unhighlight={() => this.unhighlightBackground()} />
        </header>
      </div>
    );
  }
}

export default App;