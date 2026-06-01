import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setAccessToken,
  findMetadataFile,
  downloadMetadata,
  createMetadataFile,
  updateMetadataFile,
  downloadCycleLogs,
  createCycleFile,
  updateCycleFile,
} from '../src/services/gdrive';
import type { UserMetadata, WorkoutLog } from '../src/types';

describe('Google Drive Sync Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAccessToken(null);
  });

  it('should throw an error if executing operations without access token', async () => {
    await expect(findMetadataFile()).rejects.toThrow('Not authenticated with Google');
  });

  it('should find the metadata file and return its ID', async () => {
    setAccessToken('mock_access_token');

    const mockResponse = {
      files: [{ id: 'metadata_file_id_123' }],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const fileId = await findMetadataFile();
    expect(fileId).toBe('metadata_file_id_123');
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("name='workout-tracker-metadata.json'"),
      expect.objectContaining({
        headers: { Authorization: 'Bearer mock_access_token' },
      })
    );
  });

  it('should return null if metadata search result is empty', async () => {
    setAccessToken('mock_access_token');

    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      } as Response)
    );

    const fileId = await findMetadataFile();
    expect(fileId).toBeNull();
  });

  it('should download metadata contents', async () => {
    setAccessToken('mock_access_token');

    const mockMetadata: UserMetadata = {
      version: 1,
      currentCycle: 2,
      currentWeek: 2,
      currentDay: 2,
      gdriveLinked: true,
      cycleFileIds: { 1: 'file_1', 2: 'file_2' },
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockMetadata),
      } as Response)
    );

    const metadata = await downloadMetadata('metadata_file_id_123');
    expect(metadata).toEqual(mockMetadata);
  });

  it('should upload new metadata file and return file ID', async () => {
    setAccessToken('mock_access_token');

    const mockMetadata: UserMetadata = {
      version: 1,
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 1,
      gdriveLinked: true,
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'metadata_file_id_456' }),
      } as Response)
    );

    const id = await createMetadataFile(mockMetadata);
    expect(id).toBe('metadata_file_id_456');
  });

  it('should update metadata file', async () => {
    setAccessToken('mock_access_token');

    const mockMetadata: UserMetadata = {
      version: 1,
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 1,
      gdriveLinked: true,
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
      } as Response)
    );

    await updateMetadataFile('metadata_file_id_123', mockMetadata);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('metadata_file_id_123'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(mockMetadata),
      })
    );
  });

  it('should download cycle logs', async () => {
    setAccessToken('mock_access_token');

    const mockLogs: WorkoutLog[] = [
      {
        id: 'test_log_1',
        cycle: 1,
        week: 1,
        day: 1,
        workoutId: 'chest_and_back',
        dateCompleted: '2026-06-01T12:00:00Z',
        skipped: false,
        exercises: {},
        abRipperCompleted: false,
        comments: '',
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockLogs),
      } as Response)
    );

    const logs = await downloadCycleLogs('cycle_file_id_123');
    expect(logs).toEqual(mockLogs);
  });

  it('should create cycle logs file and return file ID', async () => {
    setAccessToken('mock_access_token');

    const mockLogs: WorkoutLog[] = [];

    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'cycle_file_id_456' }),
      } as Response)
    );

    const id = await createCycleFile(1, mockLogs);
    expect(id).toBe('cycle_file_id_456');
  });

  it('should update cycle logs file', async () => {
    setAccessToken('mock_access_token');

    const mockLogs: WorkoutLog[] = [];

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
      } as Response)
    );

    await updateCycleFile('cycle_file_id_123', mockLogs);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('cycle_file_id_123'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(mockLogs),
      })
    );
  });
});
