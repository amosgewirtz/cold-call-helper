import { useState } from 'react';

const SYSTEM_PROMPT = `You are a cold calling assistant for SerraFi Bank. SerraFi offers a business debit card that earns 1.5% cashback on all spending, including state and federal corporate taxes, vendor payments, SaaS subscriptions, and utilities.

Key facts:
- No annual fee, no minimum balance
- 1.5% cashback on everything including taxes (which can't usually go on credit cards)
- Not replacing their bank — it's an add-on
- SerraFi is an early-stage company
- The CEO is available for direct calls
- Works through normal tax payment portals

Tone: Direct, concise, conversational. No corporate fluff. Speak naturally like a real person on a phone call.

Your task: Given the conversation so far and a new objection from the prospect, generate a short response (2-3 sentences max) that the SDR can read aloud immediately. Focus on the 1.5% cashback value proposition. Be empathetic but confident.`;

export default function AiAssist({ tree, path, currentNode, apiKey, addAiObjection, onResponse }) {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!input.trim()) return;

    if (!apiKey) {
      setError('Please set your Anthropic API key in Settings (gear icon).');
      return;
    }

    setLoading(true);
    setError('');

    const conversationContext = path.map(nodeId => {
      const n = tree[nodeId];
      return `[${n?.label}]: ${n?.scriptText}`;
    }).join('\n');

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 256,
          system: SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: `Conversation so far:\n${conversationContext}\n\nCurrent script position: ${currentNode.label}\nCurrent script text: "${currentNode.scriptText}"\n\nThe prospect just said: "${input}"\n\nGenerate a natural spoken response the SDR can read aloud immediately.`,
          }],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const aiText = data.content[0].text;

      addAiObjection({ objection: input, timestamp: Date.now(), nodeId: currentNode.id });

      onResponse({ text: aiText, objection: input });
      setInput('');
      setExpanded(false);
    } catch (err) {
      setError("Couldn't generate a response. Try rephrasing.");
    } finally {
      setLoading(false);
    }
  };

  if (!expanded) {
    return (
      <button className="ai-trigger-btn" onClick={() => setExpanded(true)}>
        I'm hearing something else...
      </button>
    );
  }

  return (
    <div className="ai-input-area">
      <div className="ai-input-header">What did the prospect say?</div>
      <textarea
        className="ai-textarea"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={'e.g. "We\'re locked into a contract with our current bank for 18 more months"'}
        rows={2}
        autoFocus
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
      />
      {error && <div className="ai-error">{error}</div>}
      <div className="ai-input-actions">
        <button className="ai-submit-btn" onClick={handleSubmit} disabled={loading || !input.trim()}>
          {loading ? 'Thinking...' : 'Get response'}
        </button>
        <button className="ai-cancel-btn" onClick={() => { setExpanded(false); setInput(''); setError(''); }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
