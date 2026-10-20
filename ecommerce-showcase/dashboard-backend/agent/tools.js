const tools = [
  {
    type: "function",
    function: {
      name: "update_task_status",
      description: "Updates a task's status in the database.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer", description: "The numeric ID of the target task." },
          done: { 
            type: "integer", 
            description: "CRITICAL: Set to 1 if the user wants to CROSS OFF, COMPLETE, FINISH, or BUY an item. Set to 0 ONLY if they want to RE-OPEN or MARK INCOMPLETE." 
          }
        },
        required: ["id", "done"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_tasks",
      description: "Creates one or multiple new tasks in bulk.",
      parameters: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            description: "Array of task objects.",
            items: {
              type: "object",
              properties: {
                text: { type: "string", description: "The task description." },
                priority: { type: "string", enum: ["low", "medium", "high"] }
              },
              required: ["text"]
            }
          }
        },
        required: ["tasks"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Searches the internet for real-time information, weather, news, or specific product launches.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Optimized web search query."
          }
        },
        required: ["query"]
      }
    }
  }
];

module.exports = { tools };