import * as core from '@actions/core';
import { CopilotClient, defineTool } from '@github/copilot-sdk';
import { z } from 'zod';

import { getConfig, getPRContext, shouldSkip } from './context';
import { getSystemPrompt, buildReviewPrompt, buildInteractivePrompt } from './persona';
import { getTools } from './tools';
import { postVibeReport, postInteractiveResponse, parseVibeReport } from './post';

async function main() {
  try {
    core.info('🎭 Vibe Check starting...');

    // Load configuration
    const config = getConfig();
    core.info(`Config: tone=${config.tone}, model=${config.model}, checks=${config.checks.join(',')}`);

    // Get PR context
    const context = await getPRContext();
    if (!context) {
      core.info('No PR context available, exiting');
      return;
    }

    core.info(`PR #${context.pr.number}: ${context.pr.title}`);
    core.info(`Files: ${context.stats.changedFiles}, Lines: +${context.stats.additions}/-${context.stats.deletions}`);

    // Check if we should skip
    const skipCheck = shouldSkip(context, config);
    if (skipCheck.skip) {
      core.info(`Skipping: ${skipCheck.reason}`);
      return;
    }

    // Initialize Copilot SDK client
    core.info('Initializing Copilot SDK...');
    const client = new CopilotClient();

    // Get tool definitions
    const toolDefs = getTools(config);
    core.info(`Enabled tools: ${toolDefs.map(t => t.name).join(', ')}`);

    // Convert to SDK tool format
    const sdkTools = toolDefs.map(tool => 
      defineTool(tool.name, {
        description: tool.description,
        parameters: tool.parameters,
        handler: tool.handler,
      })
    );

    // Create session with tools and persona
    const session = await client.createSession({
      model: config.model,
      tools: sdkTools,
      systemMessage: {
        mode: 'append',
        content: getSystemPrompt(config),
      },
    });

    core.info(`Session created with model: ${config.model}`);

    // Build prompt based on mode
    let prompt: string;
    if (context.mode === 'interactive' && context.command) {
      prompt = buildInteractivePrompt(context, context.command);
      core.info('Running interactive mode');
    } else {
      prompt = buildReviewPrompt(context, config);
      core.info('Running full review mode');
    }

    // Send to Copilot and get response
    core.info('Analyzing PR...');
    const response = await session.sendAndWait({
      prompt,
    });

    // Extract text content from response
    const responseText = response?.data.content || '';

    core.info('Analysis complete');

    // Post results
    if (context.mode === 'interactive') {
      await postInteractiveResponse(context, responseText);
    } else {
      const report = parseVibeReport(responseText);
      await postVibeReport(context, report);
    }

    // Cleanup
    await session.destroy();
    await client.stop();

    core.info('🎭 Vibe Check complete!');

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    core.setFailed(`Vibe Check failed: ${message}`);
    
    if (error instanceof Error && error.stack) {
      core.debug(error.stack);
    }
  }
}

main();
