module.exports = {
  apps: [
    {
      name: 'soft3-brain-prod',
      script: './backend/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3051
      }
    }
  ]
};
