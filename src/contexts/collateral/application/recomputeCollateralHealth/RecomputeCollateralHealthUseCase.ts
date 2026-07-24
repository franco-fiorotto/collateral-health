import { AppError } from '@/shared/core/AppError';
import { Either, left, right } from '@/shared/core/Either';
import { Result } from '@/shared/core/Result';
import { UseCase } from '@/shared/core/UseCase';
import { CollateralArrangement } from '@/contexts/collateral/domain/CollateralArrangement';
import { CollateralHealthDTO } from '@/contexts/collateral/domain/CollateralHealth';
import { CollateralHealthEvent } from '@/contexts/collateral/domain/CollateralHealthEvent';
import { Currency } from '@/contexts/collateral/domain/Currency';
import { HealthStatus } from '@/contexts/collateral/domain/HealthStatus';
import { IPriceProvider } from '@/contexts/collateral/domain/IPriceProvider';
import { Ltv } from '@/contexts/collateral/domain/Ltv';
import { LtvSchedule } from '@/contexts/collateral/domain/LtvSchedule';
import { Money } from '@/contexts/collateral/domain/Money';
import { RecomputeCollateralHealthUseCaseErrors as Errors } from './RecomputeCollateralHealthUseCaseErrors';

/** The primitive-only request the controller builds from raw input. */
export interface RecomputeCollateralHealthRequestDTO {
  triggerType: string;
  collateral: { asset: string; amount: string };
  requirement: { currency: string; amount: string };
  schedule: { initialBps: number; maintenanceBps: number; liquidationBps: number };
  previousStatus?: string | null;
}

type Response = Either<
  | AppError.UnexpectedError
  | Errors.InvalidEvent
  | Errors.PriceUnavailable
  | Errors.InvalidCollateralArrangement,
  Result<CollateralHealthDTO>
>;

export type { Response as RecomputeCollateralHealthResponse };

const parsePreviousStatus = (raw: string | null | undefined): Result<HealthStatus | undefined> => {
  if (raw === null || raw === undefined) {
    return Result.ok<HealthStatus | undefined>(undefined);
  }
  if ((Object.values(HealthStatus) as string[]).includes(raw)) {
    return Result.ok<HealthStatus | undefined>(raw as HealthStatus);
  }
  return Result.fail<HealthStatus | undefined>(`unknown previous status "${raw}"`);
};

/**
 * The recompute use case, built as a factory function: dependencies (here the price
 * provider) are injected as arguments and it returns `{ execute }`. The flow is DTO →
 * rich event → price resolved on the fly through the port → aggregate recompute → rich
 * result DTO. Expected failures return typed errors on the `Either` left channel; anything
 * unexpected is caught and surfaced as `AppError.UnexpectedError` — no exceptions escape.
 */
export const RecomputeCollateralHealthUseCase = (
  priceProvider: IPriceProvider,
): UseCase<RecomputeCollateralHealthRequestDTO, Promise<Response>> => {
  const execute = async (request: RecomputeCollateralHealthRequestDTO): Promise<Response> => {
    try {
      // --- Build the rich domain event from the primitive DTO --------------------------
      const collateralCurrency = Currency.fromCode(request.collateral.asset);
      if (collateralCurrency.isFailure) {
        return left(new Errors.InvalidEvent(collateralCurrency.getErrorValue() as string));
      }
      const requirementCurrency = Currency.fromCode(request.requirement.currency);
      if (requirementCurrency.isFailure) {
        return left(new Errors.InvalidEvent(requirementCurrency.getErrorValue() as string));
      }

      const balance = Money.fromMajor(collateralCurrency.getValue(), request.collateral.amount);
      if (balance.isFailure) {
        return left(new Errors.InvalidEvent(balance.getErrorValue() as string));
      }
      const requirement = Money.fromMajor(requirementCurrency.getValue(), request.requirement.amount);
      if (requirement.isFailure) {
        return left(new Errors.InvalidEvent(requirement.getErrorValue() as string));
      }

      const initial = Ltv.fromBasisPoints(request.schedule.initialBps);
      const maintenance = Ltv.fromBasisPoints(request.schedule.maintenanceBps);
      const liquidation = Ltv.fromBasisPoints(request.schedule.liquidationBps);
      const ltvBuild = Result.combine([initial, maintenance, liquidation]);
      if (ltvBuild.isFailure) {
        return left(new Errors.InvalidCollateralArrangement(ltvBuild.getErrorValue() as string));
      }
      const schedule = LtvSchedule.create(
        initial.getValue(),
        maintenance.getValue(),
        liquidation.getValue(),
      );
      if (schedule.isFailure) {
        return left(new Errors.InvalidCollateralArrangement(schedule.getErrorValue() as string));
      }

      const previousStatus = parsePreviousStatus(request.previousStatus);
      if (previousStatus.isFailure) {
        return left(new Errors.InvalidEvent(previousStatus.getErrorValue() as string));
      }

      const event = CollateralHealthEvent.create({
        triggerType: request.triggerType,
        balance: balance.getValue(),
        requirement: requirement.getValue(),
        schedule: schedule.getValue(),
        previousStatus: previousStatus.getValue(),
      });
      if (event.isFailure) {
        return left(new Errors.InvalidEvent(event.getErrorValue() as string));
      }

      // --- Resolve the price on the fly through the port (Q5) --------------------------
      const price = await priceProvider.getPrice(
        collateralCurrency.getValue(),
        requirementCurrency.getValue(),
      );
      if (price === null) {
        return left(
          new Errors.PriceUnavailable(
            collateralCurrency.getValue().code,
            requirementCurrency.getValue().code,
          ),
        );
      }

      // --- Recompute the health --------------------------------------------------------
      const arrangement = CollateralArrangement.create({
        balance: balance.getValue(),
        requirement: requirement.getValue(),
        schedule: schedule.getValue(),
        status: previousStatus.getValue(),
      }).getValue();

      const health = arrangement.recompute(event.getValue(), price);
      if (health.isFailure) {
        return left(new Errors.InvalidCollateralArrangement(health.getErrorValue() as string));
      }

      return right(Result.ok<CollateralHealthDTO>(health.getValue().toDTO()));
    } catch (err) {
      return left(new AppError.UnexpectedError(err));
    }
  };

  return { execute };
};
