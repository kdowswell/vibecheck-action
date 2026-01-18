import { z } from 'zod';
import { SecurityFinding } from '../types';

export const securityScanParams = z.object({
  code: z.string().describe('Code snippet to analyze for security issues'),
  filename: z.string().optional().describe('File path for context'),
  language: z.string().optional().describe('Programming language'),
});

export type SecurityScanParams = z.infer<typeof securityScanParams>;

export async function securityScanHandler(params: SecurityScanParams): Promise<string> {
  const findings: SecurityFinding[] = [];
  const { code, filename } = params;
  const lines = code.split('\n');

  // Pattern-based security checks
  const patterns: Array<{
    pattern: RegExp;
    type: string;
    severity: SecurityFinding['severity'];
    message: string;
  }> = [
    // Hardcoded secrets
    {
      pattern: /(['"])[A-Za-z0-9_]*(?:api[_-]?key|secret|password|token|credential)[A-Za-z0-9_]*\1\s*[:=]\s*(['"])[^'"]{8,}\2/gi,
      type: 'hardcoded-secret',
      severity: 'high',
      message: 'Possible hardcoded secret detected',
    },
    {
      pattern: /(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{24,}/g,
      type: 'stripe-key',
      severity: 'high',
      message: 'Stripe API key detected',
    },
    {
      pattern: /ghp_[A-Za-z0-9]{36}/g,
      type: 'github-token',
      severity: 'high',
      message: 'GitHub personal access token detected',
    },
    {
      pattern: /AKIA[0-9A-Z]{16}/g,
      type: 'aws-key',
      severity: 'high',
      message: 'AWS access key detected',
    },

    // SQL Injection
    {
      pattern: /`SELECT.*\$\{.*\}`/gi,
      type: 'sql-injection',
      severity: 'high',
      message: 'Potential SQL injection - string interpolation in query',
    },
    {
      pattern: /['"]SELECT.*['"].*\+.*(?:req|params|query|body)/gi,
      type: 'sql-injection',
      severity: 'high',
      message: 'Potential SQL injection - concatenating user input',
    },
    {
      pattern: /\.query\s*\(\s*['"`].*\$\{/gi,
      type: 'sql-injection',
      severity: 'high',
      message: 'Potential SQL injection in query method',
    },

    // XSS
    {
      pattern: /innerHTML\s*=\s*(?!['"]<)/g,
      type: 'xss',
      severity: 'high',
      message: 'Potential XSS - setting innerHTML with dynamic content',
    },
    {
      pattern: /dangerouslySetInnerHTML/g,
      type: 'xss',
      severity: 'medium',
      message: 'Using dangerouslySetInnerHTML - ensure content is sanitized',
    },
    {
      pattern: /document\.write\s*\(/g,
      type: 'xss',
      severity: 'high',
      message: 'document.write can enable XSS attacks',
    },

    // Command injection
    {
      pattern: /(?:exec|spawn|execSync|spawnSync)\s*\([^)]*\$\{/g,
      type: 'command-injection',
      severity: 'high',
      message: 'Potential command injection - interpolating into shell command',
    },
    {
      pattern: /(?:exec|spawn)\s*\([^)]*\+/g,
      type: 'command-injection',
      severity: 'high',
      message: 'Potential command injection - concatenating into shell command',
    },

    // Insecure practices
    {
      pattern: /eval\s*\(/g,
      type: 'eval',
      severity: 'medium',
      message: 'eval() is dangerous - consider alternatives',
    },
    {
      pattern: /new Function\s*\(/g,
      type: 'eval',
      severity: 'medium',
      message: 'new Function() can execute arbitrary code',
    },
    {
      pattern: /crypto\.createHash\s*\(\s*['"](?:md5|sha1)['"]\s*\)/gi,
      type: 'weak-crypto',
      severity: 'medium',
      message: 'Weak hash algorithm - use SHA-256 or better',
    },
    {
      pattern: /Math\.random\s*\(\s*\)/g,
      type: 'insecure-random',
      severity: 'low',
      message: 'Math.random() is not cryptographically secure',
    },

    // Auth issues
    {
      pattern: /(?:verify|check).*(?:password|token|auth).*(?:===?|!==?)\s*(?:true|false)/gi,
      type: 'auth-bypass',
      severity: 'high',
      message: 'Suspicious authentication check pattern',
    },
    {
      pattern: /jwt\.verify.*\{\s*algorithms\s*:\s*\[\s*['"]none['"]/gi,
      type: 'jwt-none',
      severity: 'high',
      message: 'JWT allowing "none" algorithm is insecure',
    },
  ];

  // Check each pattern
  for (const { pattern, type, severity, message } of patterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    
    while ((match = regex.exec(code)) !== null) {
      // Find line number
      const beforeMatch = code.slice(0, match.index);
      const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
      
      findings.push({
        severity,
        type,
        message,
        file: filename,
        line: lineNumber,
        snippet: lines[lineNumber - 1]?.trim().slice(0, 100),
      });
    }
  }

  // Dedupe findings by type + line
  const seen = new Set<string>();
  const uniqueFindings = findings.filter(f => {
    const key = `${f.type}:${f.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Generate vibe-style summary
  const high = uniqueFindings.filter(f => f.severity === 'high').length;
  const medium = uniqueFindings.filter(f => f.severity === 'medium').length;
  const low = uniqueFindings.filter(f => f.severity === 'low').length;

  let vibeTranslation: string;
  if (high > 0) {
    vibeTranslation = `🔴 ${high} critical issue${high > 1 ? 's' : ''} found - needs attention before merge`;
  } else if (medium > 0) {
    vibeTranslation = `🟡 ${medium} thing${medium > 1 ? 's' : ''} to review`;
  } else if (low > 0) {
    vibeTranslation = `🟢 Minor observations only`;
  } else {
    vibeTranslation = `✨ Looking clean!`;
  }

  return JSON.stringify({
    findings: uniqueFindings,
    summary: { high, medium, low, total: uniqueFindings.length },
    vibeTranslation,
  }, null, 2);
}
