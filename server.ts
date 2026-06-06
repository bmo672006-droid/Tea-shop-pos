import { createServer } from "http";
import { parse } from "url";
import next from "next";
import type { Server as HTTPServer } from "http";
import { initSocketServer, emitToRestaurant, emitToKitchen, emitToTable } from "./lib/socket/server";
import {
  SOCKET_EVENTS,
  type OrderEventPayload,
  type ItemEventPayload,
  type PaymentEventPayload,
} from "./lib/socket/types";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

if (require.main === module) {
  start().catch(console.error);
}

async function start(): Promise<{ server: HTTPServer; app: unknown }> {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server: HTTPServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
    }
  });

  initSocketServer(server);

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });

  return { server, app };
}

export { emitToRestaurant, emitToKitchen, emitToTable, SOCKET_EVENTS };
export type { OrderEventPayload, ItemEventPayload, PaymentEventPayload };

export { start };
