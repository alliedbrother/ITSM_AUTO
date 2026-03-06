#!/usr/bin/env python3
"""
Gmail SMTP Email Tool for ITSM Agents
Usage: python3 send_email.py --to "email@example.com" --subject "Subject" --body "Email body"
       python3 send_email.py --to "email@example.com" --template welcome --name "John Smith"

Setup:
1. Enable 2FA on your Gmail account
2. Create App Password: Google Account → Security → 2-Step Verification → App passwords
3. Set environment variables:
   export GMAIL_USER="your.email@gmail.com"
   export GMAIL_APP_PASSWORD="your-16-char-app-password"
"""

import argparse
import json
import os
import smtplib
import sys
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Gmail SMTP configuration - load from env or config file
def load_credentials():
    """Load Gmail credentials from environment or config file"""
    user = os.environ.get("GMAIL_USER", "")
    password = os.environ.get("GMAIL_APP_PASSWORD", "")

    # If not in env, try loading from config file
    if not user or not password:
        config_paths = [
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env.email"),
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "email_config.json"),
        ]
        for config_path in config_paths:
            if os.path.exists(config_path):
                if config_path.endswith(".json"):
                    with open(config_path) as f:
                        config = json.load(f)
                        user = config.get("gmail_user", user)
                        password = config.get("gmail_app_password", password)
                else:
                    # Parse shell-style config
                    with open(config_path) as f:
                        for line in f:
                            line = line.strip()
                            if line.startswith("export GMAIL_USER="):
                                user = line.split("=", 1)[1].strip('"\'')
                            elif line.startswith("export GMAIL_APP_PASSWORD="):
                                password = line.split("=", 1)[1].strip('"\'')
                break
    return user, password

GMAIL_USER, GMAIL_APP_PASSWORD = load_credentials()
FROM_NAME = os.environ.get("ITSM_FROM_NAME", "Autonomous ITSM HR")

# Email templates
TEMPLATES = {
    "welcome": {
        "subject": "Welcome to the Team, {name}!",
        "body": """
Hello {name},

Welcome to Autonomous ITSM! We're excited to have you join our team.

Your onboarding has been initiated and you should expect:
- IT equipment setup on your first day
- Access credentials via separate secure email
- Orientation schedule from your manager

If you have any questions before your start date, please don't hesitate to reach out.

Best regards,
The HR Team
Autonomous ITSM
"""
    },
    "offboarding": {
        "subject": "Thank You, {name} - Best Wishes from Autonomous ITSM",
        "body": """
Dear {name},

As you move on to your next chapter, we wanted to take a moment to thank you for your contributions to Autonomous ITSM.

Please remember to:
- Return any company equipment on your last day
- Complete your exit interview with HR
- Update your forwarding contact information

We wish you all the best in your future endeavors. You'll always be part of our extended family.

Warm regards,
The HR Team
Autonomous ITSM
"""
    },
    "pto_approved": {
        "subject": "PTO Request Approved - {dates}",
        "body": """
Hello {name},

Great news! Your PTO request has been approved.

Details:
- Dates: {dates}
- Days: {days}

Please ensure your responsibilities are covered during your absence. Enjoy your time off!

Best regards,
HR Coordinator
Autonomous ITSM
"""
    },
    "pto_denied": {
        "subject": "PTO Request Update - Action Required",
        "body": """
Hello {name},

Unfortunately, your PTO request for {dates} could not be approved at this time.

Reason: {reason}

Please contact HR to discuss alternative dates or arrangements.

Best regards,
HR Coordinator
Autonomous ITSM
"""
    },
    "onboarding_checklist": {
        "subject": "Onboarding Checklist for {name}",
        "body": """
Hello Team,

New employee onboarding initiated for: {name}
Start Date: {start_date}
Department: {department}

Onboarding Checklist:
[ ] Create email account
[ ] Setup workstation
[ ] Provision access badges
[ ] Schedule orientation
[ ] Assign onboarding buddy
[ ] Prepare welcome kit

Please complete your assigned tasks before the start date.

Best regards,
Onboarding Specialist
Autonomous ITSM
"""
    }
}


def send_via_gmail(to_email: str, subject: str, body: str) -> dict:
    """Send email via Gmail SMTP"""
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        return {
            "success": False,
            "error": "Gmail credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables."
        }

    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = f"{FROM_NAME} <{GMAIL_USER}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        # Connect to Gmail SMTP
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(GMAIL_USER, GMAIL_APP_PASSWORD)

        # Send email
        server.send_message(msg)
        server.quit()

        return {"success": True, "message": f"Email sent to {to_email}"}

    except smtplib.SMTPAuthenticationError as e:
        return {"success": False, "error": f"Authentication failed. Check your App Password. {str(e)}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def log_email(to_email: str, subject: str, body: str, result: dict):
    """Log email to outbox for audit trail"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    outbox_dir = os.path.join(script_dir, "..", "emails", "outbox")
    os.makedirs(outbox_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    safe_recipient = to_email.replace("@", "_at_").replace(".", "_")
    filename = f"{timestamp}_{safe_recipient}.json"

    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "to": to_email,
        "from": GMAIL_USER or "not_configured",
        "subject": subject,
        "body": body,
        "result": result
    }

    filepath = os.path.join(outbox_dir, filename)
    with open(filepath, "w") as f:
        json.dump(log_entry, f, indent=2)

    return filepath


def render_template(template_name: str, **kwargs) -> tuple:
    """Render an email template with variables"""
    if template_name not in TEMPLATES:
        available = ", ".join(TEMPLATES.keys())
        raise ValueError(f"Unknown template: {template_name}. Available: {available}")

    template = TEMPLATES[template_name]

    # Fill in defaults for missing variables
    defaults = {
        "name": "Team Member",
        "dates": "TBD",
        "days": "N/A",
        "reason": "Please contact HR for details",
        "start_date": "TBD",
        "department": "TBD"
    }

    for key, default_value in defaults.items():
        if key not in kwargs or not kwargs[key]:
            kwargs[key] = default_value

    subject = template["subject"].format(**kwargs)
    body = template["body"].format(**kwargs)
    return subject, body


def list_templates():
    """Print available templates"""
    print("Available email templates:")
    print("-" * 40)
    for name, template in TEMPLATES.items():
        print(f"\n{name}:")
        print(f"  Subject: {template['subject']}")
        print(f"  Preview: {template['body'][:80].strip()}...")


def main():
    parser = argparse.ArgumentParser(description="Send emails via Gmail SMTP")
    parser.add_argument("--to", help="Recipient email address")
    parser.add_argument("--subject", help="Email subject (required if not using template)")
    parser.add_argument("--body", help="Email body (required if not using template)")
    parser.add_argument("--template", choices=list(TEMPLATES.keys()), help="Use a predefined template")
    parser.add_argument("--name", help="Recipient name (for templates)")
    parser.add_argument("--dates", help="Date range (for PTO templates)")
    parser.add_argument("--days", help="Number of days (for PTO templates)")
    parser.add_argument("--reason", help="Reason (for denial templates)")
    parser.add_argument("--start-date", dest="start_date", help="Start date (for onboarding)")
    parser.add_argument("--department", help="Department (for onboarding)")
    parser.add_argument("--dry-run", action="store_true", help="Log only, don't actually send")
    parser.add_argument("--list-templates", action="store_true", help="List available templates")

    args = parser.parse_args()

    # Handle list templates
    if args.list_templates:
        list_templates()
        return

    # Validate required args
    if not args.to:
        print("Error: --to is required")
        sys.exit(1)

    # Determine subject and body
    if args.template:
        template_vars = {
            "name": args.name,
            "dates": args.dates,
            "days": args.days,
            "reason": args.reason,
            "start_date": args.start_date,
            "department": args.department
        }
        subject, body = render_template(args.template, **template_vars)
    elif args.subject and args.body:
        subject = args.subject
        body = args.body
    else:
        print("Error: Either --template or both --subject and --body are required")
        sys.exit(1)

    # Display what we're sending
    print("=" * 50)
    print(f"To: {args.to}")
    print(f"Subject: {subject}")
    print("-" * 50)
    print(body.strip())
    print("=" * 50)

    if args.dry_run:
        result = {"success": True, "dry_run": True, "message": "Email logged but not sent"}
        print("\n[DRY RUN] Email not actually sent")
    else:
        print("\nSending email...")
        result = send_via_gmail(args.to, subject, body)

        if result["success"]:
            print(f"✅ {result.get('message', 'Email sent successfully!')}")
        else:
            print(f"❌ Failed: {result.get('error', 'Unknown error')}")

    # Log the email
    log_path = log_email(args.to, subject, body, result)
    print(f"\nLogged to: {log_path}")

    # Exit with appropriate code
    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()
