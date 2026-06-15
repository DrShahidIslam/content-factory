import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface SportsOverlayProps {
    text: string;
    styleType?: 'gold' | 'neon' | 'impact';
}

export const SportsOverlay: React.FC<SportsOverlayProps> = ({ text, styleType = 'impact' }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Entrance Animation (Pop and Scale)
    const scale = spring({
        fps,
        frame,
        config: {
            damping: 12,
            stiffness: 200,
            mass: 0.5,
        },
    });

    // Slight continuous scale (Heartbeat / Tension)
    const tensionScale = interpolate(
        Math.sin(frame / 5),
        [-1, 1],
        [1, 1.05]
    );

    // Dynamic Shake during the first 15 frames for impact
    const shakeX = frame < 15 ? interpolate(Math.random(), [0, 1], [-10, 10]) : 0;
    const shakeY = frame < 15 ? interpolate(Math.random(), [0, 1], [-10, 10]) : 0;

    let textStyle: React.CSSProperties = {
        fontFamily: 'Impact, sans-serif',
        fontSize: '120px',
        fontWeight: 'bold',
        textAlign: 'center',
        textTransform: 'uppercase',
        lineHeight: 1.1,
        margin: 0,
        padding: '0 40px',
        transform: `scale(${scale * tensionScale}) translate(${shakeX}px, ${shakeY}px)`,
    };

    if (styleType === 'gold') {
        textStyle = {
            ...textStyle,
            color: '#FFD700',
            textShadow: '0px 8px 16px rgba(0,0,0,0.8), 0px 0px 20px #FF8C00',
            WebkitTextStroke: '3px #000',
        };
    } else if (styleType === 'neon') {
        textStyle = {
            ...textStyle,
            color: '#FFF',
            textShadow: '0 0 10px #fff, 0 0 20px #fff, 0 0 40px #0ff, 0 0 80px #0ff, 0 0 120px #0ff',
            fontStyle: 'italic',
        };
    } else {
        // Impact (Default)
        textStyle = {
            ...textStyle,
            color: '#FFF',
            textShadow: '4px 4px 0px #000, 8px 8px 0px rgba(0,0,0,0.5)',
            WebkitTextStroke: '2px #000',
            fontStyle: 'italic',
        };
    }

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'none',
            zIndex: 100, // Ensure it's on top of videos
        }}>
            <h1 style={textStyle}>{text}</h1>
        </div>
    );
};
