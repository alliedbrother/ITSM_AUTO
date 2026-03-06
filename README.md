# Autonomous ITSM

**[Live App](http://54.235.179.120:3100)** | [GitHub](https://github.com/alliedbrother/ITSM_AUTO)

An AI-native IT Service Management platform powered by autonomous agents. Each agent has specialized expertise, can delegate tasks, and operates within a hierarchical organizational structure.

## Architecture

```
                              ┌─────────────────┐
                              │       CEO       │
                              │  Strategic Lead │
                              └────────┬────────┘
                                       │
         ┌─────────────────┬───────────┼───────────┬─────────────────┐
         │                 │           │           │                 │
         ▼                 ▼           ▼           ▼                 ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐
│   VP Security   │ │ VP Database │ │VP Networking│ │     VP HR       │
│                 │ │             │ │             │ │                 │
│ • Threat Mgmt   │ │ • DB Ops    │ │ • Infra     │ │ • People Ops    │
│ • Compliance    │ │ • Data Eng  │ │ • Cloud     │ │ • Onboarding    │
│ • Incidents     │ │ • Backups   │ │ • Servers   │ │ • Relations     │
└────────┬────────┘ └──────┬──────┘ └──────┬──────┘ └────────┬────────┘
         │                 │               │                 │
    ┌────┴────┐       ┌────┴────┐     ┌────┴────┐       ┌────┴────┐
    │ 3 Agents│       │ 3 Agents│     │ 3 Agents│       │ 3 Agents│
    └─────────┘       └─────────┘     └─────────┘       └─────────┘
```

## Agents

### Executive

| Agent | Role | Responsibilities |
|-------|------|------------------|
| **CEO** | Chief Executive Officer | Strategic leadership, cross-department coordination, VP escalations, major approvals |

---

### Security Department

| Agent | Role | Key Capabilities |
|-------|------|------------------|
| **VP Security** | Department Head | Team management, security policy decisions, incident oversight, access approvals |
| **Security Analyst** | Threat Detection | SIEM monitoring, vulnerability scans, access reviews, security alerts |
| **Incident Responder** | Breach Response | Incident containment, forensics, account lockdown, system isolation |
| **Compliance Officer** | Audit & Policy | SOC2/GDPR/HIPAA compliance, security audits, policy enforcement |

**AWS Access:** SecurityHub, GuardDuty, CloudTrail, Inspector, IAM analysis

---

### Database Department

| Agent | Role | Key Capabilities |
|-------|------|------------------|
| **VP Database** | Department Head | Database strategy, team management, escalation handling |
| **DBA** | Database Admin | Query optimization, schema migrations, replication, PostgreSQL/MySQL/MongoDB |
| **Data Engineer** | Data Pipelines | ETL processes, data warehousing, data quality, pipeline orchestration |
| **Backup Specialist** | Disaster Recovery | Backup strategies, data restoration, RPO/RTO compliance |

**AWS Access:** RDS, database management, backup operations

---

### Networking & Infrastructure

| Agent | Role | Key Capabilities |
|-------|------|------------------|
| **VP Networking** | Department Head | Infrastructure strategy, team management, escalation handling |
| **Network Engineer** | Network Ops | Routing, firewalls, VPNs, network troubleshooting, DNS |
| **SysAdmin** | Server Management | Linux/Windows admin, OS patches, system monitoring, file operations |
| **Cloud Specialist** | Cloud Infrastructure | AWS/Azure/GCP, EC2/VPC management, Terraform, Kubernetes |

**AWS Access:** EC2, VPC, Route53, S3, CloudWatch, full infrastructure control

---

### Human Resources

| Agent | Role | Key Capabilities |
|-------|------|------------------|
| **VP HR** | Department Head | HR strategy, team management, escalation handling |
| **HR Coordinator** | HR Services | Employee inquiries, benefits admin, general HR tickets |
| **Onboarding Specialist** | New Hires | Account provisioning, equipment setup, orientation, welcome emails |
| **Employee Relations** | People Issues | Offboarding, exit interviews, workplace concerns |

---

## How It Works

### Ticket Routing

Tickets are automatically routed based on type and urgency:

```
┌──────────────────────────────────────────────────────────────────┐
│                        TICKET SUBMITTED                          │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Is it cross-department?     │
              └───────────────┬───────────────┘
                    │                 │
                   YES               NO
                    │                 │
                    ▼                 ▼
              ┌─────────┐    ┌───────────────────┐
              │   CEO   │    │ Route to Dept VP  │
              └─────────┘    └─────────┬─────────┘
                                       │
                              ┌────────┴────────┐
                              │ VP assigns to   │
                              │ specialist      │
                              └─────────────────┘
```

### Example: Security Incident

```
1. Alert: "Suspicious login from unknown IP"
   └─► Assigned to: VP Security

2. VP Security triages severity (P2 - High)
   └─► Delegates to: Incident Responder

3. Incident Responder contains threat:
   • Disables compromised account
   • Isolates affected systems
   • Collects forensic evidence

4. Post-incident:
   └─► Compliance Officer documents for audit
```

### Example: New Employee Onboarding

```
1. Ticket: "Onboard new engineer: Jane Doe"
   └─► Assigned to: VP HR

2. VP HR delegates:
   └─► Onboarding Specialist

3. Onboarding Specialist:
   • Creates email account
   • Provisions system access
   • Sends welcome email
   • Schedules orientation
```

### Example: Database Performance Issue

```
1. Alert: "Production DB queries timing out"
   └─► Assigned to: VP Database

2. VP Database triages:
   └─► Delegates to: DBA

3. DBA investigates:
   • Analyzes slow query log
   • Identifies missing index
   • Applies optimization

4. If backup needed:
   └─► Backup Specialist assists with restore
```

---

## Delegation Protocol

Agents delegate using the Paperclip API:

```bash
curl -X PATCH "$PAPERCLIP_API_URL/api/issues/{issueId}" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "assigneeAgentId": "{target-agent-id}",
    "status": "todo",
    "comment": "Delegating to @AgentName for specialized handling."
  }'
```

### Escalation Rules

| Situation | Escalate To |
|-----------|-------------|
| Cross-department issue | CEO |
| Budget approval > $5000 | CEO |
| Customer data breach | CEO + VP Security |
| Policy exception needed | VP of department |
| Technical blocker | VP of department |
| Legal/regulatory issue | CEO |

---

## Tech Stack

- **Platform:** [Paperclip](./paperclip/) - AI agent orchestration
- **Agents:** Claude-powered autonomous agents
- **Infrastructure:** AWS (EC2, RDS, VPC, IAM, SecurityHub, GuardDuty)
- **Database:** PostgreSQL (embedded in Paperclip)

---

## Directory Structure

```
itsmaiorg/
├── ITSM_AUTO/
│   ├── agents/
│   │   ├── ceo/                    # Executive agent
│   │   ├── security/               # Security department
│   │   │   ├── vp-security/
│   │   │   ├── security-analyst/
│   │   │   ├── incident-responder/
│   │   │   └── compliance-officer/
│   │   ├── database/               # Database department
│   │   │   ├── vp-database/
│   │   │   ├── dba/
│   │   │   ├── data-engineer/
│   │   │   └── backup-specialist/
│   │   ├── networking/             # Infrastructure department
│   │   │   ├── vp-networking/
│   │   │   ├── network-engineer/
│   │   │   ├── sysadmin/
│   │   │   └── cloud-specialist/
│   │   └── hr/                     # Human Resources department
│   │       ├── vp-hr/
│   │       ├── hr-coordinator/
│   │       ├── onboarding-specialist/
│   │       └── employee-relations/
│   ├── skills/                     # Shared agent skills
│   └── AGENTS_DIRECTORY.md         # Full agent reference
└── paperclip/                      # Paperclip platform
```

---

## Creating Issues

### Via the UI

1. Open the [Live App](http://54.235.179.120:3100)
2. Navigate to **Issues** in the sidebar
3. Click **New Issue**
4. Fill in title, description, and assign to an agent
5. Submit - the assigned agent will pick it up automatically

### Via the API

```bash
curl -X POST "http://54.235.179.120:3100/api/issues" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Your issue title",
    "description": "Detailed description of the issue",
    "priority": "high",
    "assigneeAgentId": "vp-security"
  }'
```

The agent will process the issue and delegate to specialists as needed.
