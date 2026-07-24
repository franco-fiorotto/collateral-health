import { Ltv } from './Ltv';
import { LtvSchedule } from './LtvSchedule';

const ltv = (bp: number) => Ltv.fromBasisPoints(bp).getValue();

describe('LtvSchedule', () => {
  it('holds initial ≤ maintenance ≤ liquidation', () => {
    const schedule = LtvSchedule.create(ltv(5000), ltv(6500), ltv(8000)).getValue();
    expect(schedule.initial.basisPoints).toBe(5000);
    expect(schedule.maintenance.basisPoints).toBe(6500);
    expect(schedule.liquidation.basisPoints).toBe(8000);
  });

  it('allows equal ratios (the precedence rule exists precisely for that case)', () => {
    const schedule = LtvSchedule.create(ltv(5000), ltv(5000), ltv(5000));
    expect(schedule.isSuccess).toBe(true);
  });

  it('rejects maintenance below initial', () => {
    expect(LtvSchedule.create(ltv(6500), ltv(5000), ltv(8000)).isFailure).toBe(true);
  });

  it('rejects liquidation below maintenance', () => {
    expect(LtvSchedule.create(ltv(5000), ltv(6500), ltv(6000)).isFailure).toBe(true);
  });
});
