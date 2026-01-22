import { describe, it, expect } from 'vitest';
import { parseTemplateVariables } from './variable-parser.js';

describe('parseTemplateVariables', () => {
  it('extracts single variable', () => {
    const template = 'Create plan for {{phase}}';
    expect(parseTemplateVariables(template)).toEqual(['phase']);
  });

  it('extracts multiple variables', () => {
    const template = 'Use {{phase}} and {{context}} to build {{output}}';
    expect(parseTemplateVariables(template)).toEqual(['phase', 'context', 'output']);
  });

  it('deduplicates repeated variables', () => {
    const template = '{{var}} appears {{var}} multiple {{var}} times';
    expect(parseTemplateVariables(template)).toEqual(['var']);
  });

  it('returns empty array for template without variables', () => {
    const template = 'No variables here';
    expect(parseTemplateVariables(template)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseTemplateVariables('')).toEqual([]);
  });

  it('handles whitespace in variable names', () => {
    const template = '{{ phase }} and {{context}}';
    expect(parseTemplateVariables(template)).toEqual(['phase', 'context']);
  });
});
