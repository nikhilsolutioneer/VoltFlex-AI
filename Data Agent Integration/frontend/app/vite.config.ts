import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Routing only: the browser supplies the Authorization header, so no token is baked into the server.
// Must stay in sync with AGENT_URL in src/agent/dataAgent.ts.
const dataAgentUrl = new URL(
  "https://api.fabric.microsoft.com/v1/mcp/workspaces/497df2d0-0d00-4cdf-9e99-325c8ed54e6b/dataagents/b3b88088-c6a3-4ef0-8aff-723aeec88a68/agent",
);
const dataAgentProxy = {
  "/dataagent": {
    target: dataAgentUrl.origin,
    changeOrigin: true,
    secure: true,
    rewrite: () => dataAgentUrl.pathname,
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: dataAgentProxy },
  preview: { proxy: dataAgentProxy },
});
