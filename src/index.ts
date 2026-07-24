/**
 * Public API of the Collateral Health library.
 *
 * Consumers drive the domain through the controller/use case (a transport can wrap the
 * controller), or use the domain models directly. Everything is exception-free at the
 * boundary: results come back as `Result` / `Either` values.
 */

// Shared kernel
export { Result } from './shared/core/Result';
export { Either, Left, Right, left, right } from './shared/core/Either';
export { Guard } from './shared/core/Guard';
export { UseCase } from './shared/core/UseCase';
export { UseCaseError } from './shared/core/UseCaseError';
export { AppError } from './shared/core/AppError';
export { BaseController } from './shared/core/BaseController';

// Domain
export { Currency } from './contexts/collateral/domain/Currency';
export { Money } from './contexts/collateral/domain/Money';
export { Price } from './contexts/collateral/domain/Price';
export { Ltv } from './contexts/collateral/domain/Ltv';
export { LtvSchedule } from './contexts/collateral/domain/LtvSchedule';
export { MarginLimits } from './contexts/collateral/domain/MarginLimits';
export { HealthStatus, HealthStatusOps } from './contexts/collateral/domain/HealthStatus';
export { CollateralHealthEvent, EventKind } from './contexts/collateral/domain/CollateralHealthEvent';
export { StatusPolicy } from './contexts/collateral/domain/StatusPolicy';
export { CollateralArrangement } from './contexts/collateral/domain/CollateralArrangement';
export { CollateralHealth, CollateralHealthDTO } from './contexts/collateral/domain/CollateralHealth';
export { IPriceProvider } from './contexts/collateral/domain/IPriceProvider';

// Application
export {
  RecomputeCollateralHealthUseCase,
  RecomputeCollateralHealthRequestDTO,
  RecomputeCollateralHealthResponse,
} from './contexts/collateral/application/recomputeCollateralHealth/RecomputeCollateralHealthUseCase';
export { RecomputeCollateralHealthUseCaseErrors } from './contexts/collateral/application/recomputeCollateralHealth/RecomputeCollateralHealthUseCaseErrors';
export {
  RecomputeCollateralHealthUseCaseController,
  RecomputeCollateralHealthControllerRequest,
  RawDomainEvent,
  RawEventAttributes,
} from './contexts/collateral/application/recomputeCollateralHealth/RecomputeCollateralHealthUseCaseController';

// Infrastructure
export { MockPriceProvider } from './contexts/collateral/infra/pricing/MockPriceProvider';
