import { Router, Request, Response, NextFunction } from 'express';
import { ServiceNowIntegration } from '../integrations/ServiceNowIntegration';
import { ServiceNowConfig } from '../integrations/ServiceNowClient';

const router = Router();

// Initialize ServiceNow integration
let serviceNowIntegration: ServiceNowIntegration | null = null;

// Initialize ServiceNow integration on first use
async function initServiceNowIntegration(): Promise<ServiceNowIntegration> {
  if (!serviceNowIntegration) {
    const config: ServiceNowConfig = {
      instanceUrl: process.env.SERVICENOW_INSTANCE_URL || '',
      username: process.env.SERVICENOW_USERNAME,
      password: process.env.SERVICENOW_PASSWORD,
      clientId: process.env.SERVICENOW_CLIENT_ID,
      clientSecret: process.env.SERVICENOW_CLIENT_SECRET,
      apiVersion: 'v1'
    };

    serviceNowIntegration = new ServiceNowIntegration(config);

    const initialized = await serviceNowIntegration.initialize();
    if (!initialized) {
      throw new Error('Failed to initialize ServiceNow integration');
    }
  }

  return serviceNowIntegration;
}

/**
 * Webhook endpoint for ServiceNow incident events
 * This endpoint should be configured in ServiceNow to receive incident creation/update notifications
 */
router.post('/servicenow/incident', async (req: Request, res: Response, _next: NextFunction) => {
  console.log('Received ServiceNow incident webhook:', req.headers, req.body);

  try {
    const integration = await initServiceNowIntegration();

    // Validate webhook payload
    const incidentData = req.body;
    if (!incidentData || !incidentData.sys_id) {
      return res.status(400).json({
        error: 'Invalid webhook payload',
        message: 'Missing sys_id in incident data'
      });
    }

    // Check if this is a new incident (state = 'New' or state = '1')
    const isNewIncident = incidentData.state === '1' || incidentData.state === 'New' ||
                         incidentData.state === 'new' || !incidentData.state;

    if (!isNewIncident) {
      console.log(`Skipping non-new incident: ${incidentData.number} (state: ${incidentData.state})`);
      return res.status(200).json({
        message: 'Incident processed (no action needed for non-new incidents)',
        incident: incidentData.number
      });
    }

    // Process the new incident
    console.log(`Processing new incident: ${incidentData.number}`);
    const processedIncident = await integration.processNewIncident(incidentData);

    return res.status(200).json({
      message: 'Incident processed successfully',
      incident: {
        id: processedIncident.id,
        number: processedIncident.number,
        category: processedIncident.category,
        priority: processedIncident.priority,
        assignmentGroup: processedIncident.assignmentGroup,
        confidence: processedIncident.classificationConfidence,
        automationTags: processedIncident.automationTags
      }
    });

  } catch (error) {
    console.error('Error processing ServiceNow webhook:', error);

    // Return success to ServiceNow to avoid retries, but log the error
    return res.status(200).json({
      message: 'Webhook received but processing failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      incident: req.body.number || 'unknown'
    });
  }
});

/**
 * Test webhook endpoint for ServiceNow connectivity
 */
router.get('/servicenow/test', async (_req: Request, res: Response, _next: NextFunction) => {
  try {
    await initServiceNowIntegration();

    return res.status(200).json({
      message: 'ServiceNow integration is working',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('ServiceNow test failed:', error);
    return res.status(500).json({
      error: 'ServiceNow integration test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Health check for webhook endpoints
 */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    message: 'Webhook endpoints are healthy',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /webhook/servicenow/incident',
      'GET /webhook/servicenow/test',
      'GET /webhook/health'
    ]
  });
});

export default router;