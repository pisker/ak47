import React, { Component } from 'react';

import './Cup.css';
import image from './becher.png';

class Cup extends Component {
    constructor(props) {
        super(props);
        this.state = {

        };
    }

    componentDidMount() {

    }


    render() {
        if (this.props.visible) {
            var angle = Math.round(this.props.seatIndex / this.props.numberOfSeats * 360);
            var transform = 'rotate(' + angle + 'deg) translate(' + this.props.circleRadius + ') rotate(-' + angle + 'deg)';
    
            return (
                <div className='circle-item cup' style={{transform: transform}}>
                    <img src={image} alt='Becher' width='50px'/>
                </div>
            );
        }
        return null;
    }
}

export default Cup;