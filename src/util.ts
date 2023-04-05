import SteamUser from 'steam-user';

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  return String(err);
}

const STEAM_LIMITED_ACCOUNT_URL = 'https://support.steampowered.com/kb_article.php?ref=3330-IAGK-7663';
const STEAM_LOCKED_ACCOUNT_URL = 'https://support.steampowered.com/kb_article.php?ref=6416-FHVM-3982';

export function constructLimitationMessage(
  limited: boolean,
  communityBanned: boolean,
  locked: boolean,
  canInviteFriends: boolean
): string {
  const messages: string[] = ['Account limitations:'];
  const add = (message: string) => messages.push(` - ${message}`);

  if (limited) add(`limited account (see ${STEAM_LIMITED_ACCOUNT_URL})`);
  if (locked) add(`locked account (see ${STEAM_LOCKED_ACCOUNT_URL})`);
  if (communityBanned) add('community banned');
  if (!canInviteFriends) add('cannot invite friends');
  if (messages.length === 1) return 'No account limitations';

  return messages.join('\n');
}

export function isValidPersona(persona: unknown): persona is SteamUser.EPersonaState {
  if (typeof persona !== 'number') {
    return false;
  }

  return Object.values(SteamUser.EPersonaState).includes(persona as SteamUser.EPersonaState);
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
