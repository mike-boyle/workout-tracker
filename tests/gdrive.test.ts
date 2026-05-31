import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setAccessToken,
  findBackupFile,
  downloadBackup,
  createBackupFile,
  updateBackupFile,
} from '../src/services/gdrive';
import { UserState } from '../src/types';

describe('Google Drive Sync Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAccessToken(null);
  });

  it('should throw an error if executing operations without access token', async () => {
    await expect(findBackupFile()).rejects.toThrow('Not authenticated with Google');
  });

  it('should find a backup file and return its ID', async () => {
    setAccessToken('mock_access_token');

    const mockResponse = {
      files: [{ id: 'file_id_123' }],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const fileId = await findBackupFile();
    expect(fileId).toBe('file_id_123');
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('spaces=appDataFolder'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer mock_access_token' },
      })
    );
  });

  it('should return null if search result is empty', async () => {
    setAccessToken('mock_access_token');

    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      } as Response)
    );

    const fileId = await findBackupFile();
    expect(fileId).toBeNull();
  });

  it('should download backup file contents', async () => {
    setAccessToken('mock_access_token');

    const mockBackup: UserState = {
      version: 1,
      currentCycle: 2,
      currentWeek: 2,
      currentDay: 2,
      logs: [],
      gdriveLinked: true,
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockBackup),
      } as Response)
    );

    const state = await downloadBackup('file_id_123');
    expect(state).toEqual(mockBackup);
  });

  it('should upload a new backup file and return file ID', async () => {
    setAccessToken('mock_access_token');

    const mockBackup: UserState = {
      version: 1,
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 1,
      logs: [],
      gdriveLinked: true,
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'new_file_id_456' }),
      } as Response)
    );

    const id = await createBackupFile(mockBackup);
    expect(id).toBe('new_file_id_456');
  });

  it('should update an existing backup file', async () => {
    setAccessToken('mock_access_token');

    const mockBackup: UserState = {
      version: 1,
      currentCycle: 1,
      currentWeek: 1,
      currentDay: 1,
      logs: [],
      gdriveLinked: true,
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
      } as Response)
    );

    await updateBackupFile('file_id_123', mockBackup);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('file_id_123'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(mockBackup),
      })
    );
  });
});
