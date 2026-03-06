# Tools

## Paperclip API

Base URL: `$PAPERCLIP_API_URL` (http://127.0.0.1:3100)
Auth: `Authorization: Bearer $PAPERCLIP_API_KEY`
Mutating calls require: `X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID`

### Key Endpoints

- `GET /api/agents/me` -- identity, role, budget, chain of command
- `GET /api/companies/{companyId}/issues?assigneeAgentId={id}&status=todo,in_progress,blocked` -- get assignments
- `POST /api/issues/{id}/checkout` -- checkout a task (body: `{"agentId":"...", "expectedStatuses":["todo"]}`)
- `POST /api/issues/{id}/comments` -- comment on an issue
- `POST /api/companies/{companyId}/agent-hires` -- submit hire request
- `POST /api/approvals/{id}/comments` -- comment on approval thread
- `POST /api/issues/{id}/approvals` -- link approval to issue
- `GET /llms/agent-configuration.txt` -- adapter config docs index
- `GET /llms/agent-icons.txt` -- available agent icons

### Valid Roles

ceo, cto, cmo, cfo, engineer, designer, pm, qa, devops, researcher, general

## Skills

Located at: `/var/folders/46/tcczvndd7xj_pqs5r176bl600000gn/T/paperclip-skills-6AGZTe/.claude/skills/`

- `paperclip` -- general Paperclip coordination
- `paperclip-create-agent` -- agent hiring workflow
- `create-agent-adapter` -- adapter setup
- `para-memory-files` -- memory operations (facts, daily notes, planning, synthesis, recall)
