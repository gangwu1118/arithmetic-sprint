import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * An error this application raises on purpose. NestJS sends the object given
 * to HttpException as the response body, so the body is
 * { code, message } plus any details (docs/spec.md, section 8).
 */
export class AppError extends HttpException {
  constructor(
    status: HttpStatus,
    code: string,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super({ code, message, ...details }, status);
  }
}

/** A validation issue, as Standard Schema libraries such as Zod report it. */
type Issue = {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>;
};

/** The error for a request whose shape is wrong, naming each field. */
export function invalidRequest(issues: readonly Issue[]): AppError {
  return new AppError(
    HttpStatus.BAD_REQUEST,
    'invalid_request',
    'The request is not valid.',
    {
      issues: issues.map((issue) => ({
        path: (issue.path ?? [])
          .map((segment) =>
            String(typeof segment === 'object' ? segment.key : segment),
          )
          .join('.'),
        message: issue.message,
      })),
    },
  );
}
