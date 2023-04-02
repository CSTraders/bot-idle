import SteamUser from 'steam-user';
import { loginClient } from './steam';
import {
  ConfigFile,
  getAppIds,
  getConfigPathsFromDirEnv,
  getConfigPathsFromEnv,
  getErrorMessage,
  getPersona,
  loadConfigFile,
} from './util';

async function main() {
  const clients: SteamUser[] = [];
  process.once('beforeExit', () => {
    for (const client of clients) {
      client.logOff();
    }
  });

  let configs = getConfigPathsFromEnv();
  if (configs.length === 0) {
    configs = await getConfigPathsFromDirEnv();
  }

  for (const path of configs) {
    console.log(`Trying to load config from ${path}`);
    let config: ConfigFile;
    try {
      config = await loadConfigFile(path);
    } catch (err) {
      console.error(`Failed to load config: ${getErrorMessage(err)}`);
      continue;
    }

    console.log(`Successfully loaded config for ${config.username}, attempting to login...`);
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

      console.log(`Successfully logged in as ${config.username}`);
      const persona = getPersona(config.persona);
      client.setPersona(persona);

      const appIds = getAppIds(config.app_ids);
      client.gamesPlayed(appIds);

      console.log(`Set persona to ${SteamUser.EPersonaState[persona]} and games to ${appIds.join(', ') || 'none'}`);
    } catch (err) {
      console.error(`Failed to login: ${getErrorMessage(err)}`);
      continue;
    } finally {
      console.log();
    }
  }
}

process.on('SIGINT', () => {
  process.exit(0);
});

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
