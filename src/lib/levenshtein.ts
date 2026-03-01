/**
 * Levenshtein distance for fuzzy matching of user recall answers.
 * Tolerates small typos (max 2 edits by default).
 */

import levenshtein from 'fast-levenshtein';

/**
 * Returns true if `typed` is close enough to `expected`.
 * Both are lowercased and trimmed before comparison.
 * Threshold scales with word length: short words allow 1 edit, longer allow 2.
 */
export function isCloseEnough(typed: string, expected: string, threshold?: number): boolean {
    const a = typed.trim().toLowerCase();
    const b = expected.trim().toLowerCase();

    if (a === b) return true;

    // Dynamic threshold based on word length if not provided
    const maxEdits = threshold ?? (b.length <= 4 ? 1 : 2);

    return levenshtein.get(a, b) <= maxEdits;
}

/**
 * Given a list of typed answers and expected words,
 * returns an array of match results for each position.
 * Order-independent: each answer is matched against the closest unmatched word.
 */
export function scoreAnswers(
    typed: string[],
    expected: string[]
): { word: string; answer: string; correct: boolean }[] {
    const remaining = [...expected];
    const results: { word: string; answer: string; correct: boolean }[] = [];

    for (const answer of typed) {
        let bestIdx = -1;
        let bestDist = Infinity;

        remaining.forEach((word, idx) => {
            const dist = levenshtein.get(answer.trim().toLowerCase(), word.trim().toLowerCase());
            if (dist < bestDist) {
                bestDist = dist;
                bestIdx = idx;
            }
        });

        const threshold = remaining[bestIdx]?.length <= 4 ? 1 : 2;
        const correct = bestIdx !== -1 && bestDist <= threshold;
        const matchedWord = bestIdx !== -1 ? remaining.splice(bestIdx, 1)[0] : answer;

        results.push({ word: matchedWord, answer, correct });
    }

    return results;
}
