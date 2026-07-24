import { Result } from '@/shared/core/Result';
import { AggregateRoot } from '@/shared/domain/AggregateRoot';
import { UniqueEntityID } from '@/shared/domain/UniqueEntityID';
import { CollateralHealth } from './CollateralHealth';
import { CollateralHealthEvent } from './CollateralHealthEvent';
import { HealthStatus } from './HealthStatus';
import { LtvSchedule } from './LtvSchedule';
import { MarginLimits } from './MarginLimits';
import { Money } from './Money';
import { Price } from './Price';
import { StatusPolicy } from './StatusPolicy';

export interface CollateralArrangementProps {
  balance: Money;
  requirement: Money;
  schedule: LtvSchedule;
  /** Last computed status, or undefined if no event has been processed yet (Q7). */
  status?: HealthStatus;
}

/**
 * The aggregate root: a Collateral Arrangement wiring a collateral balance, a loan
 * requirement, an LTV schedule and its last computed status. `recompute` values the
 * collateral with a supplied price, derives the margin limits, asks `StatusPolicy` for the
 * next status, mutates its own status and returns the rich `CollateralHealth` result.
 */
export class CollateralArrangement extends AggregateRoot<CollateralArrangementProps> {
  private _status: HealthStatus | undefined;

  private constructor(props: CollateralArrangementProps, id?: UniqueEntityID) {
    super(props, id);
    this._status = props.status;
  }

  get balance(): Money {
    return this.props.balance;
  }

  get requirement(): Money {
    return this.props.requirement;
  }

  get schedule(): LtvSchedule {
    return this.props.schedule;
  }

  get status(): HealthStatus | undefined {
    return this._status;
  }

  /**
   * Recomputes the health in response to an event, valuing the collateral with `price`.
   * The previous status is this aggregate's current status; it is respected by the rules
   * and then replaced by the newly computed status.
   */
  public recompute(event: CollateralHealthEvent, price: Price): Result<CollateralHealth> {
    if (!price.base.equals(this.props.balance.currency)) {
      return Result.fail<CollateralHealth>(
        `Price base ${price.base.code} does not match collateral currency ${this.props.balance.currency.code}`,
      );
    }
    if (!price.quote.equals(this.props.requirement.currency)) {
      return Result.fail<CollateralHealth>(
        `Price quote ${price.quote.code} does not match requirement currency ${this.props.requirement.currency.code}`,
      );
    }

    const collateralValue = price.valueOf(this.props.balance);
    const limits = MarginLimits.from(collateralValue, this.props.schedule);
    const previous = this._status;

    const nextStatus = StatusPolicy.next(previous, event.kind, this.props.requirement, limits);
    this._status = nextStatus;

    return CollateralHealth.create({
      status: nextStatus,
      previousStatus: previous,
      eventKind: event.kind,
      requirement: this.props.requirement,
      limits,
    });
  }

  public static create(
    props: CollateralArrangementProps,
    id?: UniqueEntityID,
  ): Result<CollateralArrangement> {
    return Result.ok<CollateralArrangement>(new CollateralArrangement(props, id));
  }
}
