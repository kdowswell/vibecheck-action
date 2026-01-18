"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
exports.getPRContext = getPRContext;
exports.shouldSkip = shouldSkip;
const github = __importStar(require("@actions/github"));
const core = __importStar(require("@actions/core"));
function getConfig() {
    const checksStr = process.env.INPUT_CHECKS || 'security,ai-detection,tests,complexity';
    const skipLabelsStr = process.env.INPUT_SKIP_LABELS || 'skip-vibecheck,wip,draft';
    return {
        tone: (process.env.INPUT_TONE || 'playful'),
        model: process.env.INPUT_MODEL || 'gpt-5',
        checks: checksStr.split(',').map(s => s.trim()),
        triggerPhrase: process.env.INPUT_TRIGGER_PHRASE || '@vibecheck',
        autoReview: process.env.INPUT_AUTO_REVIEW !== 'false',
        skipLabels: skipLabelsStr.split(',').map(s => s.trim().toLowerCase()),
        maxFiles: parseInt(process.env.INPUT_MAX_FILES || '50', 10),
    };
}
async function getPRContext() {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        throw new Error('GITHUB_TOKEN is required');
    }
    const octokit = github.getOctokit(token);
    const context = github.context;
    // Determine if this is a PR event or comment event
    const eventName = process.env.GITHUB_EVENT_NAME;
    let prNumber;
    let mode = 'review';
    let command;
    if (eventName === 'pull_request') {
        prNumber = context.payload.pull_request?.number;
    }
    else if (eventName === 'issue_comment') {
        // Check if comment is on a PR
        if (!context.payload.issue?.pull_request) {
            core.info('Comment is not on a pull request, skipping');
            return null;
        }
        prNumber = context.payload.issue.number;
        mode = 'interactive';
        command = context.payload.comment?.body;
    }
    else {
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
    const files = filesData.map(f => ({
        filename: f.filename,
        status: f.status,
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
function shouldSkip(context, config) {
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
//# sourceMappingURL=context.js.map