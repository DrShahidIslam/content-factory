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
    let videoPath = '';
    
    if (id === 'sfx') {
        videoPath = path.join(`G:\\Iskills\\Youtube\\Youtube Sound Effects\\background sfx`, safeFilename);
    } else {
        videoPath = path.join(PROJECTS_ROOT, id, safeFilename);
    }

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

            const stream = new ReadableStream({
                start(controller) {
                    let active = true;
                    file.on('data', (chunk) => {
                        if (active) {
                            try {
                                controller.enqueue(chunk);
                            } catch (e) {
                                active = false;
                            }
                        }
                    });
                    file.on('end', () => {
                        if (active) {
                            try {
                                controller.close();
                            } catch (e) {}
                            active = false;
                        }
                    });
                    file.on('error', (err) => {
                        if (active) {
                            try {
                                controller.error(err);
                            } catch (e) {}
                            active = false;
                        }
                    });
                },
                cancel() {
                    file.destroy();
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
                    let active = true;
                    file.on('data', (chunk) => {
                        if (active) {
                            try {
                                controller.enqueue(chunk);
                            } catch (e) {
                                active = false;
                            }
                        }
                    });
                    file.on('end', () => {
                        if (active) {
                            try {
                                controller.close();
                            } catch (e) {}
                            active = false;
                        }
                    });
                    file.on('error', (err) => {
                        if (active) {
                            try {
                                controller.error(err);
                            } catch (e) {}
                            active = false;
                        }
                    });
                },
                cancel() {
                    file.destroy();
                }
            });

            return new NextResponse(stream, { status: 200, headers });
        }

    } catch (error) {
        console.error("Stream Error:", error);
        return NextResponse.json({ error: 'Error serving file' }, { status: 500 });
    }
}
