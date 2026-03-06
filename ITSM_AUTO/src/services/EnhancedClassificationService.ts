import {
  ClassificationInput,
  ClassificationResult,
  IncidentCategory,
  Priority,
  Urgency,
  Impact,
} from '../types/incident';
import { ClassificationAgent } from '../agents/ClassificationAgent';
import { ClassificationService } from './ClassificationService';

/**
 * Enhanced Classification Service that combines rule-based and AI-based classification
 */
export class EnhancedClassificationService extends ClassificationService {
  private classificationAgent: ClassificationAgent;
  private confidenceThreshold = 70; // Threshold for using rule-based vs AI classification

  constructor() {
    super();
    this.classificationAgent = new ClassificationAgent();
  }

  /**
   * Enhanced classification that uses both rule-based and AI approaches
   */
  public override async classify(input: ClassificationInput): Promise<ClassificationResult> {
    try {
      // First, try rule-based classification
      const ruleBasedResult = await super.classify(input);

      // If rule-based classification has high confidence, use it
      if (ruleBasedResult.confidence >= this.confidenceThreshold) {
        return {
          ...ruleBasedResult,
          reasoning: `Rule-based classification (${ruleBasedResult.confidence}% confidence): ${ruleBasedResult.reasoning}`
        };
      }

      // Otherwise, use AI classification
      const aiInput = {
        shortDescription: input.shortDescription,
        description: input.description,
        caller: input.caller,
        ...(input.affectedServices && { affectedServices: input.affectedServices }),
        ...(input.businessImpact && { businessImpact: input.businessImpact })
      };
      const aiResult = await this.classificationAgent.classifyIncident(aiInput);

      // Apply business logic to AI result as well
      const adjustedAiResult = this.applyBusinessLogicToAiResult(aiResult, input);

      return {
        ...adjustedAiResult,
        reasoning: `AI classification (${adjustedAiResult.confidence}% confidence): ${adjustedAiResult.reasoning}. Rule-based had ${ruleBasedResult.confidence}% confidence.`
      };
    } catch (error) {
      console.error('Enhanced classification failed:', error);
      // Fallback to rule-based classification
      const fallbackResult = await super.classify(input);
      return {
        ...fallbackResult,
        reasoning: `Fallback rule-based classification due to AI error: ${fallbackResult.reasoning}`,
        confidence: Math.max(30, fallbackResult.confidence - 20) // Reduce confidence due to fallback
      };
    }
  }

  /**
   * Apply business logic adjustments to AI classification results
   */
  private applyBusinessLogicToAiResult(aiResult: any, input: ClassificationInput): ClassificationResult {
    let adjusted = { ...aiResult };

    // Adjust priority based on user department
    if (input.caller?.department === 'Executive' || input.caller?.department === 'Finance') {
      adjusted.priority = this.increasePriorityLocal(adjusted.priority);
      adjusted.urgency = this.increaseUrgencyLocal(adjusted.urgency);
      adjusted.reasoning += ' Priority increased for executive/finance department.';
    }

    // Adjust based on business impact keywords
    const businessImpactText = `${input.businessImpact || ''} ${input.description}`.toLowerCase();
    if (businessImpactText.includes('production') ||
        businessImpactText.includes('outage') ||
        businessImpactText.includes('down') ||
        businessImpactText.includes('critical')) {
      adjusted.priority = Priority.CRITICAL;
      adjusted.urgency = Urgency.CRITICAL;
      adjusted.impact = Impact.HIGH;
      adjusted.reasoning += ' Elevated to critical due to production impact.';
    }

    // Adjust based on affected services
    if (input.affectedServices?.includes('Email') ||
        input.affectedServices?.includes('Network')) {
      adjusted.impact = Impact.HIGH;
      adjusted.urgency = this.increaseUrgencyLocal(adjusted.urgency);
      adjusted.reasoning += ' Impact increased due to critical service affected.';
    }

    return adjusted;
  }

  /**
   * Get classification with hybrid approach explanation
   */
  public async classifyWithExplanation(input: ClassificationInput): Promise<ClassificationResult & { approach: string }> {
    const result = await this.classify(input);

    let approach = 'hybrid';
    if (result.reasoning.includes('Rule-based classification')) {
      approach = 'rule-based';
    } else if (result.reasoning.includes('AI classification')) {
      approach = 'ai-enhanced';
    } else if (result.reasoning.includes('Fallback')) {
      approach = 'fallback';
    }

    return {
      ...result,
      approach
    };
  }

  /**
   * Set the confidence threshold for rule-based vs AI classification
   */
  public setConfidenceThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 100) {
      throw new Error('Confidence threshold must be between 0 and 100');
    }
    this.confidenceThreshold = threshold;
  }

  /**
   * Get current confidence threshold
   */
  public getConfidenceThreshold(): number {
    return this.confidenceThreshold;
  }

  /**
   * Force AI classification (bypass rule-based)
   */
  public async classifyWithAI(input: ClassificationInput): Promise<ClassificationResult> {
    try {
      const aiInput = {
        shortDescription: input.shortDescription,
        description: input.description,
        caller: input.caller,
        ...(input.affectedServices && { affectedServices: input.affectedServices }),
        ...(input.businessImpact && { businessImpact: input.businessImpact })
      };
      const aiResult = await this.classificationAgent.classifyIncident(aiInput);

      return this.applyBusinessLogicToAiResult(aiResult, input);
    } catch (error) {
      console.error('AI classification failed:', error);
      throw new Error(`AI classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Force rule-based classification only
   */
  public async classifyWithRules(input: ClassificationInput): Promise<ClassificationResult> {
    return super.classify(input);
  }

  /**
   * Compare rule-based vs AI classification
   */
  public async compareClassificationMethods(input: ClassificationInput): Promise<{
    ruleBased: ClassificationResult;
    ai: ClassificationResult;
    recommendation: 'rule-based' | 'ai' | 'review-needed';
  }> {
    const [ruleBasedResult, aiResult] = await Promise.allSettled([
      this.classifyWithRules(input),
      this.classifyWithAI(input)
    ]);

    const ruleBased = ruleBasedResult.status === 'fulfilled' ? ruleBasedResult.value : null;
    const ai = aiResult.status === 'fulfilled' ? aiResult.value : null;

    let recommendation: 'rule-based' | 'ai' | 'review-needed' = 'review-needed';

    if (ruleBased && ai) {
      if (ruleBased.confidence > ai.confidence && ruleBased.confidence > this.confidenceThreshold) {
        recommendation = 'rule-based';
      } else if (ai.confidence > this.confidenceThreshold) {
        recommendation = 'ai';
      }
    } else if (ruleBased && ruleBased.confidence > this.confidenceThreshold) {
      recommendation = 'rule-based';
    } else if (ai && ai.confidence > this.confidenceThreshold) {
      recommendation = 'ai';
    }

    return {
      ruleBased: ruleBased || {
        category: IncidentCategory.OTHER,
        subcategory: 'Classification Failed',
        priority: Priority.MEDIUM,
        urgency: Urgency.MEDIUM,
        impact: Impact.MEDIUM,
        assignmentGroup: 'Service Desk',
        confidence: 0,
        reasoning: 'Rule-based classification failed',
        suggestedActions: ['Review incident manually']
      },
      ai: ai || {
        category: IncidentCategory.OTHER,
        subcategory: 'Classification Failed',
        priority: Priority.MEDIUM,
        urgency: Urgency.MEDIUM,
        impact: Impact.MEDIUM,
        assignmentGroup: 'Service Desk',
        confidence: 0,
        reasoning: 'AI classification failed',
        suggestedActions: ['Review incident manually']
      },
      recommendation
    };
  }

  private increasePriorityLocal(current: Priority): Priority {
    const priorities = [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL];
    const currentIndex = priorities.indexOf(current);
    return priorities[Math.min(currentIndex + 1, priorities.length - 1)] as Priority;
  }

  private increaseUrgencyLocal(current: Urgency): Urgency {
    const urgencies = [Urgency.LOW, Urgency.MEDIUM, Urgency.HIGH, Urgency.CRITICAL];
    const currentIndex = urgencies.indexOf(current);
    return urgencies[Math.min(currentIndex + 1, urgencies.length - 1)] as Urgency;
  }
}