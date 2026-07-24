import { Result } from './Result';

describe('Result', () => {
  it('creates a success carrying a value', () => {
    const result = Result.ok<number>(42);

    expect(result.isSuccess).toBe(true);
    expect(result.isFailure).toBe(false);
    expect(result.getValue()).toBe(42);
  });

  it('creates a success with no value', () => {
    const result = Result.ok();

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toBeNull();
  });

  it('creates a failure carrying an error', () => {
    const result = Result.fail<number>('boom');

    expect(result.isFailure).toBe(true);
    expect(result.isSuccess).toBe(false);
    expect(result.getErrorValue()).toBe('boom');
  });

  it('throws when reading the value of a failure', () => {
    const result = Result.fail<number>('boom');

    expect(() => result.getValue()).toThrow();
  });

  it('rejects an inconsistent construction (success + error)', () => {
    // exercising the constructor invariant via a cast past the protected modifier
    expect(() => new (Result as any)(true, 'oops')).toThrow();
  });

  describe('combine', () => {
    it('returns ok when every result succeeds', () => {
      const combined = Result.combine([Result.ok(1), Result.ok(2), Result.ok(3)]);

      expect(combined.isSuccess).toBe(true);
    });

    it('returns the first failure it encounters', () => {
      const combined = Result.combine([Result.ok(1), Result.fail('bad'), Result.fail('worse')]);

      expect(combined.isFailure).toBe(true);
      expect(combined.getErrorValue()).toBe('bad');
    });
  });
});
