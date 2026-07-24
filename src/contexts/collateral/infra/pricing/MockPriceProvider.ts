import { Currency } from '@/contexts/collateral/domain/Currency';
import { IPriceProvider } from '@/contexts/collateral/domain/IPriceProvider';
import { Price } from '@/contexts/collateral/domain/Price';

/**
 * An in-memory `IPriceProvider` adapter for tests and local runs. Configured with a map of
 * `BASE/QUOTE → unit price` quotes; returns `null` for any unconfigured pair. A live
 * market-data client would be a drop-in implementation of the same port.
 */
export class MockPriceProvider implements IPriceProvider {
  private readonly quotes: Map<string, Price>;

  private constructor(quotes: Map<string, Price>) {
    this.quotes = quotes;
  }

  private static key(base: Currency, quote: Currency): string {
    return `${base.code}/${quote.code}`;
  }

  public async getPrice(base: Currency, quote: Currency): Promise<Price | null> {
    return this.quotes.get(MockPriceProvider.key(base, quote)) ?? null;
  }

  /**
   * Builds a provider from major-unit quotes, e.g. `{ 'BTC/USDC': 30_000 }`.
   * Throws on an unknown currency code or an incoherent quote — a misconfigured test
   * fixture is a programming error, not a runtime condition to handle.
   */
  public static withQuotes(quotes: Record<string, number | string>): MockPriceProvider {
    const map = new Map<string, Price>();
    for (const [pair, priceMajor] of Object.entries(quotes)) {
      const [baseCode, quoteCode] = pair.split('/');
      const base = Currency.fromCode(baseCode).getValue();
      const quote = Currency.fromCode(quoteCode).getValue();
      map.set(`${base.code}/${quote.code}`, Price.fromMajor(base, quote, priceMajor).getValue());
    }
    return new MockPriceProvider(map);
  }
}
