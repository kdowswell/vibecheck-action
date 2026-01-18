import { z } from 'zod';
import { ComplexityResult } from '../types';

export const complexityParams = z.object({
  code: z.string().describe('Code to analyze for complexity'),
  filename: z.string().optional().describe('File path for context'),
});

export type ComplexityParams = z.infer<typeof complexityParams>;

export async function complexityHandler(params: ComplexityParams): Promise<string> {
  const { code, filename } = params;
  
  const result: ComplexityResult = {
    metrics: {
      avgCyclomatic: 0,
      maxNesting: 0,
      avgFunctionLength: 0,
    },
    hotspots: [],
  };

  // Extract functions and analyze each
  const functions = extractFunctions(code);
  
  if (functions.length === 0) {
    return JSON.stringify({
      ...result,
      vibeTranslation: 'no functions to analyze',
    }, null, 2);
  }

  let totalCyclomatic = 0;
  let totalLength = 0;
  let maxNesting = 0;

  for (const func of functions) {
    const cyclomatic = calculateCyclomaticComplexity(func.body);
    const nesting = calculateMaxNesting(func.body);
    const length = func.body.split('\n').length;

    totalCyclomatic += cyclomatic;
    totalLength += length;
    maxNesting = Math.max(maxNesting, nesting);

    // Flag as hotspot if concerning
    let severity: 'high' | 'medium' | 'low' | null = null;
    
    if (cyclomatic > 15 || nesting > 5 || length > 100) {
      severity = 'high';
    } else if (cyclomatic > 10 || nesting > 4 || length > 50) {
      severity = 'medium';
    } else if (cyclomatic > 7 || nesting > 3 || length > 30) {
      severity = 'low';
    }

    if (severity) {
      result.hotspots.push({
        file: filename || 'unknown',
        function: func.name,
        complexity: cyclomatic,
        severity,
      });
    }
  }

  result.metrics = {
    avgCyclomatic: Math.round((totalCyclomatic / functions.length) * 10) / 10,
    maxNesting,
    avgFunctionLength: Math.round(totalLength / functions.length),
  };

  // Generate vibe translation
  let vibeTranslation: string;
  const highHotspots = result.hotspots.filter(h => h.severity === 'high').length;
  const mediumHotspots = result.hotspots.filter(h => h.severity === 'medium').length;

  if (highHotspots > 0) {
    vibeTranslation = `🌶️ getting spicy - ${highHotspots} complex function${highHotspots > 1 ? 's' : ''} detected`;
  } else if (mediumHotspots > 0) {
    vibeTranslation = `couple of tangled bits, but manageable`;
  } else if (result.hotspots.length > 0) {
    vibeTranslation = `minor complexity - nothing scary`;
  } else {
    vibeTranslation = `clean and readable 📖`;
  }

  return JSON.stringify({
    metrics: result.metrics,
    hotspots: result.hotspots,
    functionCount: functions.length,
    vibeTranslation,
  }, null, 2);
}

interface FunctionInfo {
  name: string;
  body: string;
  startLine: number;
}

function extractFunctions(code: string): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  
  // Match various function patterns
  const patterns = [
    // Regular functions
    /function\s+(\w+)\s*\([^)]*\)\s*\{/g,
    // Arrow functions assigned to const/let
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g,
    // Arrow functions assigned to const/let (implicit return won't have braces)
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,
    // Method definitions
    /(\w+)\s*\([^)]*\)\s*\{/g,
    // Async functions
    /async\s+function\s+(\w+)\s*\([^)]*\)\s*\{/g,
  ];

  const lines = code.split('\n');
  
  // Simple brace-counting approach to extract function bodies
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for function start
    let funcName: string | null = null;
    
    const funcMatch = line.match(/(?:async\s+)?function\s+(\w+)\s*\(/);
    const arrowMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/);
    const methodMatch = line.match(/^\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/);
    
    if (funcMatch) {
      funcName = funcMatch[1];
    } else if (arrowMatch) {
      funcName = arrowMatch[1];
    } else if (methodMatch && !['if', 'for', 'while', 'switch', 'catch'].includes(methodMatch[1])) {
      funcName = methodMatch[1];
    }

    if (funcName && line.includes('{')) {
      // Extract function body by counting braces
      let braceCount = 0;
      let started = false;
      const bodyLines: string[] = [];
      
      for (let j = i; j < lines.length; j++) {
        const currentLine = lines[j];
        bodyLines.push(currentLine);
        
        for (const char of currentLine) {
          if (char === '{') {
            braceCount++;
            started = true;
          } else if (char === '}') {
            braceCount--;
          }
        }
        
        if (started && braceCount === 0) {
          break;
        }
      }

      if (bodyLines.length > 0) {
        functions.push({
          name: funcName,
          body: bodyLines.join('\n'),
          startLine: i + 1,
        });
      }
    }
  }

  return functions;
}

function calculateCyclomaticComplexity(code: string): number {
  // Start with 1 for the function itself
  let complexity = 1;

  // Count decision points
  const patterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /\?\s*[^:]/g,  // Ternary operator
    /&&/g,
    /\|\|/g,
    /\?\?/g,  // Nullish coalescing
  ];

  for (const pattern of patterns) {
    const matches = code.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }

  return complexity;
}

function calculateMaxNesting(code: string): number {
  let maxNesting = 0;
  let currentNesting = 0;
  
  // Track nesting through control structures
  const lines = code.split('\n');
  
  for (const line of lines) {
    // Check for nesting increase
    if (/\b(if|for|while|switch|try)\s*\(/.test(line) && line.includes('{')) {
      currentNesting++;
      maxNesting = Math.max(maxNesting, currentNesting);
    } else if (/\belse\s*\{/.test(line)) {
      // else at same level
    } else if (line.trim() === '}') {
      currentNesting = Math.max(0, currentNesting - 1);
    }
  }

  return maxNesting;
}
