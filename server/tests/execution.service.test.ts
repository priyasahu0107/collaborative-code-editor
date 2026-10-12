import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  executeCode,
  getSupportedLanguages,
} from '../src/modules/execution/execution.service.js';
import { EXECUTION_ERRORS } from '../src/modules/execution/execution.types.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('execution service client', () => {
  it('refuses source locally without forwarding it to a remote service', async () => {
    const post = vi.spyOn(axios, 'post');

    await expect(executeCode('console.log("unsafe")', 'javascript')).rejects.toThrow(
      EXECUTION_ERRORS.EXECUTION_DISABLED,
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('reports every language as unsupported', async () => {
    const languages = await getSupportedLanguages();

    expect(languages.length).toBeGreaterThan(0);
    expect(languages.every((language) => !language.supported)).toBe(true);
  });
});