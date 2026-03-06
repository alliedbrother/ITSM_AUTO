#!/bin/bash
set -e

# Log all output
exec > >(tee /var/log/user-data.log) 2>&1
echo "Starting setup at $(date)"

# Update system
apt-get update && apt-get upgrade -y

# Install essential packages
apt-get install -y curl git build-essential nginx certbot python3-certbot-nginx

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Create app user
useradd -m -s /bin/bash paperclip || true
mkdir -p /home/paperclip/app
chown -R paperclip:paperclip /home/paperclip

# Clone the repository
cd /home/paperclip
sudo -u paperclip git clone https://github.com/alliedbrother/ITSM_AUTO.git app

# Setup Paperclip
cd /home/paperclip/app/paperclip
sudo -u paperclip pnpm install

# Generate a secure JWT secret for agent authentication
JWT_SECRET=$(openssl rand -base64 32)

# Create environment file
cat > /home/paperclip/app/paperclip/.env << ENVEOF
NODE_ENV=production
PORT=3100
DATABASE_URL=file:/home/paperclip/.paperclip/data.db
GMAIL_USER=saiakhil121@gmail.com
GMAIL_APP_PASSWORD=ugzf oyjj vqqs dfcs
ITSM_FROM_NAME=Autonomous ITSM HR
PAPERCLIP_AGENT_JWT_SECRET=$JWT_SECRET
ENVEOF
chown paperclip:paperclip /home/paperclip/app/paperclip/.env

# Create systemd service for Paperclip
cat > /etc/systemd/system/paperclip.service << 'SERVICEEOF'
[Unit]
Description=Paperclip AI Agent Platform
After=network.target

[Service]
Type=simple
User=paperclip
WorkingDirectory=/home/paperclip/app/paperclip
Environment=NODE_ENV=production
Environment=PORT=3100
ExecStart=/usr/bin/pnpm dev
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICEEOF

# Configure Nginx
cat > /etc/nginx/sites-available/paperclip << 'NGINXEOF'
server {
    listen 80;
    server_name itsm.mlinterviewnotes.com;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/paperclip /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t && systemctl reload nginx

# Enable and start Paperclip
systemctl daemon-reload
systemctl enable paperclip
systemctl start paperclip

echo "Setup completed at $(date)"
echo "Paperclip should be running on port 3100"
