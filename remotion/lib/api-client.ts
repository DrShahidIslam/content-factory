import { ProjectData } from '../types';
import { prepareProjectData } from './sequencer';
import { scanScriptForSFX } from './sfx-matcher';
import { getAudioDurationInSeconds } from '@remotion/media-utils';

export const fetchProjectData = async (projectId: string): Promise<ProjectData> => {
    try {
        // Use new Query Param based API to support absolute paths
        const response = await fetch(`http://localhost:3000/api/scan-project?path=${encodeURIComponent(projectId)}`);
        if (!response.ok) {
            throw new Error('Failed to fetch project files');
        }
        const data = await response.json();
        console.log("DEBUG: Scanned Assets:", data.assets.map((a: any) => `${a.name} (${a.type})`));

        // --- AUTO-VOICEOVER GENERATION ---
        // If we have a script but NO voiceover, let's generate one!
        const scriptAsset = data.assets.find((a: any) => a.name.toLowerCase() === 'script.txt');
        const hasScript = !!scriptAsset;

        const parsedData = prepareProjectData(projectId, data.assets);
        const hasVO = parsedData.voiceoverTrack; // Check parsed VO

        console.log(`DEBUG: hasScript=${hasScript}, hasVO=${!!hasVO}`);

        if (hasScript && !hasVO) {
            console.log("Script found but no VO. Generating...");
            try {
                // Determine if we already tried generating (to avoid loop)
                const generated = data.assets.some((a: any) => a.name === 'voiceover_generated.wav');
                if (!generated) {
                    await fetch('http://localhost:3000/api/generate-vo', {
                        method: 'POST',
                        body: JSON.stringify({ projectId }),
                        headers: { 'Content-Type': 'application/json' }
                    });

                    // RE-FETCH data after generation
                    const retry = await fetch(`http://localhost:3000/api/scan-project?path=${encodeURIComponent(projectId)}`);
                    const newData = await retry.json();
                    data.assets = newData.assets; // Update assets
                }
            } catch (e) {
                console.warn("Auto-VO Gen failed", e);
            }
        }

        // --- FETCH CAPTIONS (Perfect Sync) ---


        // Process the raw assets into a timeline
        const project = prepareProjectData(projectId, data.assets);

        // --- FETCH CAPTIONS (Perfect Sync) ---
        if (hasVO) {
            try {
                const subAsset = data.assets.find((a: any) => a.name === 'voiceover_generated.mp3.json');
                if (subAsset) {
                    const subRes = await fetch(`http://localhost:3000${subAsset.path}`);
                    if (subRes.ok) {
                        const subJson = await subRes.json();
                        project.captions = subJson;
                        console.log(`Captions Loaded: ${subJson.length} words`);
                    }
                }
            } catch (e) { console.warn("Caption fetch failed", e); }
        }



        // --- THEME DETECTION ---
        try {
            const scriptPath = data.assets.find((a: any) => a.name === 'script.txt')?.path;
            if (scriptPath) {
                // Use localhost fetch for content reading (text is small/safe)
                const scriptRes = await fetch(`http://localhost:3000${scriptPath}`);
                const text = (await scriptRes.text()).toLowerCase();

                if (text.includes('horror') || text.includes('scary') || text.includes('ghost')) {
                    project.theme = 'horror';
                } else if (text.includes('happy') || text.includes('fun') || text.includes('vlog')) {
                    project.theme = 'happy';
                } else if (text.includes('action') || text.includes('fast') || text.includes('fight')) {
                    project.theme = 'exciting';
                }

                // Store content for Captions
                project.scriptContent = text;
            }
        } catch (e) { console.log("Theme detect failed", e); }

        // --- PREPARE DATA FOR RUNTIME PACING ---
        if (project.voiceoverTrack) {
            try {
                const voUrl = `http://localhost:3000${project.voiceoverTrack}`;
                const voDuration = await getAudioDurationInSeconds(voUrl);

                // Store VO Duration as the Target Duration for proper syncing
                project.durationInSeconds = voDuration;

                // We do NOT modify assets here anymore. 
                // We leave that to 'pacing-engine.ts' at runtime (in MainVideo).

                // Just ensure defaults are set
                project.assets.forEach(a => {
                    if (a.type === 'video' && !a.durationInSeconds) a.durationInSeconds = 5;
                    if (a.type === 'image' && !a.durationInSeconds) a.durationInSeconds = project.defaultImageDuration;
                });

            } catch (err) {
                console.warn("VO Duration fetch failed", err);
            }
        }

        // --- AUTOMATIC BACKGROUND MUSIC INSERTION ---
        if (!project.audioTrack) {
            try {
                const sfxRes = await fetch('http://localhost:3000/api/sfx');
                if (sfxRes.ok) {
                    const { sfx } = await sfxRes.json();

                    // Filter for actual music (longer files or specific names) in SFX folder
                    // We look for "Music", "Sad", "Suspense", "Happy"
                    const musicOptions = sfx.filter((f: string) =>
                        f.toLowerCase().includes('music') ||
                        f.toLowerCase().includes('suspense') ||
                        f.toLowerCase().includes('happy') ||
                        f.toLowerCase().includes('cinematic')
                    );

                    if (musicOptions.length > 0) {
                        // Pick one based on theme if possible, otherwise random
                        let bestMatch = musicOptions.find((f: string) => f.toLowerCase().includes(project.theme));
                        if (!bestMatch) bestMatch = musicOptions[Math.floor(Math.random() * musicOptions.length)];

                        project.audioTrack = `/api/serve/sfx/${encodeURIComponent(bestMatch)}`;
                        console.log("Auto-Injected Music:", bestMatch);
                    }
                }
            } catch (e) {
                console.warn("Auto-Music failed", e);
            }
        }

        // --- Smart SFX Injection ---
        try {
            const sfxRes = await fetch('http://localhost:3000/api/sfx');
            if (sfxRes.ok) {
                const { sfx } = await sfxRes.json();
                const scriptAsset = data.assets.find((a: any) => a.name.toLowerCase() === 'script.txt');

                if (scriptAsset && sfx.length > 0) {
                    const textRes = await fetch(`http://localhost:3000${scriptAsset.path}`);
                    if (textRes.ok) {
                        const text = await textRes.text();
                        console.log("SFX: Scanning Script...", text.substring(0, 50) + "...");

                        const matches = scanScriptForSFX(text, sfx);
                        console.log(`SFX: Found ${matches.length} keyword matches.`);

                        // Scale SFX to match Actual VO Duration using character ratios
                        const cleanText = text.replace(/\[[^\]]+\]/g, '');
                        const estimatedDuration = cleanText.length / 12; // ~12 chars per second spoken
                        const actualDuration = project.durationInSeconds || estimatedDuration; // Use final project duration (VO)

                        project.sfxCues = matches.map((m: any, i) => {
                            const exactTime = m.charRatio !== undefined 
                                ? m.charRatio * actualDuration 
                                : m.timestamp;

                            return {
                                id: `smart-sfx-${i}`,
                                name: m.word,
                                filename: m.filename,
                                startFrame: Math.round(exactTime * 30),
                                volume: 1.0 // Bump volume
                            };
                        });
                    }
                }
            }
        } catch (err) {
            console.warn("SFX Injection failed", err);
        }

        return project;
    } catch (e) {
        console.error(e);
        return {
            id: projectId,
            assets: [],
            theme: 'default',
            fps: 30,
            defaultImageDuration: 3
        };
    }
};
