import { useCallback, useState } from "react";
import { resetDataAgent } from "./dataAgent";

export interface AgentConfig {
  readonly endpoint: string;
  readonly deployment: string;
  readonly apiKey: string;
  readonly dataAgentToken: string;
  readonly configured: boolean;
  readonly dataAgentReady: boolean;
  readonly setEndpoint: (value: string) => void;
  readonly setDeployment: (value: string) => void;
  readonly setApiKey: (value: string) => void;
  readonly setDataAgentToken: (value: string) => void;
  readonly clear: () => void;
}

/** Credentials live in component memory only. Remounting this hook is what clears them. */
export function useAgentConfig(): AgentConfig {
  const [endpoint, setEndpointValue] = useState(
    import.meta.env.VITE_OPENAI_ENDPOINT || "",
  );
  const [deployment, setDeployment] = useState(
    import.meta.env.VITE_OPENAI_DEPLOYMENT || "",
  );
  const [apiKey, setApiKey] = useState("");
  const [dataAgentToken, setDataAgentTokenValue] = useState("");

  const setEndpoint = useCallback((value: string) => {
    setEndpointValue(value);
    setApiKey("");
  }, []);
  const setDataAgentToken = useCallback((value: string) => {
    setDataAgentTokenValue(value);
    resetDataAgent();
  }, []);
  const clear = useCallback(() => {
    setApiKey("");
    setDataAgentTokenValue("");
    resetDataAgent();
  }, []);

  return {
    endpoint,
    deployment,
    apiKey,
    dataAgentToken,
    configured: Boolean(endpoint.trim() && deployment.trim() && apiKey.trim()),
    dataAgentReady: Boolean(dataAgentToken.trim()),
    setEndpoint,
    setDeployment,
    setApiKey,
    setDataAgentToken,
    clear,
  };
}
