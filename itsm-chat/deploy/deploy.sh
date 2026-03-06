#!/bin/bash
set -e

# ITSM Chat Deployment Script
# Run this on the EC2 instance after cloning the repo

echo "=== ITSM Chat Deployment ==="

# Variables
APP_DIR="/home/paperclip/app/itsm-chat"
FRONTEND_BUILD="/var/www/itsm-chat"
BACKEND_DIR="$APP_DIR/backend"

# 1. Create venv and install Python dependencies
echo "Setting up Python virtual environment..."
cd "$BACKEND_DIR"
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate

# 2. Create backend .env if not exists
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo "Creating backend .env file..."
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    echo "IMPORTANT: Edit $BACKEND_DIR/.env with your actual values!"
fi

# 3. Create frontend .env if not exists
FRONTEND_DIR="$APP_DIR/frontend"
if [ ! -f "$FRONTEND_DIR/.env" ]; then
    echo "Creating frontend .env file..."
    cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env"
    echo "IMPORTANT: Edit $FRONTEND_DIR/.env with your company_id before building!"
fi

# 4. Build frontend
echo "Building frontend..."
cd "$FRONTEND_DIR"
npm install
npm run build

# 5. Deploy frontend to nginx
echo "Deploying frontend..."
sudo mkdir -p "$FRONTEND_BUILD"
sudo cp -r dist/* "$FRONTEND_BUILD/"
sudo chown -R www-data:www-data "$FRONTEND_BUILD"

# 6. Setup Nginx
echo "Configuring Nginx..."
sudo cp "$APP_DIR/deploy/itsm-chat.nginx.conf" /etc/nginx/sites-available/itsm-chat
sudo ln -sf /etc/nginx/sites-available/itsm-chat /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 7. Setup systemd service
echo "Configuring systemd service..."
sudo cp "$APP_DIR/deploy/itsm-chat.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable itsm-chat
sudo systemctl restart itsm-chat

# 8. Setup SSL with Certbot
echo "Setting up SSL..."
sudo certbot --nginx -d chat.mlinterviewnotes.com --non-interactive --agree-tos -m admin@mlinterviewnotes.com || echo "Certbot failed - you may need to run it manually"

echo "=== Deployment Complete ==="
echo ""
echo "Next steps:"
echo "1. Edit $BACKEND_DIR/.env with your API keys"
echo "2. Add DNS A record: chat.mlinterviewnotes.com -> EC2 IP"
echo "3. Check status: sudo systemctl status itsm-chat"
echo "4. View logs: sudo journalctl -u itsm-chat -f"
