import { AppError } from '@/shared/core/AppError';
import { Result } from '@/shared/core/Result';
import { right } from '@/shared/core/Either';
import { CollateralHealthDTO } from '@/contexts/collateral/domain/CollateralHealth';
import { EventKind } from '@/contexts/collateral/domain/CollateralHealthEvent';
import { HealthStatus } from '@/contexts/collateral/domain/HealthStatus';
import {
  RecomputeCollateralHealthControllerRequest,
  RecomputeCollateralHealthUseCaseController,
} from './RecomputeCollateralHealthUseCaseController';
import { RecomputeCollateralHealthResponse } from './RecomputeCollateralHealthUseCase';

const sampleDTO: CollateralHealthDTO = {
  status: HealthStatus.MaintenanceMarginCall,
  previousStatus: HealthStatus.GoodStanding,
  eventKind: EventKind.Recompute,
  requirement: '42000 USDC',
  collateralValue: '60000 USDC',
  limits: { initial: '30000 USDC', maintenance: '39000 USDC', liquidation: '48000 USDC' },
  utilizationBasisPoints: 7000,
  headroomToLiquidation: '6000 USDC',
};

const validRequest = (): RecomputeCollateralHealthControllerRequest => ({
  domainEvent: {
    eventType: 'price.moved',
    aggregateId: 'ca-123',
    attributes: {
      collateral: { asset: 'BTC', amount: '2' },
      requirement: { currency: 'USDC', amount: '42000' },
      schedule: { initialBps: 5000, maintenanceBps: 6500, liquidationBps: 8000 },
      previousStatus: HealthStatus.GoodStanding,
    },
  },
});

describe('RecomputeCollateralHealthUseCaseController', () => {
  const makeUseCase = (response?: RecomputeCollateralHealthResponse) => {
    const fallback: RecomputeCollateralHealthResponse = right(Result.ok<CollateralHealthDTO>(sampleDTO));
    return {
      execute: jest.fn(
        async (): Promise<RecomputeCollateralHealthResponse> => response ?? fallback,
      ),
    };
  };

  it('builds the exact Request DTO and delegates to the use case on valid input', async () => {
    const useCase = makeUseCase();
    const controller = new RecomputeCollateralHealthUseCaseController(useCase);

    await controller.execute(validRequest());

    expect(useCase.execute).toHaveBeenCalledTimes(1);
    expect(useCase.execute).toHaveBeenCalledWith({
      triggerType: 'price.moved',
      collateral: { asset: 'BTC', amount: '2' },
      requirement: { currency: 'USDC', amount: '42000' },
      schedule: { initialBps: 5000, maintenanceBps: 6500, liquidationBps: 8000 },
      previousStatus: HealthStatus.GoodStanding,
    });
  });

  it('passes the use-case response through untouched', async () => {
    const response: RecomputeCollateralHealthResponse = right(Result.ok<CollateralHealthDTO>(sampleDTO));
    const useCase = makeUseCase(response);
    const controller = new RecomputeCollateralHealthUseCaseController(useCase);

    const result = await controller.execute(validRequest());

    expect(result).toBe(response);
  });

  describe('guard failures short-circuit without calling the use case', () => {
    it.each([
      ['missing eventType', { eventType: undefined }],
      ['missing attributes', { attributes: undefined }],
      ['missing aggregateId', { aggregateId: undefined }],
    ])('%s', async (_label, patch) => {
      const useCase = makeUseCase();
      const controller = new RecomputeCollateralHealthUseCaseController(useCase);
      const request = validRequest();
      Object.assign(request.domainEvent, patch);

      const result = await controller.execute(request);

      expect(useCase.execute).not.toHaveBeenCalled();
      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(AppError.UnexpectedError);
    });
  });
});
