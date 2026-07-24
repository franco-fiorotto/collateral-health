import { Currency } from './Currency';
import { Ltv } from './Ltv';
import { Money } from './Money';

const USDC = Currency.USDC();

describe('Ltv', () => {
  it('is expressed in basis points (50% = 5000 bp)', () => {
    const ltv = Ltv.fromBasisPoints(5000).getValue();
    expect(ltv.basisPoints).toBe(5000);
  });

  it('builds from a percentage', () => {
    expect(Ltv.fromPercent(65).getValue().basisPoints).toBe(6500);
  });

  it('rejects negative basis points', () => {
    expect(Ltv.fromBasisPoints(-1).isFailure).toBe(true);
  });

  describe('limitOf', () => {
    it('applies the ratio to a monetary value', () => {
      // 50% of 60 000 USDC = 30 000 USDC
      const value = Money.fromMajor(USDC, 60_000).getValue();
      const limit = Ltv.fromBasisPoints(5000).getValue().limitOf(value);
      expect(limit.equals(Money.fromMajor(USDC, 30_000).getValue())).toBe(true);
    });

    it('applies 65% (worth 39 000 of 60 000)', () => {
      const value = Money.fromMajor(USDC, 60_000).getValue();
      const limit = Ltv.fromBasisPoints(6500).getValue().limitOf(value);
      expect(limit.equals(Money.fromMajor(USDC, 39_000).getValue())).toBe(true);
    });
  });

  it('compares two ratios', () => {
    const a = Ltv.fromBasisPoints(5000).getValue();
    const b = Ltv.fromBasisPoints(6500).getValue();
    expect(a.isLessThanOrEqualTo(b)).toBe(true);
    expect(b.isLessThanOrEqualTo(a)).toBe(false);
    expect(a.isLessThanOrEqualTo(a)).toBe(true);
  });
});
