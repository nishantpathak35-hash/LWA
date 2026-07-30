import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".agent/**",
    ".npm-cache/**",
    "scratch/**",
    "scripts/**",
  ]),
  {
    rules: {
      "@next/next/no-page-custom-font": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react/no-unescaped-entities": "off",
      "react-hooks/static-components": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off"
    },
  },
]);

export default eslintConfig;
