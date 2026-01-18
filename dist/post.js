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
exports.postVibeReport = postVibeReport;
exports.postInteractiveResponse = postInteractiveResponse;
exports.parseVibeReport = parseVibeReport;
const github = __importStar(require("@actions/github"));
const core = __importStar(require("@actions/core"));
const COMMENT_MARKER = '<!-- vibecheck-report -->';
async function postVibeReport(context, report) {
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
    const existingComment = comments.find(c => c.body?.includes(COMMENT_MARKER) ||
        c.body?.includes('✨ VIBE CHECK ✨'));
    if (existingComment) {
        // Update existing comment
        await octokit.rest.issues.updateComment({
            owner,
            repo,
            comment_id: existingComment.id,
            body: commentBody,
        });
        core.info(`Updated existing Vibe Check comment: ${existingComment.html_url}`);
    }
    else {
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
async function postInteractiveResponse(context, response) {
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
function formatComment(report) {
    return `${COMMENT_MARKER}
${report.content}

---
<sub>🎭 [Vibe Check](https://github.com/seam-dev/vibecheck-action) • Powered by GitHub Copilot</sub>`;
}
function parseVibeReport(content) {
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
function extractField(content, fieldName) {
    // Match patterns like "Overall Vibe:    chaotic neutral 🎭"
    const regex = new RegExp(`${fieldName}:\\s*(.+?)(?:\\s*│|$)`, 'm');
    const match = content.match(regex);
    return match?.[1]?.trim() || null;
}
//# sourceMappingURL=post.js.map