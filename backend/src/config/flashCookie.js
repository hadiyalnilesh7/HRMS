const crypto = require("crypto");

const COOKIE_NAME = "hrms-checkout-summary";
const MAX_AGE_SECONDS = 60 * 5;

function sign(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function encode(value, secret) {
  const payload = Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  const signature = sign(payload, secret);
  return `${payload}.${signature}`;
}

function decode(token, secret) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [payload, signature] = parts;
  const expected = sign(payload, secret);

  if (signature.length !== expected.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch (error) {
    return null;
  }
}

function buildFlashCookie(value, secret, isProduction) {
  const token = encode(value, secret);
  const attributes = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE_SECONDS}`,
  ];

  if (isProduction) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

function clearFlashCookie(isProduction) {
  const attributes = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];

  if (isProduction) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

module.exports = {
  COOKIE_NAME,
  buildFlashCookie,
  clearFlashCookie,
  decodeFlashCookie: decode,
};