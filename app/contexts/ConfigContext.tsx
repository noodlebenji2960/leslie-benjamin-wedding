import React, { createContext, useContext } from "react";
import featureConfigProd from "@/data/feature-config.json";
import featureConfigDev from "@/data/feature-config-development.json";

// Override flag from Vite environment variables
const useDevOverride = import.meta.env.VITE_USE_DEV_CONFIG === "true";

// Pick the config based on environment or override
const featureConfig =
  useDevOverride || import.meta.env.MODE !== "production"
    ? featureConfigDev
    : featureConfigProd;

// Create the context
const ConfigContext = createContext(featureConfig);

// Provider component
export const ConfigProvider = ({ children, config }) => {
  const finalConfig = config || featureConfig;

  return (
    <ConfigContext.Provider value={finalConfig}>
      {children}
    </ConfigContext.Provider>
  );
};

// Custom hook to access config
export const useSiteConfig = () => {
  return useContext(ConfigContext);
};
