import React, { createContext, useContext } from "react";
import featureConfig from "@/data/feature-config.json"

// Create the context
const ConfigContext = createContext(featureConfig);

// Provider component
export const ConfigProvider = ({ children, config = featureConfig }) => {
  return (
    <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
  );
};

// Custom hook to access config
export const useSiteConfig = () => {
  return useContext(ConfigContext);
};
