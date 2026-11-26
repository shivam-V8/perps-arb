/**
 * PM2 config for the AWS server (see scripts/deploy-aws.sh).
 * Two instances in cluster mode: `pm2 reload chainmatch` restarts them one at a
 * time, so deploys don't drop requests.
 */
module.exports = {
  apps: [
    {
      name: "chainmatch",
      cwd: "/srv/chainmatch/current/apps/web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",
      exec_mode: "cluster",
      instances: 2,
      // small instance (1 GB RAM): restart a worker before it can starve Postgres
      max_memory_restart: "400M",
      node_args: "--max-old-space-size=384",
      kill_timeout: 8000,
      listen_timeout: 15000,
      env: { NODE_ENV: "production" },
    },
  ],
};
