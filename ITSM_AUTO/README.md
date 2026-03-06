# ITSM Automation System

An agent-based IT Service Management automation platform that uses AI agents to automatically handle incident classification, routing, and response.

## Overview

This system integrates with existing ITSM platforms (primarily ServiceNow) to automate high-volume, routine ITSM processes. Using the Paperclip agent orchestration framework, specialized AI agents handle different aspects of incident management with minimal human intervention.

## Key Features

- **Automated Incident Classification**: AI-powered categorization and priority assignment
- **Intelligent Routing**: Automatic assignment to appropriate support groups
- **Initial Response Generation**: Contextual first responses and solution suggestions
- **SLA Monitoring**: Proactive escalation based on business rules
- **Full Audit Trail**: Complete traceability of all automated actions

## Architecture

The system follows a modular, agent-based architecture:

```
Paperclip Orchestrator → Agent Pool → ITSM Platform Integration
                      ↓
                   Data Layer (PostgreSQL + Redis)
```

For detailed architecture documentation, see [docs/architecture.md](docs/architecture.md).

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- ServiceNow instance (for production)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd itsm-automation
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Set up the database:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Configuration

Create a `.env` file with the following variables:

```env
# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/itsm_automation
REDIS_URL=redis://localhost:6379

# ServiceNow Integration
SERVICENOW_INSTANCE_URL=https://yourinstance.service-now.com
SERVICENOW_USERNAME=your_username
SERVICENOW_PASSWORD=your_password

# Paperclip Configuration
PAPERCLIP_API_URL=http://localhost:3100
PAPERCLIP_API_KEY=your_paperclip_api_key

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
```

## Development

### Project Structure

```
├── src/
│   ├── agents/           # AI agent implementations
│   ├── integrations/     # ServiceNow and other platform integrations
│   ├── services/         # Business logic services
│   ├── routes/           # API routes
│   ├── middleware/       # Express middleware
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── fixtures/         # Test data
├── docs/                 # Documentation
└── config/               # Configuration files
```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Lint code with ESLint
- `npm run lint:fix` - Fix linting issues automatically
- `npm run format` - Format code with Prettier

### Testing

The project uses Jest for testing with the following structure:

- **Unit tests**: Test individual functions and classes in isolation
- **Integration tests**: Test API endpoints and database interactions
- **Agent tests**: Test AI agent behavior and decision making

Run tests:
```bash
# All tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

### Development Workflow

1. **Create a branch** for your feature or bugfix
2. **Write tests** for new functionality
3. **Implement the feature** following the existing code patterns
4. **Ensure tests pass** and coverage is maintained
5. **Lint and format** your code
6. **Submit a pull request** with a clear description

## Agents

The system includes several specialized agents:

### Classification Agent
- Analyzes incident descriptions
- Assigns categories, priorities, and impact levels
- Provides confidence scores for classifications

### Routing Agent
- Determines appropriate assignment groups
- Considers workload balancing and expertise areas
- Handles escalation logic

### Response Agent
- Generates initial response messages
- Suggests potential solutions from knowledge base
- Creates follow-up tasks when needed

For detailed agent documentation, see [docs/agents.md](docs/agents.md).

## ServiceNow Integration

The system integrates with ServiceNow through:

- **REST API**: For reading and updating incidents
- **Webhooks**: For real-time event notifications
- **Table API**: For accessing configuration and reference data

### Supported Operations

- Create, read, update incidents
- Query assignment groups and users
- Access knowledge base articles
- Update work notes and resolution notes

For integration setup, see [docs/servicenow-integration.md](docs/servicenow-integration.md).

## Monitoring & Observability

### Logging
- Structured JSON logging with Winston
- Different log levels for development and production
- Request/response logging for all API calls

### Metrics
- Agent performance metrics (classification accuracy, response time)
- System metrics (throughput, error rates)
- Business metrics (automation rate, SLA compliance)

### Alerts
- Failed integrations
- Agent errors
- Performance degradation
- SLA breaches

## Security

### Authentication & Authorization
- JWT-based API authentication
- Role-based access control
- ServiceNow OAuth integration

### Data Protection
- TLS encryption in transit
- AES-256 encryption at rest
- Secrets management with environment variables

### Audit & Compliance
- Complete audit trail of all automated actions
- Immutable logging for compliance
- Data retention policies

## Deployment

### Production Deployment

The application is designed for cloud deployment with the following components:

- **Application servers**: Auto-scaling group behind load balancer
- **Agent workers**: Separate instances running Paperclip agents
- **Database**: Managed PostgreSQL with read replicas
- **Cache**: Redis cluster for session storage and caching

### Environment Variables

Ensure all production environment variables are properly configured:

- Database connection strings
- ServiceNow credentials
- API keys and secrets
- Monitoring and logging configuration

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:

- Check the [documentation](docs/)
- Review [troubleshooting guide](docs/troubleshooting.md)
- Open an issue for bugs or feature requests
- Contact the development team for urgent issues

---

**Note**: This is an early-stage project. Features and APIs are subject to change as the system evolves.