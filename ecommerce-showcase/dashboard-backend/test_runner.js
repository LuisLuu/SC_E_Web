const TEST_SUITE = [
  { prompt: "System online. How are you feeling today, V?", expected: "GENERAL_CHAT" },
  { prompt: "Add a high priority task to calibrate the ESP32 relays.", expected: "DATABASE_ACTION" },
  { prompt: "Search the web and tell me the current weather in Tokyo.", expected: "WEB_SEARCH" },
  { prompt: "What exactly is on my active task list right now?", expected: "TASK_INQUIRY" },
  { prompt: "The relays are calibrated. Cross that task off the list.", expected: "DATABASE_ACTION" }
];

async function runBenchmark() {
  console.log("🚀 Starting Latency & Precision Benchmark...\n");

  try {
    const sessionRes = await fetch('http://localhost:3001/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Latency Diagnostic' })
    });
    const session = await sessionRes.json();
    const sessionId = session.id;
    console.log(`📂 Initialized test session [ID: ${sessionId}]\n`);

    let chatHistory = [];

    for (let i = 0; i < TEST_SUITE.length; i++) {
      const test = TEST_SUITE[i];
      console.log(`--------------------------------------------------`);
      console.log(`Test [${i + 1}/${TEST_SUITE.length}] Prompt: "${test.prompt}"`);

      const startTime = Date.now();
      const response = await fetch('http://localhost:3001/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: test.prompt,
          sessionId: sessionId,
          history: chatHistory 
        })
      });

      const contentType = response.headers.get("content-type");
      let data = {};
      
      if (contentType && contentType.includes("text/event-stream")) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const payload = JSON.parse(line.replace('data: ', ''));
                if (payload.type === 'debug') data.debug = payload.debug;
                if (payload.type === 'token') fullText += payload.token;
              } catch(e) {}
            }
          }
        }
        data.response = fullText;
      } else {
        data = await response.json();
      }

      const latency = Date.now() - startTime;

      console.log(`⏱️  Latency: ${latency}ms`);
      console.log(`🧠 Layer 1: ${data.debug?.intent || 'UNDEFINED'} ${data.debug?.intent === test.expected ? '✅' : '⚠️'}`);
      
      if (data.debug?.actionResult) {
        console.log(`⚙️  Layer 2: ${data.debug.actionResult}`);
      }
      
      if (data.response) {
        const cleanResponse = data.response.trim().replace(/\n/g, ' ');
        console.log(`🤖 Layer 3: "${cleanResponse}"\n`);
        
        chatHistory.push({ role: 'user', content: test.prompt });
        chatHistory.push({ role: 'ai', content: cleanResponse });
      } else {
        console.log(`❌ Server Error: Final response missing.\n`);
      }
    }
    console.log("✨ Benchmark complete.");
  } catch (err) {
    console.error("❌ Benchmark failed. Check server connection.", err.message);
  }
}

runBenchmark();