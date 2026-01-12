import { Asset, ProjectData } from '../types';

export const sortAssets = (assets: Asset[]): Asset[] => {
    return assets.sort((a, b) => {
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
};

export const prepareProjectData = (id: string, assets: Asset[]): ProjectData => {
    const sorted = sortAssets(assets);

    // Identify audio tracks
    // Identify audio tracks
    const voKeywords = ['voiceover', 'voice over', 'vo_', 'narration', 'speech', 'tts', 'script', 'audio', 'rec', 'recording'];

    // STRICT TYPE CHECK: Must be type 'audio'
    const voiceover = sorted.find(a =>
        a.type === 'audio' &&
        voKeywords.some(k => a.name.toLowerCase().includes(k))
    );

    const music = sorted.find(a =>
        a.type === 'audio' && (
            a.name.toLowerCase().includes('music') ||
            a.name.toLowerCase().includes('bg_') ||
            a.name.toLowerCase().includes('background') ||
            a.name.toLowerCase().includes('soundtrack') ||
            a.name.toLowerCase().includes('song') ||
            !voKeywords.some(k => a.name.toLowerCase().includes(k)) // Fallback: Any audio that isn't VO
        )
    );

    // Filter out audio from visual timeline
    const visuals = sorted.filter(a => a.type === 'image' || a.type === 'video');

    return {
        id,
        assets: visuals,
        voiceoverTrack: voiceover?.path,
        audioTrack: music?.path,
        defaultImageDuration: 3,
        fps: 30,
        theme: 'default'
    };
};
