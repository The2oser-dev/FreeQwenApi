export function compactTranscriptParts(parts, maxChars) {
    const transcript = parts.join('\n\n');
    if (!Number.isFinite(maxChars) || maxChars <= 0 || transcript.length <= maxChars) {
        return transcript;
    }

    const selected = [];
    let used = 0;
    for (let index = parts.length - 1; index >= 0; index--) {
        const separatorLength = selected.length > 0 ? 2 : 0;
        const available = maxChars - used - separatorLength;
        if (available <= 0) break;

        const part = parts[index];
        if (part.length <= available) {
            selected.push(part);
            used += separatorLength + part.length;
            continue;
        }

        if (selected.length === 0) {
            selected.push(part.slice(0, available));
        }
        break;
    }

    selected.reverse();
    const omitted = Math.max(0, parts.length - selected.length);
    const marker = `[Earlier transcript compacted: ${omitted} entries omitted]\n\n`;
    const bodyBudget = Math.max(0, maxChars - marker.length);
    return marker + selected.join('\n\n').slice(-bodyBudget);
}
