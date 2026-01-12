// Basic fuzzy matcher
// Returns true if the query (e.g. "horror") is found in the filename (e.g. "final_horror_sound.mp3")

export function findMatchingSFX(word: string, sfxList: string[]): string | null {
    const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanWord.length < 3) return null; // Ignore small words like "is", "at"

    // 1. Exact partial match
    const matches = sfxList.filter(filename =>
        filename.toLowerCase().includes(cleanWord)
    );

    if (matches.length === 0) return null;

    // 2. Randomizer: Return a random match from the variants
    const randomIndex = Math.floor(Math.random() * matches.length);
    return matches[randomIndex];
}

export function scanScriptForSFX(scriptText: string, sfxList: string[]): { word: string, filename: string, timestamp: number }[] {
    // This is a simplified logic. 
    // In a real app, we'd need word-level timestamps (which LLM/Transcription provides).
    // For this "Zero Cost" version, we will estimate: 
    // Average speaking rate ~150 words/min = 2.5 words/sec.

    const words = scriptText.split(/\s+/);
    const result: { word: string, filename: string, timestamp: number }[] = [];

    words.forEach((word, index) => {
        const match = findMatchingSFX(word, sfxList);
        if (match) {
            // Estimate timestamp
            const timeEstimate = index / 2.5;

            // Allow overlapping sounds!
            // Only prevent 'spamming' the SAME sound (e.g. don't play 'boom' twice in 1 second)

            // Check if we played THIS specific filename recently
            const recentSameSound = result.find(s =>
                s.filename === match &&
                Math.abs(s.timestamp - timeEstimate) < 2.0
            );

            // Also prevent Too Many sounds at exact same moment (max 3 per second?)
            // For now, just duplicate check.

            if (!recentSameSound) {
                result.push({
                    word,
                    filename: match,
                    timestamp: timeEstimate
                });
            }
        }
    });

    return result;
}
