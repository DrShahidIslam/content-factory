import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define the root workspace path
const PROJECTS_ROOT = path.resolve('..', 'projects');

export async function GET() {
    try {
        // Ensure the directory exists
        if (!fs.existsSync(PROJECTS_ROOT)) {
            return NextResponse.json({ projects: [] });
        }

        const entries = await fs.promises.readdir(PROJECTS_ROOT, { withFileTypes: true });

        const projects = entries
            .filter(entry => entry.isDirectory())
            .map(entry => ({
                id: entry.name,
                name: entry.name,
                path: path.join(PROJECTS_ROOT, entry.name),
                updatedAt: fs.statSync(path.join(PROJECTS_ROOT, entry.name)).mtime
            }));

        return NextResponse.json({ projects });
    } catch (error) {
        console.error("Error scanning projects:", error);
        return NextResponse.json({ error: 'Failed to scan projects' }, { status: 500 });
    }
}
