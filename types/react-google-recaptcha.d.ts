declare module "react-google-recaptcha" {
  import * as React from "react";

  export interface ReCAPTCHAProps {
    sitekey: string;
    onChange?: (token: string | null) => void;
    onExpired?: () => void;
    theme?: "light" | "dark";
    size?: "normal" | "compact" | "invisible";
    tabindex?: number;
    stoken?: string;
    badge?: "bottomright" | "bottomleft" | "inline";
    hl?: string;
    // accept any other props
    [key: string]: any;
  }

  const ReCAPTCHA: React.ComponentType<ReCAPTCHAProps>;
  export default ReCAPTCHA;
}
