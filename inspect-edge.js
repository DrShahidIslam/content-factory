
const { EdgeTTS } = require('node-edge-tts');
console.log("EdgeTTS Prototype:", Object.getOwnPropertyNames(EdgeTTS.prototype));
try {
    const instance = new EdgeTTS();
    console.log("Instance Keys:", Object.keys(instance));
} catch (e) { }
