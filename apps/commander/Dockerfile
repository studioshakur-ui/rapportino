# COMMANDER — WhatsApp field sensor for CORE COMMAND
# -----------------------------------------------------------------------------
# IMPORTANT: build from the REPOSITORY ROOT as context, not from apps/commander.
# COMMANDER bundles two PURE CORE Memory agents that live outside this folder
# (src/features/core-command/agents/{normalizer,classifier}.agent.ts).
#
#   docker build -f apps/commander/Dockerfile -t commander .
#
# On Railway: set "Root Directory" = repo root and "Dockerfile Path" =
# apps/commander/Dockerfile (so the build context contains src/ as well).
# -----------------------------------------------------------------------------

# ---- Build stage ------------------------------------------------------------
FROM node:22-slim AS build
WORKDIR /app/apps/commander

# Install deps from lockfile (deterministic).
COPY apps/commander/package.json apps/commander/package-lock.json ./
RUN npm ci

# COMMANDER source + the two PURE reused agents (relative ../../../src import).
COPY apps/commander/ ./
COPY src/features/core-command/agents/normalizer.agent.ts /app/src/features/core-command/agents/normalizer.agent.ts
COPY src/features/core-command/agents/classifier.agent.ts /app/src/features/core-command/agents/classifier.agent.ts

# Bundle everything (incl. the reused agents) into a single dist/index.cjs.
RUN npm run build

# ---- Runtime stage ----------------------------------------------------------
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app/apps/commander

# Production deps only (express, supabase, zod, dotenv).
COPY apps/commander/package.json apps/commander/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Self-contained bundle.
COPY --from=build /app/apps/commander/dist ./dist

# Railway injects PORT; default kept for local `docker run`.
ENV PORT=8787
EXPOSE 8787

# Lightweight container healthcheck hitting the /health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.cjs"]
