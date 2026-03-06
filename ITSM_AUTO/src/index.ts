import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { EnhancedClassificationService } from './services/EnhancedClassificationService';
import { ClassificationInput, IncidentState } from './types/incident';
import { ServiceNowIntegration } from './integrations/ServiceNowIntegration';
import { ServiceNowConfig } from './integrations/ServiceNowClient';
import webhookRoutes from './routes/webhook';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Initialize services
const classificationService = new EnhancedClassificationService();

// Initialize ServiceNow integration if credentials are provided
let serviceNowIntegration: ServiceNowIntegration | null = null;

async function initServiceNowIntegration(): Promise<ServiceNowIntegration | null> {
  if (!serviceNowIntegration && process.env.SERVICENOW_INSTANCE_URL) {
    try {
      const config: ServiceNowConfig = {
        instanceUrl: process.env.SERVICENOW_INSTANCE_URL,
        username: process.env.SERVICENOW_USERNAME,
        password: process.env.SERVICENOW_PASSWORD,
        clientId: process.env.SERVICENOW_CLIENT_ID,
        clientSecret: process.env.SERVICENOW_CLIENT_SECRET,
        apiVersion: 'v1'
      };

      serviceNowIntegration = new ServiceNowIntegration(config);
      const initialized = await serviceNowIntegration.initialize();

      if (initialized) {
        console.log('ServiceNow integration initialized successfully');
      } else {
        console.warn('ServiceNow integration failed to initialize');
        serviceNowIntegration = null;
      }
    } catch (error) {
      console.error('ServiceNow integration initialization error:', error);
      serviceNowIntegration = null;
    }
  }

  return serviceNowIntegration;
}

// Health check endpoint
app.get('/health', async (_req, res) => {
  const serviceNow = await initServiceNowIntegration();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      classification: 'available',
      serviceNow: serviceNow ? 'available' : 'not configured'
    }
  });
});

// Classification endpoint
app.post('/api/classify', async (req, res) => {
  try {
    const input: ClassificationInput = req.body;

    // Basic validation
    if (!input.shortDescription || !input.description || !input.caller) {
      return res.status(400).json({
        error: 'Missing required fields: shortDescription, description, caller',
      });
    }

    const result = await classificationService.classify(input);

    return res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Classification error:', error);
    return res.status(500).json({
      error: 'Internal server error during classification',
      timestamp: new Date().toISOString(),
    });
  }
});

// Get classification rules
app.get('/api/rules', (_req, res) => {
  try {
    const rules = classificationService.getRules();
    return res.json({
      success: true,
      data: rules,
      count: rules.length,
    });
  } catch (error) {
    console.error('Error fetching rules:', error);
    return res.status(500).json({
      error: 'Internal server error fetching rules',
    });
  }
});

// Add new classification rule
app.post('/api/rules', (req, res) => {
  try {
    const rule = req.body;

    // Basic validation
    if (!rule.name || !rule.keywords || !rule.category) {
      return res.status(400).json({
        error: 'Missing required fields: name, keywords, category',
      });
    }

    classificationService.addRule(rule);

    return res.status(201).json({
      success: true,
      message: 'Rule created successfully',
    });
  } catch (error) {
    console.error('Error creating rule:', error);
    return res.status(500).json({
      error: 'Internal server error creating rule',
    });
  }
});

// Enhanced Classification Endpoints

// Classification with AI/Rule comparison
app.post('/api/classify/enhanced', async (req, res) => {
  try {
    const input: ClassificationInput = req.body;

    // Basic validation
    if (!input.shortDescription || !input.description || !input.caller) {
      return res.status(400).json({
        error: 'Missing required fields: shortDescription, description, caller',
      });
    }

    const result = await (classificationService as any).classifyWithExplanation(input);

    return res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Enhanced classification error:', error);
    return res.status(500).json({
      error: 'Internal server error during enhanced classification',
      timestamp: new Date().toISOString(),
    });
  }
});

// Force AI-only classification
app.post('/api/classify/ai', async (req, res) => {
  try {
    const input: ClassificationInput = req.body;

    // Basic validation
    if (!input.shortDescription || !input.description || !input.caller) {
      return res.status(400).json({
        error: 'Missing required fields: shortDescription, description, caller',
      });
    }

    const result = await (classificationService as any).classifyWithAI(input);

    return res.json({
      success: true,
      data: result,
      approach: 'ai-only',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('AI classification error:', error);
    return res.status(500).json({
      error: 'AI classification failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Force rule-based only classification
app.post('/api/classify/rules', async (req, res) => {
  try {
    const input: ClassificationInput = req.body;

    // Basic validation
    if (!input.shortDescription || !input.description || !input.caller) {
      return res.status(400).json({
        error: 'Missing required fields: shortDescription, description, caller',
      });
    }

    const result = await (classificationService as any).classifyWithRules(input);

    return res.json({
      success: true,
      data: result,
      approach: 'rule-based-only',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Rule-based classification error:', error);
    return res.status(500).json({
      error: 'Internal server error during rule-based classification',
      timestamp: new Date().toISOString(),
    });
  }
});

// Compare classification methods
app.post('/api/classify/compare', async (req, res) => {
  try {
    const input: ClassificationInput = req.body;

    // Basic validation
    if (!input.shortDescription || !input.description || !input.caller) {
      return res.status(400).json({
        error: 'Missing required fields: shortDescription, description, caller',
      });
    }

    const comparison = await (classificationService as any).compareClassificationMethods(input);

    return res.json({
      success: true,
      data: comparison,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Classification comparison error:', error);
    return res.status(500).json({
      error: 'Internal server error during classification comparison',
      timestamp: new Date().toISOString(),
    });
  }
});

// Get/Set confidence threshold
app.get('/api/classify/config', (_req, res) => {
  try {
    const threshold = (classificationService as any).getConfidenceThreshold();
    return res.json({
      success: true,
      data: {
        confidenceThreshold: threshold,
        description: 'Threshold for switching from rule-based to AI classification'
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Config retrieval error:', error);
    return res.status(500).json({
      error: 'Internal server error retrieving configuration',
      timestamp: new Date().toISOString(),
    });
  }
});

app.put('/api/classify/config', (req, res) => {
  try {
    const { confidenceThreshold } = req.body;

    if (typeof confidenceThreshold !== 'number' || confidenceThreshold < 0 || confidenceThreshold > 100) {
      return res.status(400).json({
        error: 'Invalid confidence threshold. Must be a number between 0 and 100.',
      });
    }

    (classificationService as any).setConfidenceThreshold(confidenceThreshold);

    return res.json({
      success: true,
      message: 'Confidence threshold updated successfully',
      data: { confidenceThreshold },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Config update error:', error);
    return res.status(500).json({
      error: 'Internal server error updating configuration',
      timestamp: new Date().toISOString(),
    });
  }
});

// Webhook routes
app.use('/webhook', webhookRoutes);

// ServiceNow Integration Endpoints

// Get incidents from ServiceNow
app.get('/api/servicenow/incidents', async (req, res) => {
  try {
    const serviceNow = await initServiceNowIntegration();
    if (!serviceNow) {
      return res.status(503).json({
        error: 'ServiceNow integration not available',
        message: 'ServiceNow credentials not configured or connection failed'
      });
    }

    const filters = {
      state: req.query.state ? (req.query.state as string).split(',') as IncidentState[] : undefined,
      priority: req.query.priority ? (req.query.priority as string).split(',') : undefined,
      assignmentGroup: req.query.assignmentGroup as string,
      caller: req.query.caller as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };

    const incidents = await serviceNow.getIncidents(filters);

    return res.json({
      success: true,
      data: incidents,
      count: incidents.length,
      filters: filters
    });

  } catch (error) {
    console.error('Error fetching ServiceNow incidents:', error);
    return res.status(500).json({
      error: 'Failed to fetch incidents from ServiceNow',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get specific incident from ServiceNow
app.get('/api/servicenow/incidents/:id', async (req, res) => {
  try {
    const serviceNow = await initServiceNowIntegration();
    if (!serviceNow) {
      return res.status(503).json({
        error: 'ServiceNow integration not available'
      });
    }

    const incident = await serviceNow.getIncident(req.params.id);

    return res.json({
      success: true,
      data: incident
    });

  } catch (error) {
    console.error('Error fetching ServiceNow incident:', error);
    return res.status(404).json({
      error: 'Incident not found or ServiceNow error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Classify a specific incident in ServiceNow
app.post('/api/servicenow/incidents/:id/classify', async (req, res) => {
  try {
    const serviceNow = await initServiceNowIntegration();
    if (!serviceNow) {
      return res.status(503).json({
        error: 'ServiceNow integration not available'
      });
    }

    const result = await serviceNow.classifyIncident(req.params.id);

    return res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error classifying ServiceNow incident:', error);
    return res.status(500).json({
      error: 'Failed to classify incident',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Process incidents in batch
app.post('/api/servicenow/batch-process', async (req, res) => {
  try {
    const serviceNow = await initServiceNowIntegration();
    if (!serviceNow) {
      return res.status(503).json({
        error: 'ServiceNow integration not available'
      });
    }

    const filters = {
      state: req.body.state as IncidentState[],
      limit: req.body.limit || 50,
      onlyUnclassified: req.body.onlyUnclassified !== false
    };

    const result = await serviceNow.processBatchIncidents(filters);

    return res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in batch processing:', error);
    return res.status(500).json({
      error: 'Batch processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get ServiceNow assignment groups
app.get('/api/servicenow/assignment-groups', async (_req, res) => {
  try {
    const serviceNow = await initServiceNowIntegration();
    if (!serviceNow) {
      return res.status(503).json({
        error: 'ServiceNow integration not available'
      });
    }

    const groups = await serviceNow.getAssignmentGroups();

    return res.json({
      success: true,
      data: groups,
      count: groups.length
    });

  } catch (error) {
    console.error('Error fetching assignment groups:', error);
    return res.status(500).json({
      error: 'Failed to fetch assignment groups',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl,
  });
});

// Start server
if (require.main === module) {
  app.listen(port, async () => {
    console.log(`ITSM Automation Server running on port ${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
    console.log(`Classification API: http://localhost:${port}/api/classify`);
    console.log(`Webhooks: http://localhost:${port}/webhook/*`);

    // Initialize ServiceNow integration
    await initServiceNowIntegration();

    console.log('\nAvailable endpoints:');
    console.log('- GET  /health - Health check');
    console.log('\nClassification Endpoints:');
    console.log('- POST /api/classify - Hybrid classification (rules + AI)');
    console.log('- POST /api/classify/enhanced - Enhanced classification with approach explanation');
    console.log('- POST /api/classify/ai - AI-only classification');
    console.log('- POST /api/classify/rules - Rule-based only classification');
    console.log('- POST /api/classify/compare - Compare rule-based vs AI classification');
    console.log('- GET  /api/classify/config - Get classification configuration');
    console.log('- PUT  /api/classify/config - Update classification configuration');
    console.log('- GET  /api/rules - Get classification rules');
    console.log('- POST /api/rules - Add classification rule');
    console.log('\nWebhooks:');
    console.log('- POST /webhook/servicenow/incident - ServiceNow incident webhook');
    console.log('- GET  /webhook/servicenow/test - Test ServiceNow integration');
    console.log('\nServiceNow Integration:');
    console.log('- GET  /api/servicenow/incidents - Get ServiceNow incidents');
    console.log('- GET  /api/servicenow/incidents/:id - Get specific incident');
    console.log('- POST /api/servicenow/incidents/:id/classify - Classify specific incident');
    console.log('- POST /api/servicenow/batch-process - Process incidents in batch');
    console.log('- GET  /api/servicenow/assignment-groups - Get assignment groups');
  });
}

export default app;