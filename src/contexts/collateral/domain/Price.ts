import { Result } from '@/shared/core/Result';
import { ValueObject } from '@/shared/domain/ValueObject';
import { Currency } from './Currency';
import { Money } from './Money';

interface PriceProps {
  base: Currency;
  quote: Currency;
  /** The price of ONE major unit of `base`, expressed as Money in the `quote` currency. */
  unitPrice: Money;
}

/**
 * A market price: how much of the `quote` currency one major unit of the `base` currency
 * is worth (e.g. 1 BTC → 30 000 USDC). `valueOf` values a collateral balance in the quote
 * currency. It is a current observation, not a fact of any event — the use case resolves
 * it on the fly through `IPriceProvider` (Q5).
 */
export class Price extends ValueObject<PriceProps> {
  private constructor(props: PriceProps) {
    super(props);
  }

  get base(): Currency {
    return this.props.base;
  }

  get quote(): Currency {
    return this.props.quote;
  }

  get unitPrice(): Money {
    return this.props.unitPrice;
  }

  /**
   * Values a balance (in the base currency) in the quote currency:
   * `value = unitPrice × (balance in major units)`. Computed in integer minor units;
   * the final division truncates toward zero when a balance is not exactly representable
   * in the quote currency's precision.
   */
  public valueOf(balance: Money): Money {
    if (!balance.currency.equals(this.props.base)) {
      throw new Error(
        `Price base currency is ${this.props.base.code} but balance is ${balance.currency.code}`,
      );
    }
    const baseScale = 10n ** BigInt(this.props.base.decimals);
    const valueMinor = (this.props.unitPrice.amount * balance.amount) / baseScale;
    return Money.create(this.props.quote, valueMinor).getValue();
  }

  public static create(base: Currency, quote: Currency, unitPrice: Money): Result<Price> {
    if (!unitPrice.currency.equals(quote)) {
      return Result.fail<Price>(
        `Unit price must be denominated in the quote currency (${quote.code})`,
      );
    }
    if (unitPrice.amount < 0n) {
      return Result.fail<Price>('Unit price cannot be negative');
    }
    return Result.ok<Price>(new Price({ base, quote, unitPrice }));
  }

  public static fromMajor(base: Currency, quote: Currency, priceMajor: number | string): Result<Price> {
    const unitPriceResult = Money.fromMajor(quote, priceMajor);
    if (unitPriceResult.isFailure) {
      return Result.fail<Price>(unitPriceResult.getErrorValue() as string);
    }
    return Price.create(base, quote, unitPriceResult.getValue());
  }
}
