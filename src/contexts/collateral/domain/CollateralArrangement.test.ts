import { CollateralArrangementMother } from '@/contexts/collateral/tests/CollateralArrangementMother';
import { CollateralHealthEventMother } from '@/contexts/collateral/tests/CollateralHealthEventMother';
import { CollateralArrangement } from './CollateralArrangement';
import { Currency } from './Currency';
import { HealthStatus } from './HealthStatus';
import { Money } from './Money';
import { Price } from './Price';

const BTC = Currency.BTC();
const USDC = Currency.USDC();
const usdc = (major: number) => Money.fromMajor(USDC, major).getValue();

const price30k = Price.fromMajor(BTC, USDC, 30_000).getValue();

const buildArrangement = (overrides: Partial<Parameters<typeof CollateralArrangement.create>[0]> = {}) =>
  CollateralArrangementMother.workedExample(overrides);

const event = (triggerType: string) => CollateralHealthEventMother.workedExample({ triggerType });

describe('CollateralArrangement', () => {
  it('values the collateral and derives the worked-example limits (30k/39k/48k)', () => {
    const arrangement = buildArrangement();
    const health = arrangement.recompute(event('price.moved'), price30k).getValue();
    expect(health.collateralValue.equals(usdc(60_000))).toBe(true);
    expect(health.limits.initial.equals(usdc(30_000))).toBe(true);
    expect(health.limits.maintenance.equals(usdc(39_000))).toBe(true);
    expect(health.limits.liquidation.equals(usdc(48_000))).toBe(true);
  });

  it('worked example — ordinary recompute yields Maintenance Margin Call', () => {
    const arrangement = buildArrangement({ status: HealthStatus.GoodStanding });
    const health = arrangement.recompute(event('price.moved'), price30k).getValue();
    expect(health.status).toBe(HealthStatus.MaintenanceMarginCall);
  });

  it('worked example — a link yields Initial Margin Call', () => {
    const arrangement = buildArrangement();
    const health = arrangement.recompute(event('loan.linked'), price30k).getValue();
    expect(health.status).toBe(HealthStatus.InitialMarginCall);
  });

  it('mutates its own status to the newly computed one', () => {
    const arrangement = buildArrangement({ status: HealthStatus.GoodStanding });
    expect(arrangement.status).toBe(HealthStatus.GoodStanding);
    arrangement.recompute(event('price.moved'), price30k);
    expect(arrangement.status).toBe(HealthStatus.MaintenanceMarginCall);
  });

  it('respects the previous status — a link does not override an open Maintenance call', () => {
    const arrangement = buildArrangement({ status: HealthStatus.MaintenanceMarginCall });
    const health = arrangement.recompute(event('loan.linked'), price30k).getValue();
    expect(health.status).toBe(HealthStatus.MaintenanceMarginCall);
    expect(health.previousStatus).toBe(HealthStatus.MaintenanceMarginCall);
  });

  it('fails when the price does not value the collateral in the requirement currency', () => {
    const arrangement = buildArrangement();
    const wrongPrice = Price.fromMajor(BTC, Currency.create('EUR', 2).getValue(), 30_000).getValue();
    const result = arrangement.recompute(event('price.moved'), wrongPrice);
    expect(result.isFailure).toBe(true);
  });
});
