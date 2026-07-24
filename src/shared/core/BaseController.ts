import { UseCaseError } from './UseCaseError';

/**
 * A transport-agnostic base controller. Unlike a web controller that writes to an HTTP
 * response, the failure helpers here **return** a value describing the failure rather than
 * throwing or writing to a socket. That keeps the controller drivable from any transport
 * (HTTP handler, queue consumer, background job) and lets validation failures come back on
 * the caller's `Either` left channel — consistent with "no exceptions cross the boundary".
 */
export interface ClientError {
  status: number;
  message: string;
}

export abstract class BaseController<IRequest = unknown, IResponse = unknown> {
  protected abstract executeImpl(request: IRequest): Promise<IResponse> | IResponse;

  public execute(request: IRequest): Promise<IResponse> | IResponse {
    return this.executeImpl(request);
  }

  protected clientError(message = 'Bad request.'): ClientError {
    return { status: 400, message };
  }

  protected fail(error: string | UseCaseError): ClientError {
    return { status: 500, message: typeof error === 'string' ? error : error.message };
  }
}
