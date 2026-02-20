import React, { createContext, useContext } from "react";

//override
const useDevOverride = true;

const featureConfig =
  useDevOverride || process.env.NODE_ENV !== "production"
    ? require("@/data/feature-config-development.json")
    : require("@/data/feature-config.json");

// Create the context
const ConfigContext = createContext(featureConfig);

// Provider component
export const ConfigProvider = ({ children, config }) => {
  // Use the passed config if provided, otherwise fallback to environment-based config
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
