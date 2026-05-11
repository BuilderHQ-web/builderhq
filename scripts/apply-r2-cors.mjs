#!/usr/bin/env node
/**
 * One-shot script: apply the production CORS policy to the R2 bucket.
 *
 * R2 speaks the S3 PutBucketCors API, so we use the AWS SDK we already
 * have installed. No Cloudflare dashboard fiddling required.
 *
 * Origins allowed:
 *   https://builderhq.com.au           — apex (production)
 *   https://www.builderhq.com.au       — www redirect target
 *   https://builderhq.vercel.app       — Vercel preview before DNS cutover
 *   http://localhost:3000              — local dev (pnpm dev)
 *
 * Methods: GET (presigned downloads), PUT (presigned uploads), HEAD
 *          (stat checks done by documents/storage.ts).
 *
 * The script reads R2 credentials from .env.local, applies the policy,
 * then reads it back and prints what's live for verification.
 *
 * Run:
 *   node --env-file=.env.local scripts/apply-r2-cors.mjs
 *
 * To extend the origins (e.g. when launching a marketing domain),
 * edit ORIGINS below and re-run. Idempotent — overwrites the whole
 * policy each time.
 */

import {
  S3Client,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
} from "@aws-sdk/client-s3";

const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET || "builderhq-documents";

if (!endpoint || !accessKeyId || !secretAccessKey) {
  console.error(
    "Missing R2 credentials. Did you run with --env-file=.env.local?",
  );
  process.exit(1);
}

const ORIGINS = [
  "https://builderhq.com.au",
  "https://www.builderhq.com.au",
  "https://builderhq.vercel.app",
  "http://localhost:3000",
];

const r2 = new S3Client({
  region: "auto",
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

const corsRule = {
  AllowedOrigins: ORIGINS,
  AllowedMethods: ["GET", "PUT", "HEAD"],
  AllowedHeaders: ["*"],
  ExposeHeaders: ["ETag"],
  MaxAgeSeconds: 3600,
};

console.log(`Applying CORS to bucket: ${bucket}`);
console.log(`Origins: ${ORIGINS.join(", ")}`);

try {
  await r2.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: { CORSRules: [corsRule] },
    }),
  );
  console.log("✓ CORS policy applied.\n");

  // Read it back so the human reviewer can verify.
  const result = await r2.send(new GetBucketCorsCommand({ Bucket: bucket }));
  console.log("Live policy:");
  console.log(JSON.stringify(result.CORSRules, null, 2));
} catch (err) {
  console.error("✗ Failed to apply CORS:");
  console.error(err);
  process.exit(1);
}
