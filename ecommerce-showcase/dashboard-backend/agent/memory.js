const { ChromaClient } = require('chromadb');

// FIXED CHROMA INSTANTIATION
const chroma = new ChromaClient({ host: "localhost", port: 8000 });

const ollamaEmbedder = {
  generate: async (texts) => {
    try {
      const response = await fetch('http://localhost:11434/api/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'nomic-embed-text', input: texts })
      });
      const data = await response.json();
      return data.embeddings;
    } catch (err) {
      console.error("Ollama Embedding generation failed:", err);
      return [];
    }
  }
};

const getMemoryCollection = async () => {
  return await chroma.getOrCreateCollection({
    name: "user_conversations",
    embeddingFunction: ollamaEmbedder
  });
};

const saveMemory = async (role, text) => {
  try {
    const collection = await getMemoryCollection();
    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    await collection.add({
      ids: [id],
      documents: [text],
      metadatas: [{ role: role, timestamp: new Date().toISOString() }]
    });
  } catch (err) {
    console.error("Failed to save to ChromaDB:", err.message);
  }
};

const queryMemory = async (prompt, nResults = 3) => {
  try {
    const collection = await getMemoryCollection();
    
    const count = await collection.count();
    if (count === 0) return "";

    const results = await collection.query({
      queryTexts: [prompt],
      nResults: Math.min(nResults, count)
    });

    if (!results.documents[0] || results.documents[0].length === 0) return "";
    
    let formattedMemories = "--- RELEVANT LONG-TERM MEMORIES ---\n";
    for (let i = 0; i < results.documents[0].length; i++) {
      const role = results.metadatas[0][i].role;
      const content = results.documents[0][i];
      formattedMemories += `[Past ${role.toUpperCase()}]: ${content}\n`;
    }
    return formattedMemories;
  } catch (err) {
    console.error("ChromaDB Query Failed:", err.message);
    return "";
  }
};

module.exports = { saveMemory, queryMemory };