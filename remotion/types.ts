import { z } from 'zod';

export const AssetSchema = z.object({
    name: z.string(),
    type: z.enum(['image', 'video', 'audio', 'script', 'unknown']),
    path: z.string(), // Serve path
    durationInSeconds: z.number().optional(), // For videos/audio
    originalDuration: z.number().optional(), // Original scanned video duration
    playbackRate: z.number().optional(), // New: For Time Remapping
    overlayText: z.string().optional(), // Custom text overlay for this specific clip
    speedRamp: z.enum(['none', 'impact-slow', 'slow-fast', 'fast-slow']).optional(), // Time Ramping
});

export interface SFXCue {
    id: string;
    name: string; // "horror"
    filename: string; // "vid_horror_final.mp3"
    startFrame: number;
    volume?: number;
}

export interface SFXCue {
    id: string;
    name: string; // "horror"
    filename: string; // "vid_horror_final.mp3"
    startFrame: number;
    volume?: number;
}

export interface CaptionCue {
    part: string; // Word text
    start: number; // Start ms
    end: number; // End ms
}

export const ProjectSchema = z.object({
    id: z.string(),
    assets: z.array(AssetSchema),
    audioTrack: z.string().optional(),
    voiceoverTrack: z.string().optional(),
    voiceoverPlaybackRate: z.number().optional(), // New: Elastic Audio
    theme: z.enum(['horror', 'exciting', 'happy', 'sports', 'default']).default('default'),
    colorFilter: z.enum(['none', 'vibrant-sports', 'warm-gold', 'cold-cinematic', 'vintage-sepia', 'noir', 'neon-cyber']).default('none'),
    sfxCues: z.array(z.custom<SFXCue>()).optional(),
    fps: z.number().default(30),
    durationInSeconds: z.number().optional(), // Master duration
    defaultImageDuration: z.number().default(3), // Seconds
    scriptContent: z.string().optional(), // Raw text
    captions: z.array(z.custom<CaptionCue>()).optional(), // Precise Timings from EdgeTTS
    serverOrigin: z.string().optional(), // Dynamic host/port origin
});

export type Asset = z.infer<typeof AssetSchema>;
export type ProjectData = z.infer<typeof ProjectSchema>;
