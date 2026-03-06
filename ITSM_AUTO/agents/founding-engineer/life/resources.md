# Resources - Reference Materials

## Technical References

### ITSM Standards & Best Practices
- ITIL framework for incident management
- ServiceNow API documentation patterns
- ITSM category and priority classification standards
- SLA management best practices

### AI & Classification Techniques
- Hybrid rule-based + AI classification patterns
- Confidence threshold optimization techniques
- Natural language processing for incident descriptions
- Claude AI integration via Paperclip agents

### Development & Architecture
- TypeScript best practices for Node.js services
- Express.js API design patterns
- Jest testing framework strategies
- CI/CD with GitHub Actions
- Error handling and graceful degradation patterns

## Code Patterns & Examples

### Classification System Architecture
**File**: `src/services/EnhancedClassificationService.ts`
- Hybrid approach: rule-based (>70% confidence) vs AI classification
- Business logic integration for priority elevation
- Comprehensive fallback mechanisms

**File**: `src/agents/ClassificationAgent.ts`
- Advanced multi-factor analysis engine
- Paperclip agent task creation and management
- Sophisticated keyword and semantic analysis

### Integration Patterns
**File**: `src/integrations/ServiceNowIntegration.ts`
- Webhook processing and incident handling
- Work notes automation and audit trail
- Batch processing capabilities

## Business Context

### Department Priority Matrix
1. **Executive** (Priority 5): Immediate escalation, dedicated support
2. **Finance** (Priority 4): High priority, business critical
3. **Sales** (Priority 4): Revenue impact consideration
4. **Marketing/HR/IT** (Priority 3): Standard business priority
5. **Support/General** (Priority 1-2): Normal workflow

### Classification Confidence Benchmarks
- **90%+ Confidence**: Production-ready, automated processing
- **70-89% Confidence**: Review recommended but can auto-process
- **50-69% Confidence**: Manual review required
- **<50% Confidence**: Escalate to human agents

## Useful Commands & Scripts

### Development
```bash
npm run build          # TypeScript compilation
npm run dev           # Development server with hot reload
npm test              # Run test suite
npm run lint          # Code quality checks
```

### API Testing
```bash
curl -X POST /api/webhook/servicenow/incident  # Test incident webhook
curl -X GET /api/webhook/health                 # Health check
```

## Documentation Locations
- **Architecture**: `docs/architecture.md` (comprehensive system design)
- **API Documentation**: Auto-generated from OpenAPI specs
- **Test Coverage**: Generated via Jest coverage reports
- **Agent Instructions**: `agents/founding-engineer/AGENTS.md`