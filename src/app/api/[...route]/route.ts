import { app } from "@/server/app";

// The whole API is one Hono app; Next only forwards /api/* requests to it.
const handler = (request: Request) => app.fetch(request);

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
