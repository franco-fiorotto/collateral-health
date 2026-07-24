import {
  CollateralHealthEvent,
  CollateralHealthEventProps,
} from '@/contexts/collateral/domain/CollateralHealthEvent';
import { Currency } from '@/contexts/collateral/domain/Currency';
import { Ltv } from '@/contexts/collateral/domain/Ltv';
import { LtvSchedule } from '@/contexts/collateral/domain/LtvSchedule';
import { Money } from '@/contexts/collateral/domain/Money';

const BTC = Currency.BTC();
const USDC = Currency.USDC();
const ltv = (bp: number) => Ltv.fromBasisPoints(bp).getValue();

/**
 * Object Mother for `CollateralHealthEvent`. Defaults reproduce the worked example
 * (2 BTC collateral, 42 000 USDC requirement, 50/65/80% schedule, price-move trigger);
 * pass overrides to vary a single facet without restating the rest.
 */
export const CollateralHealthEventMother = {
  workedExampleProps(overrides: Partial<CollateralHealthEventProps> = {}): CollateralHealthEventProps {
    return {
      triggerType: 'price.moved',
      balance: Money.fromMajor(BTC, '2').getValue(),
      requirement: Money.fromMajor(USDC, 42_000).getValue(),
      schedule: LtvSchedule.create(ltv(5000), ltv(6500), ltv(8000)).getValue(),
      ...overrides,
    };
  },

  workedExample(overrides: Partial<CollateralHealthEventProps> = {}): CollateralHealthEvent {
    return CollateralHealthEvent.create(this.workedExampleProps(overrides)).getValue();
  },
};
