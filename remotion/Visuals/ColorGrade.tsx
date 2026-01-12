
import React from 'react';
import { AbsoluteFill } from 'remotion';

export const ColorGrade: React.FC = () => {
    return (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
            {/* 1. Vignette */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,0.6) 100%)',
                zIndex: 1
            }} />

            {/* 2. Cinematic Contrast/Saturation Overlay */}
            {/* Using mix-blend-mode: overlay with a mid-gray/blue tint adds a "film" look */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: '#22a', // Deep Blue Tint
                opacity: 0.1,
                mixBlendMode: 'overlay',
                zIndex: 2
            }} />
        </AbsoluteFill>
    );
};
