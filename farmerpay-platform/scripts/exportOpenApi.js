#!/usr/bin/env node

/**
 * OpenAPI 3.0 Export Script
 * Generates openapi.json from swagger-jsdoc annotations.
 * Usage: node scripts/exportOpenApi.js
 */

const fs = require('fs');
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FarmerPay Platform API',
      version: '1.0.0',
      description: 'Agrarian fintech platform for India — Complete REST API documentation',
      contact: { name: 'FarmerPay Team', email: 'dev@farmerpay.in' },
      license: { name: 'ISC' },
    },
    servers: [
      { url: 'http://localhost:3000/api/v1', description: 'Local Development' },
      { url: 'https://api.farmerpay.in/api/v1', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token from /auth/login',
        },
      },
      parameters: {
        LanguageHeader: {
          in: 'header',
          name: 'X-Language',
          schema: { type: 'string', enum: ['en', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'or'] },
          description: 'Language code for translated responses',
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Missing or invalid JWT token',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'Authentication required' },
                  errorCode: { type: 'string', example: 'AUTH_001' },
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'Validation failed' },
                  errorCode: { type: 'string', example: 'VAL_001' },
                  errors: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: { type: 'string' },
                        message: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication & session management' },
      { name: 'Farmer', description: 'Farmer profile & onboarding' },
      { name: 'Trust', description: 'Trust credit scoring engine' },
      { name: 'DICE', description: 'Loan product catalog & applications' },
      { name: 'ROOTS Crop', description: 'Crop cultivation management' },
      { name: 'ROOTS Dairy', description: 'Dairy herd & milk production' },
      { name: 'ROOTS Fishery', description: 'Aquaculture pond management' },
      { name: 'Vyapar', description: 'Vendor marketplace' },
      { name: 'SATHI', description: 'Field agent task management' },
      { name: 'Sentinel', description: 'Loan health monitoring & EWS' },
      { name: 'SAGE', description: 'AI-driven farmer advisory' },
      { name: 'PULSE', description: 'Market price intelligence' },
    ],
  },
  apis: [
    './src/modules/**/routes/*.js',
    './src/modules/**/*.routes.js',
  ],
};

const spec = swaggerJsdoc(swaggerOptions);

const outputPath = path.join(__dirname, '..', 'docs', 'openapi.json');
fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2));

console.log(`OpenAPI 3.0 spec exported to ${outputPath}`);
console.log(`Paths: ${Object.keys(spec.paths || {}).length}`);
console.log(`Tags: ${(spec.tags || []).map((t) => t.name).join(', ')}`);
