import SteamUser from 'steam-user';
import { loadConfigFiles } from './config';
import { loggedOnHandler, loginClient, requestFreeLicenses } from './steam';
import { getAppIds, getErrorMessage } from './util';

async function main() {
  const clients: SteamUser[] = [];
  process.once('beforeExit', () => {
    console.log('Exiting...');
    for (const client of clients) {
      console.log(`Logging off ${client.steamID ?? 'an unknown account'}...`);
      client.logOff();
    }
  });

  const configs = await loadConfigFiles();
  if (configs.length === 0) {
    console.error('No configs found');
    process.exit(1);
  }

  console.log();

  for (const config of configs) {
    try {
      const client = await loginClient(config);
      clients.push(client);

      client.on('error', (err) => {
        console.error(`[${config.username}] Error: ${getErrorMessage(err)}`);
      });

      client.on('accountLimitations', (limited, communityBanned, locked, canInviteFriends) => {
        console.log(`[${config.username}] Account limitations:`, {
          limited,
          communityBanned,
          locked,
          canInviteFriends,
        });
      });

      client.on('disconnected', (eresult, msg) => {
        console.log(`[${config.username}] Disconnected: ${SteamUser.EResult[eresult]} - ${msg}`);
      });

      const appIds = getAppIds(config.app_ids);
      if (appIds.length) {
        try {
          console.log(`[${config.username}] Requesting free licenses...`);
          await requestFreeLicenses(client, appIds);
        } catch (err) {
          console.error(`[${config.username}] Failed to request free licenses: ${getErrorMessage(err)}`);
        }
      }

      loggedOnHandler(client, config);
      client.on('loggedOn', () => {
        loggedOnHandler(client, config);
      });
    } catch (err) {
      console.error(`Failed to login: ${getErrorMessage(err)}`);
      continue;
    } finally {
      console.log();
    }
  }
}

function exitHandler(signal: NodeJS.Signals) {
  console.log(`Received ${signal}`);
  process.exit(0);
}

process.on('SIGINT', exitHandler);
process.on('SIGTERM', exitHandler);

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
