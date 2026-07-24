import { Result } from '@/shared/core/Result';
import { ValueObject } from '@/shared/domain/ValueObject';
import { Ltv } from './Ltv';

interface LtvScheduleProps {
  initial: Ltv;
  maintenance: Ltv;
  liquidation: Ltv;
}

/**
 * The three loan-to-value ratios of a Collateral Arrangement, bound by the invariant
 * `Initial ≤ Maintenance ≤ Liquidation` (equality allowed — Q8). Construction fails if the
 * ordering is violated, so the rules engine never sees an incoherent schedule.
 */
export class LtvSchedule extends ValueObject<LtvScheduleProps> {
  private constructor(props: LtvScheduleProps) {
    super(props);
  }

  get initial(): Ltv {
    return this.props.initial;
  }

  get maintenance(): Ltv {
    return this.props.maintenance;
  }

  get liquidation(): Ltv {
    return this.props.liquidation;
  }

  public static create(initial: Ltv, maintenance: Ltv, liquidation: Ltv): Result<LtvSchedule> {
    if (!initial.isLessThanOrEqualTo(maintenance)) {
      return Result.fail<LtvSchedule>('LtvSchedule requires Initial ≤ Maintenance');
    }
    if (!maintenance.isLessThanOrEqualTo(liquidation)) {
      return Result.fail<LtvSchedule>('LtvSchedule requires Maintenance ≤ Liquidation');
    }
    return Result.ok<LtvSchedule>(new LtvSchedule({ initial, maintenance, liquidation }));
  }
}
