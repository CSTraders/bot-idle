import path from 'node:path';
import fs from 'node:fs/promises';
import type SteamUser from 'steam-user';
import { getErrorMessage, isValidPersona } from './util';

export interface ConfigFile {
  username: string;
  password: string;
  shared_secret?: string;
  app_ids?: number[];
  persona?: SteamUser.EPersonaState;
}

function getConfigPathsFromEnvs(): string[] {
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

async function getConfigPathsFromDir(): Promise<string[]> {
  if (!process.env.BOT_CONFIG_DIR) {
    return [];
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

function isConfigFile(obj: unknown): obj is ConfigFile {
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

function removeComments(json: string): string {
  return json.replace(/\/\/.*$/gm, '');
}

async function loadConfigFile(path: string): Promise<ConfigFile> {
  const contents = await fs.readFile(path, 'utf8');
  const obj = JSON.parse(removeComments(contents));
  if (!isConfigFile(obj)) {
    throw new Error(`Invalid config file: ${path}`);
  }

  return obj;
}

function dedupeConfigs(configs: ConfigFile[]): ConfigFile[] {
  const map = new Map<string, ConfigFile>();
  for (const config of configs) {
    if (!map.has(config.username)) {
      map.set(config.username, config);
    } else {
      console.warn(`Duplicate config for ${config.username} found. Skipping subsequent config.`);
    }
  }

  return [...map.values()];
}

export async function loadConfigFiles(): Promise<ConfigFile[]> {
  const paths = await getConfigPathsFromDir();
  paths.push(...getConfigPathsFromEnvs());

  const configs: ConfigFile[] = [];
  for (const path of paths) {
    try {
      console.log(`Trying to load config from ${path}`);
      const config = await loadConfigFile(path);
      configs.push(config);
    } catch (err) {
      console.error(`Failed to load config: ${getErrorMessage(err)}`);
    } finally {
      console.log();
    }
  }

  return dedupeConfigs(configs);
}
