/**
 * Template Variable Parser
 *
 * Extracts {{variable}} patterns from GSD prompt templates.
 * Used to populate OpenCode command schema with variables metadata.
 */

/**
 * Parses template variables from a prompt template string
 *
 * Extracts all {{variable}} patterns and returns unique variable names.
 *
 * @param template - Prompt template containing {{var}} patterns
 * @returns Array of unique variable names (without braces)
 *
 * @example
 * parseTemplateVariables('Create plan for {{phase}} using {{context}}')
 * // Returns: ['phase', 'context']
 *
 * @example
 * parseTemplateVariables('Duplicate {{var}} and {{var}} again')
 * // Returns: ['var']
 *
 * @example
 * parseTemplateVariables('No variables here')
 * // Returns: []
 */
export function parseTemplateVariables(template: string): string[] {
  if (!template) return [];

  const variablePattern = /\{\{([^}]+)\}\}/g;
  const variables = new Set<string>();

  let match;
  while ((match = variablePattern.exec(template)) !== null) {
    variables.add(match[1].trim());
  }

  return Array.from(variables);
}
