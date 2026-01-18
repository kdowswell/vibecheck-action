"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.complexityHandler = exports.testCoverageHandler = exports.aiDetectorHandler = exports.securityScanHandler = void 0;
exports.getTools = getTools;
const security_1 = require("./security");
Object.defineProperty(exports, "securityScanHandler", { enumerable: true, get: function () { return security_1.securityScanHandler; } });
const ai_detector_1 = require("./ai-detector");
Object.defineProperty(exports, "aiDetectorHandler", { enumerable: true, get: function () { return ai_detector_1.aiDetectorHandler; } });
const test_coverage_1 = require("./test-coverage");
Object.defineProperty(exports, "testCoverageHandler", { enumerable: true, get: function () { return test_coverage_1.testCoverageHandler; } });
const complexity_1 = require("./complexity");
Object.defineProperty(exports, "complexityHandler", { enumerable: true, get: function () { return complexity_1.complexityHandler; } });
function getTools(config) {
    const tools = [];
    const enabledChecks = config.checks.map(c => c.toLowerCase().trim());
    if (enabledChecks.includes('security')) {
        tools.push({
            name: 'security_scan',
            description: `Scan code for security vulnerabilities including:
- Hardcoded secrets and API keys (AWS, Stripe, GitHub tokens)
- SQL injection patterns
- XSS vulnerabilities (innerHTML, dangerouslySetInnerHTML)
- Command injection risks
- Weak cryptography
- Authentication bypass patterns

Returns findings with severity (high/medium/low), type, location, and code snippet.`,
            parameters: security_1.securityScanParams,
            handler: security_1.securityScanHandler,
        });
    }
    if (enabledChecks.includes('ai-detection')) {
        tools.push({
            name: 'ai_slop_detector',
            description: `Analyze code for signs it may be AI-generated and auto-accepted without thorough review.

Looks for patterns like:
- Large code blocks added in single commits
- Verbose explanatory comments ("This function...", "First, we...")
- Step-by-step numbered comments
- Generic function names (handleX, processY, validateZ)
- Placeholder TODOs
- Unusually consistent documentation style

Returns confidence score (0-1), risk level, specific signals found, and flagged code sections.

Note: This is meant to help identify code that might benefit from extra review, not to judge AI-assisted coding.`,
            parameters: ai_detector_1.aiDetectorParams,
            handler: ai_detector_1.aiDetectorHandler,
        });
    }
    if (enabledChecks.includes('tests')) {
        tools.push({
            name: 'test_coverage_check',
            description: `Analyze which changed source files have corresponding test files.

Checks for:
- Test files matching source file names (*.test.ts, *.spec.ts, _test.py, etc.)
- New test files added in the PR
- References to source files in test file content

Returns lists of covered files, uncovered files, and newly added tests.`,
            parameters: test_coverage_1.testCoverageParams,
            handler: test_coverage_1.testCoverageHandler,
        });
    }
    if (enabledChecks.includes('complexity')) {
        tools.push({
            name: 'complexity_analyzer',
            description: `Measure code complexity metrics for functions in the provided code.

Analyzes:
- Cyclomatic complexity (decision points: if, for, while, case, &&, ||, ?:)
- Maximum nesting depth
- Function length

Returns metrics and flags "hotspots" - functions that exceed complexity thresholds:
- High: cyclomatic > 15, nesting > 5, or length > 100 lines
- Medium: cyclomatic > 10, nesting > 4, or length > 50 lines
- Low: cyclomatic > 7, nesting > 3, or length > 30 lines`,
            parameters: complexity_1.complexityParams,
            handler: complexity_1.complexityHandler,
        });
    }
    return tools;
}
//# sourceMappingURL=index.js.map