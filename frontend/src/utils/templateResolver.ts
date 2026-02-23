/**
 * Resolves {{field}} placeholders in a template string using data from an object.
 * Supports dot-notation paths like {{user.name}}.
 * Missing fields resolve to empty string.
 */
export function resolveTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\s*[\w.]+\s*)\}\}/g, (_match, path: string) => {
    const value = getNestedValue(data, path.trim());
    return value != null ? String(value) : '';
  });
}

/**
 * Traverses a nested object using a dot-notation path.
 * Returns undefined if any segment is missing.
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current != null && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}
