import { Currency } from './Currency';
import { Ltv } from './Ltv';
import { LtvSchedule } from './LtvSchedule';
import { MarginLimits } from './MarginLimits';
import { Money } from './Money';

const USDC = Currency.USDC();
const ltv = (bp: number) => Ltv.fromBasisPoints(bp).getValue();
const usdc = (major: number) => Money.fromMajor(USDC, major).getValue();

describe('MarginLimits', () => {
  it('derives the three limits from a collateral value and a schedule — worked example 30k/39k/48k', () => {
    const value = usdc(60_000);
    const schedule = LtvSchedule.create(ltv(5000), ltv(6500), ltv(8000)).getValue();

    const limits = MarginLimits.from(value, schedule);

    expect(limits.initial.equals(usdc(30_000))).toBe(true);
    expect(limits.maintenance.equals(usdc(39_000))).toBe(true);
    expect(limits.liquidation.equals(usdc(48_000))).toBe(true);
  });

  it('exposes the collateral value it was built from', () => {
    const value = usdc(60_000);
    const schedule = LtvSchedule.create(ltv(5000), ltv(6500), ltv(8000)).getValue();
    const limits = MarginLimits.from(value, schedule);
    expect(limits.collateralValue.equals(value)).toBe(true);
  });
});
