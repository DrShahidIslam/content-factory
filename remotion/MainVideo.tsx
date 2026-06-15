import React from 'react';
import { useVideoConfig, useCurrentFrame, Audio, Img, Video, interpolate, AbsoluteFill, Sequence } from 'remotion';
import { ProjectData } from './types';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { flip } from '@remotion/transitions/flip';
import { applyHybridPacing } from './lib/pacing-engine';
import { Captions } from './Captions';
import { ColorGrade } from './Visuals/ColorGrade';
import { SportsOverlay } from './Visuals/SportsOverlay';

const SpeedRampedVideo: React.FC<{
    src: string;
    speedRamp: 'none' | 'impact-slow' | 'slow-fast' | 'fast-slow';
    durationInFrames: number;
    originalDuration?: number;
    fps: number;
}> = ({ src, speedRamp, durationInFrames, originalDuration, fps }) => {
    const totalDurationSec = originalDuration || (durationInFrames / fps);

    if (!speedRamp || speedRamp === 'none') {
        return (
            <Video
                src={src}
                muted={true}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
        );
    }

    let parts: {
        compStartPct: number;
        compEndPct: number;
        videoStartPct: number;
        videoEndPct: number;
    }[] = [];

    if (speedRamp === 'impact-slow') {
        parts = [
            { compStartPct: 0, compEndPct: 0.3, videoStartPct: 0, videoEndPct: 0.45 },
            { compStartPct: 0.3, compEndPct: 0.7, videoStartPct: 0.45, videoEndPct: 0.55 },
            { compStartPct: 0.7, compEndPct: 1.0, videoStartPct: 0.55, videoEndPct: 1.0 }
        ];
    } else if (speedRamp === 'slow-fast') {
        parts = [
            { compStartPct: 0, compEndPct: 0.5, videoStartPct: 0, videoEndPct: 0.2 },
            { compStartPct: 0.5, compEndPct: 1.0, videoStartPct: 0.2, videoEndPct: 1.0 }
        ];
    } else if (speedRamp === 'fast-slow') {
        parts = [
            { compStartPct: 0, compEndPct: 0.5, videoStartPct: 0, videoEndPct: 0.8 },
            { compStartPct: 0.5, compEndPct: 1.0, videoStartPct: 0.8, videoEndPct: 1.0 }
        ];
    }

    return (
        <AbsoluteFill>
            {parts.map((part, i) => {
                const startFrame = Math.round(part.compStartPct * durationInFrames);
                const endFrame = Math.round(part.compEndPct * durationInFrames);
                const partDurationFrames = endFrame - startFrame;

                if (partDurationFrames <= 0) return null;

                const startSec = part.videoStartPct * totalDurationSec;
                const endSec = part.videoEndPct * totalDurationSec;
                const playDuration = endSec - startSec;

                const compDurationSec = partDurationFrames / fps;
                const playbackRate = playDuration / compDurationSec;
                const safePlaybackRate = Math.min(16, Math.max(0.1, playbackRate));

                const videoStartFrame = Math.round(startSec * fps);
                const videoEndFrame = Math.round(endSec * fps);

                return (
                    <Sequence
                        key={i}
                        from={startFrame}
                        durationInFrames={partDurationFrames}
                        layout="absolute-fill"
                    >
                        <Video
                            src={src}
                            startFrom={videoStartFrame}
                            endAt={videoEndFrame}
                            playbackRate={safePlaybackRate}
                            muted={true}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                            }}
                        />
                    </Sequence>
                );
            })}
        </AbsoluteFill>
    );
};

// SequenceContent wrapper for Ken Burns & Camera Shake effects
const SequenceContent: React.FC<{
    asset: any;
    activeTheme: string;
    durationInFrames: number;
    fps: number;
}> = ({ asset, activeTheme, durationInFrames, fps }) => {
    const frame = useCurrentFrame();

    // 1. Ken Burns Zoom-in Animation
    const scale = interpolate(
        frame,
        [0, durationInFrames],
        [1.04, 1.14],
        { extrapolateRight: 'clamp' }
    );

    // 2. Camera Shake on cut impact (first 12 frames of sports clips)
    let translateX = 0;
    let translateY = 0;
    if ((activeTheme === 'sports' || activeTheme === 'exciting') && frame < 12) {
        const shakeIntensity = interpolate(frame, [0, 12], [5, 0], { extrapolateRight: 'clamp' });
        translateX = Math.sin(frame * 2.2) * shakeIntensity;
        translateY = Math.cos(frame * 2.2) * shakeIntensity;
    }

    return (
        <div style={{
            width: '100%',
            height: '100%',
            transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
        }}>
            {asset.type === 'image' ? (
                <Img
                    src={asset.path}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                    }}
                />
            ) : asset.type === 'video' ? (
                <SpeedRampedVideo
                    src={asset.path}
                    speedRamp={asset.speedRamp}
                    durationInFrames={durationInFrames}
                    originalDuration={asset.originalDuration}
                    fps={fps}
                />
            ) : null}
        </div>
    );
};

// Random Transition Picker (Themed)
const getThemedTransition = (index: number, theme: 'horror' | 'exciting' | 'happy' | 'sports' | 'default'): any => {
    let transitions;

    switch (theme) {
        case 'horror':
            // Horror: Mostly slow fades, occasional static wipe (simulated by random)
            transitions = [fade()];
            break;
        case 'exciting':
            // Action: Fast cuts, slides, wipes
            transitions = [slide(), wipe(), flip()];
            break;
        case 'sports':
            // Sports: Very fast cuts, flash transitions (simulated by fast fade/slide)
            transitions = [slide({ direction: 'from-left' }), slide({ direction: 'from-bottom' })];
            break;
        case 'happy':
            transitions = [fade(), slide()];
            break;
        default:
            transitions = [fade(), slide(), wipe(), flip()];
    }

    // Use index + pseudo-random to keep consistent on re-render but random-ish
    return transitions[(index * 7) % transitions.length];
};

export const MainVideo: React.FC<{ projectData: ProjectData }> = ({ projectData }) => {
    const { width, height } = useVideoConfig();

    // --- Dynamic Runtime Pacing ---
    // Recalculate timeline whenever Theme changes to ensure Sync
    const pacedData = React.useMemo(() => {
        // Use the Theme passed from UI override, or fallback to project default
        const activeTheme = projectData.theme || 'default';
        return applyHybridPacing(projectData, activeTheme);
    }, [projectData]);

    const { assets, audioTrack, voiceoverTrack, defaultImageDuration, fps } = pacedData;
    const activeTheme = projectData.theme || 'default'; // Current UI theme
    const activeFilter = projectData.colorFilter || 'none'; // Current Color Grading Filter

    // Themed Duration
    const TRANSITION_DURATION = activeTheme === 'horror' ? 30 : (activeTheme === 'sports' ? 5 : 10);

    // Themed Transition SFX
    const getThemedSFX = (idx: number) => {
        if (activeTheme === 'horror') return 'Cinematic Boom 1.mp3'; // Scarier
        if (activeTheme === 'happy') return 'Pop 1.mp3';
        if (activeTheme === 'exciting' || activeTheme === 'sports') return 'Whoosh 3.mp3';
        return 'Cinematic Whoosh.mp3';
    }

    // Apply color grade filter preset directly to video container
    const getVideoFilter = () => {
        switch (activeFilter) {
            case 'vibrant-sports':
                return 'contrast(1.18) saturate(1.4) brightness(1.05)'; // Bold vibrant stadium look
            case 'warm-gold':
                return 'contrast(1.1) saturate(1.2) brightness(1.05) sepia(0.08)'; // Warm sunset glow
            case 'cold-cinematic':
                return 'contrast(1.2) saturate(0.75) brightness(0.95) hue-rotate(5deg)'; // Cold creepy blue-cyan tone
            case 'vintage-sepia':
                return 'contrast(0.95) saturate(0.8) sepia(0.35) brightness(1.02)'; // Nostalgic retro sepia
            case 'noir':
                return 'contrast(1.3) grayscale(1.0) brightness(0.95)'; // Moody Black & White
            case 'neon-cyber':
                return 'contrast(1.25) saturate(1.5) hue-rotate(-20deg)'; // Cyberpunk neon pop
            default:
                return 'none';
        }
    };

    // "Alive" Pulse Animation (Simulated Beat)
    const frame = useCurrentFrame();

    // Scale slightly on the beat (every 60 frames approx)
    // 1.0 -> 1.02 -> 1.0
    const beat = Math.sin(frame / 10) * 0.005 + 1.005; // Very subtle breath

    return (
        <div style={{ flex: 1, backgroundColor: 'black', transform: `scale(${beat})`, position: 'relative' }}>


            {/* Background Music */}
            {audioTrack && (
                <Audio
                    src={audioTrack}
                    volume={voiceoverTrack ? 0.15 : 0.5} // Auto-Duck to 15% if VO exists
                />
            )}

            {/* Voiceover */}
            {voiceoverTrack && (
                <Audio
                    src={voiceoverTrack}
                    playbackRate={pacedData.voiceoverPlaybackRate || 1} // Correct! Use dynamic rate
                />
            )}

            {/* Continuous Stadium Crowd Noise for Sports Theme */}
            {activeTheme === 'sports' && assets.length > 0 && (
                <Audio
                    src="http://localhost:3000/api/serve/sfx/Stadium%20Cheer.mp3"
                    volume={0.25}
                />
            )}

            {/* Visual Timeline with Transitions */}
            <div style={{ width: '100%', height: '100%', filter: getVideoFilter() }}>
                <TransitionSeries>
                    {assets.map((asset, index) => {
                        const durationInSeconds = asset.durationInSeconds || defaultImageDuration;
                        const durationInFrames = Math.round(durationInSeconds * fps);

                        return (
                            <React.Fragment key={index}>
                                <TransitionSeries.Sequence durationInFrames={durationInFrames}>
                                    <SequenceContent
                                        asset={asset}
                                        activeTheme={activeTheme}
                                        durationInFrames={durationInFrames}
                                        fps={fps}
                                    />

                                    {/* Custom Text Overlay for this clip */}
                                    {asset.overlayText && (
                                        <SportsOverlay text={asset.overlayText} styleType={activeTheme === 'sports' ? 'gold' : 'impact'} />
                                    )}
                                </TransitionSeries.Sequence>

                                {/* Auto-Transition between clips (except last one) */}
                                {index < assets.length - 1 && (
                                    <TransitionSeries.Transition
                                        presentation={getThemedTransition(index, activeTheme as any)}
                                        timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
                                    />
                                )}
                            </React.Fragment>
                        );
                    })}
                </TransitionSeries>
            </div>

            {/* Auto-SFX Layer */}
            {assets.map((asset, index) => {
                // Calculate accumulated time
                const prevDuration = assets
                    .slice(0, index)
                    .reduce((acc, a) => acc + (a.durationInSeconds || defaultImageDuration), 0);

                // Play whoosh at the end of this clip (start of transition)
                // We offset by -0.5s (15 frames) to sync with transition center
                const triggerFrame = Math.round((prevDuration + (asset.durationInSeconds || defaultImageDuration)) * fps) - 15;

                // Don't play after last clip
                if (index === assets.length - 1) return null;

                return (
                    <Audio
                        key={`sfx-${index}`}
                        src={`http://localhost:3000/api/serve/sfx/${getThemedSFX(index)}`}
                        startFrom={Math.max(0, triggerFrame)}
                        endAt={triggerFrame + 30}
                        volume={0.8}
                    />
                );
            })}

            {/* Continuous Stadium Crowd Noise for Sports Theme */}
            {activeTheme === 'sports' && assets.length > 0 && (
                <Audio
                    src="http://localhost:3000/api/serve/sfx/Stadium%20Cheer.mp3"
                    volume={0.3} // Low volume in background
                />
            )}

            {/* Smart Keyword SFX Layer */}
            {pacedData.sfxCues?.map((cue) => (
                <Audio
                    key={cue.id}
                    src={`http://localhost:3000/api/serve/sfx/${encodeURIComponent(cue.filename)}`}
                    startFrom={Math.max(0, cue.startFrame)}
                    volume={cue.volume}
                />
            ))}

            {/* Captions Layer */}
            {projectData.voiceoverTrack && projectData.scriptContent && (
                <Captions
                    captions={projectData.captions}
                    scriptText={projectData.scriptContent}
                    durationInSeconds={projectData.durationInSeconds || 10}
                    fps={fps}
                    playbackRate={pacedData.voiceoverPlaybackRate || 1}
                />
            )}

            {/* Visual Polish */}
            <ColorGrade colorFilter={activeFilter} />
        </div>
    );
};
