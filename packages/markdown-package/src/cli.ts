#!/usr/bin/env node

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import {
  createPackage,
  extractPackage,
  getManifest,
  inspectPackage,
  listPackage,
} from './index.js';
import { PackageError } from './errors.js';

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function readFlag(args: string[], ...flags: string[]): string | undefined {
  for (let index = 0; index < args.length; index += 1) {
    if (!flags.includes(args[index] ?? '')) {
      continue;
    }

    return args[index + 1];
  }

  return undefined;
}

async function main(argv: string[]): Promise<void> {
  const [command, ...rest] = argv;

  if (command === undefined) {
    fail('Usage: mdvpkg <create|info|ls|extract|manifest> ...');
  }

  try {
    switch (command) {
      case 'create': {
        const sourceDir = rest[0];
        const outputPath = readFlag(rest, '-o', '--output');
        if (sourceDir === undefined || outputPath === undefined) {
          fail('Usage: mdvpkg create <sourceDir> -o <outputPath>');
        }

        await mkdir(path.dirname(outputPath), { recursive: true });
        await createPackage({
          sourceDir,
          outputPath,
          compress: outputPath.endsWith('.mpkz'),
        });
        process.stdout.write(`${outputPath}\n`);
        return;
      }
      case 'info': {
        const packagePath = rest[0];
        if (packagePath === undefined) {
          fail('Usage: mdvpkg info <packagePath>');
        }

        const info = await inspectPackage({ packagePath });
        process.stdout.write(
          `compressed: ${info.compressed}\nentries: ${info.entryCount}\ntitle: ${info.manifest?.metadata.title ?? ''}\n`,
        );
        return;
      }
      case 'ls': {
        const packagePath = rest[0];
        if (packagePath === undefined) {
          fail('Usage: mdvpkg ls <packagePath>');
        }

        const entries = await listPackage({ packagePath });
        for (const entry of entries) {
          process.stdout.write(`${entry.path}\n`);
        }
        return;
      }
      case 'extract': {
        const packagePath = rest[0];
        const outputDir = readFlag(rest, '-o', '--output');
        if (packagePath === undefined || outputDir === undefined) {
          fail('Usage: mdvpkg extract <packagePath> -o <outputDir>');
        }

        await mkdir(outputDir, { recursive: true });
        await extractPackage({
          packagePath,
          outputDir,
        });
        process.stdout.write(`${outputDir}\n`);
        return;
      }
      case 'manifest': {
        const packagePath = rest[0];
        if (packagePath === undefined) {
          fail('Usage: mdvpkg manifest <packagePath>');
        }

        const manifest = await getManifest({ packagePath });
        if (manifest === null) {
          fail('Manifest not found.');
        }
        process.stdout.write(manifest);
        if (!manifest.endsWith('\n')) {
          process.stdout.write('\n');
        }
        return;
      }
      default:
        fail(`Unknown command: ${command}`);
    }
  } catch (error) {
    if (error instanceof PackageError) {
      fail(`${error.code}: ${error.message}`);
    }
    fail(error instanceof Error ? error.message : String(error));
  }
}

void main(process.argv.slice(2));
