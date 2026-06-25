import mongoose, { Schema, Document } from "mongoose";

export interface IImage extends Document {
  id: string;
  url: string;
  thumbnailUrl: string;
  uploaderName: string | null;
  uploadedAt: string;
  filename: string;
  fileSize: number;
  createdAt: Date;
  // Uploader fingerprint
  uploaderIp: string | null;
  uploaderVisitorId: string | null;
  uploaderUserAgent: string | null;
  // Reactions: emoji → count
  reactions: Map<string, number>;
}

const imageSchema = new Schema<IImage>(
  {
    id: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
    uploaderName: { type: String, default: null },
    uploadedAt: { type: String, required: true },
    filename: { type: String, required: true },
    fileSize: { type: Number, required: true },
    uploaderIp: { type: String, default: null },
    uploaderVisitorId: { type: String, default: null },
    uploaderUserAgent: { type: String, default: null },
    reactions: { type: Map, of: Number, default: {} },
  },
  {
    timestamps: true,
    collection: "images",
  }
);

imageSchema.index({ uploadedAt: -1 });
imageSchema.index({ uploaderVisitorId: 1 });

export const Image = mongoose.model<IImage>("Image", imageSchema);

// ── Visitor ───────────────────────────────────────────────────────────────────

export interface IVisitor extends Document {
  visitorId: string;
  knownNames: string[];       // every distinct name they've submitted
  ips: string[];              // all IPs seen (deduped)
  userAgents: string[];       // all UAs seen (deduped)
  uploadIds: string[];        // image IDs they uploaded
  firstSeen: Date;
  lastSeen: Date;
}

const visitorSchema = new Schema<IVisitor>(
  {
    visitorId:  { type: String, required: true, unique: true },
    knownNames: { type: [String], default: [] },
    ips:        { type: [String], default: [] },
    userAgents: { type: [String], default: [] },
    uploadIds:  { type: [String], default: [] },
    firstSeen:  { type: Date, default: Date.now },
    lastSeen:   { type: Date, default: Date.now },
  },
  { collection: "visitors" }
);

visitorSchema.index({ visitorId: 1 }, { unique: true });

export const Visitor = mongoose.model<IVisitor>("Visitor", visitorSchema);

// ── Reaction ──────────────────────────────────────────────────────────────────

export interface IReaction extends Document {
  imageId: string;
  visitorId: string;
  emoji: string;
  nameOverride: string | null; // admin-set display name for this visitor's reactions on this image
  createdAt: Date;
}

const reactionSchema = new Schema<IReaction>(
  {
    imageId:      { type: String, required: true },
    visitorId:    { type: String, required: true },
    emoji:        { type: String, required: true },
    nameOverride: { type: String, default: null },
  },
  { timestamps: true, collection: "reactions" }
);

// One reaction per visitor per emoji per image
reactionSchema.index({ imageId: 1, visitorId: 1, emoji: 1 }, { unique: true });

export const Reaction = mongoose.model<IReaction>("Reaction", reactionSchema);

// ── Admin Auth (singleton) ──────────────────────────────────────────────────────

export interface IAdminAuth extends Document {
  singletonKey: "admin-auth";
  passwordHash: string | null; // null = no override yet, fall back to ADMIN_PASSWORD env var
  otpHash: string | null;
  otpExpiresAt: Date | null;
  otpAttempts: number;
  uploadsDisabled: boolean;
  galleryApiDisabled: boolean;
}

const adminAuthSchema = new Schema<IAdminAuth>(
  {
    singletonKey: { type: String, required: true, unique: true, default: "admin-auth" },
    passwordHash: { type: String, default: null },
    otpHash: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },
    uploadsDisabled: { type: Boolean, default: false },
    galleryApiDisabled: { type: Boolean, default: false },
  },
  { collection: "admin_auth" }
);

export const AdminAuth = mongoose.model<IAdminAuth>("AdminAuth", adminAuthSchema);
