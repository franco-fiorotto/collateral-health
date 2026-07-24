import { Currency } from './Currency';
import { EventKind } from './CollateralHealthEvent';
import { HealthStatus } from './HealthStatus';
import { Ltv } from './Ltv';
import { LtvSchedule } from './LtvSchedule';
import { MarginLimits } from './MarginLimits';
import { Money } from './Money';
import { StatusPolicy } from './StatusPolicy';

const USDC = Currency.USDC();
const usdc = (major: number) => Money.fromMajor(USDC, major).getValue();
const ltv = (bp: number) => Ltv.fromBasisPoints(bp).getValue();

// Worked-example limits: collateral value 60 000 USDC, LTVs 50/65/80% → 30k/39k/48k.
const workedSchedule = LtvSchedule.create(ltv(5000), ltv(6500), ltv(8000)).getValue();
const workedLimits = MarginLimits.from(usdc(60_000), workedSchedule);
// I = 30 000, M = 39 000, L = 48 000

describe('StatusPolicy.baseStatus', () => {
  it.each([
    ['deep below initial → Good Standing', usdc(10_000), HealthStatus.GoodStanding],
    ['just below initial (29 999) → Good Standing', usdc(29_999), HealthStatus.GoodStanding],
    ['exactly at initial (30 000) → Near Margin (≥)', usdc(30_000), HealthStatus.NearMargin],
    ['inside [I,M) → Near Margin', usdc(35_000), HealthStatus.NearMargin],
    ['just below maintenance (38 999) → Near Margin', usdc(38_999), HealthStatus.NearMargin],
    ['exactly at maintenance (39 000) → Maintenance', usdc(39_000), HealthStatus.MaintenanceMarginCall],
    ['inside [M,L) → Maintenance', usdc(42_000), HealthStatus.MaintenanceMarginCall],
    ['just below liquidation (47 999) → Maintenance', usdc(47_999), HealthStatus.MaintenanceMarginCall],
    ['exactly at liquidation (48 000) → Liquidation', usdc(48_000), HealthStatus.Liquidation],
    ['above liquidation → Liquidation', usdc(60_000), HealthStatus.Liquidation],
  ])('%s', (_label, requirement, expected) => {
    expect(StatusPolicy.baseStatus(requirement, workedLimits)).toBe(expected);
  });

  it('never yields Initial Margin Call (IMC is link-time only)', () => {
    for (const req of [10_000, 30_000, 39_000, 48_000, 60_000]) {
      expect(StatusPolicy.baseStatus(usdc(req), workedLimits)).not.toBe(HealthStatus.InitialMarginCall);
    }
  });

  it('applies precedence when limits are equal (most-severe wins)', () => {
    // I = M = L = 30 000. A requirement of exactly 30 000 must be Liquidation, not a lesser band.
    const equalSchedule = LtvSchedule.create(ltv(5000), ltv(5000), ltv(5000)).getValue();
    const equalLimits = MarginLimits.from(usdc(60_000), equalSchedule);
    expect(StatusPolicy.baseStatus(usdc(30_000), equalLimits)).toBe(HealthStatus.Liquidation);
    expect(StatusPolicy.baseStatus(usdc(29_999), equalLimits)).toBe(HealthStatus.GoodStanding);
  });
});

describe('StatusPolicy.next — Link events (rule 5)', () => {
  it('link with requirement ≥ Initial → Initial Margin Call', () => {
    expect(StatusPolicy.next(undefined, EventKind.Link, usdc(42_000), workedLimits)).toBe(
      HealthStatus.InitialMarginCall,
    );
  });

  it('link at exactly Initial (boundary) → Initial Margin Call', () => {
    expect(StatusPolicy.next(undefined, EventKind.Link, usdc(30_000), workedLimits)).toBe(
      HealthStatus.InitialMarginCall,
    );
  });

  it('link with requirement < Initial → Good Standing', () => {
    expect(StatusPolicy.next(undefined, EventKind.Link, usdc(29_999), workedLimits)).toBe(
      HealthStatus.GoodStanding,
    );
  });

  it('link produces IMC even when a higher limit is crossed (regardless of band)', () => {
    // requirement above Liquidation, but a link only ever yields Good Standing or IMC.
    expect(StatusPolicy.next(HealthStatus.GoodStanding, EventKind.Link, usdc(60_000), workedLimits)).toBe(
      HealthStatus.InitialMarginCall,
    );
  });

  it('link must NOT override a preexisting Maintenance Margin Call', () => {
    expect(
      StatusPolicy.next(HealthStatus.MaintenanceMarginCall, EventKind.Link, usdc(60_000), workedLimits),
    ).toBe(HealthStatus.MaintenanceMarginCall);
  });

  it('link must NOT override a preexisting Liquidation', () => {
    expect(StatusPolicy.next(HealthStatus.Liquidation, EventKind.Link, usdc(60_000), workedLimits)).toBe(
      HealthStatus.Liquidation,
    );
  });
});

describe('StatusPolicy.next — ordinary recompute', () => {
  it('from Good Standing follows the base classification', () => {
    expect(StatusPolicy.next(HealthStatus.GoodStanding, EventKind.Recompute, usdc(35_000), workedLimits)).toBe(
      HealthStatus.NearMargin,
    );
  });

  it('from Good Standing can jump straight to Liquidation (Q3)', () => {
    expect(StatusPolicy.next(HealthStatus.GoodStanding, EventKind.Recompute, usdc(50_000), workedLimits)).toBe(
      HealthStatus.Liquidation,
    );
  });

  it('from Near Margin follows the base classification', () => {
    expect(StatusPolicy.next(HealthStatus.NearMargin, EventKind.Recompute, usdc(45_000), workedLimits)).toBe(
      HealthStatus.MaintenanceMarginCall,
    );
  });

  it('with no previous status follows the base classification', () => {
    expect(StatusPolicy.next(undefined, EventKind.Recompute, usdc(42_000), workedLimits)).toBe(
      HealthStatus.MaintenanceMarginCall,
    );
  });

  describe('Initial Margin Call is an open call (rule 6 + Q1)', () => {
    it('cannot be promoted to Maintenance even when requirement is in [M,L)', () => {
      expect(
        StatusPolicy.next(HealthStatus.InitialMarginCall, EventKind.Recompute, usdc(42_000), workedLimits),
      ).toBe(HealthStatus.InitialMarginCall);
    });

    it('cannot be promoted to Liquidation even when requirement ≥ L', () => {
      expect(
        StatusPolicy.next(HealthStatus.InitialMarginCall, EventKind.Recompute, usdc(60_000), workedLimits),
      ).toBe(HealthStatus.InitialMarginCall);
    });

    it('stays IMC when requirement falls back into [I,M) (Q1: no demote to Near Margin)', () => {
      expect(
        StatusPolicy.next(HealthStatus.InitialMarginCall, EventKind.Recompute, usdc(35_000), workedLimits),
      ).toBe(HealthStatus.InitialMarginCall);
    });

    it('cures to Good Standing only when requirement < Initial', () => {
      expect(
        StatusPolicy.next(HealthStatus.InitialMarginCall, EventKind.Recompute, usdc(29_999), workedLimits),
      ).toBe(HealthStatus.GoodStanding);
    });

    it('holds at exactly Initial (boundary)', () => {
      expect(
        StatusPolicy.next(HealthStatus.InitialMarginCall, EventKind.Recompute, usdc(30_000), workedLimits),
      ).toBe(HealthStatus.InitialMarginCall);
    });
  });

  describe('Maintenance Margin Call (rules 7 & 8)', () => {
    it('can be promoted to Liquidation when requirement ≥ L (rule 8)', () => {
      expect(
        StatusPolicy.next(HealthStatus.MaintenanceMarginCall, EventKind.Recompute, usdc(48_000), workedLimits),
      ).toBe(HealthStatus.Liquidation);
    });

    it('holds while requirement is in [I,L)', () => {
      expect(
        StatusPolicy.next(HealthStatus.MaintenanceMarginCall, EventKind.Recompute, usdc(35_000), workedLimits),
      ).toBe(HealthStatus.MaintenanceMarginCall);
    });

    it('does not return to Good Standing until requirement < Initial (rule 7)', () => {
      expect(
        StatusPolicy.next(HealthStatus.MaintenanceMarginCall, EventKind.Recompute, usdc(30_000), workedLimits),
      ).toBe(HealthStatus.MaintenanceMarginCall);
      expect(
        StatusPolicy.next(HealthStatus.MaintenanceMarginCall, EventKind.Recompute, usdc(29_999), workedLimits),
      ).toBe(HealthStatus.GoodStanding);
    });
  });

  describe('Liquidation (rule 7 + Q2)', () => {
    it('is sticky — does not step down to Maintenance when requirement drops into [I,L) (Q2)', () => {
      expect(
        StatusPolicy.next(HealthStatus.Liquidation, EventKind.Recompute, usdc(42_000), workedLimits),
      ).toBe(HealthStatus.Liquidation);
    });

    it('cures to Good Standing only when requirement < Initial (rule 7)', () => {
      expect(
        StatusPolicy.next(HealthStatus.Liquidation, EventKind.Recompute, usdc(29_999), workedLimits),
      ).toBe(HealthStatus.GoodStanding);
      expect(
        StatusPolicy.next(HealthStatus.Liquidation, EventKind.Recompute, usdc(30_000), workedLimits),
      ).toBe(HealthStatus.Liquidation);
    });
  });
});

describe('StatusPolicy — worked example (requirement 42 000)', () => {
  it('an ordinary recompute yields Maintenance Margin Call', () => {
    expect(StatusPolicy.next(HealthStatus.GoodStanding, EventKind.Recompute, usdc(42_000), workedLimits)).toBe(
      HealthStatus.MaintenanceMarginCall,
    );
  });

  it('a link yields Initial Margin Call', () => {
    expect(StatusPolicy.next(undefined, EventKind.Link, usdc(42_000), workedLimits)).toBe(
      HealthStatus.InitialMarginCall,
    );
  });
});
