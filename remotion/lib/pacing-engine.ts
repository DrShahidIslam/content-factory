
import { ProjectData, Asset } from '../types';
import { getAudioDurationInSeconds } from '@remotion/media-utils'; // Note: This is async. We might need to keep duration fetching in api-client.

// We assume api-client has already populated 'durationInSeconds' with RAW values.
// This function strictly handles the SCALING logic based on Theme/Transition.

export const applyHybridPacing = (project: ProjectData, activeTheme: 'horror' | 'exciting' | 'happy' | 'sports' | 'default'): ProjectData => {
    // Clone to avoid mutation
    const p = { ...project, assets: project.assets.map(a => ({ ...a })) };

    // 1. Determine Overlap Loss based on Active Theme
    const TRANSITION_DURATION_SEC = activeTheme === 'horror' ? 1.0 : 0.33; // Must match MainVideo logic
    const visualAssets = p.assets.filter(a => a.type === 'image' || a.type === 'video');

    const totalOverlaps = Math.max(0, visualAssets.length - 1);
    const lostTimeDueToTransitions = totalOverlaps * TRANSITION_DURATION_SEC;

    // 2. Sum Raw Durations
    // We expect api-client to have populated 'durationInSeconds' for everything.
    // If not, we fall back to defaults.
    let totalVisualRawDuration = 0;
    visualAssets.forEach(a => {
        totalVisualRawDuration += (a.durationInSeconds || p.defaultImageDuration);
    });

    // 3. Audio Duration
    // We can't fetch duration here (sync). We assume project.durationInSeconds was set to VO duration by api-client ??
    // Actually, api-client *does* fetch VO duration. Let's rely on p.voiceoverDuration (we need to add this field) OR
    // we use the master duration if set.
    // Let's assume passed project.durationInSeconds IS the VO duration (or master target).

    const targetAudioDuration = p.durationInSeconds || totalVisualRawDuration;

    // 4. Calculate Ratio
    const effectiveVisualDuration = totalVisualRawDuration - lostTimeDueToTransitions;

    // Guard: Div by zero
    if (targetAudioDuration === 0) return p;

    const visualToAudioRatio = effectiveVisualDuration / targetAudioDuration;

    // 5. Decision Logic
    const ELASTIC_THRESHOLD_LOW = 0.85;
    const ELASTIC_THRESHOLD_HIGH = 1.15;

    if (visualToAudioRatio >= ELASTIC_THRESHOLD_LOW && visualToAudioRatio <= ELASTIC_THRESHOLD_HIGH) {
        // STRATEGY A: Elastic Audio
        // Visuals are "close enough". We keep visual duration.
        // We stretch Audio to match Visuals.

        // Effective Visuals = 30s. Audio = 32s.
        // We want Audio to take 30s. PlaybackRate = 32/30 = 1.06 (Faster).
        // p.voiceoverPlaybackRate = 1 / visualToAudioRatio;

        // WAIT: If Ratio = Visual / Audio.
        // If Visual (30) < Audio (32). Ratio = 0.93.
        // Rate = 1 / 0.93 = 1.07. Correct.
        const audioRate = 1 / visualToAudioRatio;
        p.voiceoverPlaybackRate = audioRate;

        // Master Duration = Effective Visuals
        p.durationInSeconds = effectiveVisualDuration;

        // SCALE SFX (Strategy A)
        // If Audio plays faster, SFX must happen earlier!
        if (p.sfxCues && audioRate !== 1) {
            p.sfxCues = p.sfxCues.map(cue => ({
                ...cue,
                // If Rate is 2x (Fast), sound at 10s should play at 5s.
                // StartFrame new = StartFrame old / Rate
                startFrame: Math.round(cue.startFrame / audioRate)
            }));
        }

    } else {
        // STRATEGY B: Time Remapping
        // Sync Visuals to Audio.
        // Target: RawSum * Scale - LostTime = AudioDuration
        // Scale = (AudioDuration + LostTime) / RawSum

        // We need 'voDuration'. If 'p.durationInSeconds' was modified?
        // Let's assume the passed 'p.durationInSeconds' is the REFERENCE Audio Duration.

        const targetRawSum = targetAudioDuration + lostTimeDueToTransitions;
        const scaleFactor = targetRawSum / totalVisualRawDuration;

        p.voiceoverPlaybackRate = 1;

        p.assets.forEach(asset => {
            if (asset.type === 'image' || asset.type === 'video') {
                const rawDur = asset.durationInSeconds || p.defaultImageDuration;
                const newDur = rawDur * scaleFactor;
                asset.durationInSeconds = newDur;

                if (asset.type === 'video') {
                    asset.playbackRate = 1 / scaleFactor;
                }
            }
        });

        // Update Master Duration to match Audio
        p.durationInSeconds = targetAudioDuration;
    }

    return p;
};
