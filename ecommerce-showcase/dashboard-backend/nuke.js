const sqlite3 = require('sqlite3').verbose();
const { ChromaClient } = require('chromadb');

const db = new sqlite3.Database('./iot_core.db', async (err) => {
  if (err) {
    console.error('❌ Failed to connect to SQLite:', err.message);
    process.exit(1);
  }

  console.log('💥 Starting total system state purge...\n');

  db.serialize(() => {
    db.run(`DELETE FROM tasks`);
    db.run(`DELETE FROM chat_logs`);
    db.run(`DELETE FROM sessions`); 
    
    db.run(`DELETE FROM sqlite_sequence WHERE name IN ('tasks', 'chat_logs', 'sessions')`, (err) => {
      if (err) console.error('❌ Error resetting sequences:', err.message);
      else console.log('🔥 Wiped all tasks, logs, sessions, and reset ID counters to 1.');
    });
  });

  // FIXED CHROMA INSTANTIATION: Use host/port instead of deprecated 'path'
  try {
    const chroma = new ChromaClient({ host: "localhost", port: 8000 });
    await chroma.deleteCollection({ name: "user_conversations" });
    console.log('🔥 ChromaDB collection "user_conversations" wiped clean.');
  } catch (err) {
    console.log(`ℹ️ ChromaDB collection clean or server offline. (${err.message})`);
  }

  db.close((closeErr) => {
    if (closeErr) console.error('❌ Error closing DB:', closeErr.message);
    else console.log('\n✨ System reset complete. Safe to start server.');
  });
});