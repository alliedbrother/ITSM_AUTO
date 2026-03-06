import { ClassificationService } from '../../src/services/ClassificationService';
import { IncidentCategory, Priority, Urgency, Impact } from '../../src/types/incident';

describe('ClassificationService', () => {
  let service: ClassificationService;

  beforeEach(() => {
    service = new ClassificationService();
  });

  describe('classify', () => {
    it('should classify password reset requests correctly', async () => {
      const input = {
        shortDescription: 'Cannot login - forgot password',
        description: 'User cannot access their account and needs password reset',
        caller: {
          id: '1',
          username: 'john.doe',
          name: 'John Doe',
          email: 'john.doe@company.com',
          department: 'Marketing',
          title: 'Marketing Specialist',
          location: 'New York',
        },
      };

      const result = await service.classify(input);

      expect(result.category).toBe(IncidentCategory.ACCESS);
      expect(result.subcategory).toBe('Password Reset');
      expect(result.priority).toBe(Priority.LOW);
      expect(result.assignmentGroup).toBe('Service Desk');
      expect(result.confidence).toBeGreaterThan(80);
      expect(result.reasoning).toContain('password');
      expect(result.suggestedActions).toContain('Reset user password in Active Directory');
    });

    it('should classify email issues correctly', async () => {
      const input = {
        shortDescription: 'Outlook not receiving emails',
        description: 'Cannot receive emails in Outlook application',
        caller: {
          id: '2',
          username: 'jane.smith',
          name: 'Jane Smith',
          email: 'jane.smith@company.com',
          department: 'Sales',
          title: 'Sales Representative',
          location: 'Boston',
        },
      };

      const result = await service.classify(input);

      expect(result.category).toBe(IncidentCategory.SOFTWARE);
      expect(result.subcategory).toBe('Email');
      expect(result.assignmentGroup).toBe('Email Support');
      expect(result.confidence).toBeGreaterThan(70);
    });

    it('should classify security incidents as critical', async () => {
      const input = {
        shortDescription: 'Suspicious email with virus attachment',
        description: 'Received suspicious email that might contain malware',
        caller: {
          id: '3',
          username: 'bob.johnson',
          name: 'Bob Johnson',
          email: 'bob.johnson@company.com',
          department: 'IT',
          title: 'IT Specialist',
          location: 'Chicago',
        },
      };

      const result = await service.classify(input);

      expect(result.category).toBe(IncidentCategory.ACCESS);
      expect(result.subcategory).toBe('Security');
      expect(result.priority).toBe(Priority.CRITICAL);
      expect(result.urgency).toBe(Urgency.CRITICAL);
      expect(result.assignmentGroup).toBe('Security Team');
    });

    it('should handle executive users with higher priority', async () => {
      const input = {
        shortDescription: 'Printer not working',
        description: 'Office printer is offline',
        caller: {
          id: '4',
          username: 'ceo.smith',
          name: 'CEO Smith',
          email: 'ceo@company.com',
          department: 'Executive',
          title: 'Chief Executive Officer',
          location: 'HQ',
        },
      };

      const result = await service.classify(input);

      expect(result.category).toBe(IncidentCategory.HARDWARE);
      expect(result.priority).toBe(Priority.MEDIUM); // Increased from LOW
    });

    it('should handle production outage keywords with critical priority', async () => {
      const input = {
        shortDescription: 'Production system down',
        description: 'Critical production system is down affecting all users',
        caller: {
          id: '5',
          username: 'tech.lead',
          name: 'Tech Lead',
          email: 'tech@company.com',
          department: 'Engineering',
          title: 'Technical Lead',
          location: 'Remote',
        },
        businessImpact: 'Production outage affecting all customers',
      };

      const result = await service.classify(input);

      expect(result.priority).toBe(Priority.CRITICAL);
      expect(result.urgency).toBe(Urgency.CRITICAL);
      expect(result.impact).toBe(Impact.HIGH);
    });

    it('should provide default classification for unknown issues', async () => {
      const input = {
        shortDescription: 'Strange system behavior',
        description: 'Something weird is happening with my computer but not sure what',
        caller: {
          id: '6',
          username: 'user.unknown',
          name: 'User Unknown',
          email: 'user@company.com',
          department: 'Support',
          title: 'Support Analyst',
          location: 'Remote',
        },
      };

      const result = await service.classify(input);

      expect(result.category).toBe(IncidentCategory.OTHER);
      expect(result.subcategory).toBe('General');
      expect(result.priority).toBe(Priority.MEDIUM);
      expect(result.assignmentGroup).toBe('Service Desk');
      expect(result.confidence).toBe(30);
      expect(result.reasoning).toContain('No specific classification rules matched');
    });

    it('should calculate confidence based on keyword matches', async () => {
      const input = {
        shortDescription: 'Password reset needed urgently',
        description: 'User account is locked and password needs reset for login access',
        caller: {
          id: '7',
          username: 'test.user',
          name: 'Test User',
          email: 'test@company.com',
          department: 'Testing',
          title: 'QA Engineer',
          location: 'Lab',
        },
      };

      const result = await service.classify(input);

      // Should have high confidence due to multiple keyword matches (password, reset, account, login, access)
      expect(result.confidence).toBeGreaterThan(85);
    });
  });

  describe('rule management', () => {
    it('should allow adding new rules', () => {
      const initialRuleCount = service.getRules().length;

      service.addRule({
        name: 'Test Rule',
        description: 'Test rule for testing',
        keywords: ['test', 'testing'],
        category: IncidentCategory.OTHER,
        subcategory: 'Test',
        priority: Priority.LOW,
        urgency: Urgency.LOW,
        impact: Impact.LOW,
        assignmentGroup: 'Test Team',
        confidence: 50,
        active: true,
      });

      expect(service.getRules()).toHaveLength(initialRuleCount + 1);
    });

    it('should allow updating existing rules', () => {
      const rules = service.getRules();
      const firstRule = rules[0];

      if (firstRule) {
        const updated = service.updateRule(firstRule.id, {
          name: 'Updated Rule Name',
          confidence: 95,
        });

        expect(updated).toBe(true);

        const updatedRules = service.getRules();
        const updatedRule = updatedRules.find(r => r.id === firstRule.id);

        expect(updatedRule?.name).toBe('Updated Rule Name');
        expect(updatedRule?.confidence).toBe(95);
      }
    });

    it('should return false when updating non-existent rule', () => {
      const updated = service.updateRule('non-existent-id', {
        name: 'Should not work',
      });

      expect(updated).toBe(false);
    });

    it('should return only active rules when requested', () => {
      const allRules = service.getRules();
      const activeRules = service.getActiveRules();

      expect(activeRules.length).toBeLessThanOrEqual(allRules.length);
      expect(activeRules.every(rule => rule.active)).toBe(true);
    });
  });
});