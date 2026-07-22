import React, { useState, useEffect } from 'react';

const SignalIntersection = ({ selectedLane, signalAction, urgency }) => {
  
  // Lane direction mapping
  const laneDirections = {
    'L1': 'LEFT',
    'L2': 'DOWN',
    'L3': 'RIGHT',
    'L4': 'UP'
  };

  const selectedDirection = laneDirections[selectedLane] || 'DOWN';
  const isForceGreen = signalAction?.includes('FORCE');
  const isHighUrgency = urgency === 'HIGH';

  // State for smooth transitions with yellow light
  const [signalStates, setSignalStates] = useState({
    UP: 'RED',
    DOWN: 'RED',
    LEFT: 'RED',
    RIGHT: 'RED'
  });

  // Smooth transition logic: RED → YELLOW → GREEN
  useEffect(() => {
    if (!selectedDirection) return;

    // All directions RED initially
    const initialStates = {
      UP: 'RED',
      DOWN: 'RED',
      LEFT: 'RED',
      RIGHT: 'RED'
    };

    // Step 1: Show YELLOW for selected direction (transition phase)
    setSignalStates({
      ...initialStates,
      [selectedDirection]: 'YELLOW'
    });

    // Step 2: After 800ms, switch to GREEN
    const timer = setTimeout(() => {
      setSignalStates((prev) => ({
        ...initialStates,
        [selectedDirection]: 'GREEN'
      }));
    }, 800);

    return () => clearTimeout(timer);
  }, [selectedDirection]);

  const SignalLight = ({ direction, label }) => {
    const state = signalStates[direction];
    const isSelected = direction === selectedDirection;

    return (
      <div className={`signal-direction ${direction.toLowerCase()} ${isSelected ? 'selected' : ''}`}>
        {/* REALISTIC TRAFFIC LIGHT - 3 BULBS */}
        <div className="traffic-light-housing">
          {/* RED LIGHT */}
          <div className={`traffic-bulb red ${state === 'RED' ? 'lit' : 'off'}`}>
            <div className="bulb-glow"></div>
          </div>
          
          {/* YELLOW LIGHT */}
          <div className={`traffic-bulb yellow ${state === 'YELLOW' ? 'lit' : 'off'}`}>
            <div className="bulb-glow"></div>
          </div>
          
          {/* GREEN LIGHT */}
          <div className={`traffic-bulb green ${state === 'GREEN' ? 'lit' : 'off'} ${isForceGreen && isSelected ? 'blinking' : ''}`}>
            <div className="bulb-glow"></div>
          </div>
        </div>

        {/* DIRECTION ARROW */}
        <div className={`signal-arrow-icon ${state.toLowerCase()}`}>
          {direction === 'UP' && '↑'}
          {direction === 'DOWN' && '↓'}
          {direction === 'LEFT' && '←'}
          {direction === 'RIGHT' && '→'}
        </div>

        {/* LANE LABEL */}
        <div className={`signal-label ${state.toLowerCase()}`}>
          {label}
        </div>
      </div>
    );
  };

  return (
    <div className={`signal-intersection ${isHighUrgency ? 'critical' : ''}`}>
      <div className="intersection-header">
        <span className="intersection-title">SIGNAL INTERSECTION</span>
        <span className="intersection-status">
          {isForceGreen ? 'FORCE GREEN' : 'PRIORITY'}
        </span>
      </div>

      <div className="intersection-grid">
        
        {/* TOP - UP */}
        <div className="grid-top">
          <SignalLight direction="UP" label="L4" />
        </div>

        {/* MIDDLE ROW */}
        <div className="grid-middle">
          <SignalLight direction="LEFT" label="L1" />
          
          <div className="intersection-center">
            <div className="center-icon">╳</div>
          </div>
          
          <SignalLight direction="RIGHT" label="L3" />
        </div>

        {/* BOTTOM - DOWN */}
        <div className="grid-bottom">
          <SignalLight direction="DOWN" label="L2" />
        </div>

      </div>

      <div className="intersection-footer">
        <span className="footer-label">Active Lane:</span>
        <span className="footer-value">{selectedLane || 'N/A'}</span>
      </div>
    </div>
  );
};

export default SignalIntersection;
