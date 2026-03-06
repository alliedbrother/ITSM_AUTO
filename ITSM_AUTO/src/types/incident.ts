export interface Incident {
  id: string;
  number: string;
  shortDescription: string;
  description: string;
  category: IncidentCategory;
  subcategory: string;
  priority: Priority;
  urgency: Urgency;
  impact: Impact;
  state: IncidentState;
  assignmentGroup: string;
  assignee?: string | undefined;
  caller: User;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date | undefined;
  slaDeadline: Date;

  // Our additions for automation
  classificationConfidence: number;
  automationTags: string[];
  agentActions: AgentAction[];
}

export enum IncidentCategory {
  HARDWARE = 'hardware',
  SOFTWARE = 'software',
  NETWORK = 'network',
  ACCESS = 'access',
  PASSWORD = 'password',
  DATA = 'data',
  OTHER = 'other',
}

export enum Priority {
  CRITICAL = 'critical', // P1
  HIGH = 'high', // P2
  MEDIUM = 'medium', // P3
  LOW = 'low', // P4
}

export enum Urgency {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum Impact {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum IncidentState {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  department: string;
  title: string;
  location: string;
}

export interface AgentAction {
  id: string;
  incidentId: string;
  agentId: string;
  agentName: string;
  actionType: AgentActionType;
  input: any;
  output: any;
  confidence: number;
  timestamp: Date;
  duration: number; // milliseconds
  success: boolean;
  errorMessage?: string;
}

export enum AgentActionType {
  CLASSIFY = 'classify',
  ROUTE = 'route',
  RESPOND = 'respond',
  ESCALATE = 'escalate',
  UPDATE = 'update',
}

export interface ClassificationResult {
  category: IncidentCategory;
  subcategory: string;
  priority: Priority;
  urgency: Urgency;
  impact: Impact;
  assignmentGroup: string;
  confidence: number;
  reasoning: string;
  suggestedActions: string[];
}

export interface ClassificationInput {
  shortDescription: string;
  description: string;
  caller: User;
  affectedServices?: string[];
  businessImpact?: string;
}

export interface AssignmentGroup {
  id: string;
  name: string;
  description: string;
  type: string;
}