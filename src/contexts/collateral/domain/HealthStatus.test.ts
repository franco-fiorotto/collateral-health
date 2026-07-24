import { HealthStatus, HealthStatusOps } from './HealthStatus';

describe('HealthStatus', () => {
  it('defines the five statuses', () => {
    expect(Object.values(HealthStatus)).toEqual([
      'GoodStanding',
      'NearMargin',
      'InitialMarginCall',
      'MaintenanceMarginCall',
      'Liquidation',
    ]);
  });

  it('orders statuses by severity (Good Standing least, Liquidation most)', () => {
    expect(HealthStatusOps.severityOf(HealthStatus.GoodStanding)).toBe(0);
    expect(HealthStatusOps.severityOf(HealthStatus.NearMargin)).toBe(1);
    expect(HealthStatusOps.severityOf(HealthStatus.InitialMarginCall)).toBe(2);
    expect(HealthStatusOps.severityOf(HealthStatus.MaintenanceMarginCall)).toBe(3);
    expect(HealthStatusOps.severityOf(HealthStatus.Liquidation)).toBe(4);
  });

  it('compares severity', () => {
    expect(
      HealthStatusOps.isMoreSevereThan(HealthStatus.Liquidation, HealthStatus.MaintenanceMarginCall),
    ).toBe(true);
    expect(
      HealthStatusOps.isMoreSevereThan(HealthStatus.GoodStanding, HealthStatus.NearMargin),
    ).toBe(false);
  });
});
