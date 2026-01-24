import { action } from "./_generated/server";
import { v } from "convex/values";

// Note: R2 integration requires the following environment variables in Convex:
// - R2_ACCESS_KEY_ID
// - R2_SECRET_ACCESS_KEY
// - R2_BUCKET_NAME
// - R2_ENDPOINT (e.g., https://xxx.r2.cloudflarestorage.com)

// For now, these are placeholder implementations.
// The actual R2 integration will be completed when credentials are available.

export const getUploadUrl = action({
  args: {
    filename: v.string(),
    contentType: v.string(),
  },
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // TODO: Implement R2 presigned URL generation
    // This requires:
    // 1. R2 bucket credentials in environment
    // 2. AWS SDK v3 for S3 (R2 is S3-compatible)

    // Placeholder response
    throw new Error("R2 not yet configured. Please set up R2 credentials.");

    // Example implementation with AWS SDK:
    // import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
    // import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
    //
    // const s3 = new S3Client({
    //   region: "auto",
    //   endpoint: process.env.R2_ENDPOINT,
    //   credentials: {
    //     accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    //     secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    //   },
    // });
    //
    // const key = `${identity.subject}/${Date.now()}-${args.filename}`;
    //
    // const command = new PutObjectCommand({
    //   Bucket: process.env.R2_BUCKET_NAME,
    //   Key: key,
    //   ContentType: args.contentType,
    // });
    //
    // const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    //
    // return { url, key };
  },
});

export const getDownloadUrl = action({
  args: {
    key: v.string(),
  },
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // TODO: Implement R2 presigned URL generation for downloads
    // Also verify user has access to this document

    throw new Error("R2 not yet configured. Please set up R2 credentials.");

    // Example implementation:
    // import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
    // import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
    //
    // const s3 = new S3Client({
    //   region: "auto",
    //   endpoint: process.env.R2_ENDPOINT,
    //   credentials: {
    //     accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    //     secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    //   },
    // });
    //
    // const command = new GetObjectCommand({
    //   Bucket: process.env.R2_BUCKET_NAME,
    //   Key: args.key,
    // });
    //
    // const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    //
    // return { url };
  },
});
