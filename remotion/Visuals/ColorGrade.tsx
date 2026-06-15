import React from 'react';
import { AbsoluteFill } from 'remotion';

export const ColorGrade: React.FC<{ theme: string }> = ({ theme }) => {
    // Determine Vignette intensity by theme
    const getVignetteStyle = () => {
        switch (theme) {
            case 'horror':
                // Heavy, claustrophobic vignette
                return 'radial-gradient(circle, rgba(0,0,0,0) 30%, rgba(0,0,0,0.85) 100%)';
            case 'sports':
                // Clean focus vignette
                return 'radial-gradient(circle, rgba(0,0,0,0) 65%, rgba(0,0,0,0.65) 100%)';
            case 'exciting':
                // Dynamic dramatic vignette
                return 'radial-gradient(circle, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%)';
            default:
                // Soft standard vignette
                return 'radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,0.5) 100%)';
        }
    };

    // Color tones to blend over the video
    const getBlendOverlay = () => {
        switch (theme) {
            case 'sports':
                // Amber/Gold tint to give stadium footage a warm, premium broadcast glow
                return { color: '#fbbf24', opacity: 0.08, mixMode: 'color-burn' };
            case 'horror':
                // Cold cyan/blue multiply filter for spooky darkness
                return { color: '#0f172a', opacity: 0.2, mixMode: 'multiply' };
            case 'happy':
                // Warm orange/pink tint for soft sunlight leaks
                return { color: '#f97316', opacity: 0.05, mixMode: 'screen' };
            case 'exciting':
                // Deep blue cinematic overlay
                return { color: '#2563eb', opacity: 0.06, mixMode: 'overlay' };
            default:
                // Subtle cool cinematic grading
                return { color: '#3b82f6', opacity: 0.04, mixMode: 'overlay' };
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
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: blend.color,
                opacity: blend.opacity,
                mixBlendMode: blend.mixMode as any,
            }} />
        </AbsoluteFill>
    );
};

