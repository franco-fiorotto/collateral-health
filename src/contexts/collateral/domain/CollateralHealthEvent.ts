import { Guard } from '@/shared/core/Guard';
import { Result } from '@/shared/core/Result';
import { HealthStatus } from './HealthStatus';
import { LtvSchedule } from './LtvSchedule';
import { Money } from './Money';

/**
 * The two kinds of trigger the rules distinguish. Every concrete trigger type normalizes
 * into one of these, so the transition rules stay a closed set.
 */
export enum EventKind {
  Link = 'Link',
  Recompute = 'Recompute',
}

/** Concrete trigger types → the kind the rules reason about. */
const TRIGGER_KINDS: Record<string, EventKind> = {
  'loan.linked': EventKind.Link,
  'price.moved': EventKind.Recompute,
  'balance.changed': EventKind.Recompute,
  'loan.repaid': EventKind.Recompute,
};

export interface CollateralHealthEventProps {
  triggerType: string;
  balance: Money;
  requirement: Money;
  schedule: LtvSchedule;
  previousStatus?: HealthStatus;
}

interface NormalizedProps {
  kind: EventKind;
  triggerType: string;
  balance: Money;
  requirement: Money;
  schedule: LtvSchedule;
  previousStatus?: HealthStatus;
}

/**
 * A first-class domain event describing why a recompute is happening and carrying every
 * figure the rules need — collateral balance, requirement and LTV schedule — plus an
 * optional previous status. The price is deliberately absent: it is a current market
 * observation resolved on the fly by the use case, not a fact of the trigger (Q5).
 * Malformed triggers fail here, so the rules engine never sees bad input.
 */
export class CollateralHealthEvent {
  private readonly _props: NormalizedProps;

  private constructor(props: NormalizedProps) {
    this._props = props;
  }

  get kind(): EventKind {
    return this._props.kind;
  }

  get triggerType(): string {
    return this._props.triggerType;
  }

  get balance(): Money {
    return this._props.balance;
  }

  get requirement(): Money {
    return this._props.requirement;
  }

  get schedule(): LtvSchedule {
    return this._props.schedule;
  }

  get previousStatus(): HealthStatus | undefined {
    return this._props.previousStatus;
  }

  public static create(props: CollateralHealthEventProps): Result<CollateralHealthEvent> {
    const guard = Guard.againstNullOrUndefinedBulk([
      { argument: props?.triggerType, argumentName: 'triggerType' },
      { argument: props?.balance, argumentName: 'balance' },
      { argument: props?.requirement, argumentName: 'requirement' },
      { argument: props?.schedule, argumentName: 'schedule' },
    ]);
    if (guard.isFailure) {
      return Result.fail<CollateralHealthEvent>(guard.getErrorValue() as string);
    }

    const kind = TRIGGER_KINDS[props.triggerType];
    if (kind === undefined) {
      return Result.fail<CollateralHealthEvent>(`Unknown trigger type: "${props.triggerType}"`);
    }

    return Result.ok<CollateralHealthEvent>(
      new CollateralHealthEvent({
        kind,
        triggerType: props.triggerType,
        balance: props.balance,
        requirement: props.requirement,
        schedule: props.schedule,
        previousStatus: props.previousStatus,
      }),
    );
  }
}
