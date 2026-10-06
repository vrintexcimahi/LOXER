module.exports = {
  apps: [
    {
      name: 'loxer',
      script: 'npm',
      args: 'run preview',
      cwd: '/home/vrintex/loxer',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3035
      }
    }
  ]
};
