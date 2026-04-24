import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import path from 'node:path';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { createGzip, gunzipSync } from 'node:zlib';
import * as tar from 'tar-stream';
import { PackageError } from '../errors.js';
import { MANIFEST_FILENAME, type CreateFromEntriesOptions, type PackageEntry } from '../types.js';
import { parseManifest } from '../manifest/parser.js';
import { scaffoldManifest } from '../manifest/scaffold.js';

const TAR_BLOCK_SIZE = 512;
const DEFAULT_MAX_ENTRY_BYTES = 64 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_BYTES = 256 * 1024 * 1024;

export type ParsedPackageEntry = {
  path: string;
  content: Buffer;
  size: number;
};

export type ParsedPackage = {
  compressed: boolean;
  entries: ParsedPackageEntry[];
};

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function validateRelativePackagePath(entryPath: string): string {
  if (entryPath.length === 0) {
    throw new PackageError('INVALID_ENTRY_NAME', 'Package entry paths must be non-empty.');
  }

  if (entryPath.includes('\0')) {
    throw new PackageError('INVALID_ENTRY_NAME', 'Package entry paths cannot contain null bytes.');
  }

  if (/^[A-Za-z]:/.test(entryPath)) {
    throw new PackageError(
      'INVALID_ENTRY_NAME',
      'Package entry paths cannot start with a drive-letter prefix.',
    );
  }

  if (entryPath.startsWith('/') || entryPath.startsWith('\\')) {
    throw new PackageError(
      'INVALID_ENTRY_NAME',
      'Package entry paths must stay relative to the archive root.',
    );
  }

  if (entryPath !== entryPath.normalize('NFC')) {
    throw new PackageError(
      'INVALID_ENTRY_NAME',
      'Package entry paths must use NFC-normalized Unicode.',
    );
  }

  const normalized = entryPath.replaceAll('\\', '/');
  const segments = normalized.split('/');

  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    throw new PackageError(
      'INVALID_ENTRY_NAME',
      'Package entry paths cannot contain empty, dot, or dot-dot segments.',
    );
  }

  return normalized;
}

function padLength(size: number): number {
  const remainder = size % TAR_BLOCK_SIZE;
  return remainder === 0 ? 0 : TAR_BLOCK_SIZE - remainder;
}

async function writePackageArchive(
  pack: tar.Pack,
  options: CreateFromEntriesOptions,
): Promise<void> {
  const maxEntryBytes = options.maxEntryBytes ?? DEFAULT_MAX_ENTRY_BYTES;
  const maxTotalBytes = options.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES;
  let totalBytes = 0;

  const manifestBuffer = Buffer.from(scaffoldManifest(options.manifest), 'utf8');
  if (manifestBuffer.byteLength > maxEntryBytes) {
    throw new PackageError('ENTRY_TOO_LARGE', 'Package manifest exceeded the maximum entry size.');
  }

  const writeBufferEntry = async (entryPath: string, content: Buffer): Promise<void> => {
    totalBytes += content.byteLength;
    if (totalBytes > maxTotalBytes) {
      throw new PackageError('ARCHIVE_TOO_LARGE', 'Package archive exceeded the maximum total size.');
    }

    await new Promise<void>((resolve, reject) => {
      pack.entry(
        {
          name: entryPath,
          size: content.byteLength,
          type: 'file',
        },
        content,
        (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        },
      );
    });
  };

  const writeStreamEntry = async (
    entryPath: string,
    content: Readable,
    expectedSize: number,
  ): Promise<void> => {
    if (!Number.isInteger(expectedSize) || expectedSize < 0) {
      throw new PackageError(
        'INVALID_ARCHIVE',
        `Package entry "${entryPath}" requires a known byte size for streaming.`,
      );
    }

    if (expectedSize > maxEntryBytes) {
      throw new PackageError('ENTRY_TOO_LARGE', 'Package entry exceeded the maximum entry size.');
    }

    totalBytes += expectedSize;
    if (totalBytes > maxTotalBytes) {
      throw new PackageError('ARCHIVE_TOO_LARGE', 'Package archive exceeded the maximum total size.');
    }

    const sink = pack.entry({
      name: entryPath,
      size: expectedSize,
      type: 'file',
    });
    let written = 0;

    try {
      for await (const chunk of content) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        written += buffer.byteLength;
        if (written > expectedSize) {
          throw new PackageError('ENTRY_TOO_LARGE', 'Package entry exceeded its declared size.');
        }
        if (!sink.write(buffer)) {
          await once(sink, 'drain');
        }
      }

      if (written !== expectedSize) {
        throw new PackageError('READ_ERROR', 'Package entry ended before its declared size.');
      }

      sink.end();
      await finished(sink);
    } catch (error) {
      sink.destroy(error instanceof Error ? error : new Error(toErrorMessage(error)));
      if (error instanceof PackageError) {
        throw error;
      }
      throw new PackageError('READ_ERROR', `Failed to read package entry content: ${toErrorMessage(error)}`);
    }
  };

  await writeBufferEntry(MANIFEST_FILENAME, manifestBuffer);

  for await (const entry of options.entries) {
    const entryPath = validateRelativePackagePath(entry.path);
    if (typeof entry.content === 'string') {
      const buffer = Buffer.from(entry.content, 'utf8');
      if (buffer.byteLength > maxEntryBytes) {
        throw new PackageError('ENTRY_TOO_LARGE', 'Package entry exceeded the maximum entry size.');
      }
      await writeBufferEntry(entryPath, buffer);
      continue;
    }

    if (Buffer.isBuffer(entry.content)) {
      if (entry.content.byteLength > maxEntryBytes) {
        throw new PackageError('ENTRY_TOO_LARGE', 'Package entry exceeded the maximum entry size.');
      }
      await writeBufferEntry(entryPath, entry.content);
      continue;
    }

    await writeStreamEntry(entryPath, entry.content, entry.size ?? -1);
  }

  pack.finalize();
}

export function createPackageStream(options: CreateFromEntriesOptions): Readable {
  const pack = tar.pack();
  void writePackageArchive(pack, options).catch((error: unknown) => {
    pack.destroy(error instanceof Error ? error : new Error(toErrorMessage(error)));
  });

  return options.compress === false ? pack : pack.pipe(createGzip());
}

function isGzipBuffer(buffer: Buffer): boolean {
  return buffer.byteLength >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
}

function trimNullTerminated(value: Buffer): string {
  const nullIndex = value.indexOf(0);
  const slice = nullIndex === -1 ? value : value.subarray(0, nullIndex);
  return slice.toString('utf8').trim();
}

function parseOctal(value: Buffer): number {
  const trimmed = trimNullTerminated(value).trim();
  if (trimmed.length === 0) {
    return 0;
  }

  const parsed = Number.parseInt(trimmed, 8);
  if (!Number.isFinite(parsed)) {
    throw new PackageError('INVALID_ARCHIVE', 'Package archive contains an invalid tar header.');
  }
  return parsed;
}

export async function parsePackageFile(packagePath: string): Promise<ParsedPackage> {
  let raw: Buffer;

  try {
    raw = await readFile(packagePath);
  } catch (error) {
    throw new PackageError('READ_ERROR', `Failed to read package file: ${toErrorMessage(error)}`);
  }

  let tarBytes = raw;
  const compressed = isGzipBuffer(raw);

  if (compressed) {
    try {
      tarBytes = gunzipSync(raw, {
        maxOutputLength: DEFAULT_MAX_TOTAL_BYTES,
      });
    } catch (error) {
      throw new PackageError(
        'COMPRESSION_ERROR',
        `Failed to decompress package archive: ${toErrorMessage(error)}`,
      );
    }
  }

  const entries: ParsedPackageEntry[] = [];
  const entryPaths = new Set<string>();
  let offset = 0;

  while (offset + TAR_BLOCK_SIZE <= tarBytes.byteLength) {
    const header = tarBytes.subarray(offset, offset + TAR_BLOCK_SIZE);
    offset += TAR_BLOCK_SIZE;

    if (header.every((byte) => byte === 0)) {
      break;
    }

    const name = trimNullTerminated(header.subarray(0, 100));
    const prefix = trimNullTerminated(header.subarray(345, 500));
    const entryPath = prefix.length > 0 ? `${prefix}/${name}` : name;
    const typeflag = header[156];
    const size = parseOctal(header.subarray(124, 136));

    if (typeflag !== 0 && typeflag !== 48) {
      throw new PackageError(
        'INVALID_ARCHIVE',
        `Package archive contains an unsupported entry type for "${entryPath}".`,
      );
    }

    if (offset + size > tarBytes.byteLength) {
      throw new PackageError('INVALID_ARCHIVE', 'Package archive is truncated.');
    }

    validateRelativePackagePath(entryPath);
    if (entryPaths.has(entryPath)) {
      throw new PackageError(
        'INVALID_ARCHIVE',
        `Package archive contains a duplicate entry path for "${entryPath}".`,
      );
    }
    entryPaths.add(entryPath);

    const content = tarBytes.subarray(offset, offset + size);
    entries.push({
      path: entryPath,
      content: Buffer.from(content),
      size,
    });

    offset += size + padLength(size);
  }

  return {
    compressed,
    entries,
  };
}

export async function createPackageFile(args: {
  sourceDir: string;
  outputPath: string;
  compress?: boolean;
  manifestPath?: string;
}): Promise<void> {
  const manifestPath = args.manifestPath ?? path.join(args.sourceDir, MANIFEST_FILENAME);
  const manifestMarkdown = await readFile(manifestPath, 'utf8').catch((error: unknown) => {
    throw new PackageError('READ_ERROR', `Failed to read package manifest: ${toErrorMessage(error)}`);
  });
  const manifest = parseManifest(manifestMarkdown);
  const manifestItems = manifest.content
    .split('\n')
    .map((line) => line.match(/^\d+\.\s+\[(.+?)\]\((.+?)\)$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => ({
      title: match[1] ?? '',
      path: match[2] ?? '',
    }));

  async function* walkDirectory(currentDir: string, baseDir: string): AsyncGenerator<PackageEntry> {
    const names = await readdir(currentDir, { withFileTypes: true });
    for (const entry of names.sort((left, right) => left.name.localeCompare(right.name))) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        yield* walkDirectory(absolutePath, baseDir);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const relativePath = path.relative(baseDir, absolutePath).replaceAll(path.sep, '/');
      if (relativePath === MANIFEST_FILENAME) {
        continue;
      }

      yield {
        path: relativePath,
        content: createReadStream(absolutePath),
        size: (await stat(absolutePath)).size,
      };
    }
  }

  const outputBytes = await streamToBuffer(
    createPackageStream({
      entries: walkDirectory(args.sourceDir, args.sourceDir),
      manifest: {
        metadata: manifest.metadata,
        items: manifestItems,
      },
      compress: args.compress !== false,
    }),
  );

  await mkdir(path.dirname(args.outputPath), { recursive: true });
  await writeFile(args.outputPath, outputBytes);
}

export async function streamToBuffer(readable: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function extractPackageFile(args: {
  packagePath: string;
  outputDir: string;
}): Promise<ParsedPackageEntry[]> {
  const parsed = await parsePackageFile(args.packagePath);

  for (const entry of parsed.entries) {
    const destination = path.join(args.outputDir, entry.path);
    const relative = path.relative(args.outputDir, destination);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new PackageError('INVALID_ENTRY_NAME', 'Package entry path escapes the destination.');
    }

    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, entry.content);
  }

  return parsed.entries;
}
