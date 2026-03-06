"""Department to agent mapping configuration."""

from typing import Dict, List


# Keywords that indicate a department
DEPARTMENT_KEYWORDS: Dict[str, List[str]] = {
    "security": [
        "security", "breach", "hack", "hacked", "hacking", "compliance", "audit",
        "vulnerability", "threat", "malware", "phishing", "intrusion", "firewall",
        "authentication", "authorization", "encrypt", "soc2", "gdpr", "hipaa",
        "penetration", "incident", "forensic"
    ],
    "database": [
        "database", "db", "query", "sql", "mysql", "postgres", "postgresql",
        "mongodb", "backup", "restore", "etl", "data pipeline", "slow query",
        "index", "replication", "migration", "schema", "table", "record"
    ],
    "networking": [
        "network", "server", "cloud", "aws", "azure", "gcp", "infrastructure",
        "dns", "vpn", "firewall", "load balancer", "kubernetes", "k8s", "docker",
        "terraform", "connectivity", "latency", "bandwidth", "routing", "proxy",
        "ssl", "certificate", "domain"
    ],
    "hr": [
        "hr", "human resources", "employee", "onboarding", "offboarding",
        "benefits", "hiring", "recruit", "payroll", "pto", "vacation", "leave",
        "training", "performance review", "compensation", "salary", "termination"
    ]
}

# Map department to VP agent ID
DEPARTMENT_TO_AGENT: Dict[str, str] = {
    "security": "vp-security",
    "database": "vp-database",
    "networking": "vp-networking",
    "hr": "vp-hr",
    "executive": "ceo"  # For cross-department or unclear issues
}

# Department display names
DEPARTMENT_NAMES: Dict[str, str] = {
    "security": "Security",
    "database": "Database Operations",
    "networking": "Networking & Infrastructure",
    "hr": "Human Resources",
    "executive": "Executive"
}


def classify_department_by_keywords(text: str) -> str | None:
    """Classify text to a department based on keyword matching.

    Returns department key or None if no clear match.
    """
    text_lower = text.lower()
    scores: Dict[str, int] = {}

    for department, keywords in DEPARTMENT_KEYWORDS.items():
        score = sum(1 for keyword in keywords if keyword in text_lower)
        if score > 0:
            scores[department] = score

    if not scores:
        return None

    # Return department with highest score
    return max(scores, key=lambda k: scores[k])


def get_agent_for_department(department: str) -> str:
    """Get the agent ID for a given department."""
    return DEPARTMENT_TO_AGENT.get(department, "ceo")
