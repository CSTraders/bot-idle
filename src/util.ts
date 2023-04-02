import path from 'node:path';
import fs from 'node:fs/promises';
import SteamUser from 'steam-user';

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  return String(err);
}

export function getConfigPathsFromEnv(): string[] {
  const envs = Object.entries(process.env);
  const paths: string[] = [];

  for (const [key, value] of envs) {
    if (key.startsWith('BOT_CONFIG_') && value) {
      if (key === 'BOT_CONFIG_DIR') {
        continue;
      }

      paths.push(path.resolve(value));
    }
  }

  return paths;
}

export async function getConfigPathsFromDirEnv(): Promise<string[]> {
  if (!process.env.BOT_CONFIG_DIR) {
    throw new Error('BOT_CONFIG_DIR is not set');
  }

  const dir = path.resolve(process.env.BOT_CONFIG_DIR);
  const files = await fs.readdir(dir);
  const paths: string[] = [];

  for (const filename of files) {
    const file = path.join(dir, filename);
    const stat = await fs.stat(file);
    if (stat.isFile()) {
      paths.push(file);
    }
  }

  return paths;
}

export interface ConfigFile {
  username: string;
  password: string;
  shared_secret?: string;
  app_ids?: number[];
  persona?: SteamUser.EPersonaState;
}

export function isValidPersona(persona: unknown): persona is SteamUser.EPersonaState {
  if (typeof persona !== 'number') {
    return false;
  }

  return Object.values(SteamUser.EPersonaState).includes(persona as SteamUser.EPersonaState);
}

export function isConfigFile(obj: unknown): obj is ConfigFile {
  if (typeof obj !== 'object' || obj === null || !('username' in obj) || !('password' in obj)) {
    return false;
  }

  if (typeof obj.username !== 'string' || typeof obj.password !== 'string') {
    return false;
  }

  if ('shared_secret' in obj && typeof obj.shared_secret !== 'string') {
    return false;
  }

  if ('app_ids' in obj && (!Array.isArray(obj.app_ids) || obj.app_ids.some((id) => typeof id !== 'number'))) {
    return false;
  }

  if ('persona' in obj && !isValidPersona(obj.persona)) {
    return false;
  }

  return true;
}

export async function loadConfigFile(path: string): Promise<ConfigFile> {
  const contents = await fs.readFile(path, 'utf8');
  const obj = JSON.parse(contents);
  if (!isConfigFile(obj)) {
    throw new Error(`Invalid config file: ${path}`);
  }

  return obj;
}

export function getPersona(configValue?: SteamUser.EPersonaState): SteamUser.EPersonaState {
  if (configValue) {
    return configValue;
  }

  if (process.env.BOT_PERSONA) {
    const persona = Number(process.env.BOT_PERSONA);
    if (isValidPersona(persona)) {
      return persona;
    }
  }

  return SteamUser.EPersonaState.Online;
}

export function getAppIds(configValue?: number[]): number[] {
  if (configValue) {
    return configValue;
  }

  if (process.env.BOT_APP_IDS) {
    const appIds = process.env.BOT_APP_IDS.split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => !Number.isNaN(id));

    if (appIds.length > 0) {
      return appIds;
    }
  }

  return [];
}
