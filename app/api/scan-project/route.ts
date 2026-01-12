
import { NextResponse } from 'next/server';
import { scanProjectFolder } from '../../../lib/local-scan';
import path from 'path';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('path'); // e.g., "demo-test" or "D:/Videos"

    if (!projectPath) {
        return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    try {
        const { assets, realPath } = await scanProjectFolder(projectPath);

        // Map paths for Frontend Serving
        // Now using our robust /api/serve-file endpoint
        const servedAssets = assets.map(a => {
            const absoluteFilePath = path.join(realPath, a.name);
            return {
                ...a,
                // Pass the FULL absolute path to the serve API
                path: `/api/serve-file?path=${encodeURIComponent(absoluteFilePath)}`
            };
        });

        return NextResponse.json({ assets: servedAssets });
    } catch (error: any) {
        console.error(error);
        if (error.message.includes('not found')) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to scan assets' }, { status: 500 });
    }
}
