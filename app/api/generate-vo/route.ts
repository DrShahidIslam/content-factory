
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { scanProjectFolder } from '../../../lib/local-scan';
import { EdgeTTS } from 'node-edge-tts';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { projectId } = body;

        if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });

        // Locate Script
        const { assets, realPath } = await scanProjectFolder(projectId);
        const scriptFile = assets.find(a => a.name === 'script.txt');

        if (!scriptFile) {
            return NextResponse.json({ error: 'No script.txt found' }, { status: 404 });
        }

        const scriptPath = path.join(realPath, scriptFile.name);
        const scriptContent = fs.readFileSync(scriptPath, 'utf-8');

        // Output file
        const outputPath = path.join(realPath, 'voiceover_generated.wav');

        // Check if already exists? (Maybe user wants to regenerate? We overwrite)

        // Edge TTS Generation
        const voiceId = body.voice || 'en-US-ChristopherNeural';

        const tts = new EdgeTTS({
            voice: voiceId,
            lang: 'en-US',
            outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
        });

        const mp3Path = path.join(realPath, 'voiceover_generated.mp3');

        await tts.ttsPromise(scriptContent, mp3Path);

        // Cleanup old wav if exists to avoid confusion?
        const oldWav = path.join(realPath, 'voiceover_generated.wav');
        if (fs.existsSync(oldWav)) fs.unlinkSync(oldWav);

        // Verify file creation
        if (fs.existsSync(mp3Path)) {
            return NextResponse.json({ success: true, path: mp3Path });
        } else {
            throw new Error("Audio file not created");
        }



    } catch (error: any) {
        console.error(error);
        try {
            fs.appendFileSync('debug_vo_error.log', `[${new Date().toISOString()}] MAIN ERROR: ${error.message}\nStack: ${error.stack}\n`);
        } catch (e) { }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
