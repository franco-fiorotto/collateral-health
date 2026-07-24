import { Result } from './Result';

export interface GuardArgument {
  argument: unknown;
  argumentName: string;
}

export type GuardArgumentCollection = GuardArgument[];

/**
 * Small, composable input assertions. Each returns a `Result<void>` so a caller can
 * `Result.combine` several guards and short-circuit on the first violation — validation
 * failures are values, not thrown exceptions.
 */
export class Guard {
  public static againstNullOrUndefined(argument: unknown, argumentName: string): Result<void> {
    if (argument === null || argument === undefined) {
      return Result.fail<void>(`${argumentName} is null or undefined`);
    }
    return Result.ok<void>();
  }

  public static againstNullOrUndefinedBulk(args: GuardArgumentCollection): Result<void> {
    for (const arg of args) {
      const result = this.againstNullOrUndefined(arg.argument, arg.argumentName);
      if (result.isFailure) {
        return result;
      }
    }
    return Result.ok<void>();
  }

  public static againstEmptyString(argument: unknown, argumentName: string): Result<void> {
    if (typeof argument !== 'string' || argument.trim().length === 0) {
      return Result.fail<void>(`${argumentName} is an empty string`);
    }
    return Result.ok<void>();
  }

  public static inRange(
    num: number,
    min: number,
    max: number,
    argumentName: string,
  ): Result<void> {
    const isInRange = num >= min && num <= max;
    if (!isInRange) {
      return Result.fail<void>(`${argumentName} is not within range ${min} to ${max}`);
    }
    return Result.ok<void>();
  }
}
