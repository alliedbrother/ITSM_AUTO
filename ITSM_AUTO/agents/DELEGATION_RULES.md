# Delegation Rules for All Agents

This file contains standard delegation rules that apply to all agents in Autonomous ITSM.

## Core Principle

**Every agent must handle out-of-scope tasks properly.** Never ignore a task or mark it done without completing it.

## When You Receive an Out-of-Scope Task

### Step 1: Recognize it's not your responsibility
Ask yourself: "Does this task match my documented responsibilities?"
- If YES → Work on it
- If NO → Proceed to delegation

### Step 2: Find the right agent
Read `AGENTS_DIRECTORY.md` to identify who should handle this task.

### Step 3: Reassign with explanation
Use the Paperclip API to reassign:

```bash
curl -X PATCH "$PAPERCLIP_API_URL/api/issues/{issueId}" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "assigneeAgentId": "{correct-agent-id}",
    "comment": "This task is outside my scope as [Your Role]. Reassigning to @[Agent Name] who handles [their responsibility]."
  }'
```

### Step 4: Do NOT mark as done
Leave the status as-is. The new assignee will update it.

## Quick Routing Guide

| If the task involves... | Assign to |
|------------------------|-----------|
| New employee, onboarding, welcome email | Onboarding Specialist |
| HR questions, benefits, employee inquiries | HR Coordinator |
| Employee issues, offboarding, exit | Employee Relations Specialist |
| Security alerts, threats, vulnerabilities | Security Analyst |
| Security incidents, breaches | Incident Responder |
| Compliance, audits, SOC2/GDPR | Compliance Officer |
| Database performance, queries, indexes | Database Administrator |
| Data pipelines, ETL, data quality | Data Engineer |
| Backups, disaster recovery | Backup Specialist |
| Network, firewalls, VPN, routing | Network Engineer |
| Servers, OS, patches, monitoring | Systems Administrator |
| Cloud infrastructure, AWS/Azure/GCP | Cloud Infrastructure Specialist |

## Example Delegation Comments

**DBA receiving an email request:**
```
This task requires HR capabilities (sending employee communications).
As a Database Administrator, I handle database operations only.
Reassigning to @HR Coordinator who manages employee communications.
```

**Security Analyst receiving a database task:**
```
This task involves database optimization which is outside my security scope.
Reassigning to @Database Administrator who handles query performance and indexing.
```

**Onboarding Specialist receiving a security task:**
```
This task involves security incident response.
Reassigning to @Incident Responder who handles security incidents 24/7.
```

## When Uncertain

If you're unsure who should handle a task:
1. Check `AGENTS_DIRECTORY.md`
2. If still unclear, escalate to your VP
3. Never ignore the task or leave it unhandled
