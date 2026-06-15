
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { scanProjectFolder } from '../../../lib/local-scan';

// Status file shared with status API
const RENDER_STATUS_FILE = path.join(process.cwd(), 'render_status.json');

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { projectId, theme, aspectRatio } = body;

        if (!projectId) {
            return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }

        // Determine Composition and Dimensions
        const compositionId = aspectRatio === '16:9' ? 'LongVideo' : 'ShortsVideo';

        // Output path
        const projectDir = path.isAbsolute(projectId)
            ? projectId
            : path.join(process.cwd(), '../projects', projectId);

        const outputPath = path.join(projectDir, 'final_video.mp4');

        // Determine Entry Point
        const entryPoint = 'remotion/index.ts';

        // Ensure projects dir exists
        if (!fs.existsSync(projectDir)) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // 1. Scan the project folder to get real assets
        const { assets, realPath } = await scanProjectFolder(projectId);

        // Get the origin from the request to construct local HTTP URLs.
        // Remotion's Puppeteer browser cannot access file:// URLs due to security constraints.
        const origin = req.nextUrl.origin;

        // 2. Prepare Asset Objects with HTTP Paths for Remotion Node
        const absoluteAssets = assets.map(a => {
            const absoluteFilePath = path.join(realPath, a.name);
            return {
                ...a,
                path: `${origin}/api/serve-file?path=${encodeURIComponent(absoluteFilePath)}`,
            };
        });

        // Create a temporary props file
        const propsFilePath = path.join(projectDir, `render-props-${Date.now()}.json`);

        // 3. Construct Input Props
        // We pass the Full Data so Root.tsx doesn't need to fetch
        const inputProps = {
            projectData: {
                id: projectId,
                theme: theme,
                assets: absoluteAssets, // Injecting assets directly!
                fps: 30,
                defaultImageDuration: 3
                // Root.tsx will use this 'assets' array instead of fetching
            }
        };

        fs.writeFileSync(propsFilePath, JSON.stringify(inputProps));

        // Reset Status
        fs.writeFileSync(RENDER_STATUS_FILE, JSON.stringify({ progress: 0, status: 'rendering' }));

        console.log(`Starting render for ${projectId}...`);

        // Update command to use the props file
        const command = `npx remotion render ${entryPoint} ${compositionId} "${outputPath}" --props="${propsFilePath}" --overwrite`;

        // Execution
        await new Promise((resolve, reject) => {
            // Note: capturing progress from stdout requires parsing Remotion logs
            // Remotion outputs "Rendered 10/300 frames" to stdout or stderr
            const child = exec(command, { cwd: process.cwd() });

            child.stdout?.on('data', (data) => {
                console.log(data.toString());
                // Basic parsing logic (this is fragile but zero-dependency)
                // "Rendered 30/150 frames"
                const match = data.toString().match(/Rendered (\d+)\/(\d+)/);
                if (match) {
                    const current = parseInt(match[1]);
                    const total = parseInt(match[2]);
                    const percent = Math.round((current / total) * 100);
                    try {
                        fs.writeFileSync(RENDER_STATUS_FILE, JSON.stringify({ progress: percent, status: 'rendering' }));
                    } catch (e) { }
                }
            });

            child.stderr?.on('data', (data) => console.error(data.toString()));

            child.on('exit', (code) => {
                // Cleanup props file
                try {
                    if (fs.existsSync(propsFilePath)) fs.unlinkSync(propsFilePath);
                } catch (e) { }

                if (code === 0) {
                    fs.writeFileSync(RENDER_STATUS_FILE, JSON.stringify({ progress: 100, status: 'done' }));
                    resolve('Success');
                } else {
                    fs.writeFileSync(RENDER_STATUS_FILE, JSON.stringify({ progress: 0, status: 'error' }));
                    reject(new Error(`Render exited with code ${code}`));
                }
            });
        });

        return NextResponse.json({
            success: true,
            message: 'Video rendered successfully',
            path: outputPath
        });

    } catch (error: any) {
        console.error(error);
        return NextResponse.json({
            error: 'Render failed',
            details: error?.message || String(error),
            stderr: error?.stderr || ''
        }, { status: 500 });
    }
}

// Force Rebuild Timestamp
