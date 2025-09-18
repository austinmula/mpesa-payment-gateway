import crypto from "crypto";
import { config } from "../config";

const algorithm = "aes-256-gcm";
const keyLength = 32;
const ivLength = 16;
const tagLength = 16;

/**
 * Encrypt sensitive data
 */
export const encrypt = (text: string): string => {
  try {
    const key = Buffer.from(
      config.encryption.key.padEnd(keyLength, "0").slice(0, keyLength)
    );
    const iv = crypto.randomBytes(ivLength);

    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(Buffer.from("mpesa-gateway", "utf8"));

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const tag = cipher.getAuthTag();

    // Combine iv + tag + encrypted
    return iv.toString("hex") + tag.toString("hex") + encrypted;
  } catch (error) {
    throw new Error("Encryption failed");
  }
};

/**
 * Decrypt sensitive data
 */
export const decrypt = (encryptedText: string): string => {
  try {
    const key = Buffer.from(
      config.encryption.key.padEnd(keyLength, "0").slice(0, keyLength)
    );

    // Extract iv, tag, and encrypted data
    const iv = Buffer.from(encryptedText.slice(0, ivLength * 2), "hex");
    const tag = Buffer.from(
      encryptedText.slice(ivLength * 2, (ivLength + tagLength) * 2),
      "hex"
    );
    const encrypted = encryptedText.slice((ivLength + tagLength) * 2);

    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAAD(Buffer.from("mpesa-gateway", "utf8"));
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error("Decryption failed");
  }
};

/**
 * Hash sensitive data (one-way)
 */
export const hash = (text: string): string => {
  return crypto.createHash("sha256").update(text).digest("hex");
};

/**
 * Generate secure random string
 */
export const generateSecureRandom = (length: number = 32): string => {
  return crypto.randomBytes(length).toString("hex");
};

/**
 * Create HMAC signature for webhook verification
 */
export const createSignature = (payload: string, secret: string): string => {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
};

/**
 * Verify HMAC signature
 */
export const verifySignature = (
  payload: string,
  signature: string,
  secret: string
): boolean => {
  const expectedSignature = createSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expectedSignature, "hex")
  );
};
