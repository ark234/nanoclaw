---
name: context-awareness
description: Know your context window limits and manage them proactively. Check your own session size, know when to compact, and route long-context tasks to Gemini instead of Claude.
---

# Context Window Awareness

## Your limits

| Model | Context window | Auto-compact threshold |
|-------|---------------|----------------------|
| Claude (you) | 200,000 tokens | 165,000 tokens — compaction fires automatically |
| Gemini 2.5 Pro | 1,000,000 tokens | None — no auto-compact |
| Gemini 2.0 Flash | 1,000,000 tokens | None |
| Opus 4.7 (via escalation) | 200,000 tokens | Same as Claude |

When your session hits 165k tokens, Claude Code auto-compacts and sends you a message: "Context compacted (X tokens compacted)." After compaction, the conversation history is summarised and context resets — you keep working but lose verbatim history.

## Where session state lives

You're running inside a NanoClaw container. The host's Claude Code session
transcripts (`~/.claude/projects/*/session-*.jsonl`) don't exist here — sessions
are in `/workspace/inbound.db` (host writes, you read) + `/workspace/outbound.db`
(you write, host reads). There's no transcript-file size to grep against.

Estimate your own context use by what you've been doing this turn: large file
reads, long search results, and big diffs are the dominant consumers. Bash
commands' outputs count too. When you've been reading a lot, assume you're
closer to the limit than not.

## When to act proactively

- **> 100k estimated tokens**: Warn the user if you're about to start a large multi-step task. Offer to compact first.
- **> 130k tokens**: Route any new large-context work to Gemini instead of loading more into your own context.
- **Very large documents / codebases**: Prefer Gemini by default — its 1M context means it can hold the full document plus your analysis without approaching limits.

## Routing decisions

Route to **Gemini** when:
- The input alone is > 50k tokens (large files, long documents, big diffs)
- You're already deep in a session and adding more would push past 130k
- The task benefits from a fresh, uncompressed context

Route to **Opus** (via escalation skill) when:
- Reasoning complexity is the bottleneck, not context size
- You want a more capable model on the same problem, not a larger context window

## What to tell the user

If you're approaching your limit on an important task, say so plainly:
> "I'm getting close to my context limit for this session. I can compact now to free up space, or route this next step to Gemini which has a much larger window. What would you prefer?"

Don't silently let auto-compact fire mid-task if the user would care about losing verbatim history.
