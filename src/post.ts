import * as github from '@actions/github';
import * as core from '@actions/core';
import { PRContext, VibeReport } from './types';

const COMMENT_MARKER = '<!-- vibecheck-report -->';

export async function postVibeReport(
  context: PRContext, 
  report: VibeReport
): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is required to post results');
  }

  const octokit = github.getOctokit(token);
  const { owner, name: repo } = context.repo;
  const prNumber = context.pr.number;

  const commentBody = formatComment(report);

  // Look for existing Vibe Check comment
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
    per_page: 100,
  });

  const existingComment = comments.find(c => 
    c.body?.includes(COMMENT_MARKER) ||
    c.body?.includes('✨ VIBE CHECK ✨')
  );

  if (existingComment) {
    // Update existing comment
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment.id,
      body: commentBody,
    });
    core.info(`Updated existing Vibe Check comment: ${existingComment.html_url}`);
  } else {
    // Create new comment
    const { data: newComment } = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: commentBody,
    });
    core.info(`Created Vibe Check comment: ${newComment.html_url}`);
  }

  // Set action outputs
  core.setOutput('vibe', report.summary.overallVibe);
  core.setOutput('ship_it', report.summary.shipIt);
  core.setOutput('findings_count', report.findingsCount.toString());
}

export async function postInteractiveResponse(
  context: PRContext,
  response: string
): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is required to post results');
  }

  const octokit = github.getOctokit(token);
  const { owner, name: repo } = context.repo;
  const prNumber = context.pr.number;

  // Post as a new comment (interactive responses are threaded)
  const { data: comment } = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body: `${response}\n\n---\n<sub>🎭 Vibe Check</sub>`,
  });

  core.info(`Posted interactive response: ${comment.html_url}`);
}

function formatComment(report: VibeReport): string {
  return `${COMMENT_MARKER}
${report.content}

---
<sub>🎭 [Vibe Check](https://github.com/seam-dev/vibecheck-action) • Powered by GitHub Copilot</sub>`;
}

export function parseVibeReport(content: string): VibeReport {
  // Extract summary from the formatted output
  const summary = {
    overallVibe: extractField(content, 'Overall Vibe') || 'unknown',
    shipIt: extractField(content, 'Ship It?') || 'unknown',
    aiSlopRisk: extractField(content, 'AI Slop Risk') || 'n/a',
    securityStatus: extractField(content, 'Security') || 'n/a',
    testStatus: extractField(content, 'Tests') || 'n/a',
    sizeStatus: extractField(content, 'PR Size') || 'n/a',
  };

  // Count findings by emoji severity indicators
  const highCount = (content.match(/🔴/g) || []).length;
  const mediumCount = (content.match(/🟡/g) || []).length;
  const lowCount = (content.match(/🟢/g) || []).length;

  return {
    summary,
    content,
    findingsCount: highCount + mediumCount + lowCount,
  };
}

function extractField(content: string, fieldName: string): string | null {
  // Match patterns like "Overall Vibe:    chaotic neutral 🎭"
  const regex = new RegExp(`${fieldName}:\\s*(.+?)(?:\\s*│|$)`, 'm');
  const match = content.match(regex);
  return match?.[1]?.trim() || null;
}
