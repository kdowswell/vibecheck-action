import { z } from 'zod';
import { TestCoverageResult } from '../types';

export const testCoverageParams = z.object({
  changedFiles: z.array(z.string()).describe('List of changed file paths'),
  diff: z.string().describe('The PR diff content'),
});

export type TestCoverageParams = z.infer<typeof testCoverageParams>;

export async function testCoverageHandler(params: TestCoverageParams): Promise<string> {
  const { changedFiles, diff } = params;
  
  const result: TestCoverageResult = {
    covered: [],
    uncovered: [],
    newTests: [],
  };

  // Identify test files
  const testFilePatterns = [
    /\.test\.[jt]sx?$/,
    /\.spec\.[jt]sx?$/,
    /_test\.[jt]sx?$/,
    /__tests__\//,
    /\.test\.py$/,
    /_test\.py$/,
    /test_.*\.py$/,
  ];

  const isTestFile = (file: string) => testFilePatterns.some(p => p.test(file));
  
  const testFiles = changedFiles.filter(isTestFile);
  const sourceFiles = changedFiles.filter(f => !isTestFile(f) && isSourceFile(f));

  // Track new tests added
  result.newTests = testFiles;

  // For each source file, try to find corresponding test
  for (const sourceFile of sourceFiles) {
    const hasTest = findCorrespondingTest(sourceFile, changedFiles, diff);
    
    if (hasTest) {
      result.covered.push(sourceFile);
    } else {
      result.uncovered.push(sourceFile);
    }
  }

  // Generate vibe translation
  let vibeTranslation: string;
  
  if (result.uncovered.length === 0 && sourceFiles.length > 0) {
    vibeTranslation = 'tests looking solid 💪';
  } else if (result.newTests.length > 0 && result.uncovered.length > 0) {
    vibeTranslation = `tests added, but ${result.uncovered.length} file${result.uncovered.length > 1 ? 's' : ''} still uncovered`;
  } else if (result.uncovered.length > 5) {
    vibeTranslation = `we need to talk about tests... ${result.uncovered.length} files with no coverage 😅`;
  } else if (result.uncovered.length > 0) {
    vibeTranslation = `${result.uncovered.length} file${result.uncovered.length > 1 ? 's' : ''} could use tests`;
  } else if (sourceFiles.length === 0) {
    vibeTranslation = 'no source files to test';
  } else {
    vibeTranslation = 'could not determine test coverage';
  }

  return JSON.stringify({
    covered: result.covered,
    uncovered: result.uncovered,
    newTests: result.newTests,
    summary: {
      sourceFiles: sourceFiles.length,
      coveredCount: result.covered.length,
      uncoveredCount: result.uncovered.length,
      newTestCount: result.newTests.length,
    },
    vibeTranslation,
  }, null, 2);
}

function isSourceFile(file: string): boolean {
  const sourceExtensions = [
    /\.[jt]sx?$/,
    /\.py$/,
    /\.go$/,
    /\.rs$/,
    /\.rb$/,
    /\.java$/,
    /\.cs$/,
    /\.cpp$/,
    /\.c$/,
  ];
  
  const excludePatterns = [
    /\.config\.[jt]s$/,
    /\.d\.ts$/,
    /types?\.[jt]s$/,
    /index\.[jt]s$/,  // Often just re-exports
    /package\.json$/,
    /tsconfig\.json$/,
    /\.lock$/,
    /\.md$/,
    /\.ya?ml$/,
  ];

  const isSource = sourceExtensions.some(p => p.test(file));
  const isExcluded = excludePatterns.some(p => p.test(file));
  
  return isSource && !isExcluded;
}

function findCorrespondingTest(sourceFile: string, allFiles: string[], diff: string): boolean {
  // Extract base name without extension
  const baseName = sourceFile
    .replace(/\.[^.]+$/, '')
    .split('/')
    .pop() || '';

  // Check if any test file might cover this
  const testPatterns = [
    new RegExp(`${baseName}\\.test\\.[jt]sx?$`),
    new RegExp(`${baseName}\\.spec\\.[jt]sx?$`),
    new RegExp(`${baseName}_test\\.[jt]sx?$`),
    new RegExp(`test_${baseName}\\.[jt]sx?$`),
    new RegExp(`${baseName}_test\\.py$`),
    new RegExp(`test_${baseName}\\.py$`),
  ];

  // Check in changed files
  const hasChangedTest = allFiles.some(f => 
    testPatterns.some(p => p.test(f))
  );

  if (hasChangedTest) return true;

  // Check if the source file has any function that's referenced in test files in the diff
  // This is a heuristic - if we see imports or function calls matching the source file
  const sourceBaseName = baseName.toLowerCase();
  const testFileContent = extractTestFilesContent(diff);
  
  if (testFileContent.toLowerCase().includes(sourceBaseName)) {
    return true;
  }

  return false;
}

function extractTestFilesContent(diff: string): string {
  const testChunks: string[] = [];
  const chunks = diff.split(/^diff --git/m);
  
  for (const chunk of chunks) {
    if (/\.(test|spec)\.[jt]sx?/.test(chunk) || /_test\.[jt]sx?/.test(chunk)) {
      testChunks.push(chunk);
    }
  }
  
  return testChunks.join('\n');
}
