
const { EdgeTTS } = require('edge-tts-universal');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("Testing Synthesize...");
    try {
        const tts = new EdgeTTS({
            voice: 'en-US-ChristopherNeural'
        });

        const text = "Testing the captions.";
        // Inspect what synthesize returns
        console.log("Calling synthesize...");
        const result = await tts.synthesize(text, { outputFormat: 'audio-24khz-48kbitrate-mono-mp3' });

        console.log("Result Type:", typeof result);
        console.log("Result Keys:", Object.keys(result));

        // If result is readable stream, maybe events? 
        // If result is object, maybe { audio, metadata }?

    } catch (e) {
        console.error("Synthesize Failed:", e);
    }
}

main();
