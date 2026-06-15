import React from 'react';
import { AbsoluteFill } from 'remotion';

export const ColorGrade: React.FC<{ colorFilter: string }> = ({ colorFilter }) => {
    // Determine Vignette intensity by colorFilter
    const getVignetteStyle = () => {
        switch (colorFilter) {
            case 'cold-cinematic':
            case 'neon-cyber':
                return 'radial-gradient(circle, rgba(0,0,0,0) 45%, rgba(0,0,0,0.75) 100%)';
            case 'vintage-sepia':
            case 'noir':
                return 'radial-gradient(circle, rgba(0,0,0,0) 35%, rgba(0,0,0,0.8) 100%)';
            case 'vibrant-sports':
                return 'radial-gradient(circle, rgba(0,0,0,0) 65%, rgba(0,0,0,0.65) 100%)';
            case 'warm-gold':
                return 'radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,0.55) 100%)';
            default:
                // Soft standard vignette
                return 'radial-gradient(circle, rgba(0,0,0,0) 65%, rgba(0,0,0,0.45) 100%)';
        }
    };

    // Color tones to blend over the video
    const getBlendOverlay = () => {
        switch (colorFilter) {
            case 'vibrant-sports':
                return { color: '#fbbf24', opacity: 0.08, mixMode: 'color-burn' };
            case 'warm-gold':
                return { color: '#f59e0b', opacity: 0.08, mixMode: 'overlay' };
            case 'cold-cinematic':
                return { color: '#0f172a', opacity: 0.15, mixMode: 'multiply' };
            case 'vintage-sepia':
                return { color: '#78350f', opacity: 0.08, mixMode: 'color-burn' };
            case 'noir':
                return { color: '#1e293b', opacity: 0.04, mixMode: 'multiply' };
            case 'neon-cyber':
                return { color: '#db2777', opacity: 0.08, mixMode: 'overlay' };
            default:
                // None / Passthrough
                return null;
        }
    };

    const blend = getBlendOverlay();

    return (
        <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 9 }}>
            {/* 1. Dynamic Vignette */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: getVignetteStyle(),
            }} />

            {/* 2. Cinematic Blend Overlay */}
            {blend && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: blend.color,
                    opacity: blend.opacity,
                    mixBlendMode: blend.mixMode as any,
                }} />
            )}
        </AbsoluteFill>
    );
};

