import { Result } from '@/shared/core/Result';
import { ValueObject } from '@/shared/domain/ValueObject';
import { Currency } from './Currency';

interface MoneyProps {
  currency: Currency;
  /** Amount in integer minor units (e.g. satoshis, micro-USDC). Never a float — Q6. */
  amount: bigint;
}

/**
 * A monetary amount held as integer minor units in a specific currency. All comparison and
 * arithmetic is currency-checked: mixing e.g. BTC and USDC throws, so a currency mismatch
 * can never silently corrupt a valuation. Rounding happens only at the presentation edge.
 */
export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  get currency(): Currency {
    return this.props.currency;
  }

  get amount(): bigint {
    return this.props.amount;
  }

  public equals(vo?: Money): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    return this.props.currency.equals(vo.currency) && this.props.amount === vo.amount;
  }

  private assertSameCurrency(other: Money): void {
    if (!this.props.currency.equals(other.currency)) {
      throw new Error(
        `Currency mismatch: cannot combine ${this.props.currency.code} with ${other.currency.code}`,
      );
    }
  }

  public isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.props.amount < other.amount;
  }

  public isGreaterThanOrEqualTo(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.props.amount >= other.amount;
  }

  public plus(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money({ currency: this.props.currency, amount: this.props.amount + other.amount });
  }

  public minus(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money({ currency: this.props.currency, amount: this.props.amount - other.amount });
  }

  public toString(): string {
    const { amount, currency } = this.props;
    const negative = amount < 0n;
    const digits = (negative ? -amount : amount).toString().padStart(currency.decimals + 1, '0');
    const whole = digits.slice(0, digits.length - currency.decimals) || '0';
    const fraction = currency.decimals > 0 ? digits.slice(digits.length - currency.decimals) : '';
    const trimmedFraction = fraction.replace(/0+$/, '');
    const major = trimmedFraction.length > 0 ? `${whole}.${trimmedFraction}` : whole;
    return `${negative ? '-' : ''}${major} ${currency.code}`;
  }

  public static create(currency: Currency, amount: bigint): Result<Money> {
    if (typeof amount !== 'bigint') {
      return Result.fail<Money>('Money amount must be a bigint (integer minor units)');
    }
    return Result.ok<Money>(new Money({ currency, amount }));
  }

  /**
   * Builds Money from a major-unit amount (e.g. `2` BTC, `30000` USDC), scaling by the
   * currency's decimals. Fails if the amount carries more precision than the currency
   * supports rather than silently rounding.
   */
  public static fromMajor(currency: Currency, major: number | string): Result<Money> {
    const raw = typeof major === 'number' ? major.toString() : major.trim();
    if (!/^-?\d+(\.\d+)?$/.test(raw)) {
      return Result.fail<Money>(`Invalid major amount: "${major}"`);
    }

    const negative = raw.startsWith('-');
    const unsigned = negative ? raw.slice(1) : raw;
    const [wholePart, fractionPart = ''] = unsigned.split('.');

    if (fractionPart.length > currency.decimals) {
      return Result.fail<Money>(
        `Amount "${major}" has more precision than ${currency.code} allows (${currency.decimals} dp)`,
      );
    }

    const paddedFraction = fractionPart.padEnd(currency.decimals, '0');
    const minorUnits = BigInt(`${wholePart}${paddedFraction}`);
    return Result.ok<Money>(
      new Money({ currency, amount: negative ? -minorUnits : minorUnits }),
    );
  }
}
