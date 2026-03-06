#!/bin/bash
set -e

# ITSM Chat Deployment Script
# Run this on the EC2 instance after cloning the repo

echo "=== ITSM Chat Deployment ==="

# Variables
APP_DIR="/home/paperclip/app/itsm-chat"
FRONTEND_BUILD="/var/www/itsm-chat"
BACKEND_DIR="$APP_DIR/backend"

# 1. Install Python dependencies
echo "Installing Python dependencies..."
cd "$BACKEND_DIR"
pip3 install --user -r requirements.txt

# 2. Create backend .env if not exists
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo "Creating backend .env file..."
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    echo "IMPORTANT: Edit $BACKEND_DIR/.env with your actual values!"
fi

# 3. Build frontend
echo "Building frontend..."
cd "$APP_DIR/frontend"
npm install
npm run build

# 4. Deploy frontend to nginx
echo "Deploying frontend..."
sudo mkdir -p "$FRONTEND_BUILD"
sudo cp -r dist/* "$FRONTEND_BUILD/"
sudo chown -R www-data:www-data "$FRONTEND_BUILD"

# 5. Setup Nginx
echo "Configuring Nginx..."
sudo cp "$APP_DIR/deploy/itsm-chat.nginx.conf" /etc/nginx/sites-available/itsm-chat
sudo ln -sf /etc/nginx/sites-available/itsm-chat /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 6. Setup systemd service
echo "Configuring systemd service..."
sudo cp "$APP_DIR/deploy/itsm-chat.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable itsm-chat
sudo systemctl restart itsm-chat

# 7. Setup SSL with Certbot
echo "Setting up SSL..."
sudo certbot --nginx -d chat.mlinterviewnotes.com --non-interactive --agree-tos -m admin@mlinterviewnotes.com || echo "Certbot failed - you may need to run it manually"

echo "=== Deployment Complete ==="
echo ""
echo "Next steps:"
echo "1. Edit $BACKEND_DIR/.env with your API keys"
echo "2. Add DNS A record: chat.mlinterviewnotes.com -> EC2 IP"
echo "3. Check status: sudo systemctl status itsm-chat"
echo "4. View logs: sudo journalctl -u itsm-chat -f"
