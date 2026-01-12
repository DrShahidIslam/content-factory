import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PROJECTS_ROOT = path.resolve('..', 'projects');

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string; filename: string }> }
) {
    const { id, filename } = await params;

    // Security: Prevent directory traversal & Decode URI (spaces)
    const safeFilename = path.basename(decodeURIComponent(filename));
    const videoPath = path.join(PROJECTS_ROOT, id, safeFilename);

    try {
        if (!fs.existsSync(videoPath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = request.headers.get('range');

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            if (start >= fileSize) {
                return new NextResponse('Requested range not satisfiable', { status: 416, headers: { 'Content-Range': `bytes */${fileSize}` } });
            }

            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(videoPath, { start, end });

            // Node.js ReadStream is not directly compatible with Web ReadableStream, 
            // but Next.js/Response handles standard streams or we can convert.
            // NextJS App Router Response handles node streams fine usually if passed as BodyInit?
            // Actually strictly speaking, NextResponse body expects ReadableStream (Web), not ReadStream (Node).
            // But we can use `new Response(stream)` in Node env usually.
            // To be safe and typed, we use Iterator.

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
            headers.set('Content-Type', 'video/mp4'); // Simplified content type

            return new NextResponse(stream, { status: 206, headers });

        } else {
            const headers = new Headers();
            headers.set('Content-Length', fileSize.toString());
            headers.set('Content-Type', 'video/mp4');

            const file = fs.createReadStream(videoPath);
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
