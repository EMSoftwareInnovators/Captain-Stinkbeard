/**
 * Names the game must never use: the source's lead character (the game's
 * captain has his own name), the source's word for the Great Sharkstorm, and
 * the borrowed book title (Garrick's book is his own). Kept encoded so the
 * test files that scan for them don't contain them either.
 */
const decode = (b64) => Buffer.from(b64, 'base64').toString('utf8');

/** Case-insensitive patterns; the book title matches across any spacing. */
export const BANNED = Object.freeze({
  captain: new RegExp(decode('d2FyaW8='), 'i'),
  storm: new RegExp(decode('c2hhcmtuYWRv'), 'i'),
  book: new RegExp(decode('cmFpZGVycyBvZiB0aGUgbG9zdCBmYXJ0').replace(/ /g, '\\s+'), 'i'),
});

export const BANNED_LIST = Object.values(BANNED);
