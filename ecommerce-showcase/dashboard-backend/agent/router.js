// ==========================================
// LAYER 1: Fast Intent Classifier
// ==========================================
const routeIntent = async (prompt) => {
  const cleanPrompt = prompt.toLowerCase().trim();

  // 1. FAST-PATH PRE-CHECK (0ms Latency for explicit commands)
  if (cleanPrompt.includes('search') || cleanPrompt.includes('weather') || cleanPrompt.includes('news') || cleanPrompt.includes('google')) {
    return 'WEB_SEARCH';
  }
  if (cleanPrompt.includes('add ') || cleanPrompt.includes('create ') || cleanPrompt.includes('cross off') || cleanPrompt.includes('complete ') || cleanPrompt.includes('delete ')) {
    return 'DATABASE_ACTION';
  }
  if (cleanPrompt.includes('what is on my') || cleanPrompt.includes('task list') || cleanPrompt.includes('active task') || cleanPrompt.includes('roadmap')) {
    return 'TASK_INQUIRY';
  }

  // 2. LLM FALLBACK ROUTER (llama3.2:1b for ambiguous prompts)
  const model = 'llama3.2:1b'; 
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const systemMessage = {
    role: 'system',
    content: `You are a high-speed routing AI. Today is ${currentDate}.
    Classify the user's prompt into EXACTLY one category:
    
    1. "DATABASE_ACTION": Commands to add, create, cross off, complete, delete, or update tasks.
    2. "TASK_INQUIRY": Asking to list, view, or summarize the to-do list.
    3. "WEB_SEARCH": Questions about real-world facts, current events, news, weather, dates, or people.
    4. "GENERAL_CHAT": Basic small talk, greetings, or general conversation.
    
    Return ONLY a JSON object. Example: {"intent": "GENERAL_CHAT"}`
  };

  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [systemMessage, { role: 'user', content: prompt }],
        stream: false,
        format: 'json'
      })
    });

    if (!response.ok) throw new Error('Router failed to connect to Ollama.');
    
    const data = await response.json();
    let rawIntent = "";

    try {
      const parsed = JSON.parse(data.message.content);
      rawIntent = (parsed.intent || parsed.category || "").toUpperCase().trim();
    } catch (e) {
      rawIntent = data.message.content.toUpperCase().trim();
    }
    
    if (rawIntent.includes('DATABASE') || rawIntent.includes('ADD') || rawIntent.includes('CREATE') || rawIntent.includes('UPDATE')) return 'DATABASE_ACTION';
    if (rawIntent.includes('TASK') || rawIntent.includes('INQUIRY') || rawIntent.includes('ROADMAP') || rawIntent.includes('LIST')) return 'TASK_INQUIRY';
    if (rawIntent.includes('SEARCH') || rawIntent.includes('WEB') || rawIntent.includes('INTERNET') || rawIntent.includes('NEWS')) return 'WEB_SEARCH';
    
    return 'GENERAL_CHAT';
    
  } catch (err) {
    console.error("Router Error:", err.message);
    return 'GENERAL_CHAT'; 
  }
};

module.exports = { routeIntent };