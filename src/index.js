const core = require('@actions/core');
const fs = require('fs');
const PROMPT = `You are an AI-powered commit message improver. You will be given a commit message and your task is to suggest improvements based on best practices. These best practices include:

*   **Subject Line:**
    *   Limit to 50 characters.
    *   Capitalize the first letter.
    *   Use the imperative mood (e.g., "Fix," "Add," "Refactor").
    *   Do not end with a period.
    *   Describe *what* the commit changes, not *how*.
*   **Body (Optional):**
    *   Separate from the subject with a blank line.
    *   Wrap lines at 72 characters.
    *   Provide context for *why* the change was made.
    *   Explain the problem the commit solves.
    *   Explain any trade-offs made.

Here's the commit message to improve:

{commit_message}

Provide your suggested improvements in the following format:

**Improved Subject:** {improved_subject}

**Improved Body:**
{improved_body}

If the original commit message is already good, simply state: "No improvements needed."`;
async function run() {
  try {
    const key = core.getInput('gemini_api_key');
    const token = core.getInput('service_token');
    const ctx = { repoName: process.env.GITHUB_REPOSITORY || '', event: process.env.GITHUB_EVENT_NAME || '' };
    try { Object.assign(ctx, JSON.parse(fs.readFileSync('package.json', 'utf8'))); } catch {}
    let prompt = PROMPT;
    for (const [k, v] of Object.entries(ctx)) prompt = prompt.replace(new RegExp('{' + k + '}', 'g'), String(v || ''));
    let result;
    if (key) {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 2000 } })
      });
      result = (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (token) {
      const r = await fetch('https://action-factory.walshd1.workers.dev/generate/ai-powered-commit-message-improver', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx)
      });
      result = (await r.json()).content || '';
    } else throw new Error('Need gemini_api_key or service_token');
    console.log(result);
    core.setOutput('result', result);
  } catch (e) { core.setFailed(e.message); }
}
run();
