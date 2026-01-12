import { NextResponse } from 'next/server';
import { scanProjectFolder } from '../../../../../lib/local-scan';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const { assets } = await scanProjectFolder(id);

        // Map paths for Frontend Serving
        // The scanner returns empty paths basically. We need to tell the frontend how to load them.
        // For local dev, /api/serve/{id}/{filename} is fine.
        const servedAssets = assets.map(a => ({
            ...a,
            path: `/api/serve/${encodeURIComponent(id)}/${encodeURIComponent(a.name)}`
        }));

        return NextResponse.json({ assets: servedAssets });
    } catch (error: any) {
        console.error(error);
        if (error.message.includes('not found')) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to scan assets' }, { status: 500 });
    }
}
