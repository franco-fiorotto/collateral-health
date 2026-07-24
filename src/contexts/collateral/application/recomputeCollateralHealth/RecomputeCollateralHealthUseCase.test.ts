import { AppError } from '@/shared/core/AppError';
import { Currency } from '@/contexts/collateral/domain/Currency';
import { HealthStatus } from '@/contexts/collateral/domain/HealthStatus';
import { IPriceProvider } from '@/contexts/collateral/domain/IPriceProvider';
import { Price } from '@/contexts/collateral/domain/Price';
import {
  RecomputeCollateralHealthRequestDTO,
  RecomputeCollateralHealthUseCase,
} from './RecomputeCollateralHealthUseCase';
import { RecomputeCollateralHealthUseCaseErrors as Errors } from './RecomputeCollateralHealthUseCaseErrors';

const price30k: IPriceProvider = {
  getPrice: async () => Price.fromMajor(Currency.BTC(), Currency.USDC(), 30_000).getValue(),
};
const noPrice: IPriceProvider = { getPrice: async () => null };
const throwingProvider: IPriceProvider = {
  getPrice: async () => {
    throw new Error('market feed exploded');
  },
};

const validRequest = (
  overrides: Partial<RecomputeCollateralHealthRequestDTO> = {},
): RecomputeCollateralHealthRequestDTO => ({
  triggerType: 'price.moved',
  collateral: { asset: 'BTC', amount: '2' },
  requirement: { currency: 'USDC', amount: '42000' },
  schedule: { initialBps: 5000, maintenanceBps: 6500, liquidationBps: 8000 },
  previousStatus: HealthStatus.GoodStanding,
  ...overrides,
});

describe('RecomputeCollateralHealthUseCase', () => {
  describe('happy path (price resolved on the fly through the stubbed provider)', () => {
    it('values the worked example and returns Maintenance Margin Call on an ordinary recompute', async () => {
      const useCase = RecomputeCollateralHealthUseCase(price30k);

      const result = await useCase.execute(validRequest());

      if (!result.isRight()) {
        throw new Error('expected a right (success) response');
      }
      const dto = result.value.getValue();
      expect(dto.status).toBe(HealthStatus.MaintenanceMarginCall);
      expect(dto.collateralValue).toBe('60000 USDC');
      expect(dto.limits).toEqual({
        initial: '30000 USDC',
        maintenance: '39000 USDC',
        liquidation: '48000 USDC',
      });
    });

    it('returns Initial Margin Call on a link', async () => {
      const useCase = RecomputeCollateralHealthUseCase(price30k);

      const result = await useCase.execute(
        validRequest({ triggerType: 'loan.linked', previousStatus: null }),
      );

      if (!result.isRight()) {
        throw new Error('expected a right (success) response');
      }
      expect(result.value.getValue().status).toBe(HealthStatus.InitialMarginCall);
    });
  });

  describe('typed error paths', () => {
    it('returns InvalidEvent for an unknown trigger type', async () => {
      const useCase = RecomputeCollateralHealthUseCase(price30k);
      const result = await useCase.execute(validRequest({ triggerType: 'nope' }));

      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(Errors.InvalidEvent);
    });

    it('returns InvalidCollateralArrangement for a schedule violating I ≤ M ≤ L', async () => {
      const useCase = RecomputeCollateralHealthUseCase(price30k);
      const result = await useCase.execute(
        validRequest({ schedule: { initialBps: 8000, maintenanceBps: 6500, liquidationBps: 5000 } }),
      );

      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(Errors.InvalidCollateralArrangement);
    });

    it('returns PriceUnavailable when the provider has no quote', async () => {
      const useCase = RecomputeCollateralHealthUseCase(noPrice);
      const result = await useCase.execute(validRequest());

      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(Errors.PriceUnavailable);
    });
  });

  describe('unexpected failures', () => {
    it('wraps a throwing price provider as AppError.UnexpectedError', async () => {
      const useCase = RecomputeCollateralHealthUseCase(throwingProvider);
      const result = await useCase.execute(validRequest());

      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(AppError.UnexpectedError);
    });
  });
});
