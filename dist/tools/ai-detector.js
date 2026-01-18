"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiDetectorParams = void 0;
exports.aiDetectorHandler = aiDetectorHandler;
const zod_1 = require("zod");
exports.aiDetectorParams = zod_1.z.object({
    diff: zod_1.z.string().describe('Git diff to analyze for AI-generated patterns'),
    commitCount: zod_1.z.number().optional().describe('Number of commits in PR'),
});
async function aiDetectorHandler(params) {
    const { diff, commitCount = 1 } = params;
    const signals = [];
    const sections = [];
    // Parse diff into files
    const fileChunks = diff.split(/^diff --git/m).filter(Boolean);
    let totalAdditions = 0;
    let totalDeletions = 0;
    for (const chunk of fileChunks) {
        const fileMatch = chunk.match(/a\/(.+?) b\//);
        const filename = fileMatch?.[1] || 'unknown';
        const lines = chunk.split('\n');
        let additions = 0;
        let deletions = 0;
        let currentLine = 0;
        let blockStart = 0;
        let inLargeBlock = false;
        let blockContent = [];
        for (const line of lines) {
            if (line.startsWith('@@')) {
                const lineMatch = line.match(/@@ -\d+(?:,\d+)? \+(\d+)/);
                currentLine = lineMatch ? parseInt(lineMatch[1], 10) : 0;
                continue;
            }
            if (line.startsWith('+') && !line.startsWith('+++')) {
                additions++;
                totalAdditions++;
                // Track large addition blocks
                if (!inLargeBlock) {
                    inLargeBlock = true;
                    blockStart = currentLine;
                    blockContent = [];
                }
                blockContent.push(line.slice(1));
                currentLine++;
            }
            else if (line.startsWith('-') && !line.startsWith('---')) {
                deletions++;
                totalDeletions++;
                // End of addition block
                if (inLargeBlock && blockContent.length > 30) {
                    const blockAnalysis = analyzeBlock(blockContent, filename, blockStart);
                    if (blockAnalysis) {
                        sections.push(blockAnalysis);
                    }
                }
                inLargeBlock = false;
                blockContent = [];
            }
            else {
                // Context line - end block if we were in one
                if (inLargeBlock && blockContent.length > 30) {
                    const blockAnalysis = analyzeBlock(blockContent, filename, blockStart);
                    if (blockAnalysis) {
                        sections.push(blockAnalysis);
                    }
                }
                inLargeBlock = false;
                blockContent = [];
                if (!line.startsWith('\\'))
                    currentLine++;
            }
        }
        // Check final block
        if (inLargeBlock && blockContent.length > 30) {
            const blockAnalysis = analyzeBlock(blockContent, filename, blockStart);
            if (blockAnalysis) {
                sections.push(blockAnalysis);
            }
        }
    }
    // Calculate signals
    // Signal 1: Large additions with few deletions (pure addition pattern)
    const additionRatio = totalDeletions > 0
        ? totalAdditions / totalDeletions
        : totalAdditions > 50 ? 10 : 1;
    if (additionRatio > 5 && totalAdditions > 100) {
        signals.push(`High addition ratio (${Math.round(additionRatio)}:1) - typical of AI-generated code`);
    }
    // Signal 2: Large PR in single commit
    if (commitCount === 1 && totalAdditions > 200) {
        signals.push(`${totalAdditions} lines added in single commit`);
    }
    // Signal 3: Verbose comment patterns
    const verboseComments = (diff.match(/\/\/\s*(This|The|We|First|Next|Finally|Here|Now)\s+\w+/g) || []).length;
    if (verboseComments > 5) {
        signals.push(`${verboseComments} verbose explanatory comments`);
    }
    // Signal 4: Step-by-step comments
    const stepComments = (diff.match(/\/\/\s*(Step \d|First,|Second,|Then,|Finally,|Next,)/gi) || []).length;
    if (stepComments > 2) {
        signals.push(`${stepComments} step-by-step comments`);
    }
    // Signal 5: Generic function names
    const genericNames = (diff.match(/(?:function|const|let|var)\s+(handle|process|validate|check|get|set|update|create|delete|fetch|render)[A-Z]\w+/g) || []).length;
    if (genericNames > 5) {
        signals.push(`${genericNames} generic function names (handle*, process*, etc.)`);
    }
    // Signal 6: TODO placeholders
    const todoPlaceholders = (diff.match(/TODO:\s*(implement|add|fix|handle|update)/gi) || []).length;
    if (todoPlaceholders > 2) {
        signals.push(`${todoPlaceholders} placeholder TODOs`);
    }
    // Calculate confidence
    let confidence = 0;
    if (additionRatio > 5 && totalAdditions > 100)
        confidence += 0.25;
    if (commitCount === 1 && totalAdditions > 200)
        confidence += 0.2;
    if (verboseComments > 5)
        confidence += 0.15;
    if (stepComments > 2)
        confidence += 0.15;
    if (genericNames > 5)
        confidence += 0.1;
    if (todoPlaceholders > 2)
        confidence += 0.1;
    if (sections.length > 0)
        confidence += 0.15;
    confidence = Math.min(confidence, 1);
    // Generate vibe translation
    let vibeTranslation;
    let riskLevel;
    if (confidence > 0.7) {
        vibeTranslation = "giving 'let Claude cook unsupervised' energy 🤖";
        riskLevel = 'high';
    }
    else if (confidence > 0.4) {
        vibeTranslation = "AI ghostwriter detected - might want to double-check 👀";
        riskLevel = 'medium';
    }
    else if (confidence > 0.2) {
        vibeTranslation = "some AI vibes but mostly human";
        riskLevel = 'low';
    }
    else {
        vibeTranslation = "looks hand-crafted ✋";
        riskLevel = 'none';
    }
    return JSON.stringify({
        confidence: Math.round(confidence * 100) / 100,
        riskLevel,
        signals,
        sections,
        vibeTranslation,
    }, null, 2);
}
function analyzeBlock(lines, filename, startLine) {
    const content = lines.join('\n');
    const reasons = [];
    // Check for AI patterns in block
    if (content.match(/\/\/\s*(This|The|We)\s+\w+/g)?.length ?? 0 > 3) {
        reasons.push('verbose explanatory comments');
    }
    if (content.match(/\/\/\s*Step \d/gi)) {
        reasons.push('numbered step comments');
    }
    // Unusually consistent style (every function has same structure)
    const funcCount = (content.match(/(?:function|const\s+\w+\s*=\s*(?:async\s*)?\(|=>\s*\{)/g) || []).length;
    if (funcCount > 3) {
        const hasConsistentComments = (content.match(/\/\*\*[\s\S]*?\*\//g) || []).length >= funcCount - 1;
        if (hasConsistentComments) {
            reasons.push('unusually consistent documentation style');
        }
    }
    if (reasons.length === 0)
        return null;
    return {
        file: filename,
        startLine,
        endLine: startLine + lines.length,
        reason: reasons.join(', '),
    };
}
//# sourceMappingURL=ai-detector.js.map