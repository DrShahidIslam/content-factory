
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, "test 'folder", 'voiceover.wav');
// Ensure dir exists
if (!fs.existsSync(path.dirname(outputPath))) fs.mkdirSync(path.dirname(outputPath));

const text = "Testing path escaping.";

console.log("Starting TTS Test...");

// Fix: Escape output path
const safeOutputPath = outputPath.replace(/'/g, "''");

const psCommand = `
Add-Type -AssemblyName System.Speech;
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
$synth.SetOutputToWaveFile('${safeOutputPath}');
$synth.Speak('${text}');
$synth.Dispose();
`;

const command = `powershell -Command "${psCommand.replace(/\n/g, ';')}"`;

exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error("TTS Failed:", error);
        console.error("Stderr:", stderr);
    } else {
        console.log("TTS Command Executed.");
        if (fs.existsSync(outputPath)) {
            const stats = fs.statSync(outputPath);
            console.log(`Success! File created at ${outputPath}`);
            console.log(`Size: ${stats.size} bytes`);
        } else {
            console.error("Command ran but file was NOT created.");
        }
    }
});
