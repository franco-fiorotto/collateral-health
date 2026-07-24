/**
 * Base shape for a use-case error. Every typed business error carries a human-readable
 * message; it is wrapped in a `Result` and returned on the `Either` left channel.
 */
export interface UseCaseError {
  message: string;
}
