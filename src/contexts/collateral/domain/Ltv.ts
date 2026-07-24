import { Result } from '@/shared/core/Result';
import { ValueObject } from '@/shared/domain/ValueObject';
import { Money } from './Money';

interface LtvProps {
  basisPoints: number;
}

const BASIS_POINTS_DENOMINATOR = 10_000n;

/**
 * A loan-to-value ratio held in basis points (1% = 100 bp, so 50% = 5000 bp). Basis points
 * keep the ratio an integer, so `limitOf` stays exact bigint arithmetic (no floats — Q6).
 */
export class Ltv extends ValueObject<LtvProps> {
  private constructor(props: LtvProps) {
    super(props);
  }

  get basisPoints(): number {
    return this.props.basisPoints;
  }

  public isLessThanOrEqualTo(other: Ltv): boolean {
    return this.props.basisPoints <= other.basisPoints;
  }

  public equals(vo?: Ltv): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    return this.props.basisPoints === vo.basisPoints;
  }

  /** The monetary limit this ratio implies for a collateral value: `value × LTV`. */
  public limitOf(value: Money): Money {
    const limitMinor = (value.amount * BigInt(this.props.basisPoints)) / BASIS_POINTS_DENOMINATOR;
    return Money.create(value.currency, limitMinor).getValue();
  }

  public static fromBasisPoints(basisPoints: number): Result<Ltv> {
    if (!Number.isInteger(basisPoints) || basisPoints < 0) {
      return Result.fail<Ltv>('LTV basis points must be a non-negative integer');
    }
    return Result.ok<Ltv>(new Ltv({ basisPoints }));
  }

  public static fromPercent(percent: number): Result<Ltv> {
    const basisPoints = Math.round(percent * 100);
    return Ltv.fromBasisPoints(basisPoints);
  }
}
