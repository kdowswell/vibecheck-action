export interface PRContext {
    mode: 'review' | 'interactive';
    command?: string;
    pr: {
        number: number;
        title: string;
        body: string;
        author: string;
        head: string;
        base: string;
        headSha: string;
        labels: string[];
        draft: boolean;
    };
    files: FileChange[];
    diff: string;
    stats: {
        additions: number;
        deletions: number;
        changedFiles: number;
    };
    repo: {
        owner: string;
        name: string;
    };
}
export interface FileChange {
    filename: string;
    status: 'added' | 'removed' | 'modified' | 'renamed';
    additions: number;
    deletions: number;
    patch?: string;
}
export interface Config {
    tone: 'playful' | 'professional';
    model: string;
    checks: string[];
    triggerPhrase: string;
    autoReview: boolean;
    skipLabels: string[];
    maxFiles: number;
}
export interface SecurityFinding {
    severity: 'high' | 'medium' | 'low';
    type: string;
    message: string;
    file?: string;
    line?: number;
    snippet?: string;
}
export interface AIDetectionResult {
    confidence: number;
    signals: string[];
    sections: Array<{
        file: string;
        startLine: number;
        endLine: number;
        reason: string;
    }>;
}
export interface TestCoverageResult {
    covered: string[];
    uncovered: string[];
    newTests: string[];
}
export interface ComplexityResult {
    metrics: {
        avgCyclomatic: number;
        maxNesting: number;
        avgFunctionLength: number;
    };
    hotspots: Array<{
        file: string;
        function: string;
        complexity: number;
        severity: 'high' | 'medium' | 'low';
    }>;
}
export interface VibeReport {
    summary: {
        overallVibe: string;
        shipIt: string;
        aiSlopRisk: string;
        securityStatus: string;
        testStatus: string;
        sizeStatus: string;
    };
    content: string;
    findingsCount: number;
}
//# sourceMappingURL=types.d.ts.map