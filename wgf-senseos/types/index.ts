// =============================================
// WGF SenseOS — Shared TypeScript Types
// =============================================

// ---- Auth & Users ----

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
  photoURL?: string;
}

// ---- Organizations ----

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

// ---- Sites ----

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

// ---- Zones ----

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
  x: number;       // percentage 0-100 of site width
  y: number;       // percentage 0-100 of site height
  width: number;   // percentage
  height: number;  // percentage
  maxOccupancy?: number;
  isRestricted: boolean;
  color?: string;
  createdAt: number;
}

// ---- Sensors ----

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
  x: number;       // percentage position on map
  y: number;
  macAddress?: string;
  firmwareVersion?: string;
  lastHeartbeatAt?: number;
  createdAt: number;
  updatedAt: number;
  isSimulated: boolean;
}

// ---- CSI / Sensor Streams ----

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
}

// ---- Detections ----

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
  locationX?: number;     // 0-100 % of site
  locationY?: number;
  confidenceScore: number; // 0-1
  privacyHash?: string;   // ZKP hash — no raw biometrics
  isSimulated: boolean;
  metadata?: Record<string, unknown>;
}

// ---- Alerts ----

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

// ---- Consent Profiles ----

export interface ConsentProfile {
  id: string;
  organizationId: string;
  subjectUserId?: string;
  label: string;          // e.g. "Morador A" or "Funcionário X"
  privacyHash: string;    // irreversible hash
  isActive: boolean;
  consentGivenAt: number;
  consentExpiresAt?: number;
  createdBy: string;
}

// ---- Simulation ----

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

// ---- Audit Log ----

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

// ---- Billing ----

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

// ---- Feature Flags ----

export interface FeatureFlag {
  id: string;
  organizationId: string;
  flag: string;
  enabled: boolean;
  updatedAt: number;
}

// ---- Dashboard ----

export interface DashboardStats {
  totalPeople: number;
  sensorsOnline: number;
  sensorsOffline: number;
  activeAlerts: number;
  occupancyByZone: { zoneId: string; zoneName: string; count: number; max?: number }[];
  recentEvents: Detection[];
  simulationRunning: boolean;
}
