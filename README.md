# 🎭 Vibe Check

> PR review for developers who ship fast. Catches security issues, AI slop, and complexity — with personality.

Vibe Check is a GitHub Action powered by **GitHub Copilot** that reviews your pull requests with a mix of serious analysis and playful commentary.

## Features

- **🔒 Security Scanning** - Catches hardcoded secrets, SQL injection, XSS, and more
- **🤖 AI Slop Detection** - Identifies potentially auto-accepted AI-generated code
- **🧪 Test Coverage Check** - Flags changed code missing tests
- **📊 Complexity Analysis** - Finds functions that got too spicy
- **✨ The Vibe Report** - Results delivered with personality

## Quick Start

### 1. Create a Personal Access Token

The action needs a GitHub token with **Copilot access**:

1. Go to [GitHub Settings → Personal Access Tokens → Fine-grained tokens](https://github.com/settings/tokens?type=beta)
2. Click "Generate new token"
3. Give it a name like "Vibe Check"
4. Under **Permissions**, add:
   - `Copilot Requests` - Read and write
   - `Pull requests` - Read and write
   - `Contents` - Read
5. Generate and copy the token

### 2. Add the Token to Your Repo

1. Go to your repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `COPILOT_TOKEN`
4. Value: paste your token

### 3. Add the Workflow

Create `.github/workflows/vibecheck.yml`:

```yaml
name: Vibe Check

on:
  pull_request:
    types: [opened, synchronize, ready_for_review]
  issue_comment:
    types: [created]

jobs:
  vibecheck:
    runs-on: ubuntu-latest
    # Only run on PR comments that mention @vibecheck
    if: >
      github.event_name == 'pull_request' ||
      (github.event_name == 'issue_comment' && 
       github.event.issue.pull_request &&
       contains(github.event.comment.body, '@vibecheck'))
    
    permissions:
      contents: read
      pull-requests: write
      issues: write
    
    steps:
      - uses: kdowswell/vibecheck-action@v1
        with:
          github_token: ${{ secrets.COPILOT_TOKEN }}
```

That's it! Vibe Check will now review your PRs automatically.

## Example Output

```
┌─────────────────────────────────────┐
│         ✨ VIBE CHECK ✨            │
├─────────────────────────────────────┤
│ Overall Vibe:    chaotic neutral 🎭 │
│ Ship It?:        ...maybe sit down  │
│ AI Slop Risk:    medium 🤖          │
│ Security:        one yikes found    │
│ Tests:           we don't talk abt  │
│ PR Size:         it's a lot         │
└─────────────────────────────────────┘

## 🔴 Security

**Potential SQL injection** in `src/db/users.ts:42`
```ts
const query = `SELECT * FROM users WHERE id = ${userId}`;
```
this is giving... Little Bobby Tables energy 💀

**Suggestion:** Use parameterized queries:
```ts
const query = 'SELECT * FROM users WHERE id = $1';
await db.query(query, [userId]);
```

## 🟡 AI Slop Risk

Detected patterns suggesting AI-generated code:
- 847 lines added in single commit
- 12 verbose explanatory comments
- Step-by-step numbered comments in `src/utils/parser.ts`

Not saying it's bad, just... maybe give it a read? 👀

## 🟡 Tests

Changed files missing test coverage:
- `src/db/users.ts`
- `src/utils/parser.ts`

no tests? bold strategy, let's see if it pays off 🎲
```

## Configuration

```yaml
- uses: kdowswell/vibecheck-action@v1
  with:
    # Required: GitHub token with Copilot access
    github_token: ${{ secrets.COPILOT_TOKEN }}
    
    # Optional: Response tone ("playful" or "professional")
    tone: "playful"
    
    # Optional: Which model to use
    model: "gpt-5"
    
    # Optional: Which checks to run
    checks: "security,ai-detection,tests,complexity"
    
    # Optional: Trigger phrase for interactive mode
    trigger_phrase: "@vibecheck"
    
    # Optional: Auto-review new PRs
    auto_review: "true"
    
    # Optional: Skip PRs with these labels
    skip_labels: "skip-vibecheck,wip,draft"
    
    # Optional: Skip PRs with more than N files
    max_files: "50"
```

## Interactive Mode

Comment on any PR with `@vibecheck` followed by a question:

- `@vibecheck is this SQL query safe?`
- `@vibecheck explain what this function does`
- `@vibecheck write tests for the parser`
- `@vibecheck help me split this PR`

## Professional Mode

For teams that prefer less personality:

```yaml
- uses: kdowswell/vibecheck-action@v1
  with:
    github_token: ${{ secrets.COPILOT_TOKEN }}
    tone: "professional"
```

## Models

Vibe Check supports any model available in GitHub Copilot:

- `gpt-5` (default) - Best overall
- `gpt-5.2-codex` - Optimized for code
- `claude-sonnet-4.5` - Great for nuanced analysis
- `gpt-5-mini` - Faster, included in subscription (no premium requests)

## Requirements

- GitHub Copilot subscription (Pro, Pro+, Business, or Enterprise)
- Repository with GitHub Actions enabled

## Pricing

Vibe Check is **free**. You just need a Copilot subscription, which you probably already have.

Each review uses 1-3 premium requests from your Copilot quota, depending on PR size.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Type check
npm run typecheck
```

## License

MIT