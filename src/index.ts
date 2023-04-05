import { loadConfigFiles } from './config';
import { getAppIds, getErrorMessage } from './util';
import { CSteamUser, addEachOthers, loggedOnHandler, loginClient, requestFreeLicenses } from './steam';

async function main() {
  const clients: CSteamUser[] = [];
  process.once('beforeExit', () => {
    console.log('Exiting...');
    for (const client of clients) {
      client.log(`Logging off...`);
      client.logOff();
    }
  });

  const configs = await loadConfigFiles();
  if (configs.length === 0) {
    console.error('No configs found');
    process.exit(1);
  }

  console.log(`Loaded ${configs.length} config(s)`);
  console.log();

  for (const config of configs) {
    try {
      const client = await loginClient(config);
      clients.push(client);

      client.on('error', (err) => {
        client.error(`Error: ${getErrorMessage(err)}`);
      });

      client.on('disconnected', (_eresult, msg) => {
        client.log(`Disconnected: ${msg}`);
      });

      const appIds = getAppIds(config.app_ids);
      if (appIds.length) {
        try {
          client.log(`Requesting free licenses...`);
          await requestFreeLicenses(client, appIds);
        } catch (err) {
          client.error(`Failed to request free licenses: ${getErrorMessage(err)}`);
        }
      }

      loggedOnHandler(client, config);
      client.on('loggedOn', () => {
        loggedOnHandler(client, config);
      });
    } catch (err) {
      console.error(`[${config.username}] Failed to login: ${getErrorMessage(err)}`);
      continue;
    }
  }

  if (process.env.BOT_ADD_FRIENDS === 'true') {
    await addEachOthers(clients);
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
