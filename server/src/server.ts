import "./env.js";

import { app } from "./app.js";
import { database } from "./db.js";

const PORT = parseInt(process.env.PORT || "3001", 10);
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

async function start(): Promise<void> {
  await database.init();
  console.log("✓ Database initialized");

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✓ Server running on http://0.0.0.0:${PORT}`);
    console.log(`✓ CORS enabled for: ${CLIENT_URL}`);
  });
}

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received, shutting down gracefully`);
  await database.close();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
