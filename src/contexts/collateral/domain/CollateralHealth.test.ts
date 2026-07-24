import { Currency } from './Currency';
import { CollateralHealth } from './CollateralHealth';
import { EventKind } from './CollateralHealthEvent';
import { HealthStatus } from './HealthStatus';
import { Ltv } from './Ltv';
import { LtvSchedule } from './LtvSchedule';
import { MarginLimits } from './MarginLimits';
import { Money } from './Money';

const USDC = Currency.USDC();
const usdc = (major: number) => Money.fromMajor(USDC, major).getValue();
const ltv = (bp: number) => Ltv.fromBasisPoints(bp).getValue();

const workedLimits = MarginLimits.from(
  usdc(60_000),
  LtvSchedule.create(ltv(5000), ltv(6500), ltv(8000)).getValue(),
); // I=30k M=39k L=48k, collateralValue=60k

const build = (overrides: Partial<Parameters<typeof CollateralHealth.create>[0]> = {}) =>
  CollateralHealth.create({
    status: HealthStatus.MaintenanceMarginCall,
    previousStatus: HealthStatus.GoodStanding,
    eventKind: EventKind.Recompute,
    requirement: usdc(42_000),
    limits: workedLimits,
    ...overrides,
  });

describe('CollateralHealth', () => {
  it('is created through a guarded factory', () => {
    expect(build().isSuccess).toBe(true);
  });

  it('fails when the requirement currency differs from the limits currency', () => {
    const btcRequirement = Money.fromMajor(Currency.BTC(), '1').getValue();
    expect(build({ requirement: btcRequirement }).isFailure).toBe(true);
  });

  it('exposes the status, previous status and event kind', () => {
    const health = build().getValue();
    expect(health.status).toBe(HealthStatus.MaintenanceMarginCall);
    expect(health.previousStatus).toBe(HealthStatus.GoodStanding);
    expect(health.eventKind).toBe(EventKind.Recompute);
  });

  describe('derived fields (computed at construction)', () => {
    it('derives utilization = requirement ÷ collateral value (in basis points)', () => {
      // 42 000 / 60 000 = 70% = 7000 bp
      expect(build().getValue().utilizationBasisPoints).toBe(7000);
    });

    it('derives headroom to liquidation = liquidation limit − requirement', () => {
      // 48 000 − 42 000 = 6 000 USDC
      expect(build().getValue().headroomToLiquidation.equals(usdc(6_000))).toBe(true);
    });

    it('reports negative headroom when the requirement is past liquidation', () => {
      const health = build({ requirement: usdc(50_000), status: HealthStatus.Liquidation }).getValue();
      // 48 000 − 50 000 = −2 000
      expect(health.headroomToLiquidation.amount).toBe(-2_000_000_000n);
    });
  });

  describe('toDTO', () => {
    it('produces a plain, serializable summary', () => {
      const dto = build().getValue().toDTO();
      expect(dto).toEqual({
        status: HealthStatus.MaintenanceMarginCall,
        previousStatus: HealthStatus.GoodStanding,
        eventKind: EventKind.Recompute,
        requirement: '42000 USDC',
        collateralValue: '60000 USDC',
        limits: {
          initial: '30000 USDC',
          maintenance: '39000 USDC',
          liquidation: '48000 USDC',
        },
        utilizationBasisPoints: 7000,
        headroomToLiquidation: '6000 USDC',
      });
    });

    it('renders a null previousStatus when there was none', () => {
      const dto = build({ previousStatus: undefined }).getValue().toDTO();
      expect(dto.previousStatus).toBeNull();
    });
  });
});
