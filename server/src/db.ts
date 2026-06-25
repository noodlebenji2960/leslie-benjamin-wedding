import mongoose from "mongoose";
import { Image, Visitor, Reaction, AdminAuth } from "./models.js";
import type { ImageRecord } from "./types.js";

class Database {
  async init(): Promise<void> {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/wedding-gallery";
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 5,
    });
    console.log("✓ Connected to MongoDB");
    // Indexes are defined on the schemas; syncIndexes ensures they exist without
    // duplicating index creation logic here.
    await Promise.all([Image.syncIndexes(), Visitor.syncIndexes(), Reaction.syncIndexes()]);
    console.log("✓ Database indexes synced");
  }

  private assertConnected(): void {
    if (mongoose.connection.readyState !== 1) {
      throw new Error("Database not connected");
    }
  }

  async addImage(image: ImageRecord): Promise<void> {
    this.assertConnected();
    await Image.create(image);
  }

  async getImages(
    limit: number = 50,
    cursor?: string
  ): Promise<{ images: ImageRecord[]; nextCursor: string | null; total: number }> {
    this.assertConnected();

    const [total, rawImages] = await Promise.all([
      Image.countDocuments(),
      (cursor
        ? Image.find({ uploadedAt: { $lt: cursor } })
        : Image.find()
      )
        .sort({ uploadedAt: -1 })
        .limit(limit + 1)
        .lean<ImageRecord[]>(),
    ]);

    let nextCursor: string | null = null;
    if (rawImages.length > limit) {
      rawImages.pop();
      nextCursor = rawImages[rawImages.length - 1].uploadedAt;
    }

    return { images: rawImages, nextCursor, total };
  }

  async upsertVisitor(opts: {
    visitorId: string;
    name: string | null;
    ip: string | null;
    userAgent: string | null;
    imageId: string;
  }): Promise<void> {
    this.assertConnected();
    const { visitorId, name, ip, userAgent, imageId } = opts;

    const addToSet: Record<string, unknown> = { uploadIds: imageId };
    if (name)      addToSet["knownNames"]  = name;
    if (ip)        addToSet["ips"]         = ip;
    if (userAgent) addToSet["userAgents"]  = userAgent;

    await Visitor.findOneAndUpdate(
      { visitorId },
      {
        $addToSet: addToSet,
        $set:      { lastSeen: new Date() },
        $setOnInsert: { firstSeen: new Date() },
      },
      { upsert: true }
    );
  }

  async setReaction(imageId: string, visitorId: string, emoji: string): Promise<{
    reactions: Record<string, number>;
    previousEmoji: string | null;
  }> {
    this.assertConnected();

    // Find if visitor already has a reaction on this image
    const existing = await Reaction.findOne({ imageId, visitorId });
    const previousEmoji = existing?.emoji ?? null;

    if (previousEmoji === emoji) {
      // Same emoji tapped again — no-op, return current counts
      const img = await Image.findOne({ id: imageId }).lean<ImageRecord>();
      return { reactions: (img?.reactions as Record<string, number>) ?? {}, previousEmoji };
    }

    const inc: Record<string, number> = { [`reactions.${emoji}`]: 1 };
    if (previousEmoji) inc[`reactions.${previousEmoji}`] = -1;

    if (existing) {
      existing.emoji = emoji;
      await existing.save();
    } else {
      await Reaction.create({ imageId, visitorId, emoji });
    }

    const updated = await Image.findOneAndUpdate(
      { id: imageId },
      { $inc: inc },
      { new: true }
    ).lean<ImageRecord>();

    // Remove any zero/negative counts left behind by the decrement
    const rawReactions = (updated?.reactions as Record<string, number>) ?? {};
    const reactions: Record<string, number> = {};
    for (const [k, v] of Object.entries(rawReactions)) {
      if (v > 0) reactions[k] = v;
    }

    // Persist the cleanup back to the document
    const unset: Record<string, number> = {};
    for (const [k, v] of Object.entries(rawReactions)) {
      if (v <= 0) unset[`reactions.${k}`] = 1;
    }
    if (Object.keys(unset).length > 0) {
      await Image.updateOne({ id: imageId }, { $unset: unset });
    }

    return { reactions, previousEmoji };
  }

  async deleteReaction(imageId: string, emoji: string): Promise<Record<string, number>> {
    this.assertConnected();
    const { deletedCount } = await Reaction.deleteMany({ imageId, emoji });
    if (deletedCount > 0) {
      await Image.updateOne({ id: imageId }, { $inc: { [`reactions.${emoji}`]: -deletedCount } });
      // Clean up zero/negative counts
      const img = await Image.findOne({ id: imageId }).lean<ImageRecord>();
      const unset: Record<string, number> = {};
      const raw = (img?.reactions as Record<string, number>) ?? {};
      for (const [k, v] of Object.entries(raw)) {
        if (v <= 0) unset[`reactions.${k}`] = 1;
      }
      if (Object.keys(unset).length > 0) await Image.updateOne({ id: imageId }, { $unset: unset });
      // Return cleaned counts
      const reactions: Record<string, number> = {};
      for (const [k, v] of Object.entries(raw)) {
        if (v > 0 && !unset[`reactions.${k}`]) reactions[k] = v;
      }
      return reactions;
    }
    const img = await Image.findOne({ id: imageId }).lean<ImageRecord>();
    return (img?.reactions as Record<string, number>) ?? {};
  }

  async clearReactions(imageId: string): Promise<Record<string, number>> {
    this.assertConnected();
    await Reaction.deleteMany({ imageId });
    await Image.updateOne({ id: imageId }, { $set: { reactions: {} } });
    return {};
  }

  async getReactionDetails(imageId: string): Promise<{ emoji: string; name: string; visitorId: string }[]> {
    this.assertConnected();
    const reactions = await Reaction.find({ imageId }).lean();
    if (reactions.length === 0) return [];

    const visitorIds = reactions.map((r) => r.visitorId);
    const visitors = await Visitor.find({ visitorId: { $in: visitorIds } }).lean();
    const nameMap = new Map(visitors.map((v) => [v.visitorId, v.knownNames[v.knownNames.length - 1] ?? null]));

    return reactions.map((r) => ({
      emoji: r.emoji,
      name: r.nameOverride ?? nameMap.get(r.visitorId) ?? "Anonymous",
      visitorId: r.visitorId,
    }));
  }

  async setReactionNameOverride(imageId: string, visitorId: string, name: string | null): Promise<void> {
    this.assertConnected();
    await Reaction.updateMany(
      { imageId, visitorId },
      { $set: { nameOverride: name } }
    );
  }

  async getVisitorReactions(visitorId: string, imageIds: string[]): Promise<Record<string, string[]>> {
    this.assertConnected();
    const rows = await Reaction.find({ visitorId, imageId: { $in: imageIds } }).lean();
    const result: Record<string, string[]> = {};
    for (const row of rows) {
      if (!result[row.imageId]) result[row.imageId] = [];
      result[row.imageId].push(row.emoji);
    }
    return result;
  }

  async getImagesByIds(ids: string[]): Promise<{ images: ImageRecord[] }> {
    this.assertConnected();
    const images = await Image.find({ id: { $in: ids } }).lean<ImageRecord[]>();
    return { images };
  }

  async updateImageName(id: string, uploaderName: string | null): Promise<boolean> {
    this.assertConnected();
    const result = await Image.findOneAndUpdate({ id }, { $set: { uploaderName } });
    return result !== null;
  }

  async deleteImage(id: string): Promise<{ filename: string; thumbnailFilename: string } | null> {
    this.assertConnected();
    const img = await Image.findOneAndDelete({ id }).lean<ImageRecord>();
    if (!img) return null;
    // Filename is always <uuid>.jpg, thumbnail is <uuid>-thumb.jpg
    const thumbFilename = img.filename.replace(/\.jpg$/, "-thumb.jpg");
    return { filename: img.filename, thumbnailFilename: thumbFilename };
  }

  async deleteAllImages(): Promise<{ filename: string; thumbnailFilename: string }[]> {
    this.assertConnected();
    const images = await Image.find().lean<ImageRecord[]>();
    await Image.deleteMany({});
    await Reaction.deleteMany({});
    return images.map((img) => ({
      filename: img.filename,
      thumbnailFilename: img.filename.replace(/\.jpg$/, "-thumb.jpg"),
    }));
  }

  async getServiceFlags(): Promise<{ uploadsDisabled: boolean; galleryApiDisabled: boolean }> {
    this.assertConnected();
    const auth = await this.getAdminAuth();
    return { uploadsDisabled: auth.uploadsDisabled, galleryApiDisabled: auth.galleryApiDisabled };
  }

  async setServiceFlag(
    flag: "uploadsDisabled" | "galleryApiDisabled",
    value: boolean
  ): Promise<{ uploadsDisabled: boolean; galleryApiDisabled: boolean }> {
    this.assertConnected();
    const doc = await AdminAuth.findOneAndUpdate(
      { singletonKey: "admin-auth" },
      { $set: { [flag]: value } },
      { upsert: true, new: true }
    );
    return { uploadsDisabled: doc.uploadsDisabled, galleryApiDisabled: doc.galleryApiDisabled };
  }

  async getAdminAuth() {
    this.assertConnected();
    return AdminAuth.findOneAndUpdate(
      { singletonKey: "admin-auth" },
      { $setOnInsert: { singletonKey: "admin-auth" } },
      { upsert: true, new: true }
    );
  }

  async setAdminOtp(otpHash: string, expiresAt: Date): Promise<void> {
    this.assertConnected();
    await AdminAuth.findOneAndUpdate(
      { singletonKey: "admin-auth" },
      { $set: { otpHash, otpExpiresAt: expiresAt, otpAttempts: 0 } },
      { upsert: true }
    );
  }

  async incrementAdminOtpAttempts(): Promise<number> {
    this.assertConnected();
    const doc = await AdminAuth.findOneAndUpdate(
      { singletonKey: "admin-auth" },
      { $inc: { otpAttempts: 1 } },
      { upsert: true, new: true }
    );
    return doc.otpAttempts;
  }

  async setAdminPassword(passwordHash: string): Promise<void> {
    this.assertConnected();
    await AdminAuth.findOneAndUpdate(
      { singletonKey: "admin-auth" },
      { $set: { passwordHash, otpHash: null, otpExpiresAt: null, otpAttempts: 0 } },
      { upsert: true }
    );
  }

  async close(): Promise<void> {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log("✓ Disconnected from MongoDB");
    }
  }
}

export const database = new Database();
