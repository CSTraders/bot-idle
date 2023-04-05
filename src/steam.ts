import SteamUser from 'steam-user';
import SteamTotp from 'steam-totp';
import { ConfigFile } from './config';
import { constructLimitationMessage, getAppIds, getPersona } from './util';

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

export function loginClient(config: ConfigFile, timeout: number = getTimeout()): Promise<CSteamUser> {
  return new Promise((resolve, reject) => {
    const client = new CSteamUser(config.username);
    const timeoutId = setTimeout(() => reject(new Error('Timeout')), timeout);

    client.once('loggedOn', () => {
      clearTimeout(timeoutId);
      resolve(client);
    });

    client.once('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });

    client.on('accountLimitations', (limited, communityBanned, locked, canInviteFriends) => {
      client.log(constructLimitationMessage(limited, communityBanned, locked, canInviteFriends));
    });

    client.logOn(getLogonOptions(config));
  });
}

export function requestFreeLicenses(client: CSteamUser, appIds: number[]): Promise<void> {
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

export function loggedOnHandler(client: CSteamUser, config: ConfigFile) {
  client.log(`Successfully logged in`);
  const persona = getPersona(config.persona);
  const appIds = getAppIds(config.app_ids);
  client.gamesPlayed(appIds);
  client.setPersona(persona);

  client.log(`Set persona to ${SteamUser.EPersonaState[persona]} and games to ${appIds.join(', ') || 'none'}`);
}

export class CSteamUser extends SteamUser {
  private _username: string;

  constructor(username: string) {
    super({ autoRelogin: true });
    this._username = username;
  }

  public log(...args: any[]): void {
    console.log(`[${this._username}]`, ...args);
  }

  public error(...args: any[]): void {
    console.error(`[${this._username}]`, ...args);
  }
}
