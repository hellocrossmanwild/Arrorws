#!/bin/sh
# Vercel install step. The deploy payload may carry a .db-url file with the
# pooled Neon connection string; when no DATABASE_URL env var is configured
# on the project, splice it into lib/db/index.ts as a fallback. The proper
# setup is a DATABASE_URL project env var — then this is a no-op.
set -e
if [ -f .db-url ] && [ -z "$DATABASE_URL" ]; then
  node -e "const fs=require('fs');const u=fs.readFileSync('.db-url','utf8').trim();let s=fs.readFileSync('lib/db/index.ts','utf8');s=s.replace('process.env.DATABASE_URL','process.env.DATABASE_URL ?? '+JSON.stringify(u));fs.writeFileSync('lib/db/index.ts',s);console.log('db url fallback spliced')"
fi
pnpm install
