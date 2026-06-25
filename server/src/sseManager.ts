import type { Response } from "express";
import type { ImageRecord } from "./types.js";

/**
 * Manages Server-Sent Events connections.
 * Encapsulates client lifecycle so routes stay thin and
 * new event types can be added here without touching route handlers.
 */
class SSEManager {
  private clients: Set<Response> = new Set();
  private readonly heartbeatInterval: number;

  constructor(heartbeatIntervalMs = 30_000) {
    this.heartbeatInterval = heartbeatIntervalMs;
  }

  /**
   * Register a new SSE client. Returns a cleanup function to call on disconnect.
   */
  add(res: Response): () => void {
    this.clients.add(res);

    const timer = setInterval(() => {
      res.write(":heartbeat\n\n");
    }, this.heartbeatInterval);

    return () => {
      clearInterval(timer);
      this.clients.delete(res);
    };
  }

  broadcastNewImage(image: ImageRecord): void {
    this.broadcast("new-image", image);
  }

  broadcastDeleteImage(id: string): void {
    this.broadcast("delete-image", { id });
  }

  broadcastUpdateImage(id: string, uploaderName: string | null): void {
    this.broadcast("update-image", { id, uploaderName });
  }

  broadcastReaction(id: string, reactions: Record<string, number>): void {
    this.broadcast("react-image", { id, reactions });
  }

  broadcastClearAll(): void {
    this.broadcast("clear-all", {});
  }

  get clientCount(): number {
    return this.clients.size;
  }

  private broadcast(event: string, data: unknown): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(message);
      } catch {
        // Client disconnected without triggering the close event; clean it up
        this.clients.delete(client);
      }
    }
  }
}

export const sseManager = new SSEManager();
