// ==========================================
// LAYER 2: The Tool Executor
// ==========================================
const { tools } = require('./tools');

const executeAction = async (prompt, db, model = 'llama3.1:8b') => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT id, text, priority, due_date FROM tasks WHERE archived = 0 AND done = 0`, [], async (err, tasks) => {
      if (err) return reject('Database error gathering context for execution.');

      const systemMessage = {
        role: 'system',
        content: `You are Layer 2: The Tool Executor. 
        Active Tasks in Database: ${tasks.length === 0 ? "None." : JSON.stringify(tasks)}
        
        CRITICAL RULES:
        1. When marking a task as DONE, BOUGHT, COMPLETED, or CROSSING IT OFF, you MUST pass 'done': 1.
        2. Match the user's task text EXACTLY to its numeric ID in the list above before updating.`
      };

      try {
        const response = await fetch('http://localhost:11434/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model,
            messages: [systemMessage, { role: 'user', content: prompt }],
            tools: tools,
            stream: false
          })
        });

        const data = await response.json();

        if (data.error) {
          console.error(`❌ Layer 2 Tool Error [Model: ${model}]:`, data.error);
          return resolve(`[ERROR] Execution engine rejected the tool request: ${data.error}`);
        }

        const message = data.message;
        if (!message) return resolve(`[ERROR] Malformed AI execution payload.`);

        if (message.tool_calls && message.tool_calls.length > 0) {
          const executionPromises = message.tool_calls.map(async (toolCall) => {
            try {
              let args = toolCall.function.arguments;
              if (typeof args === 'string') args = JSON.parse(args);

              if (toolCall.function.name === 'update_task_status') {
                const { id, done } = args;
                return new Promise((res) => {
                  db.run(`UPDATE tasks SET done = ? WHERE id = ?`, [done, id], function(updateErr) {
                    if (updateErr) res(`[ERROR] Failed to update Task ID: ${id}`);
                    else res(`[SUCCESS] Task ID: ${id} marked as ${done === 1 ? 'completed' : 'active'}.`);
                  });
                });
              } 
              else if (toolCall.function.name === 'add_tasks') {
                let tasksToCreate = [];
                const extractTasks = (input) => {
                  if (typeof input === 'string') {
                    try { extractTasks(JSON.parse(input)); } catch (e) {
                      if (input.trim() !== '' && input.length > 2) tasksToCreate.push({ text: input.trim(), priority: 'low' });
                    }
                  } else if (Array.isArray(input)) {
                    input.forEach(item => extractTasks(item));
                  } else if (typeof input === 'object' && input !== null) {
                    if (input.text) tasksToCreate.push({ text: input.text, priority: input.priority || 'low' });
                    else Object.values(input).forEach(val => extractTasks(val));
                  }
                };

                extractTasks(args);
                tasksToCreate = tasksToCreate.filter((t, index, self) => index === self.findIndex((obj) => obj.text === t.text) && t.text.toLowerCase() !== 'tasks');

                if (tasksToCreate.length === 0) return `[ERROR] Invalid parameters provided for task creation.`;

                const insertPromises = tasksToCreate.map(t => {
                  return new Promise((insertRes) => {
                    db.run(`INSERT INTO tasks (text, priority) VALUES (?, ?)`, [t.text, t.priority || 'low'], function(err) {
                      if (err) insertRes(`[ERROR] Failed to create: "${t.text}"`);
                      else insertRes(`[SUCCESS] Created task: "${t.text}" (ID: ${this.lastID})`);
                    });
                  });
                });

                const insertResults = await Promise.all(insertPromises);
                return insertResults.join(' | ');
              }
              else if (toolCall.function.name === 'search_web') {
                const { query } = args;
                if (!query) return "[ERROR] AI failed to provide a search query.";
                
                const TAVILY_KEY = process.env.TAVILY_API_KEY || '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';

                try {
                  const tavilyRes = await fetch('https://api.tavily.com/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      api_key: TAVILY_KEY,
                      query: query,
                      search_depth: 'basic',
                      max_results: 2,
                      include_answer: true
                    })
                  });

                  if (!tavilyRes.ok) throw new Error(`Tavily API error: ${tavilyRes.statusText}`);
                  
                  const searchData = await tavilyRes.json();
                  if (!searchData.results || searchData.results.length === 0) {
                    return `[WARNING] Web search completed for "${query}", but no results were found.`;
                  }
                  
                  const summary = searchData.answer || searchData.results.map(r => r.content).join(' ');
                  return `[SUCCESS] Web Search Summary for "${query}": ${summary.substring(0, 600)}`;
                } catch (err) {
                  return `[ERROR] Web search failed: ${err.message}`;
                }
              } 
              
              return `[IGNORED] Unknown tool call requested.`;

            } catch (toolErr) {
              return `[ERROR] Tool execution failed: ${toolErr.message}`;
            }
          });

          const results = await Promise.all(executionPromises);
          resolve(results.join(' | '));
        } else {
          resolve("[WARNING] Executor was triggered but no valid tool calls were generated.");
        }
      } catch (err) {
        reject(`Executor API Error: ${err.message}`);
      }
    });
  });
};

module.exports = { executeAction };