import { Currency } from '@/contexts/collateral/domain/Currency';
import { Money } from '@/contexts/collateral/domain/Money';
import { MockPriceProvider } from './MockPriceProvider';

const BTC = Currency.BTC();
const USDC = Currency.USDC();

describe('MockPriceProvider', () => {
  it('returns a configured quote', async () => {
    const provider = MockPriceProvider.withQuotes({ 'BTC/USDC': 30_000 });

    const price = await provider.getPrice(BTC, USDC);

    expect(price).not.toBeNull();
    const value = price!.valueOf(Money.fromMajor(BTC, '2').getValue());
    expect(value.equals(Money.fromMajor(USDC, 60_000).getValue())).toBe(true);
  });

  it('returns null for an unconfigured pair', async () => {
    const provider = MockPriceProvider.withQuotes({ 'BTC/USDC': 30_000 });

    expect(await provider.getPrice(USDC, BTC)).toBeNull();
  });
});
