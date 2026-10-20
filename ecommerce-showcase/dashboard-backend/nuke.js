const sqlite3 = require('sqlite3').verbose();
const { ChromaClient } = require('chromadb');

async function executePurge() {
  console.log('💥 Starting total system state purge...\n');

  // 1. Enforce Chroma DB Purge FIRST
  try {
    const chroma = new ChromaClient({ host: "localhost", port: 8000 });
    // Ping the server to ensure it is actually alive before proceeding
    await chroma.heartbeat(); 
    await chroma.deleteCollection({ name: "user_conversations" });
    console.log('🔥 ChromaDB collection "user_conversations" wiped clean.');
  } catch (err) {
    console.error(`❌ FATAL: ChromaDB is offline or unreachable. (${err.message})`);
    console.error('⚠️  Aborting purge. Start your Chroma server before nuking to prevent data desync.');
    process.exit(1); // Kill the script immediately
  }

  // 2. Only proceed to SQLite if Vector DB was successfully reached
  const db = new sqlite3.Database('./iot_core.db', (err) => {
    if (err) {
      console.error('❌ Failed to connect to SQLite:', err.message);
      process.exit(1);
    }
  });

  db.serialize(() => {
    db.run(`DELETE FROM tasks`);
    db.run(`DELETE FROM chat_logs`);
    db.run(`DELETE FROM sessions`); 
    
    db.run(`DELETE FROM sqlite_sequence WHERE name IN ('tasks', 'chat_logs', 'sessions')`, (err) => {
      if (err) console.error('❌ Error resetting sequences:', err.message);
      else console.log('🔥 Wiped all tasks, logs, sessions, and reset ID counters to 1.');
    });
  });

  db.close((closeErr) => {
    if (closeErr) console.error('❌ Error closing DB:', closeErr.message);
    else console.log('\n✨ System reset complete. Safe to start server.');
  });
}

executePurge();