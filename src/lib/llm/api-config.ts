/**
 * Multi-provider LLM API Configuration Detection and Testing
 *
 * Detects API keys from environment variables, confirms with user,
 * and tests endpoint connectivity before returning validated configuration.
 */

import { confirm, password, select, isCancel } from '@clack/prompts';
import pc from 'picocolors';
import { log } from '../logger.js';
import {
  PROVIDER_CONFIGS,
  PROVIDER_PRIORITY,
  type APIConfig,
  type APIProvider,
  type ProviderKey
} from './types.js';

/**
 * Test API endpoint connectivity with minimal request
 *
 * @param provider Provider configuration
 * @param apiKey API key to test
 * @returns true if endpoint responds successfully, false otherwise
 */
export async function testEndpoint(provider: APIProvider, apiKey: string): Promise<boolean> {
  const url = `${provider.endpoint}/chat/completions`;

  log.verbose(`Testing ${provider.name} endpoint: ${url}`);
  log.verbose(`Using model: ${provider.testModel}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const requestBody = {
      model: provider.testModel,
      messages: [{ role: 'user', content: 'respond with ready' }],
      max_tokens: 10
    };

    log.verbose(`Request body: ${JSON.stringify(requestBody)}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeout);

    log.verbose(`Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      log.verbose(`Response error: ${errorText}`);
      return false;
    }

    const data = await response.json();
    log.verbose(`Response data: ${JSON.stringify(data)}`);

    // Check for valid response structure
    if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
      const message = data.choices[0].message;
      if (message && message.content) {
        log.verbose(`Test successful, received: ${message.content}`);
        return true;
      }
    }

    log.verbose('Response structure invalid - missing choices or content');
    return false;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        log.verbose('Request timeout after 5 seconds');
      } else {
        log.verbose(`Test failed: ${error.message}`);
      }
    }
    return false;
  }
}

/**
 * Detect API configuration from environment variables with user confirmation
 *
 * Scans environment for API keys in priority order (OpenAI, Anthropic, OpenRouter, Azure),
 * prompts user to confirm detected keys, tests endpoints, and falls back to manual entry.
 *
 * @returns Validated API configuration or null if detection/testing failed
 */
export async function detectAndConfirmAPIConfig(): Promise<APIConfig | null> {
  log.info('');
  log.info(pc.cyan('LLM API Configuration'));
  log.info('');

  // Phase 1: Scan environment variables for API keys
  const detectedProviders: Array<{ key: ProviderKey; envVar: string; value: string }> = [];

  for (const providerKey of PROVIDER_PRIORITY) {
    const provider = PROVIDER_CONFIGS[providerKey];

    for (const envVar of provider.envVars) {
      const value = process.env[envVar];
      if (value && value.trim().length > 0) {
        log.verbose(`Detected ${provider.name} API key in ${envVar}`);
        detectedProviders.push({ key: providerKey, envVar, value: value.trim() });
        break; // Only need one env var per provider
      }
    }
  }

  // Phase 2: For each detected provider, confirm and test
  for (const detected of detectedProviders) {
    const provider = PROVIDER_CONFIGS[detected.key];

    // Special handling for Azure - requires endpoint
    if (detected.key === 'azure' && !process.env.AZURE_OPENAI_ENDPOINT) {
      log.warn(`Found ${detected.envVar} but AZURE_OPENAI_ENDPOINT not set, skipping Azure`);
      continue;
    }

    log.info(`Found ${pc.green(provider.name)} API key in environment`);

    const useDetected = await confirm({
      message: `Use ${provider.name} API? (from ${detected.envVar})`,
      initialValue: true
    });

    if (isCancel(useDetected)) {
      log.verbose('User cancelled detection');
      return null;
    }

    if (!useDetected) {
      log.verbose(`User declined ${provider.name}, trying next provider`);
      continue;
    }

    // Test the endpoint
    log.info(`Testing ${provider.name} endpoint...`);

    const testSuccess = await testEndpoint(provider, detected.value);

    if (testSuccess) {
      log.success(`${pc.green('✓')} ${provider.name} API connection verified`);
      return {
        provider: provider.name,
        apiKey: detected.value,
        endpoint: provider.endpoint,
        model: provider.testModel
      };
    } else {
      log.warn(`${pc.yellow('✗')} ${provider.name} endpoint test failed`);

      const tryNext = await confirm({
        message: 'Try alternative provider?',
        initialValue: true
      });

      if (isCancel(tryNext)) {
        log.verbose('User cancelled after failed test');
        return null;
      }

      if (!tryNext) {
        log.verbose('User declined to try alternatives');
        return null;
      }
    }
  }

  // Phase 3: Manual entry fallback
  if (detectedProviders.length === 0) {
    log.info(pc.yellow('No API keys detected in environment'));
  } else {
    log.info(pc.yellow('All detected providers failed testing'));
  }

  const enterManually = await confirm({
    message: 'Enter API key manually?',
    initialValue: false
  });

  if (isCancel(enterManually) || !enterManually) {
    log.verbose('User declined manual entry');
    return null;
  }

  // Prompt for provider selection
  const providerChoice = await select({
    message: 'Select LLM provider:',
    options: [
      { value: 'openai', label: 'OpenAI', hint: 'api.openai.com' },
      { value: 'anthropic', label: 'Anthropic', hint: 'api.anthropic.com' },
      { value: 'openrouter', label: 'OpenRouter', hint: 'openrouter.ai' },
      { value: 'azure', label: 'Azure OpenAI', hint: 'Requires AZURE_OPENAI_ENDPOINT env var' }
    ]
  });

  if (isCancel(providerChoice)) {
    log.verbose('User cancelled provider selection');
    return null;
  }

  const selectedProvider = PROVIDER_CONFIGS[providerChoice as ProviderKey];

  // Special handling for Azure
  if (providerChoice === 'azure' && !process.env.AZURE_OPENAI_ENDPOINT) {
    log.error('Azure OpenAI requires AZURE_OPENAI_ENDPOINT environment variable');
    return null;
  }

  // Prompt for API key
  const manualKey = await password({
    message: `Enter ${selectedProvider.name} API key:`
  });

  if (isCancel(manualKey) || !manualKey || manualKey.trim().length === 0) {
    log.verbose('User cancelled or provided empty API key');
    return null;
  }

  // Test the manually entered key
  log.info(`Testing ${selectedProvider.name} endpoint...`);

  const testSuccess = await testEndpoint(selectedProvider, manualKey);

  if (testSuccess) {
    log.success(`${pc.green('✓')} ${selectedProvider.name} API connection verified`);
    return {
      provider: selectedProvider.name,
      apiKey: manualKey.trim(),
      endpoint: selectedProvider.endpoint,
      model: selectedProvider.testModel
    };
  } else {
    log.error(`${pc.red('✗')} ${selectedProvider.name} endpoint test failed`);
    log.info('');
    log.info(pc.dim('Possible issues:'));
    log.info(pc.dim('  • Invalid API key'));
    log.info(pc.dim('  • Network connectivity problems'));
    log.info(pc.dim('  • Provider service temporarily unavailable'));
    log.info('');
    return null;
  }
}
