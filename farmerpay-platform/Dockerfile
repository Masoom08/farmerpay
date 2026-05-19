# ─── Build Stage ───────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ─── Runtime Stage ─────────────────────────────────────────────────
FROM node:18-alpine

# Security: create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy production dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs src/ ./src/
COPY --chown=nodejs:nodejs package.json ./
COPY --chown=nodejs:nodejs ecosystem.config.js ./
COPY --chown=nodejs:nodejs migrations/ ./migrations/
COPY --chown=nodejs:nodejs seeders/ ./seeders/
COPY --chown=nodejs:nodejs .sequelizerc ./

# Create logs directory
RUN mkdir -p logs && chown nodejs:nodejs logs

# Switch to non-root user
USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health',(r)=>{if(r.statusCode!==200)throw new Error(r.statusCode)})"

CMD ["node", "src/app.js"]
