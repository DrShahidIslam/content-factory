import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SFX_ROOT = path.resolve('..', 'projects', 'sfx');

export async function GET() {
    try {
        if (!fs.existsSync(SFX_ROOT)) {
            // Auto-create if missing to avoid crash
            fs.mkdirSync(SFX_ROOT, { recursive: true });
            return NextResponse.json({ sfx: [] });
        }

        const files = await fs.promises.readdir(SFX_ROOT);

        // Filter for audio files
        const sfxFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.mp3', '.wav', '.aac', '.m4a'].includes(ext);
        });

        return NextResponse.json({ sfx: sfxFiles });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to scan SFX' }, { status: 500 });
    }
}
