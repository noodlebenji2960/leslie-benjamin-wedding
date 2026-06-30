import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SessionProvider } from "@/contexts/SessionContext";
import { ServerProvider } from "@/contexts/ServerContext";
import "@/i18n";

function wrap(ui: ReactElement) {
  return (
    <MemoryRouter>
      <SessionProvider>
        <ServerProvider>{ui}</ServerProvider>
      </SessionProvider>
    </MemoryRouter>
  );
}

export function renderWithProviders(ui: ReactElement) {
  const result = render(wrap(ui));
  return {
    ...result,
    rerender: (nextUi: ReactElement) => result.rerender(wrap(nextUi)),
  };
}
