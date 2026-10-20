// ==========================================
// LAYER 3: The Synthesizer
// ==========================================
const synthesizeResponse = async (prompt, intent, actionResult, db, history = [], vectorContext = "", model = 'gemma2:latest', onToken = null) => {
  return new Promise((resolve, reject) => {
    
    const generateResponse = async (taskContext = "") => {
      const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      let systemContent = `You are V, a direct, concise, and realist AI assistant.
Today's Date: ${currentDate}.

${taskContext}

${vectorContext}`;

      if (intent === 'DATABASE_ACTION') {
        if (actionResult && (actionResult.includes('[ERROR]') || actionResult.includes('[WARNING]'))) {
          systemContent += `\n\nSYSTEM ERROR LOG: "${actionResult}". Report the error directly to the user.`;
        } else {
          systemContent += `\n\nACTION LOG: "${actionResult}". Confirm this action naturally in one sentence.`;
        }
      } 
      else if (intent === 'WEB_SEARCH') {
        if (actionResult && actionResult.includes('[ERROR]')) {
          systemContent += `\n\nSYSTEM ERROR LOG: "${actionResult}". State that the web search failed.`;
        } else {
          systemContent += `\n\nCOMPLETED WEB SEARCH RESULTS:\n${actionResult}\n\nInstructions: Summarize the search results above directly in 2-3 sentences. Do not mention system logs or internal processes.`;
        }
      }

      const formattedHistory = history.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.content
      }));

      const ollamaMessages = [
        { role: 'system', content: systemContent },
        ...formattedHistory,
        { role: 'user', content: prompt }
      ];

      try {
        const response = await fetch('http://localhost:11434/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: model, messages: ollamaMessages, stream: true })
        });

        if (!response.ok) throw new Error(`Ollama HTTP Error: ${response.statusText}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              const chunk = parsed.message?.content || '';
              if (chunk) {
                fullContent += chunk;
                if (onToken) onToken(chunk);
              }
            } catch (e) {}
          }
        }

        resolve(fullContent); 
      } catch (err) {
        console.error("Synthesizer Error:", err);
        const fallback = "System error processing final response.";
        if (onToken) onToken(fallback);
        resolve(fallback);
      }
    };

    if (intent === 'TASK_INQUIRY' || intent === 'DATABASE_ACTION') {
      db.all(`SELECT id, text, priority, due_date, done FROM tasks WHERE archived = 0 ORDER BY created_at DESC LIMIT 20`, [], (err, tasks) => {
        if (err) return reject('Database error gathering context.');
        const activeTasks = tasks.filter(t => t.done === 0);
        const taskContext = `ACTIVE DATABASE TASKS: ${activeTasks.length === 0 ? "None." : JSON.stringify(activeTasks)}`;
        generateResponse(taskContext);
      });
    } else {
      generateResponse("");
    }
  });
};

module.exports = { synthesizeResponse };