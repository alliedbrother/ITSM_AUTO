# Agents Directory

This file lists all agents in Autonomous ITSM and their responsibilities. Use this to delegate tasks to the appropriate agent when a request is outside your scope.

## How to Delegate

When you receive a task outside your responsibilities:
1. Identify the appropriate agent from the directory below
2. Reassign the task using: `PATCH /api/issues/{issueId}` with `{"assigneeAgentId": "<agent-id>", "comment": "Reassigning to @AgentName - this task is better suited for their expertise."}`
3. Do NOT mark the task as done - let the new assignee handle it

---

## Executive Leadership

| Agent | Title | Agent ID | Responsibilities |
|-------|-------|----------|------------------|
| **Chief Executive Officer** | CEO | `ceo` | Strategic leadership, coordinates VPs, approves major changes, escalation point for cross-team issues |

---

## Human Resources Department

| Agent | Title | Agent ID | Responsibilities |
|-------|-------|----------|------------------|
| **VP Human Resources** | VP of HR | `vp-hr` | Manages HR operations, oversees HR team, handles escalations |
| **Onboarding Specialist** | Employee Onboarding Specialist | `onboarding-specialist` | New hire onboarding, account provisioning, equipment setup, orientation, welcome emails |
| **HR Coordinator** | HR Coordinator | `hr-coordinator` | HR service requests, employee inquiries, benefits administration, general HR tickets |
| **Employee Relations Specialist** | Employee Relations Specialist | `employee-relations` | Employee relations issues, offboarding, exit interviews, workplace concerns |

**Delegate HR tasks to:**
- New employee setup → Onboarding Specialist
- General HR questions → HR Coordinator
- Employee issues/offboarding → Employee Relations Specialist
- Escalations → VP Human Resources

---

## Security Department

| Agent | Title | Agent ID | Responsibilities |
|-------|-------|----------|------------------|
| **VP Security** | VP of Security | `vp-security` | Leads security operations, oversees security team, handles escalations |
| **Security Analyst** | Security Analyst | `security-analyst` | Security monitoring, threat analysis, vulnerability assessments, security alerts |
| **Incident Responder** | Security Incident Responder | `incident-responder` | Security incidents, forensics, breach response, containment (24/7 on-call) |
| **Compliance Officer** | Security Compliance Officer | `compliance-officer` | SOC2/GDPR/HIPAA compliance, audits, security policies, regulatory requirements |

**Delegate security tasks to:**
- Security alerts/threats → Security Analyst
- Active security incidents → Incident Responder
- Compliance/audit questions → Compliance Officer
- Escalations → VP Security

---

## Database Department

| Agent | Title | Agent ID | Responsibilities |
|-------|-------|----------|------------------|
| **VP Database** | VP of Database Operations | `vp-database` | Manages database operations, oversees database team, handles escalations |
| **Database Administrator** | Senior DBA | `dba` | Database performance, query optimization, indexes, replication, schema migrations (PostgreSQL, MySQL, MongoDB) |
| **Data Engineer** | Data Engineer | `data-engineer` | Data pipelines, ETL processes, data warehousing, data quality |
| **Backup Specialist** | Backup & Recovery Specialist | `backup-specialist` | Backup strategies, disaster recovery, data restoration, RPO/RTO compliance |

**Delegate database tasks to:**
- Slow queries/performance → Database Administrator
- Data pipelines/ETL → Data Engineer
- Backup/recovery → Backup Specialist
- Escalations → VP Database

---

## Networking & Infrastructure Department

| Agent | Title | Agent ID | Responsibilities |
|-------|-------|----------|------------------|
| **VP Networking** | VP of Networking | `vp-networking` | Oversees network and infrastructure team, handles escalations |
| **Network Engineer** | Senior Network Engineer | `network-engineer` | Network infrastructure, routing, switching, firewalls, VPNs, network troubleshooting |
| **Systems Administrator** | Systems Administrator | `sysadmin` | Server management, OS patches, system monitoring, Linux/Windows administration |
| **Cloud Infrastructure Specialist** | Cloud Infrastructure Specialist | `cloud-specialist` | AWS/Azure/GCP, Terraform, Kubernetes, cloud cost optimization |

**Delegate infrastructure tasks to:**
- Network issues → Network Engineer
- Server/OS issues → Systems Administrator
- Cloud infrastructure → Cloud Infrastructure Specialist
- Escalations → VP Networking

---

## Quick Reference: Common Task Routing

| Task Type | Assign To |
|-----------|-----------|
| New employee onboarding | Onboarding Specialist |
| Send company emails/communications | HR Coordinator |
| Password reset / access issues | Systems Administrator |
| Database slow/errors | Database Administrator |
| Security alert | Security Analyst |
| Network connectivity | Network Engineer |
| Cloud infrastructure | Cloud Infrastructure Specialist |
| Compliance questions | Compliance Officer |
| Employee complaints | Employee Relations Specialist |
| Data pipeline issues | Data Engineer |
| Backup/restore requests | Backup Specialist |

---

## Out-of-Scope Handling

If you receive a task that is not in your area of expertise:

1. **Do NOT attempt the task** if you lack the skills/access
2. **Check this directory** to find the right agent
3. **Reassign with a comment** explaining why:
   ```
   This task requires [HR/Security/Database/Network] expertise.
   Reassigning to @AgentName who handles [specific responsibility].
   ```
4. **Escalate to your VP** if unclear who should handle it
