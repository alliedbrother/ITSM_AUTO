import { ServiceNowClient, ServiceNowConfig } from './ServiceNowClient';
import { EnhancedClassificationService } from '../services/EnhancedClassificationService';
import { Incident, AgentAction, AgentActionType, IncidentState } from '../types/incident';
import { v4 as uuidv4 } from 'uuid';

export class ServiceNowIntegration {
  private client: ServiceNowClient;
  private classificationService: EnhancedClassificationService;

  constructor(config: ServiceNowConfig) {
    this.client = new ServiceNowClient(config);
    this.classificationService = new EnhancedClassificationService();
  }

  /**
   * Initialize and test the ServiceNow connection
   */
  async initialize(): Promise<boolean> {
    try {
      const isConnected = await this.client.testConnection();
      if (isConnected) {
        console.log('ServiceNow integration initialized successfully');
        return true;
      } else {
        console.error('Failed to connect to ServiceNow');
        return false;
      }
    } catch (error) {
      console.error('ServiceNow initialization error:', error);
      return false;
    }
  }

  /**
   * Process a new incident from ServiceNow webhook
   * This is the main automation entry point
   */
  async processNewIncident(incidentData: any): Promise<Incident> {
    console.log(`Processing new incident: ${incidentData.number}`);

    try {
      // Step 1: Transform and fetch the full incident data
      const incident = await this.client.getIncident(incidentData.sys_id);

      // Step 2: Classify the incident
      const startTime = Date.now();
      const classificationResult = await this.classificationService.classify({
        shortDescription: incident.shortDescription,
        description: incident.description,
        caller: incident.caller
      });
      const duration = Date.now() - startTime;

      // Step 3: Create agent action record
      const classificationAction: AgentAction = {
        id: uuidv4(),
        incidentId: incident.id,
        agentId: 'classification-agent',
        agentName: 'Classification Agent',
        actionType: AgentActionType.CLASSIFY,
        input: {
          shortDescription: incident.shortDescription,
          description: incident.description,
          caller: incident.caller
        },
        output: classificationResult,
        confidence: classificationResult.confidence,
        timestamp: new Date(),
        duration,
        success: true
      };

      // Step 4: Update the incident with classification results
      const updatedIncident = await this.updateIncidentWithClassification(
        incident.id,
        classificationResult,
        classificationAction
      );

      // Step 5: Add work notes about the automation
      await this.addAutomationWorkNotes(incident.id, classificationResult);

      console.log(`Successfully processed incident ${incident.number} with confidence ${classificationResult.confidence}`);

      return updatedIncident;
    } catch (error) {
      console.error(`Error processing incident ${incidentData.number}:`, error);

      // Create failure agent action
      const failureAction: AgentAction = {
        id: uuidv4(),
        incidentId: incidentData.sys_id,
        agentId: 'classification-agent',
        agentName: 'Classification Agent',
        actionType: AgentActionType.CLASSIFY,
        input: incidentData,
        output: null,
        confidence: 0,
        timestamp: new Date(),
        duration: 0,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };

      // Still try to get the incident for return
      try {
        const incident = await this.client.getIncident(incidentData.sys_id);
        incident.agentActions = [failureAction];
        return incident;
      } catch (fetchError) {
        // If we can't even fetch the incident, throw the original error
        throw error;
      }
    }
  }

  /**
   * Update ServiceNow incident with classification results
   */
  private async updateIncidentWithClassification(
    incidentId: string,
    classification: any,
    agentAction: AgentAction
  ): Promise<Incident> {
    const updates = {
      category: classification.category,
      subcategory: classification.subcategory,
      priority: classification.priority,
      urgency: classification.urgency,
      impact: classification.impact,
      assignmentGroup: classification.assignmentGroup
    };

    const updatedIncident = await this.client.updateIncident(incidentId, updates);

    // Add the agent action to the incident
    updatedIncident.agentActions = [agentAction];
    updatedIncident.classificationConfidence = classification.confidence;
    updatedIncident.automationTags = ['auto-classified', `confidence-${Math.round(classification.confidence * 100)}`];

    return updatedIncident;
  }

  /**
   * Add work notes to document the automated classification
   */
  private async addAutomationWorkNotes(incidentId: string, classification: any): Promise<void> {
    const workNotes = [
      '--- Automated Classification ---',
      `Category: ${classification.category} (${classification.subcategory})`,
      `Priority: ${classification.priority}`,
      `Assignment Group: ${classification.assignmentGroup}`,
      `Confidence: ${Math.round(classification.confidence * 100)}%`,
      `Reasoning: ${classification.reasoning}`,
      '',
      'Suggested Actions:',
      ...classification.suggestedActions.map((action: string) => `• ${action}`),
      '',
      'This classification was generated by AI automation.',
      `Timestamp: ${new Date().toISOString()}`
    ].join('\n');

    await this.client.addWorkNotes(incidentId, workNotes);
  }

  /**
   * Process incidents in bulk (for batch processing)
   */
  async processBatchIncidents(filters?: {
    state?: IncidentState[];
    limit?: number;
    onlyUnclassified?: boolean;
  }): Promise<{ processed: number; errors: number; results: any[] }> {
    console.log('Starting batch incident processing...');

    const results = {
      processed: 0,
      errors: 0,
      results: [] as any[]
    };

    try {
      // Get incidents to process
      const incidents = await this.client.getIncidents({
        state: filters?.state || [IncidentState.NEW, IncidentState.IN_PROGRESS],
        limit: filters?.limit || 50
      });

      console.log(`Found ${incidents.length} incidents to process`);

      // Process each incident
      for (const incident of incidents) {
        try {
          // Skip if already classified and we only want unclassified
          if (filters?.onlyUnclassified && incident.classificationConfidence > 0) {
            continue;
          }

          const processedIncident = await this.processExistingIncident(incident);
          results.processed++;
          results.results.push({
            incidentId: incident.id,
            number: incident.number,
            success: true,
            classification: processedIncident.category,
            confidence: processedIncident.classificationConfidence
          });

        } catch (error) {
          results.errors++;
          results.results.push({
            incidentId: incident.id,
            number: incident.number,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          console.error(`Error processing incident ${incident.number}:`, error);
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      console.error('Batch processing error:', error);
      throw error;
    }

    console.log(`Batch processing complete: ${results.processed} processed, ${results.errors} errors`);
    return results;
  }

  /**
   * Process an existing incident (for batch or manual processing)
   */
  private async processExistingIncident(incident: Incident): Promise<Incident> {
    // Classify the incident
    const startTime = Date.now();
    const classificationResult = await this.classificationService.classify({
      shortDescription: incident.shortDescription,
      description: incident.description,
      caller: incident.caller
    });
    const duration = Date.now() - startTime;

    // Create agent action record
    const classificationAction: AgentAction = {
      id: uuidv4(),
      incidentId: incident.id,
      agentId: 'classification-agent',
      agentName: 'Classification Agent',
      actionType: AgentActionType.CLASSIFY,
      input: {
        shortDescription: incident.shortDescription,
        description: incident.description,
        caller: incident.caller
      },
      output: classificationResult,
      confidence: classificationResult.confidence,
      timestamp: new Date(),
      duration,
      success: true
    };

    // Update the incident with classification results
    return await this.updateIncidentWithClassification(
      incident.id,
      classificationResult,
      classificationAction
    );
  }

  /**
   * Get ServiceNow assignment groups for routing
   */
  async getAssignmentGroups() {
    return await this.client.getAssignmentGroups();
  }

  /**
   * Get user information
   */
  async getUser(userId: string) {
    return await this.client.getUser(userId);
  }

  /**
   * Get incident by ID
   */
  async getIncident(incidentId: string) {
    return await this.client.getIncident(incidentId);
  }

  /**
   * Get incidents with filters
   */
  async getIncidents(filters?: any) {
    return await this.client.getIncidents(filters);
  }

  /**
   * Manual classification endpoint
   */
  async classifyIncident(incidentId: string): Promise<any> {
    const incident = await this.client.getIncident(incidentId);

    const classificationResult = await this.classificationService.classify({
      shortDescription: incident.shortDescription,
      description: incident.description,
      caller: incident.caller
    });

    return {
      incident: {
        id: incident.id,
        number: incident.number,
        shortDescription: incident.shortDescription
      },
      classification: classificationResult
    };
  }
}