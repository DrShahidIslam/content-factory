import React from 'react';
import { useVideoConfig, useCurrentFrame, Audio, Img, Video } from 'remotion';
import { ProjectData } from './types';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { flip } from '@remotion/transitions/flip';
import { applyHybridPacing } from './lib/pacing-engine';
import { Captions } from './Captions';
import { ColorGrade } from './Visuals/ColorGrade';

// Random Transition Picker (Themed)
const getThemedTransition = (index: number, theme: 'horror' | 'exciting' | 'happy' | 'default') => {
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

    // Themed Duration
    const TRANSITION_DURATION = activeTheme === 'horror' ? 30 : 10;

    // Themed Transition SFX
    const getThemedSFX = (idx: number) => {
        if (activeTheme === 'horror') return 'Cinematic Boom 1.mp3'; // Scarier
        if (activeTheme === 'happy') return 'Pop 1.mp3';
        if (activeTheme === 'exciting') return 'Whoosh 3.mp3';
        return 'Cinematic Whoosh.mp3';
    }

    // "Alive" Pulse Animation (Simulated Beat)
    const frame = useCurrentFrame();

    // Scale slightly on the beat (every 60 frames approx)
    // 1.0 -> 1.02 -> 1.0
    const beat = Math.sin(frame / 10) * 0.005 + 1.005; // Very subtle breath

    return (
        <div style={{ flex: 1, backgroundColor: 'black', transform: `scale(${beat})` }}>
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

            {/* Visual Timeline with Transitions */}
            <TransitionSeries>
                {assets.map((asset, index) => {
                    const durationInSeconds = asset.durationInSeconds || defaultImageDuration;
                    const durationInFrames = Math.round(durationInSeconds * fps);

                    return (
                        <React.Fragment key={index}>
                            <TransitionSeries.Sequence durationInFrames={durationInFrames}>
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
                                    <Video
                                        src={asset.path}
                                        playbackRate={asset.playbackRate || 1} // Apply Time Remapping
                                        muted={true} // Ensure background video audio doesn't clash with VO
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                    />
                                ) : null}
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
                        src="http://localhost:3000/api/serve/sfx/Cinematic%20Whoosh.mp3"
                        startFrom={triggerFrame}
                        endAt={triggerFrame + 30}

                        volume={0.8}
                    />
                );
            })}

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
            <ColorGrade />
        </div>
    );
};
