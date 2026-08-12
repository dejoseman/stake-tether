const path = require('path');
const fs = require('fs');

/**
 * Where KYC documents live on disk.
 *
 * IMPORTANT: this directory is NOT served statically. It used to be exposed
 * via `app.use('/uploads', express.static(...))` with no authentication, which
 * published every user's passport and ID to anyone with the URL. The only way
 * to read a document now is GET /api/admin/kyc/:userId/document, which is
 * admin-only and writes an audit record.
 *
 * Set KYC_UPLOAD_DIR to a mounted persistent volume. The container filesystem
 * is ephemeral — without a volume, every redeploy destroys documents that have
 * already been reviewed, while kycStatus stays 'verified' in the database.
 */
const UPLOAD_DIR = process.env.KYC_UPLOAD_DIR
  ? path.resolve(process.env.KYC_UPLOAD_DIR)
  : path.join(__dirname, '..', '..', 'uploads');

const ensureUploadDir = () => {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true, mode: 0o700 });
  }
  return UPLOAD_DIR;
};

/**
 * Magic-byte signatures.
 *
 * multer's fileFilter only checked the client-supplied MIME type and the
 * filename extension, both of which the client controls. A request could
 * declare `image/png` and upload anything at all. These are the first bytes of
 * the formats we actually accept.
 */
const SIGNATURES = [
  { ext: '.jpg',  mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { ext: '.png',  mime: 'image/png',  bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  { ext: '.pdf',  mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
];

const matchesSignature = (buffer, bytes) =>
  bytes.every((b, i) => buffer[i] === b);

/**
 * Inspect a file's real contents. Returns { ext, mime } or null.
 * WEBP needs a two-part check: "RIFF" at 0 and "WEBP" at 8.
 */
const detectFileType = (buffer) => {
  if (!buffer || buffer.length < 12) return null;

  for (const sig of SIGNATURES) {
    if (matchesSignature(buffer, sig.bytes)) {
      return { ext: sig.ext, mime: sig.mime };
    }
  }

  const isRiff = buffer.toString('ascii', 0, 4) === 'RIFF';
  const isWebp = buffer.toString('ascii', 8, 12) === 'WEBP';
  if (isRiff && isWebp) {
    return { ext: '.webp', mime: 'image/webp' };
  }

  return null;
};

/**
 * Resolve a stored filename to an absolute path, refusing anything that tries
 * to escape the upload directory (path traversal via `../`).
 */
const resolveStoredFile = (filename) => {
  if (!filename || typeof filename !== 'string') return null;

  // Strip any directory component the database may hold from older records
  // that stored '/uploads/<name>'.
  const base = path.basename(filename);
  const full = path.resolve(UPLOAD_DIR, base);

  if (!full.startsWith(UPLOAD_DIR + path.sep) && full !== UPLOAD_DIR) {
    return null;
  }
  if (!fs.existsSync(full)) return null;

  return full;
};

const deleteStoredFile = (filename) => {
  const full = resolveStoredFile(filename);
  if (!full) return false;
  try {
    fs.unlinkSync(full);
    return true;
  } catch (error) {
    console.error(`Failed to delete KYC file ${filename}:`, error.message);
    return false;
  }
};

module.exports = {
  UPLOAD_DIR,
  ensureUploadDir,
  detectFileType,
  resolveStoredFile,
  deleteStoredFile,
};
