import { fetchBreachCount } from '../api/client';

/**
 * Have I Been Pwned — Pwned Passwords breach check via the k-anonymity model.
 *
 * The password never leaves the browser: we hash it locally with Web Crypto and
 * send only the SHA-1 prefix/suffix to our backend, which forwards just the
 * 5-char prefix to HIBP and matches the suffix. No API key is required.
 */

/** SHA-1 of `text` as an uppercase hex string (Web Crypto). */
async function sha1Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/**
 * Returns how many known breaches contain this password (0 = not found).
 * Throws if the check can't be completed.
 */
export async function checkPwnedPassword(password: string): Promise<number> {
  const hash = await sha1Hex(password);
  return fetchBreachCount(hash.slice(0, 5), hash.slice(5));
}
