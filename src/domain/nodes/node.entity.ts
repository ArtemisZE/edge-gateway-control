export interface IProxyNode {
  id: string;
  ip: string;
  port: number;
  protocol: 'http' | 'https';
  status: 'active' | 'degraded' | 'dead';
  latency: number;
  lastChecked: number;
  country?: string;
}
