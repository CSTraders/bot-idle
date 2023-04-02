import SteamUser from 'steam-user';
import SteamTotp from 'steam-totp';
import type { ConfigFile } from './util';

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

export function loginClient(config: ConfigFile, timeout: number = 5000): Promise<SteamUser> {
  return new Promise((resolve, reject) => {
    const client = new SteamUser({ autoRelogin: true });
    const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);

    client.on('loggedOn', () => {
      clearTimeout(timeout);
      resolve(client);
    });

    client.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    client.logOn(getLogonOptions(config));
  });
}
