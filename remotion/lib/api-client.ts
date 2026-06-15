import { ProjectData } from '../types';
import { prepareProjectData } from './sequencer';
import { scanScriptForSFX } from './sfx-matcher';
import { getAudioDurationInSeconds, getVideoMetadata } from '@remotion/media-utils';

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

        // --- FETCH VIDEO DURATIONS DYNAMICALLY ---
        for (const asset of project.assets) {
            if (asset.type === 'video' && !asset.originalDuration) {
                try {
                    const fullUrl = asset.path.startsWith('http') ? asset.path : `http://localhost:3000${asset.path}`;
                    const metadata = await getVideoMetadata(fullUrl);
                    const dur = metadata.durationInSeconds;
                    asset.originalDuration = dur;
                    if (!asset.durationInSeconds) {
                        asset.durationInSeconds = dur;
                    }
                    console.log(`[API Client] Scanned video ${asset.name} duration: ${dur}s`);
                } catch (e) {
                    console.warn(`[API Client] Failed to fetch video duration for ${asset.name}, fallback to 5s`, e);
                    asset.originalDuration = 5;
                    if (!asset.durationInSeconds) {
                        asset.durationInSeconds = 5;
                    }
                }
            } else if (asset.type === 'image' && !asset.durationInSeconds) {
                asset.durationInSeconds = project.defaultImageDuration;
            }
        }

        // --- PREPARE DATA FOR RUNTIME PACING ---
        if (project.voiceoverTrack) {
            try {
                const voUrl = `http://localhost:3000${project.voiceoverTrack}`;
                const voDuration = await getAudioDurationInSeconds(voUrl);

                // Store VO Duration as the Target Duration for proper syncing
                project.durationInSeconds = voDuration;
            } catch (err) {
                console.warn("VO Duration fetch failed", err);
            }
        }

        // Automatic background music insertion disabled to allow manual control only

        // Smart SFX Injection disabled to allow manual control only

        return project;
    } catch (e) {
        console.error(e);
        return {
            id: projectId,
            assets: [],
            theme: 'default',
            colorFilter: 'none',
            fps: 30,
            defaultImageDuration: 3
        };
    }
};
