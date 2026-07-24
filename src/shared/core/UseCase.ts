/**
 * A UseCase is the application-layer entry point: it takes a request and returns a
 * response (possibly async). Implementations are factory functions returning `{ execute }`.
 */
export interface UseCase<IRequest, IResponse> {
  execute(request?: IRequest): Promise<IResponse> | IResponse;
}
