
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const RENDER_STATUS_FILE = path.join(process.cwd(), 'render_status.json');

export async function GET() {
    try {
        if (fs.existsSync(RENDER_STATUS_FILE)) {
            const data = fs.readFileSync(RENDER_STATUS_FILE, 'utf-8');
            return NextResponse.json(JSON.parse(data));
        }
        return NextResponse.json({ progress: 0, status: 'idle' });
    } catch (error) {
        return NextResponse.json({ progress: 0, status: 'error' });
    }
}
