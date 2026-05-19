/**
 * Shared Jest preset reference for all Next.js dashboard apps.
 *
 * NOTE: This file is a reference template, not imported at runtime.
 * Each app copies this config inline in its own jest.config.ts because
 * Jest's TS config loader cannot resolve cross-package imports in a
 * flat (non-workspace) monorepo.
 *
 * When updating: sync changes to dashboard/, dashboard-sathi/, and
 * dashboard-farmer/ jest.config.ts files.
 *
 * Each app also needs jest.setup.ts with:
 *   import "@testing-library/jest-dom";
 */
import type { Config } from "jest";

const baseConfig: Config = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        jsx: "react-jsx",
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["<rootDir>/__tests__/**/*.test.{ts,tsx}"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};

export default baseConfig;
