import React from 'react';
import { Composition } from 'remotion';
import { MainVideo } from './MainVideo';
import { fetchProjectData } from './lib/api-client';

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="ShortsVideo"
                component={MainVideo}
                durationInFrames={300} // Default fallback
                fps={30}
                width={1080}
                height={1920}
                defaultProps={{
                    projectData: {
                        id: 'demo-test',
                        assets: [],
                        fps: 30,
                        defaultImageDuration: 3,
                        theme: 'sports'
                    }
                }}
                calculateMetadata={async ({ props }) => {
                    // Check if props has data (passed from CLI or Player)
                    // If CLI, we might pass just ID. If Player, we pass full data.
                    const pid = props.projectData?.id || 'demo-test';
                    let data = props.projectData;

                    // If we only have ID (CLI scenario) or want to refresh
                    if (!data?.assets || data.assets.length === 0) {
                        data = await fetchProjectData(pid);
                    }

                    // Apply Metadata overrides (CLI props)
                    if (props.projectData?.theme) {
                        data.theme = props.projectData.theme;
                    }

                    // Calculate total duration
                    let durationInFrames = 300;
                    if (data.durationInSeconds) {
                        // Exact sync with Audio
                        durationInFrames = Math.ceil(data.durationInSeconds * data.fps);
                    } else {
                        // Fallback: Sum of assets
                        let totalDuration = 0;
                        data.assets.forEach(a => {
                            const dur = a.durationInSeconds || data.defaultImageDuration;
                            totalDuration += dur;
                        });
                        durationInFrames = Math.max(30, Math.round(totalDuration * data.fps));
                    }

                    return {
                        durationInFrames,
                        props: {
                            projectData: data
                        }
                    };
                }}
            />
            <Composition
                id="LongVideo"
                component={MainVideo}
                durationInFrames={300}
                fps={30}
                width={1920}
                height={1080}
                defaultProps={{
                    projectData: {
                        id: 'demo-test',
                        assets: [],
                        fps: 30,
                        defaultImageDuration: 3,
                        theme: 'sports'
                    }
                }}
                calculateMetadata={async ({ props }) => {
                    const pid = props.projectData?.id || 'demo-test';
                    let data = props.projectData;

                    if (!data?.assets || data.assets.length === 0) {
                        data = await fetchProjectData(pid);
                    }

                    if (props.projectData?.theme) {
                        data.theme = props.projectData.theme;
                    }

                    let totalDuration = 0;
                    if (data.durationInSeconds) {
                        totalDuration = data.durationInSeconds;
                    } else {
                        data.assets.forEach(a => {
                            totalDuration += (a.durationInSeconds || data.defaultImageDuration);
                        });
                    }

                    return {
                        durationInFrames: Math.max(30, Math.round(totalDuration * data.fps)),
                        props: {
                            projectData: data
                        }
                    };
                }}
            />
        </>
    );
};
