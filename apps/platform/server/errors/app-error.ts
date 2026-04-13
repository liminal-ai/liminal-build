export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(args: { code: string; message: string; statusCode: number }) {
    super(args.message);
    this.code = args.code;
    this.statusCode = args.statusCode;
  }
}
