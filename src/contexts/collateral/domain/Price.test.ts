import { Currency } from './Currency';
import { Money } from './Money';
import { Price } from './Price';

const BTC = Currency.BTC();
const USDC = Currency.USDC();

describe('Price', () => {
  it('carries a base and a quote currency', () => {
    const price = Price.fromMajor(BTC, USDC, 30_000).getValue();
    expect(price.base.equals(BTC)).toBe(true);
    expect(price.quote.equals(USDC)).toBe(true);
  });

  it('rejects a unit price whose currency is not the quote currency', () => {
    const wrong = Money.fromMajor(BTC, 30_000).getValue();
    const result = Price.create(BTC, USDC, wrong);
    expect(result.isFailure).toBe(true);
  });

  describe('valueOf', () => {
    it('values a balance in the quote currency — worked example: 2 BTC × 30 000 = 60 000 USDC exact', () => {
      const price = Price.fromMajor(BTC, USDC, 30_000).getValue();
      const balance = Money.fromMajor(BTC, '2').getValue();

      const value = price.valueOf(balance);

      expect(value.currency.equals(USDC)).toBe(true);
      expect(value.equals(Money.fromMajor(USDC, 60_000).getValue())).toBe(true);
    });

    it('values a fractional balance exactly', () => {
      const price = Price.fromMajor(BTC, USDC, 30_000).getValue();
      const balance = Money.fromMajor(BTC, '0.5').getValue();

      const value = price.valueOf(balance);

      expect(value.equals(Money.fromMajor(USDC, 15_000).getValue())).toBe(true);
    });

    it('throws when the balance is not in the base currency', () => {
      const price = Price.fromMajor(BTC, USDC, 30_000).getValue();
      const balance = Money.fromMajor(USDC, 1).getValue();

      expect(() => price.valueOf(balance)).toThrow();
    });
  });
});
