import { PackageError } from '../errors.js';

export function notImplemented(name: string): never {
  throw new PackageError('NOT_IMPLEMENTED', `${name} is scaffolded in Story 0 but not implemented yet.`);
}
