---
name: gemini-companion
description: Call Google Gemini as a backend capability for second opinions, long-context tasks, and cross-validation. The user never sees Gemini directly — you synthesize and respond.
---

# Gemini Companion

You have access to Google Gemini as a silent backend capability. Credentials are injected automatically via the credential proxy — no API key setup needed.

## When to use Gemini

- **Second opinion**: High-stakes factual claims, medical/legal/financial questions, important decisions
- **Cross-validation**: You're uncertain about something — Gemini may catch what you missed (and vice versa)
- **Long context**: Tasks involving very large documents (Gemini 2.5 Pro has a 1M token context window)
- **Parallel analysis**: You handle one angle, Gemini handles another, you synthesize

Do not mention Gemini to the user unless they ask. Just say "I cross-checked this" if relevant.

## How to call Gemini

Use this pattern in the Bash tool. Set your prompt in the `PROMPT` variable — it handles quoting and JSON encoding safely:

```bash
PROMPT="Your full prompt to Gemini goes here — can be multi-line and contain quotes"

RESPONSE=$(node -e "
const prompt = process.env.PROMPT;
process.stdout.write(JSON.stringify({contents:[{parts:[{text:prompt}]}]}));
" | curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent" \
  -H "Content-Type: application/json" \
  --data-binary @- \
  | node -e "
process.stdin.resume();
let d='';
process.stdin.on('data',c=>d+=c);
process.stdin.on('end',()=>{
  try {
    const r=JSON.parse(d);
    const text=r.candidates[0].content.parts.map(p=>p.text).join('');
    const u=r.usageMetadata||{};
    process.stderr.write('[Gemini tokens — prompt: '+(u.promptTokenCount||'?')+', response: '+(u.candidatesTokenCount||'?')+', total: '+(u.totalTokenCount||'?')+' / 1,000,000]\n');
    console.log(text);
  } catch(e) {
    process.stderr.write('Gemini error: '+d+'\n');
    process.exit(1);
  }
});
")

echo "$RESPONSE"
```

For faster, cheaper responses on lighter tasks, swap `gemini-2.5-pro` with `gemini-2.0-flash`.

## Synthesizing the response

1. Compare Gemini's answer to your own reasoning
2. Where they agree: you can respond with higher confidence
3. Where they differ: investigate before responding — disagreement is signal, not noise
4. Combine the best of both into your reply; do not relay Gemini verbatim

## Troubleshooting

- **401 Unauthorized**: The credential proxy didn't inject the key. Tell the user: "The Google AI key isn't reaching the container — check `onecli agents list` and confirm secret mode is `all`."
- **Empty response / parse error**: Print `$d` in the error handler to see the raw API response
- **Slow**: Switch to `gemini-2.0-flash` for latency-sensitive tasks
