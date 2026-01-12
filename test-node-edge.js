
const { EdgeTTS } = require('node-edge-tts');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("Testing Node Edge TTS...");

    const outputPath = path.join(__dirname, 'test_edge_node.mp3');
    const text = "This is the Node Edge TTS library test. I hope I work!";

    try {
        const tts = new EdgeTTS({
            voice: 'en-US-ChristopherNeural',
            lang: 'en-US',
            outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
        });

        await tts.ttsPromise(text, outputPath);
        console.log("Success! File saved to:", outputPath);

    } catch (e) {
        console.error("Node Edge TTS Failed:", e);
        // Fallback: If the API is different, let's log the object to see methods
        try {
            const EdgeTTSLib = require('node-edge-tts');
            console.log("Library Exports:", EdgeTTSLib);
        } catch (err) {
            console.log("Connect verify require failed");
        }
    }
}

main();
