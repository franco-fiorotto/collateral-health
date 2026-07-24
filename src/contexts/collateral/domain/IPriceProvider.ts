import { Currency } from './Currency';
import { Price } from './Price';

/**
 * Port for resolving a current market price. The domain depends on this interface only;
 * concrete adapters (a mock, a live market-data feed) live in infra and are injected into
 * the use case, which resolves the price on the fly at compute time (Q5). Returns `null`
 * when no price is available for the pair — the use case turns that into a typed error.
 */
export interface IPriceProvider {
  getPrice(base: Currency, quote: Currency): Promise<Price | null>;
}
