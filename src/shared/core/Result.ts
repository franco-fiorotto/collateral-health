/**
 * A Result models the outcome of an operation that can fail with a domain-level
 * reason rather than throwing. `isSuccess`/`isFailure` are the two channels; the
 * error is a value (string or a typed error), never an exception.
 */
export class Result<T> {
  public readonly isSuccess: boolean;
  public readonly isFailure: boolean;
  public readonly error: T | string | null;
  private readonly _value: T | null;

  protected constructor(isSuccess: boolean, error?: T | string | null, value?: T | null) {
    if (isSuccess && error) {
      throw new Error('InvalidOperation: A result cannot be successful and contain an error');
    }
    if (!isSuccess && !error) {
      throw new Error('InvalidOperation: A failing result needs to contain an error message');
    }

    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this.error = error ?? null;
    this._value = value ?? null;

    Object.freeze(this);
  }

  /**
   * Reads the wrapped value. Throwing here is intentional: getting the value of a
   * failing result is a programming error the caller should have guarded against.
   */
  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error("Can't get the value of an error result. Use 'error' instead.");
    }
    return this._value as T;
  }

  public getErrorValue(): T | string {
    return this.error as T | string;
  }

  public static ok<U>(value?: U): Result<U> {
    return new Result<U>(true, null, value ?? null);
  }

  public static fail<U>(error: U | string): Result<U> {
    return new Result<U>(false, error);
  }

  /**
   * Returns the first failing result in `results`, or a success otherwise.
   * Lets a caller short-circuit a batch of guarded constructions.
   */
  public static combine(results: Result<unknown>[]): Result<unknown> {
    for (const result of results) {
      if (result.isFailure) {
        return result;
      }
    }
    return Result.ok();
  }
}
