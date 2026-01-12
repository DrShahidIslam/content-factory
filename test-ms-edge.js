
const { MsEdgeTTS, OUTPUT_FORMAT } = require('ms-edge-tts');
const fs = require('fs');

(async () => {
    console.log("Testing ms-edge-tts...");
    const tts = new MsEdgeTTS();
    await tts.setMetadata("en-US-ChristopherNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const filePath = './test_ms_edge.mp3';

    // Attempt to listen for metadata events
    // Based on library usually emitting events or having raw stream access

    try {
        const writable = tts.toStream("Hello world");
        writable.on('data', (chunk) => {
            // Analyzing chunk? No, this is likely audio only.
        });

        await tts.toFile(filePath, "Hello world, I am testing subtitles.");
        console.log("File created.");

        // Check if there is a 'subtitle' or 'metadata' method?
        console.log("Keys:", Object.keys(tts));
        console.log("Proto:", Object.getOwnPropertyNames(Object.getPrototypeOf(tts)));

    } catch (e) {
        console.error(e);
    }
})();
