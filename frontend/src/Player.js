import adapter from 'webrtc-adapter';
import React, { Component } from 'react';

import './Player.css';

const { RTCPeerConnection, RTCSessionDescription } = window;

class Player extends Component {
    constructor(props) {
        super(props);
        this.state = {
        };
        this.videoRef = React.createRef();
        this.peerConnection = new RTCPeerConnection();
        this.callMade = false;
    }

    async componentDidMount() {
        if (this.props.isOwnPlayer) {
            this.setState({ stream: window.ownStream });
        } else if(window.ownStream !== undefined) {
            window.ownStream.getTracks().forEach(track => {
                console.log('adding track to peer connection');
                 this.peerConnection.addTrack(track, window.ownStream);
            });
        }
        this.peerConnection.ontrack = (event)  => {
            console.log('got track from player %s', this.props.name);
            console.log(event.streams[0]);
            this.setState({ stream: event.streams[0] });
        };
        this.peerConnection.onconnectionstatechange = (event) => console.log(event);
    }

    componentDidUpdate() {
        this.updateVideoStream();
    }

    updateVideoStream() {
        if (this.videoRef.current !== null && this.state.stream !== undefined) {
            console.log('updating video stream for player %d (active: %s)', this.props.name, this.state.stream.active);
            if (this.videoRef.current.srcObject !== this.state.stream) {
                this.videoRef.current.srcObject = this.state.stream;
                console.log(this.videoRef.current);
                this.videoRef.current.play();
            }
        } else
            console.log('updateVideoStream: videoRef is null..');
    }

    async sendOffer() {
        // call user and send him an offer
        console.log('send offer to %s', this.props.name);
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(new RTCSessionDescription(offer));
        this.props.onSendOffer(offer);
    }

    async gotOffer(offer) {
        console.log('got offer from %s, sending answer', this.props.name);
        await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(offer)
        );
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(new RTCSessionDescription(answer));

        // send answer
        this.props.onSendAnswer(answer);
    }

    async gotAnswer(answer) {
        console.log('got answer from %s, adding tracks', this.props.name);
        await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(answer)
        );
        if(!this.callMade) {
            this.sendOffer();
            this.callMade = true;
        }

    }

    renderContent() {
        if(this.state.stream !== undefined && this.state.stream.active) {
            return (
                <div className='test'>
                    <video ref={this.videoRef} playsInline={true} autoPlay={true} muted={this.props.isOwnPlayer ? true : true}></video>
                    <span>{this.props.name}</span>
                </div>
             );
        } else {
            return (
            <span>{this.props.name}</span>
            );
        }
    }

    render() {
        if (!this.props.isUsed) {
            return (
                <div className='player' onClick={() => this.props.onClick()}>
                    <p>{
                        this.props.showSeatSelection ?
                            'Platz ' + (this.props.seatIndex + 1) + ' wählen' :
                            'Leer'
                    }</p>
                </div>
            );
        }
        else {
            return (
                <div className='player' style={this.props.isOwnPlayer ? { borderColor: 'tomato' } : null} onClick={() => this.props.onClick()}>
                    {this.renderContent()}
                </div>

            );
        }

    }
}

export default Player;