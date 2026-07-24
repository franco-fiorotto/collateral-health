import { Currency } from './Currency';
import { CollateralHealthEvent, EventKind } from './CollateralHealthEvent';
import { HealthStatus } from './HealthStatus';
import { Ltv } from './Ltv';
import { LtvSchedule } from './LtvSchedule';
import { Money } from './Money';

const BTC = Currency.BTC();
const USDC = Currency.USDC();
const ltv = (bp: number) => Ltv.fromBasisPoints(bp).getValue();

const validProps = () => ({
  triggerType: 'price.moved',
  balance: Money.fromMajor(BTC, '2').getValue(),
  requirement: Money.fromMajor(USDC, 42_000).getValue(),
  schedule: LtvSchedule.create(ltv(5000), ltv(6500), ltv(8000)).getValue(),
});

describe('CollateralHealthEvent', () => {
  describe('trigger normalization', () => {
    it('normalizes loan.linked → Link', () => {
      const event = CollateralHealthEvent.create({ ...validProps(), triggerType: 'loan.linked' }).getValue();
      expect(event.kind).toBe(EventKind.Link);
    });

    it.each(['price.moved', 'balance.changed', 'loan.repaid'])(
      'normalizes %s → Recompute',
      (triggerType) => {
        const event = CollateralHealthEvent.create({ ...validProps(), triggerType }).getValue();
        expect(event.kind).toBe(EventKind.Recompute);
      },
    );

    it('rejects an unknown trigger type', () => {
      const result = CollateralHealthEvent.create({ ...validProps(), triggerType: 'something.weird' });
      expect(result.isFailure).toBe(true);
    });
  });

  describe('figures', () => {
    it('carries balance, requirement and schedule', () => {
      const event = CollateralHealthEvent.create(validProps()).getValue();
      expect(event.balance.equals(Money.fromMajor(BTC, '2').getValue())).toBe(true);
      expect(event.requirement.equals(Money.fromMajor(USDC, 42_000).getValue())).toBe(true);
      expect(event.schedule.initial.basisPoints).toBe(5000);
    });

    it('carries NO price (price is resolved on the fly — Q5)', () => {
      const event = CollateralHealthEvent.create(validProps()).getValue() as unknown as Record<string, unknown>;
      expect('price' in event).toBe(false);
    });

    it('defaults previousStatus to undefined', () => {
      const event = CollateralHealthEvent.create(validProps()).getValue();
      expect(event.previousStatus).toBeUndefined();
    });

    it('carries an optional previousStatus', () => {
      const event = CollateralHealthEvent.create({
        ...validProps(),
        previousStatus: HealthStatus.MaintenanceMarginCall,
      }).getValue();
      expect(event.previousStatus).toBe(HealthStatus.MaintenanceMarginCall);
    });

    it('rejects a missing requirement', () => {
      const props = validProps() as Record<string, unknown>;
      delete props.requirement;
      const result = CollateralHealthEvent.create(props as never);
      expect(result.isFailure).toBe(true);
    });
  });
});
