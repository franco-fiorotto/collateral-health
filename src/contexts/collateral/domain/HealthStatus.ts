/**
 * The five health statuses of a Collateral Arrangement, declared least-severe first. The
 * declaration order IS the severity order, which the base classification relies on when it
 * evaluates thresholds most-severe-first (the "precedence with equal LTVs" rule).
 */
export enum HealthStatus {
  GoodStanding = 'GoodStanding',
  NearMargin = 'NearMargin',
  InitialMarginCall = 'InitialMarginCall',
  MaintenanceMarginCall = 'MaintenanceMarginCall',
  Liquidation = 'Liquidation',
}

const SEVERITY: Record<HealthStatus, number> = {
  [HealthStatus.GoodStanding]: 0,
  [HealthStatus.NearMargin]: 1,
  [HealthStatus.InitialMarginCall]: 2,
  [HealthStatus.MaintenanceMarginCall]: 3,
  [HealthStatus.Liquidation]: 4,
};

export const HealthStatusOps = {
  severityOf(status: HealthStatus): number {
    return SEVERITY[status];
  },
  isMoreSevereThan(a: HealthStatus, b: HealthStatus): boolean {
    return SEVERITY[a] > SEVERITY[b];
  },
} as const;
