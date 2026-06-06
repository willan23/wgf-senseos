// =============================================
// UWSC Core TypeScript Types
// =============================================

export type UserRole = 'owner' | 'admin' | 'analyst' | 'viewer';
export type OperatingMode = 'residential' | 'corporate';
export type PlanType = 'free_demo' | 'residential' | 'business' | 'enterprise';

export interface SenseUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  organizationId: string;
  createdAt: number;
  updatedAt: number;
  isSuperAdmin?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  plan: PlanType;
  mode: OperatingMode;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  maxSensors: number;
  maxSites: number;
  monthlyEventsProcessed: number;
  isSimulationMode: boolean;
  timezone: string;
  country: string;
}

export interface Site {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  address?: string;
  floorPlanUrl?: string;
  widthMeters: number;
  heightMeters: number;
  createdAt: number;
  updatedAt: number;
}

export type ZoneType =
  | 'room'
  | 'corridor'
  | 'entrance'
  | 'office'
  | 'store_floor'
  | 'meeting_room'
  | 'bedroom'
  | 'restricted';

export interface Zone {
  id: string;
  siteId: string;
  organizationId: string;
  name: string;
  type: ZoneType;
  x: number;
  y: number;
  width: number;
  height: number;
  maxOccupancy?: number;
  isRestricted: boolean;
  color?: string;
  createdAt: number;
}

export type SensorStatus = 'online' | 'offline' | 'warning' | 'simulated';
export type SensorType = 'wifi_csi' | 'simulated';

export interface Sensor {
  id: string;
  siteId: string;
  zoneId?: string;
  organizationId: string;
  name: string;
  type: SensorType;
  status: SensorStatus;
  x: number;
  y: number;
  macAddress?: string;
  firmwareVersion?: string;
  lastHeartbeatAt?: number;
  createdAt: number;
  updatedAt: number;
  isSimulated: boolean;
}

export interface CsiFrame {
  sensorId: string;
  siteId: string;
  organizationId: string;
  timestamp: number;
  amplitude: number[];     // per subcarrier
  phase: number[];         // per subcarrier
  subcarrierCount: number;
  noiseFloor: number;
  rssi: number;
  isSimulated: boolean;
  scenarioTag?: string;
  antennaIndex?: number;
  firmwareVersion?: string;
}

export type DetectionType =
  | 'presence'
  | 'movement'
  | 'fall'
  | 'breathing'
  | 'known_person'
  | 'unknown_person'
  | 'intrusion';

export interface Detection {
  id: string;
  organizationId: string;
  siteId: string;
  zoneId?: string;
  sensorId: string;
  type: DetectionType;
  timestamp: number;
  personCount: number;
  locationX?: number;
  locationY?: number;
  confidenceScore: number;
  privacyHash?: string;
  isSimulated: boolean;
  metadata?: Record<string, unknown>;
}

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';
export type AlertType =
  | 'unknown_presence'
  | 'fall_detected'
  | 'sensor_offline'
  | 'occupancy_exceeded'
  | 'restricted_zone'
  | 'signal_anomaly'
  | 'rf_spoofing_attempt';

export interface Alert {
  id: string;
  organizationId: string;
  siteId: string;
  zoneId?: string;
  sensorId?: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  timestamp: number;
  acknowledgedAt?: number;
  resolvedAt?: number;
  assignedTo?: string;
  isSimulated: boolean;
}

export interface ConsentProfile {
  id: string;
  organizationId: string;
  subjectUserId?: string;
  label: string;
  privacyHash: string;
  isActive: boolean;
  consentGivenAt: number;
  consentExpiresAt?: number;
  createdBy: string;
}

export type SimulationScenario =
  | 'empty_house'
  | 'one_person_enters'
  | 'two_people_walking'
  | 'person_breathing'
  | 'fall_event'
  | 'unknown_intruder'
  | 'store_customer_flow';

export interface SimulationRun {
  id: string;
  organizationId: string;
  siteId: string;
  scenario: SimulationScenario;
  status: 'running' | 'stopped' | 'completed';
  startedAt: number;
  stoppedAt?: number;
  framesGenerated: number;
  startedBy: string;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: number;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export interface BillingPlan {
  id: PlanType;
  name: string;
  description: string;
  priceMonthly: number;
  maxSensors: number;
  maxSites: number;
  maxEventsPerMonth: number;
  features: string[];
}

export interface FeatureFlag {
  id: string;
  organizationId: string;
  flag: string;
  enabled: boolean;
  updatedAt: number;
}

export interface DashboardStats {
  totalPeople: number;
  sensorsOnline: number;
  sensorsOffline: number;
  activeAlerts: number;
  occupancyByZone: { zoneId: string; zoneName: string; count: number; max?: number }[];
  recentEvents: Detection[];
  simulationRunning: boolean;
}
