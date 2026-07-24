/**
 * A ValueObject has no identity: two value objects are equal when their attributes are
 * equal (structural equality). They are immutable — any "change" produces a new instance.
 */
export abstract class ValueObject<T> {
  protected readonly props: T;

  constructor(props: T) {
    this.props = Object.freeze({ ...props });
  }

  public equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    if (vo.props === undefined) {
      return false;
    }
    // bigint is not JSON-serializable by default (Money uses bigint minor units), so
    // stringify it explicitly.
    const replacer = (_key: string, value: unknown) =>
      typeof value === 'bigint' ? `${value}n` : value;
    return JSON.stringify(this.props, replacer) === JSON.stringify(vo.props, replacer);
  }
}
