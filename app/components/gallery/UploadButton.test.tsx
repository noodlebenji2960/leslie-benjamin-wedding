import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import { UploadButton } from "./UploadButton";

const upload = vi.fn(async () => ({
  id: "img-1",
  url: "https://example.com/img.jpg",
  thumbnailUrl: "https://example.com/img-thumb.jpg",
  uploaderName: "Ben",
  uploadedAt: "2026-06-25T00:00:00.000Z",
  filename: "img-1.jpg",
  fileSize: 100,
}));

vi.mock("@/hooks/useImageUpload", () => ({
  useImageUpload: () => ({
    status: "idle",
    errorMessage: null,
    upload,
    reset: vi.fn(),
  }),
}));

beforeEach(() => {
  localStorage.clear();
  upload.mockClear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ status: "ok", db: "connected", timestamp: "now" }),
    })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup(props: Partial<Parameters<typeof UploadButton>[0]> = {}) {
  const onUploaded = vi.fn();
  const setUploaderName = vi.fn();
  const utils = renderWithProviders(
    <UploadButton
      onUploaded={onUploaded}
      uploaderName=""
      setUploaderName={setUploaderName}
      {...props}
    />,
  );
  return { ...utils, onUploaded, setUploaderName };
}

describe("UploadButton — locked state (no name)", () => {
  it("hides the 'Share a photo' title until a name is set", () => {
    setup({ uploaderName: "" });
    expect(screen.queryByText(/share a photo/i)).not.toBeInTheDocument();
  });

  it("shows the locked prompt inside the dropzone", () => {
    setup({ uploaderName: "" });
    expect(screen.getByText(/add your name to share photos/i)).toBeInTheDocument();
    expect(screen.getByText(/enter your name above to unlock uploading/i)).toBeInTheDocument();
  });

  it("does not call setUploaderName while typing — only on save", async () => {
    const { setUploaderName } = setup({ uploaderName: "" });
    const input = screen.getByPlaceholderText(/maría/i);

    await userEvent.type(input, "Ben");

    expect(setUploaderName).not.toHaveBeenCalled();
  });

  it("calls setUploaderName only after clicking save", async () => {
    const { setUploaderName } = setup({ uploaderName: "" });
    const input = screen.getByPlaceholderText(/maría/i);
    await userEvent.type(input, "Ben");

    const saveButton = screen.getByRole("button", { name: /save name/i });
    fireEvent.click(saveButton);

    expect(setUploaderName).toHaveBeenCalledWith("Ben");
  });

  it("calls setUploaderName when Enter is pressed in the input", async () => {
    const { setUploaderName } = setup({ uploaderName: "" });
    const input = screen.getByPlaceholderText(/maría/i);
    await userEvent.type(input, "Ben{Enter}");

    expect(setUploaderName).toHaveBeenCalledWith("Ben");
  });

  it("does not call setUploaderName when saving a blank name", () => {
    const { setUploaderName } = setup({ uploaderName: "" });
    const saveButton = screen.getByRole("button", { name: /save name/i });
    expect(saveButton).toBeDisabled();

    fireEvent.click(saveButton);
    expect(setUploaderName).not.toHaveBeenCalled();
  });

  it("shows a validation message after trying to save a blank name via Enter then clearing", async () => {
    const { setUploaderName } = setup({ uploaderName: "" });
    const input = screen.getByPlaceholderText(/maría/i);

    await userEvent.type(input, "x");
    await userEvent.clear(input);
    fireEvent.keyDown(input, { key: "Enter" });

    expect(setUploaderName).not.toHaveBeenCalled();
  });

  it("the dropzone is not clickable / has no file-picker affordance label while locked", () => {
    const { container } = setup({ uploaderName: "" });
    const dropzone = container.querySelector(".gallery-upload__dropzone");
    expect(dropzone).toHaveAttribute("aria-disabled", "true");
    expect(dropzone).toHaveAttribute("tabindex", "-1");
  });
});

describe("UploadButton — recognized state (name already set)", () => {
  it("shows the 'Share a photo' title and a welcome-back greeting", () => {
    setup({ uploaderName: "Ben" });
    expect(screen.getByText(/share a photo/i)).toBeInTheDocument();
    expect(screen.getByText(/welcome back, ben!/i)).toBeInTheDocument();
  });

  it("shows the normal choose-file dropzone instead of the name form", () => {
    setup({ uploaderName: "Ben" });
    expect(screen.getByText(/choose from library/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/maría/i)).not.toBeInTheDocument();
  });

  it("clicking 'change name' reveals the name input again, labeled, with choose-file hidden", async () => {
    setup({ uploaderName: "Ben" });

    const changeButton = screen.getByRole("button", { name: /change name/i });
    fireEvent.click(changeButton);

    expect(screen.getByText("Change Uploader Name")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Ben")).toBeInTheDocument();
    expect(screen.queryByText(/choose from library/i)).not.toBeInTheDocument();
  });

  it("saving a new name from edit mode calls setUploaderName with the new value", async () => {
    const { setUploaderName } = setup({ uploaderName: "Ben" });
    fireEvent.click(screen.getByRole("button", { name: /change name/i }));

    const input = screen.getByDisplayValue("Ben");
    await userEvent.clear(input);
    await userEvent.type(input, "Benjamin");
    fireEvent.click(screen.getByRole("button", { name: /save name/i }));

    expect(setUploaderName).toHaveBeenCalledWith("Benjamin");
  });

  it("uploads a selected file when a name is already set", async () => {
    setup({ uploaderName: "Ben" });

    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    const input = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;

    await userEvent.upload(input, file);

    expect(screen.getByText(/1 photo awaiting upload/i)).toBeInTheDocument();
  });

  it("calls upload() and onUploaded() when confirming a staged file", async () => {
    const { onUploaded } = setup({ uploaderName: "Ben" });

    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector(
      'input[type="file"]:not([capture])',
    ) as HTMLInputElement;
    await userEvent.upload(fileInput, file);

    const confirmButton = screen.getByRole("button", { name: /^upload$/i });
    fireEvent.click(confirmButton);

    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
  });

  it("removing a pending file before confirming drops it from the queue", async () => {
    setup({ uploaderName: "Ben" });
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector(
      'input[type="file"]:not([capture])',
    ) as HTMLInputElement;
    await userEvent.upload(fileInput, file);

    expect(screen.getByText(/1 photo awaiting upload/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /remove photo.jpg/i }));

    expect(screen.queryByText(/awaiting upload/i)).not.toBeInTheDocument();
  });

  it("cancel clears all pending files", async () => {
    setup({ uploaderName: "Ben" });
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector(
      'input[type="file"]:not([capture])',
    ) as HTMLInputElement;
    await userEvent.upload(fileInput, file);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByText(/awaiting upload/i)).not.toBeInTheDocument();
  });
});
