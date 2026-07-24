import { Entity } from './Entity';
import { UniqueEntityID } from './UniqueEntityID';

/**
 * An AggregateRoot is the entry point to a cluster of domain objects treated as a unit for
 * data changes. It is the natural place to raise domain events; here it only marks the
 * consistency boundary (event emission is out of scope — see the README).
 */
export abstract class AggregateRoot<T> extends Entity<T> {
  get id(): UniqueEntityID {
    return this._id;
  }
}
