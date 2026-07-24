import { Result } from '@/shared/core/Result';
import { UseCaseError } from '@/shared/core/UseCaseError';

/**
 * The typed, expected business failures of the recompute use case. Each is a `Result`
 * carrying a `UseCaseError`, returned on the `Either` left channel so consumers can
 * pattern-match on the exact failure without catching exceptions.
 */
export namespace RecomputeCollateralHealthUseCaseErrors {
  export class InvalidEvent extends Result<UseCaseError> {
    public constructor(reason: string) {
      super(false, { message: `Invalid event: ${reason}` });
    }
  }

  export class PriceUnavailable extends Result<UseCaseError> {
    public constructor(base: string, quote: string) {
      super(false, { message: `No price available for ${base}/${quote}` });
    }
  }

  export class InvalidCollateralArrangement extends Result<UseCaseError> {
    public constructor(reason: string) {
      super(false, { message: `Invalid collateral arrangement: ${reason}` });
    }
  }
}
