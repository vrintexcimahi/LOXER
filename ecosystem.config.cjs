module.exports = {
  apps: [
    {
      name: 'loxer',
      script: './node_modules/vite/bin/vite.js',
      args: 'preview --host 0.0.0.0 --port 3035',
      cwd: '/home/vrintex/loxer',
      exec_mode: 'fork',
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
