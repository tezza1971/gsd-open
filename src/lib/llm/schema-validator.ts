/**
 * Schema Validator for LLM-Generated Transform Rules
 *
 * Validates JSON output from LLM enhancement to ensure it matches expected structure
 * before applying to transpilation process. Uses manual validation (no zod/ajv) for MVP.
 */

import type { GapCategory } from '../../types/index.js';

/**
 * Result of schema validation
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Error messages if validation failed */
  errors: string[];
}

/**
 * Transform rule structure expected from LLM
 */
export interface TransformRule {
  /** Field name that needs transformation */
  field: string;
  /** Category of the gap */
  category: GapCategory;
  /** Suggestion for handling this field */
  suggestion: string;
  /** Optional example showing usage */
  example?: string;
  /** Optional source file reference */
  sourceFile?: string;
}

/**
 * Expected structure of LLM enhancement response
 */
export interface EnhancementResponse {
  /** Array of transformation rules */
  rules: TransformRule[];
}

/**
 * Validate LLM-generated transform rules
 *
 * Checks that the object has required structure and all fields are correctly typed.
 * Accumulates all validation errors for helpful user feedback.
 *
 * @param obj Unknown object to validate (from JSON.parse)
 * @returns ValidationResult with errors if invalid
 */
export function validateTransformRules(obj: unknown): ValidationResult {
  const errors: string[] = [];

  // Check obj is object (not null, not array)
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return { valid: false, errors: ['Expected object, got ' + (Array.isArray(obj) ? 'array' : typeof obj)] };
  }

  // Check obj has 'rules' property that is array
  if (!('rules' in obj)) {
    return { valid: false, errors: ['Missing "rules" array'] };
  }

  const { rules } = obj as { rules: unknown };

  if (!Array.isArray(rules)) {
    return { valid: false, errors: ['Property "rules" must be array, got ' + typeof rules] };
  }

  // Valid category values
  const validCategories: GapCategory[] = ['unsupported', 'platform', 'missing-dependency'];

  // Validate each rule in the array
  rules.forEach((rule, index) => {
    // Check rule is object (not null)
    if (typeof rule !== 'object' || rule === null) {
      errors.push(`Rule ${index}: must be object, got ${typeof rule}`);
      return;
    }

    const ruleObj = rule as Record<string, unknown>;

    // Check required fields exist and have correct types
    if (!('field' in ruleObj)) {
      errors.push(`Rule ${index}: missing required field "field"`);
    } else if (typeof ruleObj.field !== 'string') {
      errors.push(`Rule ${index}: "field" must be string, got ${typeof ruleObj.field}`);
    }

    if (!('category' in ruleObj)) {
      errors.push(`Rule ${index}: missing required field "category"`);
    } else if (typeof ruleObj.category !== 'string') {
      errors.push(`Rule ${index}: "category" must be string, got ${typeof ruleObj.category}`);
    } else if (!validCategories.includes(ruleObj.category as GapCategory)) {
      errors.push(`Rule ${index}: "category" must be one of [unsupported, platform, missing-dependency], got "${ruleObj.category}"`);
    }

    if (!('suggestion' in ruleObj)) {
      errors.push(`Rule ${index}: missing required field "suggestion"`);
    } else if (typeof ruleObj.suggestion !== 'string') {
      errors.push(`Rule ${index}: "suggestion" must be string, got ${typeof ruleObj.suggestion}`);
    }

    // Check optional fields if present
    if ('example' in ruleObj && ruleObj.example !== undefined && typeof ruleObj.example !== 'string') {
      errors.push(`Rule ${index}: "example" must be string if provided, got ${typeof ruleObj.example}`);
    }

    if ('sourceFile' in ruleObj && ruleObj.sourceFile !== undefined && typeof ruleObj.sourceFile !== 'string') {
      errors.push(`Rule ${index}: "sourceFile" must be string if provided, got ${typeof ruleObj.sourceFile}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}
