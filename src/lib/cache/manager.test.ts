import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ensureOpenCodeDocsCache } from './manager.js';
import type { CacheMetadata, DownloadResult } from './types.js';

// Mock dependencies
vi.mock('fs');
vi.mock('fs/promises');
vi.mock('./downloader.js');
vi.mock('./paths.js', () => ({
  getDocsOpenCodeCachePath: vi.fn(() => '/home/user/.gsdo/cache/docs-opencode')
}));

describe('ensureOpenCodeDocsCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns fresh cache when metadata exists and is <24 hours old', async () => {
    // Mock time: current time
    const now = new Date('2026-01-22T12:00:00Z').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    // Mock cache exists with fresh timestamp (12 hours ago)
    const downloadedAt = new Date('2026-01-22T00:00:00Z').toISOString();
    const metadata: CacheMetadata = {
      downloadedAt,
      source: 'https://example.com/README.md'
    };

    const fs = await import('fs');
    const fsPromises = await import('fs/promises');

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify(metadata));

    // Execute
    const result = await ensureOpenCodeDocsCache();

    // Verify: fresh cache, no download attempted
    expect(result).toEqual({
      cached: true,
      stale: false
    });

    // Downloader should NOT be called (cache is fresh)
    const downloader = await import('./downloader.js');
    expect(downloader.downloadOpenCodeDocs).not.toHaveBeenCalled();
  });

  it('triggers download when metadata exists but is >=24 hours old', async () => {
    // Mock time: current time
    const now = new Date('2026-01-23T12:00:00Z').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    // Mock cache exists with stale timestamp (25 hours ago)
    const downloadedAt = new Date('2026-01-22T11:00:00Z').toISOString();
    const metadata: CacheMetadata = {
      downloadedAt,
      source: 'https://example.com/README.md'
    };

    const fs = await import('fs');
    const fsPromises = await import('fs/promises');
    const downloader = await import('./downloader.js');

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify(metadata));

    // Mock successful download
    const downloadResult: DownloadResult = {
      success: true,
      cached: false
    };
    vi.mocked(downloader.downloadOpenCodeDocs).mockResolvedValue(downloadResult);

    // Execute
    const result = await ensureOpenCodeDocsCache();

    // Verify: download triggered, cache updated
    expect(downloader.downloadOpenCodeDocs).toHaveBeenCalledOnce();
    expect(result).toEqual({
      cached: true,
      stale: false
    });
  });

  it('triggers download when metadata.json does not exist', async () => {
    const fs = await import('fs');
    const downloader = await import('./downloader.js');

    vi.mocked(fs.existsSync).mockReturnValue(false);

    // Mock successful download
    const downloadResult: DownloadResult = {
      success: true,
      cached: false
    };
    vi.mocked(downloader.downloadOpenCodeDocs).mockResolvedValue(downloadResult);

    // Execute
    const result = await ensureOpenCodeDocsCache();

    // Verify: download triggered
    expect(downloader.downloadOpenCodeDocs).toHaveBeenCalledOnce();
    expect(result).toEqual({
      cached: true,
      stale: false
    });
  });

  it('uses stale cache when download fails with existing cache (graceful degradation)', async () => {
    // Mock time
    const now = new Date('2026-01-23T12:00:00Z').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    // Mock stale cache (25 hours old)
    const downloadedAt = new Date('2026-01-22T11:00:00Z').toISOString();
    const metadata: CacheMetadata = {
      downloadedAt,
      source: 'https://example.com/README.md'
    };

    const fs = await import('fs');
    const fsPromises = await import('fs/promises');
    const downloader = await import('./downloader.js');

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify(metadata));

    // Mock download failure
    const downloadResult: DownloadResult = {
      success: false,
      error: 'Network error: ENOTFOUND',
      cached: false
    };
    vi.mocked(downloader.downloadOpenCodeDocs).mockResolvedValue(downloadResult);

    // Execute
    const result = await ensureOpenCodeDocsCache();

    // Verify: graceful degradation - uses stale cache
    expect(result).toEqual({
      cached: true,
      stale: true,
      error: 'Network error: ENOTFOUND'
    });
  });

  it('returns error when download fails with no cache (first-run failure)', async () => {
    const fs = await import('fs');
    const downloader = await import('./downloader.js');

    vi.mocked(fs.existsSync).mockReturnValue(false);

    // Mock download failure
    const downloadResult: DownloadResult = {
      success: false,
      error: 'HTTP 404',
      cached: false
    };
    vi.mocked(downloader.downloadOpenCodeDocs).mockResolvedValue(downloadResult);

    // Execute
    const result = await ensureOpenCodeDocsCache();

    // Verify: no cache available, error returned
    expect(result).toEqual({
      cached: false,
      stale: false,
      error: 'HTTP 404'
    });
  });

  it('treats corrupted metadata.json as stale and triggers download', async () => {
    const fs = await import('fs');
    const fsPromises = await import('fs/promises');
    const downloader = await import('./downloader.js');

    vi.mocked(fs.existsSync).mockReturnValue(true);

    // Mock corrupted JSON
    vi.mocked(fsPromises.readFile).mockResolvedValue('{ invalid json');

    // Mock successful download
    const downloadResult: DownloadResult = {
      success: true,
      cached: false
    };
    vi.mocked(downloader.downloadOpenCodeDocs).mockResolvedValue(downloadResult);

    // Execute
    const result = await ensureOpenCodeDocsCache();

    // Verify: download triggered after parse failure
    expect(downloader.downloadOpenCodeDocs).toHaveBeenCalledOnce();
    expect(result).toEqual({
      cached: true,
      stale: false
    });
  });

  it('handles invalid timestamps (future dates) by treating as stale', async () => {
    // Mock time: current time
    const now = new Date('2026-01-22T12:00:00Z').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    // Mock metadata with future timestamp (invalid)
    const metadata: CacheMetadata = {
      downloadedAt: '2026-01-25T00:00:00Z', // 3 days in the future
      source: 'https://example.com/README.md'
    };

    const fs = await import('fs');
    const fsPromises = await import('fs/promises');
    const downloader = await import('./downloader.js');

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify(metadata));

    // Mock successful download
    const downloadResult: DownloadResult = {
      success: true,
      cached: false
    };
    vi.mocked(downloader.downloadOpenCodeDocs).mockResolvedValue(downloadResult);

    // Execute
    const result = await ensureOpenCodeDocsCache();

    // Verify: treated as stale, download triggered
    expect(downloader.downloadOpenCodeDocs).toHaveBeenCalledOnce();
    expect(result).toEqual({
      cached: true,
      stale: false
    });
  });
});
