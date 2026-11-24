import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key() {
  const encoded = process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY;
  if (!encoded) throw new Error("INSTAGRAM_TOKEN_ENCRYPTION_KEY is not configured.");
  const value = Buffer.from(encoded, "base64");
  if (value.length !== 32) throw new Error("INSTAGRAM_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return value;
}

export function encryptInstagramToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptInstagramToken(value: string) {
  const [iv, tag, encrypted] = value.split(".");
  if (!iv || !tag || !encrypted) throw new Error("Stored Instagram token is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}
