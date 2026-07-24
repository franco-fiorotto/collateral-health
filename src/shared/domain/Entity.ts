import { UniqueEntityID } from './UniqueEntityID';

const isEntity = (v: unknown): v is Entity<unknown> => v instanceof Entity;

/**
 * An Entity has identity: two entities are equal when they share the same id, regardless
 * of their attribute values. Subclasses hold their state in `props` and expose getters.
 */
export abstract class Entity<T> {
  protected readonly _id: UniqueEntityID;
  protected readonly props: T;

  constructor(props: T, id?: UniqueEntityID) {
    this._id = id ?? new UniqueEntityID();
    this.props = props;
  }

  public equals(object?: Entity<T>): boolean {
    if (object === null || object === undefined) {
      return false;
    }
    if (this === object) {
      return true;
    }
    if (!isEntity(object)) {
      return false;
    }
    return this._id.equals(object._id);
  }
}
