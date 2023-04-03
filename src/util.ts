import SteamUser from 'steam-user';

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  return String(err);
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
