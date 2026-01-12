
import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { FONT_FAMILY } from './constants';

interface CaptionsProps {
    captions?: { part: string; start: number; end: number }[]; // Perfect Sync (ms)
    scriptText?: string; // Fallback (estimated)
    durationInSeconds: number;
    fps: number;
    playbackRate?: number; // Needed to scale timings if audio is sped up
}

interface Word {
    part: string; // Unified name
    startFrame: number;
    endFrame: number;
}

export const Captions: React.FC<CaptionsProps> = ({ captions, scriptText, durationInSeconds, fps, playbackRate = 1 }) => {
    const frame = useCurrentFrame();

    const words: Word[] = useMemo(() => {
        // 1. Prioritize Perfect Sync
        if (captions && captions.length > 0) {
            return captions.map(c => ({
                part: c.part,
                startFrame: (c.start / 1000) * fps / playbackRate,
                endFrame: (c.end / 1000) * fps / playbackRate
            }));
        }

        // 2. Fallback: Estimate from Script
        if (scriptText) {
            const cleanText = scriptText.replace(/\s+/g, ' ').trim();
            const tokens = cleanText.split(' ');
            const totalFrames = durationInSeconds * fps;
            const framesPerWord = totalFrames / tokens.length;

            return tokens.map((token, i) => ({
                part: token,
                startFrame: i * framesPerWord,
                endFrame: (i + 1) * framesPerWord
            }));
        }

        return [];
    }, [captions, scriptText, durationInSeconds, fps]);

    // Find Active Word
    const activeWordIndex = words.findIndex(w => frame >= w.startFrame && frame < w.endFrame);
    const activeWord = words[activeWordIndex];

    if (!activeWord) return null;

    // Animation Calculation
    const timeInWord = frame - activeWord.startFrame;
    const scale = spring({
        fps,
        frame: timeInWord,
        config: { damping: 10, stiffness: 200 }
    });

    const isImportant = activeWord.part.length > 5;
    const color = isImportant ? '#fbbf24' : 'white';
    const shadow = isImportant ? '0px 0px 20px rgba(251, 191, 36, 0.5)' : '0px 4px 4px rgba(0,0,0,0.5)';

    return (
        <div style={{
            position: 'absolute',
            top: '40%', // Center-ISH
            width: '100%',
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10
        }}>
            <div style={{
                fontFamily: FONT_FAMILY,
                fontSize: 80,
                fontWeight: 900,
                color: color,
                textShadow: shadow,
                transform: `scale(${scale})`,
                WebkitTextStroke: '2px black',
                padding: '0 20px'
            }}>
                {activeWord.part}
            </div>
        </div>
    );
};
