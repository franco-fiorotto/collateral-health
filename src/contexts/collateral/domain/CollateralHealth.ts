import { Guard } from '@/shared/core/Guard';
import { Result } from '@/shared/core/Result';
import { Entity } from '@/shared/domain/Entity';
import { EventKind } from './CollateralHealthEvent';
import { HealthStatus } from './HealthStatus';
import { MarginLimits } from './MarginLimits';
import { Money } from './Money';

export interface CollateralHealthProps {
  status: HealthStatus;
  previousStatus?: HealthStatus;
  eventKind: EventKind;
  requirement: Money;
  limits: MarginLimits;
}

export interface CollateralHealthDTO {
  status: HealthStatus;
  previousStatus: HealthStatus | null;
  eventKind: EventKind;
  requirement: string;
  collateralValue: string;
  limits: {
    initial: string;
    maintenance: string;
    liquidation: string;
  };
  utilizationBasisPoints: number;
  headroomToLiquidation: string;
}

const BASIS_POINTS = 10_000n;

/**
 * The rich result of a recompute. Rather than returning a bare enum, it holds the new
 * status alongside the figures it was decided from, and derives its computed fields
 * (utilization, headroom to liquidation) once, at construction, via private setters — so
 * consumers read everything they need from getters without re-deriving anything.
 */
export class CollateralHealth extends Entity<CollateralHealthProps> {
  private _utilizationBasisPoints!: number;
  private _headroomToLiquidation!: Money;

  private constructor(props: CollateralHealthProps) {
    super(props);
    this.setUtilization();
    this.setHeadroomToLiquidation();
  }

  private setUtilization(): void {
    const collateralValue = this.props.limits.collateralValue;
    if (collateralValue.amount === 0n) {
      this._utilizationBasisPoints = 0;
      return;
    }
    const bp = (this.props.requirement.amount * BASIS_POINTS) / collateralValue.amount;
    this._utilizationBasisPoints = Number(bp);
  }

  private setHeadroomToLiquidation(): void {
    this._headroomToLiquidation = this.props.limits.liquidation.minus(this.props.requirement);
  }

  get status(): HealthStatus {
    return this.props.status;
  }

  get previousStatus(): HealthStatus | undefined {
    return this.props.previousStatus;
  }

  get eventKind(): EventKind {
    return this.props.eventKind;
  }

  get requirement(): Money {
    return this.props.requirement;
  }

  get limits(): MarginLimits {
    return this.props.limits;
  }

  get collateralValue(): Money {
    return this.props.limits.collateralValue;
  }

  get utilizationBasisPoints(): number {
    return this._utilizationBasisPoints;
  }

  get headroomToLiquidation(): Money {
    return this._headroomToLiquidation;
  }

  public toDTO(): CollateralHealthDTO {
    return {
      status: this.props.status,
      previousStatus: this.props.previousStatus ?? null,
      eventKind: this.props.eventKind,
      requirement: this.props.requirement.toString(),
      collateralValue: this.collateralValue.toString(),
      limits: {
        initial: this.props.limits.initial.toString(),
        maintenance: this.props.limits.maintenance.toString(),
        liquidation: this.props.limits.liquidation.toString(),
      },
      utilizationBasisPoints: this._utilizationBasisPoints,
      headroomToLiquidation: this._headroomToLiquidation.toString(),
    };
  }

  public static create(props: CollateralHealthProps): Result<CollateralHealth> {
    const guard = Guard.againstNullOrUndefinedBulk([
      { argument: props?.status, argumentName: 'status' },
      { argument: props?.eventKind, argumentName: 'eventKind' },
      { argument: props?.requirement, argumentName: 'requirement' },
      { argument: props?.limits, argumentName: 'limits' },
    ]);
    if (guard.isFailure) {
      return Result.fail<CollateralHealth>(guard.getErrorValue() as string);
    }

    if (!props.requirement.currency.equals(props.limits.collateralValue.currency)) {
      return Result.fail<CollateralHealth>(
        'Requirement currency must match the collateral value currency',
      );
    }

    return Result.ok<CollateralHealth>(new CollateralHealth(props));
  }
}
