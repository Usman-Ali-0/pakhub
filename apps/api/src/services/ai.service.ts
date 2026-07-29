import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { config } from '../config';
import { decryptApiKey } from './auth.service';
import prisma from '../lib/prisma';

// ─────────────────────────────────────────────────────────
// Platform-level free AI clients (admin keys)
// ─────────────────────────────────────────────────────────

function getGeminiClient() {
  if (!config.ai.geminiApiKey) return null;
  return new GoogleGenerativeAI(config.ai.geminiApiKey);
}

function getGroqClient() {
  if (!config.ai.groqApiKey) return null;
  return new Groq({ apiKey: config.ai.groqApiKey });
}

// ─────────────────────────────────────────────────────────
// Get user's custom AI provider if they have one
// ─────────────────────────────────────────────────────────

async function getUserProvider(userId: string, useFor: string) {
  const provider = await prisma.userAiProvider.findFirst({
    where: {
      userId,
      useFor: { has: useFor },
      isDefault: true,
    },
  });
  return provider;
}

// ─────────────────────────────────────────────────────────
// AI PR Code Review
// ─────────────────────────────────────────────────────────

export async function reviewPullRequest(
  diff: string,
  prTitle: string,
  prBody: string,
  userId?: string
): Promise<{
  summary: string;
  score: number;
  comments: Array<{ path: string; line: number; severity: string; message: string; suggestion?: string }>;
  positives: string[];
}> {
  const prompt = `You are an expert code reviewer for PISA-HUB platform. Review this pull request and provide structured feedback.

PR Title: ${prTitle}
PR Description: ${prBody || 'No description provided'}

Diff:
\`\`\`diff
${diff.slice(0, 15000)}
\`\`\`

Respond ONLY with valid JSON in this exact format:
{
  "summary": "Brief overall assessment (2-3 sentences)",
  "score": 85,
  "positives": ["What is done well 1", "What is done well 2"],
  "comments": [
    {
      "path": "src/file.ts",
      "line": 42,
      "severity": "warning",
      "message": "Potential null reference",
      "suggestion": "Add null check: if (value !== null)"
    }
  ]
}

Severity levels: "critical" (bugs/security), "warning" (code quality), "info" (style), "suggestion" (improvements)
Score from 0-100 (100 = perfect). Keep comments array under 10 items.`;

  try {
    // Try user's custom provider first
    if (userId) {
      const userProvider = await getUserProvider(userId, 'review');
      if (userProvider) {
        const result = await callUserProvider(userProvider, prompt);
        if (result) return parseAIReviewResponse(result);
      }
    }

    // Fall back to platform Gemini
    const gemini = getGeminiClient();
    if (gemini) {
      const model = gemini.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const response = await model.generateContent(prompt);
      const text = response.response.text();
      return parseAIReviewResponse(text);
    }

    return getDefaultReview();
  } catch (err) {
    console.error('AI review error:', err);
    return getDefaultReview();
  }
}

// ─────────────────────────────────────────────────────────
// AI PR Summary Generation
// ─────────────────────────────────────────────────────────

export async function summarizePullRequest(
  diff: string,
  headBranch: string,
  baseBranch: string,
  userId?: string
): Promise<string> {
  const prompt = `You are a helpful assistant on PISA-HUB. Generate a clear, professional pull request description from this diff.

Branch: ${headBranch} → ${baseBranch}

Diff (first 10000 chars):
\`\`\`diff
${diff.slice(0, 10000)}
\`\`\`

Write a PR description with:
## What changed
(bullet points of main changes)

## Why
(brief rationale if inferable)

## Testing
(what should be tested)

Keep it concise and professional. No preamble.`;

  try {
    if (userId) {
      const userProvider = await getUserProvider(userId, 'review');
      if (userProvider) {
        const result = await callUserProvider(userProvider, prompt);
        if (result) return result;
      }
    }

    const gemini = getGeminiClient();
    if (gemini) {
      const model = gemini.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const response = await model.generateContent(prompt);
      return response.response.text();
    }

    return 'AI summary not available. Please configure an AI provider in Settings → AI Providers.';
  } catch (err) {
    console.error('AI summary error:', err);
    return 'Failed to generate summary. Please try again.';
  }
}

// ─────────────────────────────────────────────────────────
// AI Code Explanation
// ─────────────────────────────────────────────────────────

export async function explainCode(
  code: string,
  language: string,
  userId?: string
): Promise<string> {
  const prompt = `Explain this ${language} code clearly and concisely. Focus on what it does, not how line by line.\n\n\`\`\`${language}\n${code.slice(0, 5000)}\n\`\`\``;

  try {
    if (userId) {
      const userProvider = await getUserProvider(userId, 'chat');
      if (userProvider) {
        const result = await callUserProvider(userProvider, prompt);
        if (result) return result;
      }
    }

    const gemini = getGeminiClient();
    if (gemini) {
      const model = gemini.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const response = await model.generateContent(prompt);
      return response.response.text();
    }

    return 'AI explanation not available.';
  } catch {
    return 'Failed to explain code.';
  }
}

// ─────────────────────────────────────────────────────────
// AI Commit Message Suggestion (Groq — fast)
// ─────────────────────────────────────────────────────────

export async function suggestCommitMessage(diff: string, userId?: string): Promise<string> {
  const prompt = `Generate a concise, conventional commit message for this diff. Format: type(scope): description\nTypes: feat, fix, docs, style, refactor, test, chore\nDiff:\n${diff.slice(0, 3000)}\n\nRespond with ONLY the commit message, nothing else.`;

  try {
    if (userId) {
      const userProvider = await getUserProvider(userId, 'copilot');
      if (userProvider) {
        const result = await callUserProvider(userProvider, prompt);
        if (result) return result.trim();
      }
    }

    // Use Groq for speed
    const groq = getGroqClient();
    if (groq) {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.3,
      });
      return completion.choices[0]?.message?.content?.trim() || 'chore: update code';
    }

    // Fallback to Gemini
    const gemini = getGeminiClient();
    if (gemini) {
      const model = gemini.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const response = await model.generateContent(prompt);
      return response.response.text().trim();
    }

    return 'chore: update code';
  } catch {
    return 'chore: update code';
  }
}

// ─────────────────────────────────────────────────────────
// Copilot Code Completion (Groq — ultra fast)
// ─────────────────────────────────────────────────────────

export async function getCopilotCompletion(
  prefix: string,
  suffix: string,
  language: string,
  userId?: string
): Promise<string> {
  const prompt = `Complete the following ${language} code. Only output the completion, no explanation, no markdown.\n\nCode before cursor:\n${prefix.slice(-1000)}\n\nCode after cursor:\n${suffix.slice(0, 500)}`;

  try {
    if (userId) {
      const userProvider = await getUserProvider(userId, 'copilot');
      if (userProvider) {
        const result = await callUserProvider(userProvider, prompt);
        if (result) return result;
      }
    }

    const groq = getGroqClient();
    if (groq) {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.2,
        stop: ['\n\n', '```'],
      });
      return completion.choices[0]?.message?.content || '';
    }

    return '';
  } catch {
    return '';
  }
}

// ─────────────────────────────────────────────────────────
// AI Chat (ask questions about code/repo)
// ─────────────────────────────────────────────────────────

export async function chatWithAI(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  context: { repoName?: string; filePath?: string; fileContent?: string },
  userId?: string
): Promise<string> {
  const systemContext = `You are PISA Copilot, an AI assistant integrated into PISA-HUB (a code collaboration platform like GitHub).
${context.repoName ? `Repository: ${context.repoName}` : ''}
${context.filePath ? `File: ${context.filePath}` : ''}
${context.fileContent ? `File content:\n\`\`\`\n${context.fileContent.slice(0, 5000)}\n\`\`\`` : ''}
Be helpful, concise, and technical. Format code with markdown code blocks.`;

  const fullPrompt = `${systemContext}\n\n${messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}\nAssistant:`;

  try {
    if (userId) {
      const userProvider = await getUserProvider(userId, 'chat');
      if (userProvider) {
        const result = await callUserProvider(userProvider, fullPrompt);
        if (result) return result;
      }
    }

    const gemini = getGeminiClient();
    if (gemini) {
      const model = gemini.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const response = await model.generateContent(fullPrompt);
      return response.response.text();
    }

    return 'AI chat is not configured. Please add your API key in Settings → AI Providers.';
  } catch {
    return 'Failed to get AI response. Please try again.';
  }
}

// ─────────────────────────────────────────────────────────
// BYOAI: Call user's custom provider
// ─────────────────────────────────────────────────────────

async function callUserProvider(provider: any, prompt: string): Promise<string | null> {
  try {
    const apiKey = decryptApiKey(provider.encryptedApiKey);

    switch (provider.provider) {
      case 'GEMINI': {
        const client = new GoogleGenerativeAI(apiKey);
        const model = client.getGenerativeModel({ model: provider.selectedModel || 'gemini-2.5-flash' });
        const response = await model.generateContent(prompt);
        return response.response.text();
      }

      case 'GROQ': {
        const client = new Groq({ apiKey });
        const completion = await client.chat.completions.create({
          model: provider.selectedModel || 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
        });
        return completion.choices[0]?.message?.content || null;
      }

      case 'OPENAI':
      case 'ANTHROPIC':
      case 'MISTRAL':
      case 'CUSTOM': {
        // OpenAI-compatible API
        const endpoint = provider.endpoint || getDefaultEndpoint(provider.provider);
        const response = await fetch(`${endpoint}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: provider.selectedModel,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 2000,
          }),
        });
        const data = await response.json() as any;
        return data.choices?.[0]?.message?.content || null;
      }

      case 'OLLAMA': {
        const endpoint = provider.endpoint || 'http://localhost:11434';
        const response = await fetch(`${endpoint}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: provider.selectedModel,
            prompt,
            stream: false,
          }),
        });
        const data = await response.json() as any;
        return data.response || null;
      }

      default:
        return null;
    }
  } catch (err: any) {
    console.error('User provider error:', err);
    return `[AI Provider Error] ${err.message || 'Unknown error occurred while calling your AI provider.'}`;
  }
}

function getDefaultEndpoint(provider: string): string {
  switch (provider) {
    case 'OPENAI': return 'https://api.openai.com/v1';
    case 'ANTHROPIC': return 'https://api.anthropic.com/v1';
    case 'MISTRAL': return 'https://api.mistral.ai/v1';
    default: return 'https://api.openai.com/v1';
  }
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function parseAIReviewResponse(text: string) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {}
  return getDefaultReview();
}

function getDefaultReview() {
  return {
    summary: 'AI review is not configured. Add a Gemini API key in your .env file.',
    score: 0,
    comments: [],
    positives: [],
  };
}
