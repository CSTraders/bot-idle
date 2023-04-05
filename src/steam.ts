import SteamID from 'steamid';
import SteamUser from 'steam-user';
import SteamTotp from 'steam-totp';
import { ConfigFile } from './config';
import { constructLimitationMessage, delay, getAppIds, getErrorMessage, getPersona } from './util';

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

export async function addFriendIfNot(client: CSteamUser, other: CSteamUser): Promise<void> {
  const friends = client.myFriends;
  const otherSteamId = other.steamID?.getSteamID64();
  if (!otherSteamId) {
    throw new Error(`Could not get steam id of ${other.username}`);
  }

  if (friends[otherSteamId]) {
    return;
  }

  client.log(`Adding ${other.username} as friend`);
  await client.addFriend(otherSteamId);
}

function isClientID(clients: CSteamUser[], steamId: SteamID): boolean {
  return clients.some((client) => client.steamID?.getSteamID64() === steamId.getSteamID64());
}

export async function addEachOthers(clients: CSteamUser[]): Promise<void> {
  for (const client of clients) {
    async function acceptIfClient(steamId: SteamID, relationship: SteamUser.EFriendRelationship) {
      if (isClientID(clients, steamId) && relationship === SteamUser.EFriendRelationship.RequestRecipient) {
        try {
          await client.addFriend(steamId);
          client.log(`Accepted ${steamId} as friend`);
        } catch (err) {
          client.error(`Failed to accept ${steamId} as friend: ${getErrorMessage(err)}`);
        }
      }
    }

    client.on('friendRelationship', acceptIfClient);
    for (const [steamId, relationship] of Object.entries(client.myFriends)) {
      await acceptIfClient(new SteamID(steamId), relationship);
    }

    for (const other of clients) {
      if (client === other) {
        continue;
      }

      try {
        await addFriendIfNot(client, other);
      } catch (err) {
        client.error(`Failed to add ${other.username} as friend: ${getErrorMessage(err)}`);
      }

      await delay(1000);
    }
  }
}

export class CSteamUser extends SteamUser {
  public readonly username: string;

  constructor(username: string) {
    super({ autoRelogin: true });
    this.username = username;
  }

  public log(...args: any[]): void {
    console.log(`[${this.username}]`, ...args);
  }

  public error(...args: any[]): void {
    console.error(`[${this.username}]`, ...args);
  }
}
