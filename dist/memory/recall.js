/**
 * Memory Recall System
 *
 * LLM-powered relevance selection for memory retrieval.
 */
/**
 * Format memory manifest for the LLM selector
 * One line per file: type, name, date, description
 */
export function formatMemoryManifest(files, surfacedFiles) {
    const available = files.filter(f => !surfacedFiles.has(f.path));
    return available
        .map(file => {
        const date = new Date(file.mtime).toISOString().split('T')[0];
        const { type, name, description } = file.frontmatter;
        return `[${type}] ${name} (${date}): ${description}`;
    })
        .join('\n');
}
/**
 * Validate selected filenames against known set
 * Catches hallucinated filenames from the LLM
 */
export function validateSelections(selections, knownFiles) {
    const knownNames = new Set(knownFiles.map(f => f.path.split('/').pop()));
    const valid = [];
    const invalid = [];
    for (const selection of selections) {
        // Accept either full path or just filename
        const name = selection.split('/').pop();
        if (knownNames.has(name)) {
            const fullPath = knownFiles.find(f => f.path.endsWith('/' + name))?.path;
            if (fullPath)
                valid.push(fullPath);
        }
        else {
            invalid.push(selection);
        }
    }
    return { valid, invalid };
}
/**
 * Parse LLM selector response
 */
export function parseRecallResponse(json) {
    try {
        const parsed = JSON.parse(json);
        return {
            selectedFiles: parsed.selectedFiles || [],
            reasoning: parsed.reasoning || ''
        };
    }
    catch {
        // Fallback: treat response as comma-separated filenames
        return {
            selectedFiles: json.split(',').map(s => s.trim()).filter(Boolean),
            reasoning: 'Parsed from plain text'
        };
    }
}
/**
 * Calculate relevance score for ranking
 * Higher score = more relevant
 */
export function calculateRelevanceScore(file, query) {
    const { type, description } = file.frontmatter;
    // Type-based weighting
    const typeWeights = {
        user: 1.5,
        feedback: 1.4,
        project: 1.2,
        reference: 1.0
    };
    const typeWeight = typeWeights[type] || 1.0;
    // Recency boost (exponential decay)
    const ageDays = (Date.now() - file.mtime) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.exp(-ageDays / 30); // 30-day half-life
    // Query matching (simplified - production uses embeddings)
    const queryWords = query.toLowerCase().split(/\s+/);
    const descWords = description.toLowerCase().split(/\s+/);
    const matches = queryWords.filter(q => descWords.some(d => d.includes(q))).length;
    const matchScore = matches / queryWords.length;
    return typeWeight * (0.3 + 0.7 * recencyBoost) * (0.5 + 0.5 * matchScore);
}
//# sourceMappingURL=recall.js.map