import {
  CollateralArrangement,
  CollateralArrangementProps,
} from '@/contexts/collateral/domain/CollateralArrangement';
import { Currency } from '@/contexts/collateral/domain/Currency';
import { Ltv } from '@/contexts/collateral/domain/Ltv';
import { LtvSchedule } from '@/contexts/collateral/domain/LtvSchedule';
import { Money } from '@/contexts/collateral/domain/Money';

const BTC = Currency.BTC();
const USDC = Currency.USDC();
const ltv = (bp: number) => Ltv.fromBasisPoints(bp).getValue();

/**
 * Object Mother for `CollateralArrangement`. Defaults reproduce the worked example
 * (2 BTC collateral, 42 000 USDC requirement, 50/65/80% schedule, no prior status); pass
 * overrides to vary a single facet.
 */
export const CollateralArrangementMother = {
  workedExample(overrides: Partial<CollateralArrangementProps> = {}): CollateralArrangement {
    return CollateralArrangement.create({
      balance: Money.fromMajor(BTC, '2').getValue(),
      requirement: Money.fromMajor(USDC, 42_000).getValue(),
      schedule: LtvSchedule.create(ltv(5000), ltv(6500), ltv(8000)).getValue(),
      status: undefined,
      ...overrides,
    }).getValue();
  },
};
