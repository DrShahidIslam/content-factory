
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function POST() {
    try {
        // Use VBScript to open a native Folder Picker Dialog.
        // This is highly reliable on Windows and bypasses PowerShell STA thread and execution policy constraints.
        const tempVbsPath = path.join(process.cwd(), `temp_picker_${Date.now()}.vbs`);
        const vbsScript = `
Set objShell = CreateObject("Shell.Application")
Set objFolder = objShell.BrowseForFolder(0, "Select Content Folder", 0, 0)
If Not objFolder Is Nothing Then
    WScript.Echo objFolder.Self.Path
End If
`;
        fs.writeFileSync(tempVbsPath, vbsScript);
        const command = `cscript //NoLogo "${tempVbsPath}"`;

        const chosenPath = await new Promise<string>((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                // Cleanup temp file
                try {
                    if (fs.existsSync(tempVbsPath)) fs.unlinkSync(tempVbsPath);
                } catch (e) {}

                if (error) {
                    console.error('Picker error:', stderr);
                    reject(error);
                } else {
                    resolve(stdout.trim());
                }
            });
        });

        if (!chosenPath) {
            return NextResponse.json({ cancelled: true });
        }

        return NextResponse.json({ path: chosenPath });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to open picker' }, { status: 500 });
    }
}
