
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
        return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    try {
        // Allow reading any file provided by the user (Local Tool Trust)
        // If we wanted to be safe, we'd check if it starts with allowed roots.

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = request.headers.get('range');

        // Determine Mime Type
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'application/octet-stream';
        if (['.mp4', '.mov', '.webm', '.mkv'].includes(ext)) contentType = 'video/mp4';
        if (['.png', '.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
        if (['.mp3', '.wav'].includes(ext)) contentType = 'audio/mpeg';

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            if (start >= fileSize) {
                return new NextResponse('Requested range not satisfiable', { status: 416, headers: { 'Content-Range': `bytes */${fileSize}` } });
            }

            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(filePath, { start, end });

            const stream = new ReadableStream({
                start(controller) {
                    file.on('data', (chunk) => controller.enqueue(chunk));
                    file.on('end', () => controller.close());
                    file.on('error', (err) => controller.error(err));
                }
            });

            const headers = new Headers();
            headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
            headers.set('Accept-Ranges', 'bytes');
            headers.set('Content-Length', chunksize.toString());
            headers.set('Content-Type', contentType);

            return new NextResponse(stream, { status: 206, headers });

        } else {
            const headers = new Headers();
            headers.set('Content-Length', fileSize.toString());
            headers.set('Content-Type', contentType);

            const file = fs.createReadStream(filePath);
            const stream = new ReadableStream({
                start(controller) {
                    file.on('data', (chunk) => controller.enqueue(chunk));
                    file.on('end', () => controller.close());
                    file.on('error', (err) => controller.error(err));
                }
            });

            return new NextResponse(stream, { status: 200, headers });
        }

    } catch (error) {
        console.error("Stream Error:", error);
        return NextResponse.json({ error: 'Error serving file' }, { status: 500 });
    }
}
