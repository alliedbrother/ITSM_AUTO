import {
  ClassificationInput,
  ClassificationResult,
  IncidentCategory,
  Priority,
  Urgency,
  Impact,
} from '../types/incident';

export interface ClassificationRule {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  category: IncidentCategory;
  subcategory: string;
  priority: Priority;
  urgency: Urgency;
  impact: Impact;
  assignmentGroup: string;
  confidence: number;
  active: boolean;
}

export class ClassificationService {
  private rules: ClassificationRule[] = [];

  constructor() {
    this.loadDefaultRules();
  }

  /**
   * Classify an incident based on description and context
   */
  public async classify(input: ClassificationInput): Promise<ClassificationResult> {
    const textToAnalyze = `${input.shortDescription} ${input.description}`.toLowerCase();

    // Find matching rules based on keywords
    const matchingRules = this.findMatchingRules(textToAnalyze);

    if (matchingRules.length === 0) {
      return this.getDefaultClassification(input);
    }

    // Get the best matching rule (highest confidence and most keyword matches)
    const bestMatch = this.getBestMatch(matchingRules, textToAnalyze);

    // Apply business logic adjustments
    const adjustedResult = this.applyBusinessLogic(bestMatch, input);

    return {
      category: adjustedResult.category,
      subcategory: adjustedResult.subcategory,
      priority: adjustedResult.priority,
      urgency: adjustedResult.urgency,
      impact: adjustedResult.impact,
      assignmentGroup: adjustedResult.assignmentGroup,
      confidence: this.calculateConfidence(bestMatch, textToAnalyze),
      reasoning: this.generateReasoning(bestMatch, textToAnalyze),
      suggestedActions: this.getSuggestedActions(adjustedResult),
    };
  }

  private findMatchingRules(text: string): ClassificationRule[] {
    return this.rules.filter(rule => {
      if (!rule.active) return false;

      return rule.keywords.some(keyword =>
        text.includes(keyword.toLowerCase())
      );
    });
  }

  private getBestMatch(rules: ClassificationRule[], text: string): ClassificationRule {
    return rules.reduce((best, current) => {
      const currentScore = this.calculateRuleScore(current, text);
      const bestScore = this.calculateRuleScore(best, text);

      return currentScore > bestScore ? current : best;
    });
  }

  private calculateRuleScore(rule: ClassificationRule, text: string): number {
    const keywordMatches = rule.keywords.filter(keyword =>
      text.includes(keyword.toLowerCase())
    ).length;

    return (keywordMatches / rule.keywords.length) * rule.confidence;
  }

  private applyBusinessLogic(rule: ClassificationRule, input: ClassificationInput): ClassificationRule {
    const adjusted = { ...rule };

    // Adjust priority based on user department
    if (input.caller.department === 'Executive' || input.caller.department === 'Finance') {
      adjusted.priority = this.increasePriority(adjusted.priority);
      adjusted.urgency = this.increaseUrgency(adjusted.urgency);
    }

    // Adjust based on business impact keywords
    if (input.businessImpact?.toLowerCase().includes('production') ||
        input.businessImpact?.toLowerCase().includes('outage') ||
        input.description.toLowerCase().includes('down') ||
        input.description.toLowerCase().includes('critical')) {
      adjusted.priority = Priority.CRITICAL;
      adjusted.urgency = Urgency.CRITICAL;
      adjusted.impact = Impact.HIGH;
    }

    // Adjust based on affected services
    if (input.affectedServices?.includes('Email') ||
        input.affectedServices?.includes('Network')) {
      adjusted.impact = Impact.HIGH;
      adjusted.urgency = this.increaseUrgency(adjusted.urgency);
    }

    return adjusted;
  }

  private increasePriority(current: Priority): Priority {
    const priorities = [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL];
    const currentIndex = priorities.indexOf(current);
    return priorities[Math.min(currentIndex + 1, priorities.length - 1)] as Priority;
  }

  private increaseUrgency(current: Urgency): Urgency {
    const urgencies = [Urgency.LOW, Urgency.MEDIUM, Urgency.HIGH, Urgency.CRITICAL];
    const currentIndex = urgencies.indexOf(current);
    return urgencies[Math.min(currentIndex + 1, urgencies.length - 1)] as Urgency;
  }

  private calculateConfidence(rule: ClassificationRule, text: string): number {
    const baseConfidence = rule.confidence;
    const keywordMatches = rule.keywords.filter(keyword =>
      text.includes(keyword.toLowerCase())
    ).length;

    const matchRatio = keywordMatches / rule.keywords.length;

    // Confidence ranges from rule base confidence to 100% based on keyword match ratio
    return Math.min(100, baseConfidence + (matchRatio * (100 - baseConfidence)));
  }

  private generateReasoning(rule: ClassificationRule, text: string): string {
    const matchedKeywords = rule.keywords.filter(keyword =>
      text.includes(keyword.toLowerCase())
    );

    return `Classified as ${rule.category} based on keywords: ${matchedKeywords.join(', ')}. ` +
           `Applied rule: ${rule.name}`;
  }

  private getSuggestedActions(rule: ClassificationRule): string[] {
    const actions: string[] = [];

    switch (rule.category) {
      case IncidentCategory.PASSWORD:
        actions.push('Reset user password in Active Directory');
        actions.push('Verify user identity before reset');
        actions.push('Send new password via secure channel');
        break;
      case IncidentCategory.HARDWARE:
        actions.push('Run hardware diagnostics');
        actions.push('Check warranty status');
        actions.push('Consider hardware replacement if under warranty');
        break;
      case IncidentCategory.SOFTWARE:
        actions.push('Check application logs');
        actions.push('Verify software version and patches');
        actions.push('Restart application services if safe');
        break;
      case IncidentCategory.NETWORK:
        actions.push('Check network connectivity');
        actions.push('Verify firewall rules');
        actions.push('Monitor network traffic patterns');
        break;
      default:
        actions.push('Gather additional information from user');
        actions.push('Check knowledge base for similar issues');
        actions.push('Escalate to appropriate technical team');
    }

    if (rule.priority === Priority.CRITICAL) {
      actions.unshift('Notify on-call manager immediately');
      actions.push('Prepare status page update if user-facing');
    }

    return actions;
  }

  private getDefaultClassification(_input: ClassificationInput): ClassificationResult {
    return {
      category: IncidentCategory.OTHER,
      subcategory: 'General',
      priority: Priority.MEDIUM,
      urgency: Urgency.MEDIUM,
      impact: Impact.MEDIUM,
      assignmentGroup: 'Service Desk',
      confidence: 30,
      reasoning: 'No specific classification rules matched. Using default classification.',
      suggestedActions: [
        'Review incident description with user',
        'Gather additional technical details',
        'Search knowledge base for similar issues',
        'Escalate to appropriate technical team if needed'
      ],
    };
  }

  private loadDefaultRules(): void {
    this.rules = [
      {
        id: 'password-reset',
        name: 'Password Reset Request',
        description: 'User requesting password reset',
        keywords: ['password', 'reset', 'forgot', 'login', 'access', 'unlock', 'account'],
        category: IncidentCategory.ACCESS,
        subcategory: 'Password Reset',
        priority: Priority.LOW,
        urgency: Urgency.MEDIUM,
        impact: Impact.LOW,
        assignmentGroup: 'Service Desk',
        confidence: 85,
        active: true,
      },
      {
        id: 'email-issue',
        name: 'Email Problems',
        description: 'Issues with email access or functionality',
        keywords: ['email', 'outlook', 'mail', 'exchange', 'inbox', 'sending', 'receiving'],
        category: IncidentCategory.SOFTWARE,
        subcategory: 'Email',
        priority: Priority.MEDIUM,
        urgency: Urgency.HIGH,
        impact: Impact.MEDIUM,
        assignmentGroup: 'Email Support',
        confidence: 80,
        active: true,
      },
      {
        id: 'printer-issue',
        name: 'Printer Problems',
        description: 'Issues with printing functionality',
        keywords: ['printer', 'print', 'printing', 'paper jam', 'toner', 'offline'],
        category: IncidentCategory.HARDWARE,
        subcategory: 'Printer',
        priority: Priority.LOW,
        urgency: Urgency.LOW,
        impact: Impact.LOW,
        assignmentGroup: 'Hardware Support',
        confidence: 90,
        active: true,
      },
      {
        id: 'network-outage',
        name: 'Network Connectivity Issues',
        description: 'Network connectivity problems',
        keywords: ['network', 'internet', 'connection', 'wifi', 'lan', 'connectivity', 'slow'],
        category: IncidentCategory.NETWORK,
        subcategory: 'Connectivity',
        priority: Priority.HIGH,
        urgency: Urgency.HIGH,
        impact: Impact.HIGH,
        assignmentGroup: 'Network Team',
        confidence: 85,
        active: true,
      },
      {
        id: 'software-crash',
        name: 'Application Crash or Error',
        description: 'Software application crashes or errors',
        keywords: ['crash', 'error', 'freeze', 'hang', 'blue screen', 'application', 'software'],
        category: IncidentCategory.SOFTWARE,
        subcategory: 'Application Error',
        priority: Priority.MEDIUM,
        urgency: Urgency.MEDIUM,
        impact: Impact.MEDIUM,
        assignmentGroup: 'Application Support',
        confidence: 75,
        active: true,
      },
      {
        id: 'security-incident',
        name: 'Security Related Issues',
        description: 'Security incidents or concerns',
        keywords: ['security', 'virus', 'malware', 'suspicious', 'phishing', 'breach', 'unauthorized'],
        category: IncidentCategory.ACCESS,
        subcategory: 'Security',
        priority: Priority.CRITICAL,
        urgency: Urgency.CRITICAL,
        impact: Impact.HIGH,
        assignmentGroup: 'Security Team',
        confidence: 95,
        active: true,
      },
    ];
  }

  /**
   * Add a new classification rule
   */
  public addRule(rule: Omit<ClassificationRule, 'id'>): void {
    const newRule: ClassificationRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    this.rules.push(newRule);
  }

  /**
   * Update an existing classification rule
   */
  public updateRule(id: string, updates: Partial<ClassificationRule>): boolean {
    const index = this.rules.findIndex(rule => rule.id === id);
    if (index === -1) return false;

    this.rules[index] = { ...this.rules[index], ...updates } as ClassificationRule;
    return true;
  }

  /**
   * Get all classification rules
   */
  public getRules(): ClassificationRule[] {
    return [...this.rules];
  }

  /**
   * Get active classification rules only
   */
  public getActiveRules(): ClassificationRule[] {
    return this.rules.filter(rule => rule.active);
  }
}