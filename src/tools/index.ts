import { securityScanParams, securityScanHandler } from './security';
import { aiDetectorParams, aiDetectorHandler } from './ai-detector';
import { testCoverageParams, testCoverageHandler } from './test-coverage';
import { complexityParams, complexityHandler } from './complexity';
import { Config } from '../types';

// Note: We're defining tools in a way that's compatible with the Copilot SDK
// The actual defineTool import will come from @github/copilot-sdk

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: any; // Zod schema
  handler: (params: any) => Promise<string>;
}

export function getTools(config: Config): ToolDefinition[] {
  const tools: ToolDefinition[] = [];
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
      parameters: securityScanParams,
      handler: securityScanHandler,
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
      parameters: aiDetectorParams,
      handler: aiDetectorHandler,
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
      parameters: testCoverageParams,
      handler: testCoverageHandler,
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
      parameters: complexityParams,
      handler: complexityHandler,
    });
  }

  return tools;
}

// Export individual tools for testing
export {
  securityScanHandler,
  aiDetectorHandler,
  testCoverageHandler,
  complexityHandler,
};
