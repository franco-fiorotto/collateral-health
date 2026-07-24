import { AppError } from '@/shared/core/AppError';
import { BaseController } from '@/shared/core/BaseController';
import { left } from '@/shared/core/Either';
import { Guard } from '@/shared/core/Guard';
import { UseCase } from '@/shared/core/UseCase';
import {
  RecomputeCollateralHealthRequestDTO,
  RecomputeCollateralHealthResponse,
} from './RecomputeCollateralHealthUseCase';

/** The raw, untrusted attributes carried by an inbound domain event. */
export interface RawEventAttributes {
  collateral: { asset: string; amount: string };
  requirement: { currency: string; amount: string };
  schedule: { initialBps: number; maintenanceBps: number; liquidationBps: number };
  previousStatus?: string | null;
}

export interface RawDomainEvent {
  eventType: string;
  aggregateId: string;
  attributes: RawEventAttributes;
}

export interface RecomputeCollateralHealthControllerRequest {
  domainEvent: RawDomainEvent;
}

type UseCaseType = UseCase<
  RecomputeCollateralHealthRequestDTO,
  Promise<RecomputeCollateralHealthResponse>
>;

/**
 * A transport-agnostic controller. It validates the raw inbound event with `Guard`,
 * shapes a Request DTO and delegates to the use case. On a guard failure it returns a
 * client error on the left channel **without invoking the use case** — consistent with our
 * decision that `clientError()` returns a value rather than throwing (see the README).
 */
export class RecomputeCollateralHealthUseCaseController extends BaseController<
  RecomputeCollateralHealthControllerRequest,
  RecomputeCollateralHealthResponse
> {
  private readonly useCase: UseCaseType;

  constructor(useCase: UseCaseType) {
    super();
    this.useCase = useCase;
  }

  protected async executeImpl(
    request: RecomputeCollateralHealthControllerRequest,
  ): Promise<RecomputeCollateralHealthResponse> {
    const domainEvent = request?.domainEvent;

    const guard = Guard.againstNullOrUndefinedBulk([
      { argument: domainEvent?.eventType, argumentName: 'eventType' },
      { argument: domainEvent?.attributes, argumentName: 'attributes' },
      { argument: domainEvent?.aggregateId, argumentName: 'aggregateId' },
    ]);
    if (guard.isFailure) {
      return left(
        AppError.UnexpectedError.create(this.clientError(guard.getErrorValue() as string)),
      ) as RecomputeCollateralHealthResponse;
    }

    const { attributes } = domainEvent;
    const dto: RecomputeCollateralHealthRequestDTO = {
      triggerType: domainEvent.eventType,
      collateral: attributes.collateral,
      requirement: attributes.requirement,
      schedule: attributes.schedule,
      previousStatus: attributes.previousStatus ?? null,
    };

    return this.useCase.execute(dto);
  }
}
