
import { NextResponse } from 'next/server';
import { exec } from 'child_process';

export async function POST() {
    try {
        // Powershell command to open a native Folder Picker Dialog
        // We use System.Windows.Forms (available in standard Windows .NET environment)
        // This is a "Zero-Cost" hack to get native functionality in a web app running locally.
        // Use a strictly formatted single-line command
        // -sta is crucial for Forms/Dialogs on Windows
        const command = `powershell -sta -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Select content folder'; $f.ShowNewFolderButton = $true; if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $f.SelectedPath }"`;

        const path = await new Promise<string>((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error('Picker error:', stderr);
                    reject(error);
                } else {
                    resolve(stdout.trim());
                }
            });
        });

        if (!path) {
            return NextResponse.json({ cancelled: true });
        }

        return NextResponse.json({ path });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to open picker' }, { status: 500 });
    }
}
