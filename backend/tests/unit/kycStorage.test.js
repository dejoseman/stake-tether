const path = require('path');
const { detectFileType, resolveStoredFile, UPLOAD_DIR } = require('../../utils/kycStorage');

/*
 * multer's fileFilter only checked the client-declared MIME type and the
 * filename extension. Both are attacker-controlled, so a request could
 * announce `image/png`, name the file `passport.png`, and upload anything at
 * all. detectFileType inspects the actual leading bytes instead.
 */
describe('detectFileType', () => {
  const png = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0]);
  const jpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const pdf = Buffer.from('%PDF-1.7\n\n\n\n');
  const webp = Buffer.concat([
    Buffer.from('RIFF', 'ascii'),
    Buffer.from([0, 0, 0, 0]),
    Buffer.from('WEBP', 'ascii'),
  ]);

  it('identifies accepted formats from their signatures', () => {
    expect(detectFileType(png)).toEqual({ ext: '.png', mime: 'image/png' });
    expect(detectFileType(jpeg)).toEqual({ ext: '.jpg', mime: 'image/jpeg' });
    expect(detectFileType(pdf)).toEqual({ ext: '.pdf', mime: 'application/pdf' });
    expect(detectFileType(webp)).toEqual({ ext: '.webp', mime: 'image/webp' });
  });

  it('rejects content that is not an accepted format', () => {
    // A shell script or Windows executable renamed to .png — accepted by the
    // old extension-and-MIME-only filter.
    expect(detectFileType(Buffer.from('#!/bin/sh\necho pwned\n'))).toBeNull();
    expect(detectFileType(Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00'))).toBeNull();
    expect(detectFileType(Buffer.from('<?php system($_GET[0]); ?>'))).toBeNull();
    expect(detectFileType(Buffer.from('<svg onload=alert(1)></svg>'))).toBeNull();
  });

  it('rejects a RIFF container that is not WEBP', () => {
    const wav = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from('WAVE', 'ascii'),
    ]);
    expect(detectFileType(wav)).toBeNull();
  });

  it('handles short and missing buffers without throwing', () => {
    expect(detectFileType(Buffer.from([0x89]))).toBeNull();
    expect(detectFileType(Buffer.alloc(0))).toBeNull();
    expect(detectFileType(null)).toBeNull();
    expect(detectFileType(undefined)).toBeNull();
  });
});

describe('resolveStoredFile', () => {
  it('refuses path traversal', () => {
    // The filename comes from the database, but defence in depth: a stored
    // value must never be able to read outside the upload directory.
    expect(resolveStoredFile('../../../etc/passwd')).toBeNull();
    expect(resolveStoredFile('../../.env')).toBeNull();
    expect(resolveStoredFile('/etc/passwd')).toBeNull();
  });

  it('refuses empty and non-string input', () => {
    expect(resolveStoredFile('')).toBeNull();
    expect(resolveStoredFile(null)).toBeNull();
    expect(resolveStoredFile(undefined)).toBeNull();
    expect(resolveStoredFile(123)).toBeNull();
  });

  it('returns null for a filename that is not on disk', () => {
    expect(resolveStoredFile('definitely-not-a-real-file.png')).toBeNull();
  });

  it('resolves inside the upload directory', () => {
    // UPLOAD_DIR must be absolute so the traversal check above is meaningful.
    expect(path.isAbsolute(UPLOAD_DIR)).toBe(true);
  });
});
