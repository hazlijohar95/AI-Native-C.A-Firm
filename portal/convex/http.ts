// convex/http.ts
// HTTP router for WorkOS webhooks and other HTTP endpoints

import { httpRouter } from "convex/server";
import { authKit } from "./auth";

const http = httpRouter();

// Register WorkOS AuthKit webhook routes
// This handles user.created, user.updated, user.deleted events
authKit.registerRoutes(http);

export default http;
