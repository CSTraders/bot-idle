import SteamUser from 'steam-user';
import SteamTotp from 'steam-totp';
import { ConfigFile } from './config';
import { getAppIds, getErrorMessage, getPersona } from './util';

interface LogOnOptions {
  accountName: string;
  password: string;
  twoFactorCode?: string;
}

function getLogonOptions(config: ConfigFile): LogOnOptions {
  const options: LogOnOptions = {
    accountName: config.username,
    password: config.password,
  };

  if (config.shared_secret) {
    options.twoFactorCode = SteamTotp.generateAuthCode(config.shared_secret);
  }

  return options;
}

function getTimeout(): number {
  const timeout = Number(process.env.BOT_LOGIN_TIMEOUT);
  if (Number.isNaN(timeout) || timeout <= 0) {
    return 10 * 1000;
  }

  return timeout;
}

export function loginClient(config: ConfigFile, timeout: number = getTimeout()): Promise<SteamUser> {
  return new Promise((resolve, reject) => {
    const client = new SteamUser({ autoRelogin: true });
    const timeoutId = setTimeout(() => reject(new Error('Timeout')), timeout);

    client.once('loggedOn', () => {
      clearTimeout(timeoutId);
      resolve(client);
    });

    client.once('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });

    client.logOn(getLogonOptions(config));
  });
}

export function requestFreeLicenses(client: SteamUser, appIds: number[]): Promise<void> {
  return new Promise((resolve, reject) => {
    client.requestFreeLicense(appIds, (err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
}

export function loggedOnHandler(client: SteamUser, config: ConfigFile) {
  console.log(`Successfully logged in as ${config.username}`);

  const persona = getPersona(config.persona);
  const appIds = getAppIds(config.app_ids);
  client.gamesPlayed(appIds);
  client.setPersona(persona);

  console.log(`Set persona to ${SteamUser.EPersonaState[persona]} and games to ${appIds.join(', ') || 'none'}`);
}
