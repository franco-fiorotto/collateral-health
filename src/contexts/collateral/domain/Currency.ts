import { Result } from '@/shared/core/Result';
import { ValueObject } from '@/shared/domain/ValueObject';

interface CurrencyProps {
  code: string;
  decimals: number;
}

/**
 * A currency: an ISO-like code plus the number of decimal places its minor unit uses
 * (BTC → 8 satoshis-per, USDC → 6). `decimals` is what lets `Money` store amounts as
 * integer minor units (Q6: no floats).
 */
export class Currency extends ValueObject<CurrencyProps> {
  private constructor(props: CurrencyProps) {
    super(props);
  }

  get code(): string {
    return this.props.code;
  }

  get decimals(): number {
    return this.props.decimals;
  }

  public equals(vo?: Currency): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    return this.props.code === vo.code && this.props.decimals === vo.decimals;
  }

  public static create(code: string, decimals: number): Result<Currency> {
    if (typeof code !== 'string' || code.trim().length === 0) {
      return Result.fail<Currency>('Currency code must be a non-empty string');
    }
    if (!Number.isInteger(decimals) || decimals < 0) {
      return Result.fail<Currency>('Currency decimals must be a non-negative integer');
    }
    return Result.ok<Currency>(new Currency({ code: code.trim().toUpperCase(), decimals }));
  }

  /**
   * Known currencies and their minor-unit precision. The domain owns this knowledge so a
   * consumer only ever passes a currency code — decimals are never supplied from outside.
   */
  private static readonly REGISTRY: Record<string, number> = {
    BTC: 8,
    USDC: 6,
  };

  /** Resolves a known currency by code, failing for unregistered codes. */
  public static fromCode(code: string): Result<Currency> {
    if (typeof code !== 'string' || code.trim().length === 0) {
      return Result.fail<Currency>('Currency code must be a non-empty string');
    }
    const normalized = code.trim().toUpperCase();
    const decimals = Currency.REGISTRY[normalized];
    if (decimals === undefined) {
      return Result.fail<Currency>(`Unknown currency code: "${code}"`);
    }
    return Currency.create(normalized, decimals);
  }

  /** Convenience constructors for the two assets used across the domain and tests. */
  public static BTC(): Currency {
    return Currency.fromCode('BTC').getValue();
  }

  public static USDC(): Currency {
    return Currency.fromCode('USDC').getValue();
  }
}
