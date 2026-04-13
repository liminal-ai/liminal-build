export class SectionError extends Error {
  readonly code: string;

  constructor(args: { code: string; message: string }) {
    super(args.message);
    this.code = args.code;
  }
}
