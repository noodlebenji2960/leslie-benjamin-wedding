import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useSession } from "@/contexts/SessionContext";
import { Icon } from "@/components/Icon";
import { ServerStatus } from "@/components/gallery/ServerStatus";
import type { SSEImageRecord } from "@/hooks/useSSE";

interface UploadButtonProps {
  onUploaded: (image: SSEImageRecord) => void;
  uploaderName: string;
  setUploaderName: (name: string) => void;
}

const ACCEPTED = "image/*";
const UPLOADER_NAME_KEY = "wedding_uploader_name";
const UPLOAD_SPACING_MS = 400;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

type PendingFileStatus = "pending" | "staging" | "uploading" | "done" | "error";

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string;
  status: PendingFileStatus;
  progress: number;
}

export function UploadButton({
  onUploaded,
  uploaderName,
  setUploaderName,
}: UploadButtonProps) {
  const { t } = useTranslation("gallery");
  const { visitor } = useSession();
  const { status, errorMessage, upload, reset } = useImageUpload();
  const [draftName, setDraftName] = useState(uploaderName);
  const [nameError, setNameError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewsRef = useRef<HTMLDivElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const [baseHeight, setBaseHeight] = useState(0);
  const [previewsHeight, setPreviewsHeight] = useState(0);

  const hasName = uploaderName.trim().length > 0;

  const handleSetName = useCallback(() => {
    setDraftName(uploaderName);
    setIsEditingName(true);
  }, [uploaderName]);

  const handleConfirmName = useCallback(() => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setNameError(true);
      return;
    }
    setNameError(false);
    localStorage.setItem(UPLOADER_NAME_KEY, trimmed);
    setUploaderName(trimmed);
    setIsEditingName(false);
  }, [draftName, setUploaderName]);

  const isRecognized = hasName && !isEditingName;
  const showNameForm = !hasName || isEditingName;

  const addPendingFiles = (files: File[]) => {
    const next: PendingFile[] = files.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: "pending",
      progress: 0,
    }));
    setPendingFiles((prev) => [...prev, ...next]);
  };

  const updatePendingFile = useCallback(
    (id: string, patch: Partial<Pick<PendingFile, "status" | "progress">>) => {
      setPendingFiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      );
    },
    [],
  );

  // Revoke any outstanding preview URLs when the component unmounts
  const pendingFilesRef = useRef(pendingFiles);
  pendingFilesRef.current = pendingFiles;
  useEffect(() => {
    return () => {
      for (const p of pendingFilesRef.current)
        URL.revokeObjectURL(p.previewUrl);
    };
  }, []);

  const handleRemovePending = useCallback((id: string) => {
    setPendingFiles((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const handleClearPending = useCallback(() => {
    setPendingFiles((prev) => {
      for (const p of prev) URL.revokeObjectURL(p.previewUrl);
      return [];
    });
  }, []);

  const handleConfirmUpload = async () => {
    const trimmed = uploaderName.trim();
    if (!trimmed) {
      setNameError(true);
      return;
    }
    setNameError(false);
    localStorage.setItem(UPLOADER_NAME_KEY, trimmed);

    const toUpload = pendingFiles;
    setBatchProgress({ done: 0, total: toUpload.length });

    for (let i = 0; i < toUpload.length; i++) {
      const pending = toUpload[i];
      updatePendingFile(pending.id, { status: "staging", progress: 0 });

      const result = await upload(pending.file, {
        uploaderName: trimmed,
        visitorId: visitor?.visitorId,
        onProgress: (percent) => {
          updatePendingFile(pending.id, {
            status: "uploading",
            progress: percent,
          });
        },
      });

      updatePendingFile(pending.id, {
        status: result ? "done" : "error",
        progress: result ? 100 : 0,
      });
      if (result) onUploaded(result);
      setBatchProgress({ done: i + 1, total: toUpload.length });

      if (i < toUpload.length - 1) await sleep(UPLOAD_SPACING_MS);
    }

    for (const p of toUpload) URL.revokeObjectURL(p.previewUrl);
    setPendingFiles([]);
    setBatchProgress(null);
    setTimeout(reset, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) addPendingFiles(files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) addPendingFiles(files);
  };

  const isUploading = status === "uploading" || status === "staging";
  const locked = !hasName || isUploading || isEditingName;

  const capitalizedName = uploaderName
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  const greeting = t("upload.nameGreeting", {
    name: capitalizedName,
  });

  useEffect(() => {
    if (!dropzoneRef.current) return;
    setBaseHeight(dropzoneRef.current.offsetHeight);
  }, []);

  useEffect(() => {
    if (!previewsRef.current) return;

    const el = previewsRef.current;

    const observer = new ResizeObserver(() => {
      setPreviewsHeight(el.offsetHeight);
    });

    observer.observe(el);
    setPreviewsHeight(el.offsetHeight);

    return () => observer.disconnect();
  }, [pendingFiles.length]);

  return (
    <div
      className={`gallery-upload${isDragging ? " gallery-upload--active" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!locked) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        if (locked) {
          e.preventDefault();
          setIsDragging(false);
          return;
        }
        handleDrop(e);
      }}
    >
      {hasName && (
        <p className="gallery-upload__title">
          <Icon.CameraFlash size={18} />
          {t("upload.sectionTitle")}
        </p>
      )}

      {isRecognized && (
        <div className="gallery-upload__name-row">
          <p className="gallery-upload__name-greeting">
            {greeting.charAt(0).toUpperCase() + greeting.slice(1)},{" "}
            <span className="gallery-upload__description">{t("subtitle")}</span>
          </p>
        </div>
      )}

      {pendingFiles.length > 0 && (
        <p className="gallery-upload__pending-count">
          {t("upload.pendingCount", { count: pendingFiles.length })}
        </p>
      )}

      <div className="gallery-upload__actions">
        {/* Camera button — opens rear camera directly on mobile */}
        {/* File picker — drag-and-drop + browse library */}
        <div
          ref={dropzoneRef}
          className={`gallery-upload__dropzone${isDragging ? " gallery-upload__dropzone--active" : ""}${pendingFiles.length > 0 ? " gallery-upload__dropzone--has-files" : ""}${showNameForm ? " gallery-upload__dropzone--locked" : ""}`}
          style={{
            paddingBottom: previewsHeight ? `${previewsHeight}px` : undefined,
          }}
          onClick={() => !locked && fileInputRef.current?.click()}
          role="button"
          tabIndex={locked ? -1 : 0}
          onKeyDown={(e) =>
            e.key === "Enter" && !locked && fileInputRef.current?.click()
          }
          aria-label={
            hasName ? t("upload.chooseFile") : t("upload.nameRequiredLabel")
          }
          aria-disabled={locked}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            onChange={handleChange}
            className="gallery-upload__input"
            aria-hidden="true"
            tabIndex={-1}
            disabled={locked}
          />

          <span className="gallery-upload__dropzone-icon" aria-hidden="true">
            {isUploading ? (
              <span className="gallery-upload__spinner" />
            ) : showNameForm ? (
              <Icon.CameraFlash size={48} />
            ) : (
              <Icon.Add size={56} />
            )}
          </span>
          <span className="gallery-upload__dropzone-text">
            {!showNameForm && (
              <>
                <span className="gallery-upload__label">
                  {isUploading
                    ? batchProgress && batchProgress.total > 1
                      ? t("upload.uploadingBatch", {
                          done: batchProgress.done,
                          total: batchProgress.total,
                        })
                      : t("upload.uploading")
                    : t("upload.chooseFile")}
                </span>
                <span className="gallery-upload__hint">{t("upload.dragDrop")}</span>
              </>
            )}

            {!hasName && (
              <>
                <span className="gallery-upload__label">{t("upload.nameRequiredLabel")}</span>
                <span className="gallery-upload__hint">{t("upload.nameRequiredHint")}</span>
              </>
            )}

            {showNameForm && (
              <div
                className="gallery-upload__name-input-row"
                onClick={(e) => e.stopPropagation()}
              >
                <label
                  className="gallery-upload__name-input-label"
                  htmlFor="gallery-upload-name-input"
                >
                  {t("upload.nameLabel")}
                </label>
                <div className="gallery-upload__name-input-controls">
                  <input
                    id="gallery-upload-name-input"
                    type="text"
                    className={`gallery-upload__name-input${nameError ? " gallery-upload__name-input--error" : ""}`}
                    placeholder={t("upload.namePlaceholder")}
                    aria-required="true"
                    autoFocus={isEditingName}
                    value={draftName}
                    onChange={(e) => {
                      setDraftName(e.target.value);
                      setNameError(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConfirmName();
                    }}
                    maxLength={100}
                    disabled={isUploading}
                  />
                  <button
                    type="button"
                    className="gallery-upload__name-confirm"
                    onClick={handleConfirmName}
                    disabled={isUploading || !draftName.trim()}
                    aria-label={t("upload.saveName")}
                  >
                    <Icon.Tick size={16} />
                  </button>
                </div>
              </div>
            )}

            {nameError && (
              <p className="gallery-upload__feedback gallery-upload__feedback--error">
                {t("upload.nameRequired")}
              </p>
            )}
          </span>

          {pendingFiles.length > 0 && (
            <div ref={previewsRef} className="gallery-upload__previews">
              {pendingFiles.map((pending, index) => (
                <div
                  key={pending.id}
                  className="gallery-upload__preview-polaroid"
                  style={
                    {
                      "--rotation": `${((index % 5) - 2) * 3}deg`,
                    } as React.CSSProperties
                  }
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="gallery-upload__preview-number">
                    {index + 1}
                  </span>
                  <img
                    src={pending.previewUrl}
                    alt={pending.file.name}
                    className="gallery-upload__preview-img"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className="gallery-upload__fab"
          onClick={() => !locked && cameraInputRef.current?.click()}
          disabled={locked}
          aria-label={
            hasName ? t("upload.takePhoto") : t("upload.nameRequiredLabel")
          }
        >
          {isUploading ? (
            <span className="gallery-upload__spinner" />
          ) : (
            <Icon.Camera size={22} />
          )}
        </button>

        <input
          ref={cameraInputRef}
          type="file"
          accept={ACCEPTED}
          capture="environment"
          onChange={handleChange}
          className="gallery-upload__input"
        />
        <div className={`gallery-upload__actions-footer${!hasName ? " gallery-upload__actions-footer--centered" : ""}`}>
          {isRecognized && (
            <button
              type="button"
              className="gallery-upload__change-name"
              onClick={handleSetName}
            >
              <Icon.Edit size={12} />
              {uploaderName ? t("changeName") : t("setName")}
            </button>
          )}
          <ServerStatus />
        </div>
      </div>

      {pendingFiles.length > 0 && (
        <ul className="gallery-upload__file-list">
          {pendingFiles.map((pending, index) => (
            <li key={pending.id} className="gallery-upload__file-row">
              <div className="gallery-upload__file-row-main">
                <span
                  className="gallery-upload__file-row-icon"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="gallery-upload__file-row-name">
                  {pending.file.name}
                </span>
                {pending.status === "pending" && (
                  <button
                    type="button"
                    className="gallery-upload__file-row-remove"
                    onClick={() => handleRemovePending(pending.id)}
                    aria-label={t("upload.removeFile", {
                      name: pending.file.name,
                    })}
                  >
                    <Icon.Close size={12} />
                  </button>
                )}
                {pending.status === "done" && (
                  <Icon.Tick
                    size={14}
                    className="gallery-upload__file-row-status-icon gallery-upload__file-row-status-icon--done"
                  />
                )}
                {pending.status === "error" && (
                  <Icon.Close
                    size={14}
                    className="gallery-upload__file-row-status-icon gallery-upload__file-row-status-icon--error"
                  />
                )}
              </div>

              {pending.status !== "pending" && (
                <div className="gallery-upload__file-row-progress">
                  <div
                    className={`gallery-upload__file-row-progress-fill gallery-upload__file-row-progress-fill--${pending.status}`}
                    style={{
                      width:
                        pending.status === "staging"
                          ? "100%"
                          : `${pending.progress}%`,
                    }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {pendingFiles.length > 0 && (
        <div className="gallery-upload__confirm-row">
          <button
            type="button"
            className="gallery-upload__confirm-btn"
            onClick={() => void handleConfirmUpload()}
            disabled={isUploading}
          >
            {isUploading ? t("upload.uploading") : t("upload.confirmShort")}
            <Icon.Tick size={16} />
          </button>
          <button
            type="button"
            className="gallery-upload__confirm-btn"
            onClick={() => !isUploading && fileInputRef.current?.click()}
            disabled={isUploading}
            title={t("upload.addMore")}
          >
            <Icon.Add size={16} />
            {t("upload.addMore")}
          </button>
          <button
            type="button"
            className="gallery-upload__cancel-btn"
            onClick={handleClearPending}
            disabled={isUploading}
          >
            <Icon.Close size={16} />
            {t("upload.cancel")}
          </button>
        </div>
      )}

      {status === "success" && (
        <p className="gallery-upload__feedback gallery-upload__feedback--success">
          <Icon.Tick size={16} />
          {t("upload.success")}
        </p>
      )}
      {status === "error" && errorMessage && (
        <p className="gallery-upload__feedback gallery-upload__feedback--error">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
