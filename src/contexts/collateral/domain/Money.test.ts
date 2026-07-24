import { Currency } from './Currency';
import { Money } from './Money';

const USDC = Currency.USDC();
const BTC = Currency.BTC();

describe('Money', () => {
  describe('construction', () => {
    it('creates money from integer minor units', () => {
      const money = Money.create(USDC, 60_000_000_000n).getValue();
      expect(money.amount).toBe(60_000_000_000n);
      expect(money.currency.equals(USDC)).toBe(true);
    });

    it('creates money from a major-unit number, scaling by the currency decimals', () => {
      // 30 000 USDC with 6 decimals → 30 000 * 10^6 minor units
      const money = Money.fromMajor(USDC, 30_000).getValue();
      expect(money.amount).toBe(30_000_000_000n);
    });

    it('creates money from a fractional major-unit string without float error', () => {
      const money = Money.fromMajor(BTC, '2').getValue();
      expect(money.amount).toBe(200_000_000n); // 2 BTC in satoshis

      const half = Money.fromMajor(BTC, '0.5').getValue();
      expect(half.amount).toBe(50_000_000n);
    });

    it('rejects a major amount with more precision than the currency allows', () => {
      const result = Money.fromMajor(USDC, '1.1234567'); // 7 dp > 6
      expect(result.isFailure).toBe(true);
    });
  });

  describe('currency safety', () => {
    it('treats money of different currencies as unequal', () => {
      const a = Money.fromMajor(USDC, 1).getValue();
      const b = Money.fromMajor(BTC, 1).getValue();
      expect(a.equals(b)).toBe(false);
    });

    it('throws when comparing across currencies', () => {
      const usdc = Money.fromMajor(USDC, 1).getValue();
      const btc = Money.fromMajor(BTC, 1).getValue();
      expect(() => usdc.isGreaterThanOrEqualTo(btc)).toThrow();
    });

    it('throws when adding across currencies', () => {
      const usdc = Money.fromMajor(USDC, 1).getValue();
      const btc = Money.fromMajor(BTC, 1).getValue();
      expect(() => usdc.plus(btc)).toThrow();
    });
  });

  describe('comparison and arithmetic (same currency)', () => {
    const a = Money.fromMajor(USDC, 100).getValue();
    const b = Money.fromMajor(USDC, 250).getValue();

    it('compares with < and >=', () => {
      expect(a.isLessThan(b)).toBe(true);
      expect(b.isGreaterThanOrEqualTo(a)).toBe(true);
      expect(a.isGreaterThanOrEqualTo(a)).toBe(true); // boundary: equal is >=
    });

    it('adds and subtracts', () => {
      expect(a.plus(b).amount).toBe(Money.fromMajor(USDC, 350).getValue().amount);
      expect(b.minus(a).amount).toBe(Money.fromMajor(USDC, 150).getValue().amount);
    });

    it('renders a human-readable major-unit string', () => {
      expect(Money.fromMajor(USDC, 60_000).getValue().toString()).toBe('60000 USDC');
    });
  });
});
