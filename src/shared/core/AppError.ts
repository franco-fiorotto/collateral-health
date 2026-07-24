import { Result } from './Result';
import { UseCaseError } from './UseCaseError';

/**
 * Errors that are not part of the domain's expected failure modes — a thrown exception,
 * a bug, an unavailable dependency. Wrapped as a `Result<UseCaseError>` so they flow on
 * the same `Either` left channel as typed business errors, keeping the boundary
 * exception-free.
 */
export namespace AppError {
  export class UnexpectedError extends Result<UseCaseError> {
    public constructor(err: unknown) {
      super(false, {
        message: 'An unexpected error occurred.',
        error: err,
      } as unknown as UseCaseError);
    }

    public static create(err: unknown): UnexpectedError {
      return new UnexpectedError(err);
    }
  }
}
