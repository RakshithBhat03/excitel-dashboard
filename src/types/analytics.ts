import type {
  BillingMonthId,
  RawExcitelSession,
  SelectableMonth,
  SelectableMonthId,
} from '../../shared/contracts';

export interface NormalizedSession extends RawExcitelSession {
  start: Date;
  end: Date;
  minutes: number;
  gb: number;
  ip: string | null;
  cause: string;
}

export interface DailySpan {
  from: number;
  to: number;
  cause: string;
}

export interface DailySummary {
  dateKey: string;
  date: Date;
  label: string;
  shortLabel: string;
  fullLabel: string;
  weekday: number;
  usage: number;
  duration: number;
  connectedMinutes: number;
  sessionCount: number;
  spans: DailySpan[];
}

export interface Outage {
  id: string;
  from: Date;
  to: Date;
  minutes: number;
  cause: string;
}

export interface DashboardStats {
  totalGb: number;
  totalMinutes: number;
  dailyAvgGb: number;
  sessionCount: number;
  uptimePercent: number;
  downMinutes: number;
  outageCount: number;
  peakDay: DailySummary | null;
  quietDay: DailySummary | null;
  longestSession: NormalizedSession | null;
  longestRunMinutes: number;
  periodStart: Date | null;
  periodEnd: Date | null;
  spanMinutes: number;
  medianDailyGb: number;
  dayCount: number;
}

export interface WeekdayProfile {
  index: number;
  name: string;
  total: number;
  days: number;
  avg: number;
}

export interface TerminationCauseSummary {
  cause: string;
  count: number;
  share: number;
}

export interface SubnetSummary {
  subnet: string;
  count: number;
  gb: number;
}

export interface AddressPoolSummary {
  uniqueAddresses: number;
  reuseRate: number;
  subnets: SubnetSummary[];
  subnetCount: number;
  prefixes: string[];
}

export interface MonthlyHistoryEntry {
  key: string;
  label: string;
  fullLabel: string;
  monthId: BillingMonthId;
  gb: number;
  minutes: number;
  sessions: number;
}

export interface CurrentLinkState {
  up: boolean;
  label: 'Link up' | 'Awaiting sync' | 'No data';
  since: Date | null;
  staleMinutes?: number;
}

export interface AnalyticsData {
  rows: NormalizedSession[];
  days: DailySummary[];
  outages: Outage[];
  stats: DashboardStats;
  weekdays: WeekdayProfile[];
  causes: TerminationCauseSummary[];
  pool: AddressPoolSummary;
  link: CurrentLinkState;
}

export interface UseExcitelDataResult extends AnalyticsData {
  history: MonthlyHistoryEntry[];
  months: SelectableMonth[];
  selectedMonth: SelectableMonthId | null;
  selectedMonthTitle: string | null;
  loading: boolean;
  syncing: boolean;
  lastUpdated: Date | null;
  error: string | null;
  changeMonth: (monthId: SelectableMonthId) => void;
  refresh: () => Promise<void>;
}

export interface DailyAggregate {
  dateKey: string;
  label: string;
  fullLabel: string;
  usage: number;
  duration: number;
  sessionCount: number;
}

export type DailySessionInput = Pick<
  RawExcitelSession,
  'sessionStartDate' | 'sessionEndDate' | 'usageTime' | 'usageVolume'
>;
