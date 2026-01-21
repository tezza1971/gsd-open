/**
 * Intermediate Representation (IR) for GSD context files.
 *
 * This IR acts as a platform-agnostic bridge between GSD input and any target platform output.
 * It captures GSD concepts (agents, commands, models, config) in a JSON-serializable format.
 *
 * Design principles:
 * - Plain interfaces (no classes) for easy serialization
 * - All fields optional where GSD allows omission
 * - Source metadata for idempotency and debugging
 * - Gaps tracking for unmapped fields and approximations
 */

/**
 * Source metadata for tracking original GSD files.
 * Used for idempotency checks and debugging.
 */
export interface GSDSourceMetadata {
  /** Original GSD directory path */
  path: string;
  /** SHA256 content hash of all source files (sorted by filename) */
  hash: string;
  /** ISO 8601 timestamp of when parsing occurred */
  timestamp: string;
  /** GSD version if detected from package.json */
  version?: string;
}

/**
 * Agent definition from GSD context.
 *
 * Represents an AI agent with model, prompt, and tool configuration.
 */
export interface GSDAgent {
  /** Agent identifier (e.g., "planner", "qa-agent") */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Model to use (references GSDModel.name) */
  model?: string;
  /** Temperature setting (0.0-1.0) */
  temperature?: number;
  /** System prompt or path to prompt file */
  systemPrompt?: string;
  /** List of tool names this agent can use */
  tools?: string[];
  /** Maximum tokens for responses */
  maxTokens?: number;
  /** Additional custom configuration */
  config?: Record<string, unknown>;
}

/**
 * Command definition from GSD context.
 *
 * Represents a CLI command or workflow template.
 */
export interface GSDCommand {
  /** Command identifier (e.g., "/gsd:plan", "/gsd:execute") */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Command template with variable placeholders */
  template?: string;
  /** Variable definitions for template interpolation */
  variables?: Array<{
    name: string;
    type?: 'string' | 'number' | 'boolean' | 'choice';
    description?: string;
    default?: string | number | boolean;
    required?: boolean;
    choices?: string[];
  }>;
  /** Agent to execute this command (references GSDAgent.name) */
  agent?: string;
  /** Additional custom configuration */
  config?: Record<string, unknown>;
}

/**
 * Model definition from GSD context.
 *
 * Represents an AI model provider and configuration.
 */
export interface GSDModel {
  /** Model identifier (e.g., "sonnet-3.5", "gpt-4") */
  name: string;
  /** Provider (e.g., "anthropic", "openai") */
  provider: string;
  /** API endpoint URL */
  endpoint?: string;
  /** Model-specific configuration */
  config?: Record<string, unknown>;
}

/**
 * General configuration from GSD context.
 *
 * Captures theme, keybindings, permissions, and other settings.
 */
export interface GSDConfig {
  /** Theme settings (colors, icons, etc.) */
  theme?: Record<string, unknown>;
  /** Keybinding definitions */
  keybindings?: Record<string, string>;
  /** Permission settings (file access, network, etc.) */
  permissions?: Record<string, boolean | string>;
  /** Any other configuration not fitting above categories */
  custom?: Record<string, unknown>;
}

/**
 * Gap tracking for unmapped or approximated transformations.
 *
 * Documents fields that couldn't be directly mapped to the target platform,
 * or required approximation/adaptation.
 */
export interface GSDGaps {
  /** Fields from GSD that have no equivalent in target platform */
  unmappedFields: Array<{
    /** Source file containing unmapped field */
    file: string;
    /** Field path (e.g., "agent.customField") */
    field: string;
    /** Original value */
    value: unknown;
    /** Explanation of why it couldn't be mapped */
    reason: string;
  }>;
  /** Transformations that required approximation */
  approximations: Array<{
    /** Source file containing approximated field */
    file: string;
    /** Field path */
    field: string;
    /** Original value */
    originalValue: unknown;
    /** Approximated value used instead */
    approximatedValue: unknown;
    /** Explanation of approximation */
    reason: string;
  }>;
}

/**
 * Root Intermediate Representation for GSD context.
 *
 * Contains all parsed GSD data in platform-neutral format.
 */
export interface GSDIntermediate {
  /** IR format version (for future compatibility) */
  version: '1.0';
  /** Source metadata for idempotency */
  source: GSDSourceMetadata;
  /** Parsed agent definitions */
  agents: GSDAgent[];
  /** Parsed command definitions */
  commands: GSDCommand[];
  /** Parsed model definitions */
  models: GSDModel[];
  /** General configuration */
  config: GSDConfig;
  /** Gap tracking for unmapped/approximated content */
  gaps: GSDGaps;
}
