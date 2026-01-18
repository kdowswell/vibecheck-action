import * as github from '@actions/github';
import * as core from '@actions/core';
import { PRContext, FileChange, Config } from './types';

export function getConfig(): Config {
  const checksStr = process.env.INPUT_CHECKS || 'security,ai-detection,tests,complexity';
  const skipLabelsStr = process.env.INPUT_SKIP_LABELS || 'skip-vibecheck,wip,draft';
  
  return {
    tone: (process.env.INPUT_TONE || 'playful') as 'playful' | 'professional',
    model: process.env.INPUT_MODEL || 'GPT-5.2',
    checks: checksStr.split(',').map(s => s.trim()),
    triggerPhrase: process.env.INPUT_TRIGGER_PHRASE || '@vibecheck',
    autoReview: process.env.INPUT_AUTO_REVIEW !== 'false',
    skipLabels: skipLabelsStr.split(',').map(s => s.trim().toLowerCase()),
    maxFiles: parseInt(process.env.INPUT_MAX_FILES || '50', 10),
  };
}

export async function getPRContext(): Promise<PRContext | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is required');
  }

  const octokit = github.getOctokit(token);
  const context = github.context;

  // Determine if this is a PR event or comment event
  const eventName = process.env.GITHUB_EVENT_NAME;
  let prNumber: number;
  let mode: 'review' | 'interactive' = 'review';
  let command: string | undefined;

  if (eventName === 'pull_request') {
    prNumber = context.payload.pull_request?.number!;
  } else if (eventName === 'issue_comment') {
    // Check if comment is on a PR
    if (!context.payload.issue?.pull_request) {
      core.info('Comment is not on a pull request, skipping');
      return null;
    }
    prNumber = context.payload.issue.number;
    mode = 'interactive';
    command = context.payload.comment?.body;
  } else {
    core.info(`Unsupported event: ${eventName}`);
    return null;
  }

  const { owner, repo } = context.repo;

  // Get PR details
  const { data: pr } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  // Get PR files
  const { data: filesData } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  const files: FileChange[] = filesData.map(f => ({
    filename: f.filename,
    status: f.status as FileChange['status'],
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch,
  }));

  // Build combined diff
  const diff = files
    .filter(f => f.patch)
    .map(f => `--- a/${f.filename}\n+++ b/${f.filename}\n${f.patch}`)
    .join('\n\n');

  const stats = {
    additions: files.reduce((sum, f) => sum + f.additions, 0),
    deletions: files.reduce((sum, f) => sum + f.deletions, 0),
    changedFiles: files.length,
  };

  return {
    mode,
    command,
    pr: {
      number: prNumber,
      title: pr.title,
      body: pr.body || '',
      author: pr.user?.login || 'unknown',
      head: pr.head.ref,
      base: pr.base.ref,
      headSha: pr.head.sha,
      labels: pr.labels.map(l => (typeof l === 'string' ? l : l.name || '')),
      draft: pr.draft || false,
    },
    files,
    diff,
    stats,
    repo: { owner, name: repo },
  };
}

export function shouldSkip(context: PRContext, config: Config): { skip: boolean; reason?: string } {
  // Skip drafts unless explicitly enabled
  if (context.pr.draft) {
    return { skip: true, reason: 'PR is a draft' };
  }

  // Skip if has skip label
  const prLabels = context.pr.labels.map(l => l.toLowerCase());
  const hasSkipLabel = config.skipLabels.some(sl => prLabels.includes(sl));
  if (hasSkipLabel) {
    return { skip: true, reason: 'PR has skip label' };
  }

  // Skip if too many files
  if (context.stats.changedFiles > config.maxFiles) {
    return { 
      skip: true, 
      reason: `PR has ${context.stats.changedFiles} files (max: ${config.maxFiles})` 
    };
  }

  // For interactive mode, check if comment contains trigger phrase
  if (context.mode === 'interactive') {
    if (!context.command?.includes(config.triggerPhrase)) {
      return { skip: true, reason: 'Comment does not contain trigger phrase' };
    }
  }

  return { skip: false };
}
