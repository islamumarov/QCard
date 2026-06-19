// Auth.js catch-all route. Handlers are no-ops when auth is not configured.
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
