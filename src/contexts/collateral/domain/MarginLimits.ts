import { ValueObject } from '@/shared/domain/ValueObject';
import { LtvSchedule } from './LtvSchedule';
import { Money } from './Money';

interface MarginLimitsProps {
  collateralValue: Money;
  initial: Money;
  maintenance: Money;
  liquidation: Money;
}

/**
 * The three monetary limits (`I ≤ M ≤ L`) obtained by applying an `LtvSchedule` to a
 * collateral value. These are the thresholds the requirement is classified against.
 */
export class MarginLimits extends ValueObject<MarginLimitsProps> {
  private constructor(props: MarginLimitsProps) {
    super(props);
  }

  get collateralValue(): Money {
    return this.props.collateralValue;
  }

  get initial(): Money {
    return this.props.initial;
  }

  get maintenance(): Money {
    return this.props.maintenance;
  }

  get liquidation(): Money {
    return this.props.liquidation;
  }

  public static from(collateralValue: Money, schedule: LtvSchedule): MarginLimits {
    return new MarginLimits({
      collateralValue,
      initial: schedule.initial.limitOf(collateralValue),
      maintenance: schedule.maintenance.limitOf(collateralValue),
      liquidation: schedule.liquidation.limitOf(collateralValue),
    });
  }
}
