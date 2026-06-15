// Basic fuzzy matcher that maps bracketed emotions to matching SFX filenames

export function findMatchingSFX(emotion: string, sfxList: string[]): string | null {
    const cleanEmotion = emotion.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanEmotion.length < 2) return null;

    // 1. Direct match check (e.g. "cheer" in "Kids Cheering.mp3" or "fail" in "Fail 1.mp3")
    const matches = sfxList.filter(filename =>
        filename.toLowerCase().includes(cleanEmotion)
    );

    if (matches.length > 0) {
        // Return a random match from the variants
        return matches[Math.floor(Math.random() * matches.length)];
    }

    // 2. Synonyms mapping for common video emotions/sounds
    const synonyms: Record<string, string[]> = {
        cheer: ['clapping', 'cheering', 'applause'],
        applause: ['clapping', 'cheering'],
        happy: ['kids cheering', 'baby kids music', 'fairytale quest'],
        sad: ['sad music', 'fail'],
        boom: ['boom', 'gong'],
        ding: ['bell', 'ding'],
        laugh: ['laugh'],
        scream: ['scream'],
        suspense: ['suspense', 'rumble', 'drone'],
        shock: ['dun dun dun', 'mgs alert', 'alert'],
        surprise: ['dun dun dun', 'alert'],
        whoosh: ['whoosh'],
        bell: ['bell', 'gong'],
        fail: ['fail', 'wrong answer', 'record scratch'],
        scratch: ['record scratch'],
        slap: ['slap'],
        yeet: ['yeet'],
        cash: ['cash'],
        click: ['click']
    };

    if (synonyms[cleanEmotion]) {
        for (const syn of synonyms[cleanEmotion]) {
            const synMatches = sfxList.filter(filename =>
                filename.toLowerCase().includes(syn)
            );
            if (synMatches.length > 0) {
                return synMatches[Math.floor(Math.random() * synMatches.length)];
            }
        }
    }

    return null;
}

export function scanScriptForSFX(scriptText: string, sfxList: string[]): { word: string, filename: string, timestamp: number, charRatio: number }[] {
    // Find bracketed tags like [cheer], [fail], [drumroll]
    const bracketRegex = /\[([^\]]+)\]/g;
    const matches: { word: string, filename: string, charIndex: number }[] = [];
    
    let match;
    while ((match = bracketRegex.exec(scriptText)) !== null) {
        const emotion = match[1];
        const filename = findMatchingSFX(emotion, sfxList);
        if (filename) {
            matches.push({
                word: emotion,
                filename,
                charIndex: match.index
            });
        }
    }

    if (matches.length === 0) return [];

    // Calculate relative character positions in clean spoken text (without brackets)
    const totalChars = scriptText.replace(/\[[^\]]+\]/g, '').length || 1;

    return matches.map(m => {
        const textBeforeTag = scriptText.substring(0, m.charIndex).replace(/\[[^\]]+\]/g, '');
        const charRatio = textBeforeTag.length / totalChars;
        // Fallback estimated time (assuming ~12 characters per second spoken speed)
        const defaultTime = textBeforeTag.length / 12;

        return {
            word: m.word,
            filename: m.filename,
            timestamp: defaultTime,
            charRatio
        };
    });
}

