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
        this.shouldSendOffers = props.shouldSendOffers; // make copy
        this.didSetStream = false;
    }
    async componentDidMount() {
        const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
        this.peerConnection = new RTCPeerConnection(configuration);

        this.peerConnection.ontrack = (event) => {
            if (event.track.kind !== 'video') {
                console.log('got audio track only from %s, skip..', this.props.name);
                //return;
            }
            console.log('got video track from player', this.props.name);
            //let inboundStream = new MediaStream(event.track);
            this.setState({ stream: event.streams[0] });
        };

        this.peerConnection.onicecandidate = (event) => {
            console.log('send candidate to %s', this.props.name);
            this.props.socket.emit('sendCandidate', this.props.id, event.candidate);
        };
        this.peerConnection.onnegotiationneeded = (event) => {
            if (this.shouldSendOffers)
                this.sendOffer();
        };
        this.updateVideoStream();
    }


    componentDidUpdate() {
        this.updateVideoStream();
    }

    updateVideoStream() {
        if (this.props.ownStream !== undefined && !this.didSetStream) {
            // stream was set by Game for the first time
            this.didSetStream = true;
            if (this.props.isOwnPlayer) {
                this.setState({ stream: this.props.ownStream });
            } else {
                if(this.props.ownStream === null) {
                    // no webcam stream available. we can not make the offer without a stream
                    // ask the partner to make us an offer
                    this.props.socket.emit('requestOffer', this.props.id);
                } else {
                    this.props.ownStream.getTracks().forEach(track => {
                        this.peerConnection.addTrack(track, this.props.ownStream);
                    });
                }


            }
        }
        if (this.videoRef.current !== null && this.state.stream !== undefined) {
            if (this.videoRef.current.srcObject !== this.state.stream) {
                this.videoRef.current.srcObject = this.state.stream;
                console.log('updated video stream of %s', this.props.name);
            }
        }
    }

    async sendOffer() {
        // call user and send him an offer
        console.log('send offer to %s', this.props.name);
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(new RTCSessionDescription(offer));
        this.props.socket.emit('sendOffer', this.props.id, offer);
    }

    async gotOffer(offer) {
        console.log('got offer from %s, sending answer', this.props.name);
        await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(offer)
        );
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(new RTCSessionDescription(answer));

        this.props.socket.emit('sendAnswer', this.props.id, answer);
    }

    async gotAnswer(answer) {
        console.log('got answer from %s, adding tracks', this.props.name);
        await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(answer)
        );
    }

    async gotCandidate(candidate) {
        console.log('got candidate from %s', this.props.name);
        await this.peerConnection.addIceCandidate(candidate);
    }
    render() {
        return (
            <div className='player' style={this.props.isOwnPlayer ? { borderColor: 'tomato' } : null} onClick={() => this.props.onClick()}>
                <video ref={this.videoRef} playsInline={true} autoPlay={true} muted={(this.props.isOwnPlayer || this.props.muted) ? true : false}></video>
                <span>{this.props.name}</span>
            </div>

        );
    }

}

export default Player;