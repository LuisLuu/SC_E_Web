const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

// --- MQTT & WEBSOCKET BROKER IMPORTS ---
const AedesPackage = require('aedes');
const AedesClass = typeof AedesPackage === 'function' ? AedesPackage : (AedesPackage.Aedes || AedesPackage.default);
const aedes = new AedesClass();

const net = require('net');
const http = require('http');
const ws = require('websocket-stream');

const { routeIntent } = require('./agent/router');
const { executeAction } = require('./agent/executor');
const { synthesizeResponse } = require('./agent/synthesizer');
const { saveMemory, queryMemory } = require('./agent/memory');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// 1. Start Standard MQTT for ESP32 (Port 1883)
const tcpServer = net.createServer(aedes.handle);
tcpServer.listen(1883, () => {
  console.log('📡 TCP MQTT Broker running on port 1883 (For ESP32)');
});

// 2. Start WebSocket MQTT for React Dashboard (Port 9001)
const httpServer = http.createServer();
ws.createServer({ server: httpServer }, aedes.handle);
httpServer.listen(9001, () => {
  console.log('🌐 WebSocket MQTT Broker running on port 9001 (For React UI)');
});

const db = new sqlite3.Database('./iot_core.db', (err) => {
  if (err) console.error('Database connection failed:', err.message);
  else console.log('Connected to the SQLite database.');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    done INTEGER DEFAULT 0,
    archived INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    priority TEXT DEFAULT 'low',
    due_date DATETIME,
    notes TEXT,
    extra_material TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT DEFAULT 'New Conversation',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS chat_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});
// ==========================================
// TASKS CRUD ENDPOINTS (Restored)
// ==========================================
app.get('/api/tasks', (req, res) => {
  const isArchived = req.query.archived === '1';
  const query = isArchived 
    ? `SELECT * FROM tasks WHERE archived = 1 OR done = 1 ORDER BY done DESC, created_at DESC`
    : `SELECT * FROM tasks WHERE archived = 0 AND done = 0 ORDER BY created_at DESC`;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/tasks', (req, res) => {
  const { text, category, priority, due_date, notes } = req.body;
  if (!text) return res.status(400).json({ error: 'Task text is required' });

  const query = `INSERT INTO tasks (text, category, priority, due_date, notes) VALUES (?, ?, ?, ?, ?)`;
  db.run(query, [text, category || 'general', priority || 'low', due_date || null, notes || null], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, text, category, done: 0, archived: 0, priority: priority || 'low', due_date, notes });
  });
});

app.put('/api/tasks/:id', (req, res) => {
  const { done, text, archived, priority, due_date, notes } = req.body;
  const id = req.params.id;
  
  const query = `
    UPDATE tasks 
    SET 
      done = COALESCE(?, done), text = COALESCE(?, text), archived = COALESCE(?, archived),
      priority = COALESCE(?, priority), due_date = COALESCE(?, due_date), notes = COALESCE(?, notes)
    WHERE id = ?
  `;
  
  db.run(query, [done, text, archived, priority, due_date, notes, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

app.delete('/api/tasks/:id', (req, res) => {
  db.run(`DELETE FROM tasks WHERE id = ?`, req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// ==========================================
// SESSION CRUD ENDPOINTS
// ==========================================
app.get('/api/sessions', (req, res) => {
  db.all(`SELECT * FROM sessions ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/sessions', (req, res) => {
  const title = req.body.title || 'New Conversation';
  db.run(`INSERT INTO sessions (title) VALUES (?)`, [title], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, title, created_at: new Date() });
  });
});

app.put('/api/sessions/:id', (req, res) => {
  const { title } = req.body;
  db.run(`UPDATE sessions SET title = ? WHERE id = ?`, [title, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

app.delete('/api/sessions/:id', (req, res) => {
  const id = req.params.id;
  db.run(`DELETE FROM sessions WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.run(`DELETE FROM chat_logs WHERE session_id = ?`, [id], () => {});
    res.json({ deleted: this.changes });
  });
});

app.get('/api/sessions/:id/messages', (req, res) => {
  db.all(`SELECT role, content FROM chat_logs WHERE session_id = ? ORDER BY timestamp ASC`, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ==========================================
// AI AGENT HUB: The 3-Layer Master Pipeline
// ==========================================
app.post('/api/agent', async (req, res) => {
  // We extract 'model' here, but it will ONLY be applied to Layer 3 (Synthesizer)
  const { prompt, history = [], sessionId, model = 'gemma2:latest' } = req.body;

  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    if (sessionId) {
      db.run(`INSERT INTO chat_logs (session_id, role, content) VALUES (?, ?, ?)`, [sessionId, 'user', prompt]);
    }
    await saveMemory('user', prompt); 

    // LAYER 1: Intent Router (Hardcoded internally to use llama3.2:1b)
    const intent = await routeIntent(prompt);
    
    let actionResult = null;
    let vectorContext = "";
    
    // STRICT ISOLATION: Only use RAG memory for General Chat.
    if (intent === 'GENERAL_CHAT') {
      vectorContext = await queryMemory(prompt);
    } 
    // Trigger Layer 2 for Tools (NO DUPLICATES)
    else if (intent === 'DATABASE_ACTION' || intent === 'WEB_SEARCH' || intent === 'HARDWARE_ACTION') {
      actionResult = await executeAction(prompt, db, 'llama3.1:8b');
    }

    res.write(`data: ${JSON.stringify({ type: 'debug', debug: { intent, actionResult, vectorContext } })}\n\n`);

    // LAYER 3: Synthesizer Stream (Gemma 2)
    const finalResponse = await synthesizeResponse(
      prompt, intent, actionResult, db, history, vectorContext, model,
      (token) => {
        res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
      }
    );

    if (sessionId) {
      db.run(`INSERT INTO chat_logs (session_id, role, content) VALUES (?, ?, ?)`, [sessionId, 'ai', finalResponse]);
    }
    await saveMemory('ai', finalResponse);

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();

  } catch (err) {
    console.error("Agent Pipeline Error:", err);
    res.write(`data: ${JSON.stringify({ type: 'error', error: 'Internal pipeline error.' })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Command Center Backend running on http://localhost:${PORT}`);
});