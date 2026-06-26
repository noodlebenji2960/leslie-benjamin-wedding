import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { SessionProvider } from "@/contexts/SessionContext";
import { ServerProvider } from "@/contexts/ServerContext";
import "@/i18n";

export function renderWithProviders(ui: ReactElement) {
  return render(
    <SessionProvider>
      <ServerProvider>{ui}</ServerProvider>
    </SessionProvider>,
  );
}
