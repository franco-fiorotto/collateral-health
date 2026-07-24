/**
 * Identity for entities. A UniqueEntityID wraps an opaque identifier; two ids are equal
 * when their underlying values are equal. Callers may supply an id (e.g. from a store) or
 * let one be generated.
 */
let counter = 0;

export class UniqueEntityID {
  private readonly value: string | number;

  constructor(id?: string | number) {
    // No crypto/random dependency: a monotonic counter is enough for in-memory identity
    // in a library with no persistence.
    this.value = id ?? `id-${++counter}`;
  }

  public equals(id?: UniqueEntityID): boolean {
    if (id === null || id === undefined) {
      return false;
    }
    return this.value === id.toValue();
  }

  public toString(): string {
    return String(this.value);
  }

  public toValue(): string | number {
    return this.value;
  }
}
