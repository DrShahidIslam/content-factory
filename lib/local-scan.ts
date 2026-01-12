
import fs from 'fs';
import path from 'path';

// Default projects root relative to the app
const DEFAULT_PROJECTS_ROOT = path.resolve('..', 'projects');

export interface AssetFile {
    name: string;
    path: string;
    type: 'image' | 'video' | 'audio' | 'script' | 'unknown';
}

function getAssetType(filename: string): AssetFile['type'] {
    const ext = path.extname(filename).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) return 'image';
    if (['.mp4', '.mov', '.webm', '.mkv'].includes(ext)) return 'video';
    if (['.mp3', '.wav', '.m4a'].includes(ext)) return 'audio';
    if (['.txt', '.md'].includes(ext)) return 'script';
    return 'unknown';
}

/**
 * Scans a folder for assets.
 * @param projectIdOrPath Either a simple ID (relative to default projects) or an absolute path.
 */
export async function scanProjectFolder(projectIdOrPath: string): Promise<{ assets: AssetFile[], projectPath: string, realPath: string }> {

    let realPath: string;

    // Check if it's an absolute path
    if (path.isAbsolute(projectIdOrPath)) {
        realPath = projectIdOrPath;
    } else {
        realPath = path.join(DEFAULT_PROJECTS_ROOT, projectIdOrPath);
    }

    if (!fs.existsSync(realPath)) {
        throw new Error(`Project folder not found: ${realPath}`);
    }

    const files = await fs.promises.readdir(realPath);

    const assets = files.map(file => {
        // Construct a URL path for the frontend to access via the serve API
        // If absolute path, we might need a special serve route or symlink? 
        // For now, let's encode the absolute path in the ID if needed, 
        // BUT the Serve API expects "id/filename". 
        // If we use absolute paths, we need a way to serve them.
        // HACK: We will pass the full path back, and handle serving dynamically.

        return {
            name: file,
            type: getAssetType(file),
            path: `` // Will be constructed by the caller based on context (API vs Render)
        };
    });

    return { assets, projectPath: projectIdOrPath, realPath };
}
