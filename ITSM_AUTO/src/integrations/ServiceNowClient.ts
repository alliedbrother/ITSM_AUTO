import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Incident, IncidentCategory, Priority, Urgency, Impact, IncidentState, User, AssignmentGroup } from '../types/incident';

export interface ServiceNowConfig {
  instanceUrl: string;
  username?: string | undefined;
  password?: string | undefined;
  clientId?: string | undefined;
  clientSecret?: string | undefined;
  apiVersion?: string | undefined;
}

export interface ServiceNowIncidentResponse {
  number: string;
  short_description: string;
  description: string;
  category?: string;
  subcategory?: string;
  priority?: string;
  urgency?: string;
  impact?: string;
  state?: string;
  assignment_group?: string;
  assigned_to?: string;
  caller_id?: string;
  sys_created_on: string;
  sys_updated_on: string;
  business_service?: string;
  work_notes?: string;
  close_notes?: string;
  resolved_at?: string;
  sys_id: string;
}

export interface ServiceNowUserResponse {
  sys_id: string;
  user_name: string;
  first_name: string;
  last_name: string;
  email: string;
  department?: string;
  title?: string;
  location?: string;
}

export interface ServiceNowAssignmentGroupResponse {
  sys_id: string;
  name: string;
  description?: string;
  type?: string;
}

export class ServiceNowClient {
  private client: AxiosInstance;
  private config: ServiceNowConfig;

  constructor(config: ServiceNowConfig) {
    this.config = config;

    // Create axios instance with base configuration
    this.client = axios.create({
      baseURL: `${config.instanceUrl}/api/now/${config.apiVersion || 'v1'}`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    // Set up authentication
    this.setupAuthentication();

    // Add request/response interceptors for logging
    this.setupInterceptors();
  }

  private setupAuthentication(): void {
    if (this.config.username && this.config.password) {
      // Basic authentication
      const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
      this.client.defaults.headers.common['Authorization'] = `Basic ${auth}`;
    } else if (this.config.clientId && this.config.clientSecret) {
      // OAuth2 authentication (simplified - in production, implement full OAuth2 flow)
      console.warn('OAuth2 authentication requires token management - implement full OAuth2 flow in production');
    } else {
      throw new Error('ServiceNow authentication credentials are required');
    }
  }

  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`ServiceNow API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('ServiceNow API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`ServiceNow API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('ServiceNow API Error:', error.response?.status, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get a single incident by sys_id
   */
  async getIncident(sysId: string): Promise<Incident> {
    const response: AxiosResponse<{ result: ServiceNowIncidentResponse }> = await this.client.get(
      `/table/incident/${sysId}`
    );

    return this.transformIncident(response.data.result);
  }

  /**
   * Get incidents with optional query filters
   */
  async getIncidents(filters?: {
    state?: IncidentState[];
    priority?: Priority[];
    assignmentGroup?: string;
    caller?: string;
    limit?: number;
    offset?: number;
  }): Promise<Incident[]> {
    const params: any = {};

    if (filters?.state?.length) {
      params.sysparm_query = `state IN ${filters.state.join(',')}`;
    }

    if (filters?.priority?.length) {
      const priorityQuery = `priority IN ${filters.priority.join(',')}`;
      params.sysparm_query = params.sysparm_query
        ? `${params.sysparm_query}^${priorityQuery}`
        : priorityQuery;
    }

    if (filters?.assignmentGroup) {
      const groupQuery = `assignment_group=${filters.assignmentGroup}`;
      params.sysparm_query = params.sysparm_query
        ? `${params.sysparm_query}^${groupQuery}`
        : groupQuery;
    }

    if (filters?.caller) {
      const callerQuery = `caller_id=${filters.caller}`;
      params.sysparm_query = params.sysparm_query
        ? `${params.sysparm_query}^${callerQuery}`
        : callerQuery;
    }

    if (filters?.limit) {
      params.sysparm_limit = filters.limit;
    }

    if (filters?.offset) {
      params.sysparm_offset = filters.offset;
    }

    const response: AxiosResponse<{ result: ServiceNowIncidentResponse[] }> = await this.client.get(
      '/table/incident',
      { params }
    );

    return response.data.result.map(incident => this.transformIncident(incident));
  }

  /**
   * Create a new incident
   */
  async createIncident(incident: Partial<Incident>): Promise<Incident> {
    const serviceNowData = this.transformToServiceNow(incident);

    const response: AxiosResponse<{ result: ServiceNowIncidentResponse }> = await this.client.post(
      '/table/incident',
      serviceNowData
    );

    return this.transformIncident(response.data.result);
  }

  /**
   * Update an existing incident
   */
  async updateIncident(sysId: string, updates: Partial<Incident>): Promise<Incident> {
    const serviceNowData = this.transformToServiceNow(updates);

    const response: AxiosResponse<{ result: ServiceNowIncidentResponse }> = await this.client.patch(
      `/table/incident/${sysId}`,
      serviceNowData
    );

    return this.transformIncident(response.data.result);
  }

  /**
   * Add work notes to an incident
   */
  async addWorkNotes(sysId: string, notes: string): Promise<void> {
    await this.client.patch(
      `/table/incident/${sysId}`,
      {
        work_notes: notes
      }
    );
  }

  /**
   * Get user information by sys_id
   */
  async getUser(sysId: string): Promise<User> {
    const response: AxiosResponse<{ result: ServiceNowUserResponse }> = await this.client.get(
      `/table/sys_user/${sysId}`
    );

    return this.transformUser(response.data.result);
  }

  /**
   * Get assignment groups
   */
  async getAssignmentGroups(): Promise<AssignmentGroup[]> {
    const response: AxiosResponse<{ result: ServiceNowAssignmentGroupResponse[] }> = await this.client.get(
      '/table/sys_user_group',
      {
        params: {
          sysparm_query: 'activeSTARTSWITHtrue',
          sysparm_fields: 'sys_id,name,description,type'
        }
      }
    );

    return response.data.result.map(group => this.transformAssignmentGroup(group));
  }

  /**
   * Transform ServiceNow incident response to our Incident interface
   */
  private transformIncident(snIncident: ServiceNowIncidentResponse): Incident {
    return {
      id: snIncident.sys_id,
      number: snIncident.number,
      shortDescription: snIncident.short_description,
      description: snIncident.description || '',
      category: this.mapCategory(snIncident.category),
      subcategory: snIncident.subcategory || '',
      priority: this.mapPriority(snIncident.priority),
      urgency: this.mapUrgency(snIncident.urgency),
      impact: this.mapImpact(snIncident.impact),
      state: this.mapState(snIncident.state),
      assignmentGroup: snIncident.assignment_group || '',
      assignee: snIncident.assigned_to,
      caller: {
        id: snIncident.caller_id || '',
        username: '',
        name: '',
        email: '',
        department: '',
        title: '',
        location: ''
      }, // Note: You'll need to fetch caller details separately if needed
      createdAt: new Date(snIncident.sys_created_on),
      updatedAt: new Date(snIncident.sys_updated_on),
      resolvedAt: snIncident.resolved_at ? new Date(snIncident.resolved_at) : undefined,
      slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24h SLA - implement proper SLA calculation

      // Our additions
      classificationConfidence: 0, // Will be set by classification service
      automationTags: [],
      agentActions: []
    };
  }

  /**
   * Transform our Incident interface to ServiceNow format
   */
  private transformToServiceNow(incident: Partial<Incident>): any {
    const snData: any = {};

    if (incident.shortDescription) snData.short_description = incident.shortDescription;
    if (incident.description) snData.description = incident.description;
    if (incident.category) snData.category = this.reverseMapCategory(incident.category);
    if (incident.subcategory) snData.subcategory = incident.subcategory;
    if (incident.priority) snData.priority = this.reverseMapPriority(incident.priority);
    if (incident.urgency) snData.urgency = this.reverseMapUrgency(incident.urgency);
    if (incident.impact) snData.impact = this.reverseMapImpact(incident.impact);
    if (incident.state) snData.state = this.reverseMapState(incident.state);
    if (incident.assignmentGroup) snData.assignment_group = incident.assignmentGroup;
    if (incident.assignee) snData.assigned_to = incident.assignee;
    if (incident.caller?.id) snData.caller_id = incident.caller.id;

    return snData;
  }

  /**
   * Transform ServiceNow user to our User interface
   */
  private transformUser(snUser: ServiceNowUserResponse): User {
    return {
      id: snUser.sys_id,
      username: snUser.user_name,
      name: `${snUser.first_name} ${snUser.last_name}`.trim(),
      email: snUser.email,
      department: snUser.department || '',
      title: snUser.title || '',
      location: snUser.location || ''
    };
  }

  /**
   * Transform ServiceNow assignment group to our AssignmentGroup interface
   */
  private transformAssignmentGroup(snGroup: ServiceNowAssignmentGroupResponse): AssignmentGroup {
    return {
      id: snGroup.sys_id,
      name: snGroup.name,
      description: snGroup.description || '',
      type: snGroup.type || ''
    };
  }

  // Mapping functions for enum values
  private mapCategory(category?: string): IncidentCategory {
    if (!category) return IncidentCategory.OTHER;

    const categoryMap: { [key: string]: IncidentCategory } = {
      'hardware': IncidentCategory.HARDWARE,
      'software': IncidentCategory.SOFTWARE,
      'network': IncidentCategory.NETWORK,
      'security': IncidentCategory.ACCESS,
      'database': IncidentCategory.DATA,
      'inquiry': IncidentCategory.OTHER
    };

    return categoryMap[category.toLowerCase()] || IncidentCategory.OTHER;
  }

  private reverseMapCategory(category: IncidentCategory): string {
    const reverseMap: { [key in IncidentCategory]: string } = {
      [IncidentCategory.HARDWARE]: 'hardware',
      [IncidentCategory.SOFTWARE]: 'software',
      [IncidentCategory.NETWORK]: 'network',
      [IncidentCategory.ACCESS]: 'security',
      [IncidentCategory.PASSWORD]: 'security',
      [IncidentCategory.DATA]: 'database',
      [IncidentCategory.OTHER]: 'inquiry'
    };

    return reverseMap[category];
  }

  private mapPriority(priority?: string): Priority {
    if (!priority) return Priority.MEDIUM;

    const priorityMap: { [key: string]: Priority } = {
      '1': Priority.CRITICAL,
      '2': Priority.HIGH,
      '3': Priority.MEDIUM,
      '4': Priority.LOW
    };

    return priorityMap[priority] || Priority.MEDIUM;
  }

  private reverseMapPriority(priority: Priority): string {
    const reverseMap: { [key in Priority]: string } = {
      [Priority.CRITICAL]: '1',
      [Priority.HIGH]: '2',
      [Priority.MEDIUM]: '3',
      [Priority.LOW]: '4'
    };

    return reverseMap[priority];
  }

  private mapUrgency(urgency?: string): Urgency {
    if (!urgency) return Urgency.MEDIUM;

    const urgencyMap: { [key: string]: Urgency } = {
      '1': Urgency.HIGH,
      '2': Urgency.MEDIUM,
      '3': Urgency.LOW
    };

    return urgencyMap[urgency] || Urgency.MEDIUM;
  }

  private reverseMapUrgency(urgency: Urgency): string {
    const reverseMap: { [key in Urgency]: string } = {
      [Urgency.CRITICAL]: '1',
      [Urgency.HIGH]: '1',
      [Urgency.MEDIUM]: '2',
      [Urgency.LOW]: '3'
    };

    return reverseMap[urgency];
  }

  private mapImpact(impact?: string): Impact {
    if (!impact) return Impact.MEDIUM;

    const impactMap: { [key: string]: Impact } = {
      '1': Impact.HIGH,
      '2': Impact.MEDIUM,
      '3': Impact.LOW
    };

    return impactMap[impact] || Impact.MEDIUM;
  }

  private reverseMapImpact(impact: Impact): string {
    const reverseMap: { [key in Impact]: string } = {
      [Impact.CRITICAL]: '1',
      [Impact.HIGH]: '1',
      [Impact.MEDIUM]: '2',
      [Impact.LOW]: '3'
    };

    return reverseMap[impact];
  }

  private mapState(state?: string): IncidentState {
    if (!state) return IncidentState.NEW;

    const stateMap: { [key: string]: IncidentState } = {
      '1': IncidentState.NEW,
      '2': IncidentState.IN_PROGRESS,
      '3': IncidentState.ON_HOLD,
      '6': IncidentState.RESOLVED,
      '7': IncidentState.CLOSED
    };

    return stateMap[state] || IncidentState.NEW;
  }

  private reverseMapState(state: IncidentState): string {
    const reverseMap: { [key in IncidentState]: string } = {
      [IncidentState.NEW]: '1',
      [IncidentState.IN_PROGRESS]: '2',
      [IncidentState.ON_HOLD]: '3',
      [IncidentState.RESOLVED]: '6',
      [IncidentState.CLOSED]: '7'
    };

    return reverseMap[state];
  }

  /**
   * Test connection to ServiceNow
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/table/incident', {
        params: {
          sysparm_limit: 1,
          sysparm_fields: 'sys_id'
        }
      });
      return true;
    } catch (error) {
      console.error('ServiceNow connection test failed:', error);
      return false;
    }
  }
}