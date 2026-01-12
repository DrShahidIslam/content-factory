
const { EdgeTTS } = require('edge-tts-client');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("Testing Edge TTS Integration...");

    const outputPath = path.join(__dirname, 'test_edge_voice.mp3');
    const text = "Hello! This is a test of the Microsoft Edge Natural Voices. I should sound much more human than the previous robot.";

    try {
        const tts = new EdgeTTS({
            voice: 'en-US-ChristopherNeural', // Famous "Human" voice
            lang: 'en-US',
            outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
        });

        await tts.ttsPromise(text, outputPath);

        console.log("Success! File generated at:", outputPath);
        const stats = fs.statSync(outputPath);
        console.log("Size:", stats.size, "bytes");

    } catch (e) {
        console.error("Edge TTS Failed:", e);
    }
}

main();
