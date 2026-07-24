import { EventKind } from './CollateralHealthEvent';
import { HealthStatus } from './HealthStatus';
import { MarginLimits } from './MarginLimits';
import { Money } from './Money';

/**
 * The heart of the domain: the pure rules that decide a health status. Split into a
 * stateless base classification (which band the requirement falls in) and a stateful
 * transition (which also depends on the event kind and the previous status).
 *
 * No I/O, no dependencies, no mutation — every decision is a pure function of its inputs,
 * which is what makes the eight spec rules directly and exhaustively testable.
 */
export class StatusPolicy {
  /**
   * Classifies the requirement against the three limits, evaluated most-severe-first so
   * that when limits are equal the more severe status wins (the precedence rule). Boundary
   * semantics: `≥` a limit belongs to the more-severe side (Q4). Never yields Initial
   * Margin Call — that status is reachable only through a link (rule 5).
   */
  public static baseStatus(requirement: Money, limits: MarginLimits): HealthStatus {
    if (requirement.isGreaterThanOrEqualTo(limits.liquidation)) {
      return HealthStatus.Liquidation;
    }
    if (requirement.isGreaterThanOrEqualTo(limits.maintenance)) {
      return HealthStatus.MaintenanceMarginCall;
    }
    if (requirement.isGreaterThanOrEqualTo(limits.initial)) {
      return HealthStatus.NearMargin;
    }
    return HealthStatus.GoodStanding;
  }

  /**
   * The transition function. `previous` is undefined on the very first event (Q7).
   *
   * A link (rule 5) only ever yields Good Standing or Initial Margin Call, and never
   * overrides a preexisting Maintenance Margin Call or Liquidation. On an ordinary
   * recompute an open call (IMC / MMC / Liquidation) never demotes to a less-severe status:
   * it cures only when `requirement < Initial`, otherwise it holds or (MMC → Liquidation)
   * escalates. Good Standing and Near Margin are not calls, so they follow the base
   * classification freely.
   */
  public static next(
    previous: HealthStatus | undefined,
    kind: EventKind,
    requirement: Money,
    limits: MarginLimits,
  ): HealthStatus {
    const belowInitial = requirement.isLessThan(limits.initial);

    if (kind === EventKind.Link) {
      // A link must not override an open maintenance call or a liquidation (rule 5).
      if (previous === HealthStatus.MaintenanceMarginCall || previous === HealthStatus.Liquidation) {
        return previous;
      }
      return belowInitial ? HealthStatus.GoodStanding : HealthStatus.InitialMarginCall;
    }

    // Ordinary recompute.
    const base = StatusPolicy.baseStatus(requirement, limits);

    switch (previous) {
      case HealthStatus.InitialMarginCall:
        // Rule 6: cannot be promoted. Q1: does not demote either — cures only below Initial.
        return belowInitial ? HealthStatus.GoodStanding : HealthStatus.InitialMarginCall;

      case HealthStatus.MaintenanceMarginCall:
        // Rule 7: no return to Good Standing until below Initial. Rule 8: may escalate.
        if (belowInitial) {
          return HealthStatus.GoodStanding;
        }
        return requirement.isGreaterThanOrEqualTo(limits.liquidation)
          ? HealthStatus.Liquidation
          : HealthStatus.MaintenanceMarginCall;

      case HealthStatus.Liquidation:
        // Rule 7 + Q2: sticky — holds until below Initial, then cures straight to Good Standing.
        return belowInitial ? HealthStatus.GoodStanding : HealthStatus.Liquidation;

      case HealthStatus.GoodStanding:
      case HealthStatus.NearMargin:
      case undefined:
      default:
        // Not an open call: follow the base classification freely (may jump to any band).
        return base;
    }
  }
}
