import React, { createContext, useContext } from "react";
import featureConfigProd from "@/data/feature-config.json";
import featureConfigDev from "@/data/feature-config-development.json";
import routes from "@/routes";

// Override flag from Vite environment variables
const useDevOverride = import.meta.env.VITE_USE_DEV_CONFIG === "true";

if (import.meta.env.DEV) {
  console.warn("** DEV MODE **\n  Using feature-config-development.json");
  console.warn("ALL ROUTES ENABLED:", routes)
}else{
  console.warn("** PROD MODE **");
  console.warn("ENABLED ROUTES:", routes)
}

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
  console.log(finalConfig);
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
