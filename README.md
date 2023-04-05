## bot-idle

A simple docker image for idling Steam accounts.

### Usage

Simple example:

```console
docker run -it \
  -v /path/to/bots:/bots \
  -e BOT_CONFIG_DIR=/bots \
  ghcr.io/cstraders/bot-idle
```

Complete example:

```console
docker run -it \
  -v /path/to/bots:/bots \
  -v /some/path/to/bot.json:/somewhere/bot1.json \
  -v /other/path/to/bot.json:/somewhere/bot2.json \
  -e BOT_CONFIG_DIR=/bots \
  -e BOT_CONFIG_1=/somewhere/bot1.json \
  -e BOT_CONFIG_2=/somewhere/bot2.json \
  -e BOT_APP_IDS=730,440 \
  -e BOT_PERSONA=3 \
  ghcr.io/cstraders/bot-idle
```

### Configuration

These environment variables are available:

- `BOT_LOGIN_TIMEOUT` - Timeout for logging in to Steam. Defaults to 10 seconds.
- `BOT_CONFIG_DIR` - Path to a directory containing the account files.
- `BOT_CONFIG_*` - Path to an account file. Multiple environment variables can be provided to load multiple accounts.
- `BOT_PERSONA` - Persona to use for all accounts if none is provided. Defaults to 1 (Online).
- `BOT_APP_IDS` - A comma-separated list of app IDs to idle for all accounts if none are provided. Defaults to none.
- `BOT_ADD_FRIENDS` - Set to `true` to have the bots add eachother as friends. Defaults to `false`.

#### Account files

Your Steam account credentials are provided via a JSON file.

Here's an example of a config file:

```jsonc
{
  "username": "username",
  "password": "password",
  "shared_secret": "shared_secret", // omit if the account doesn't have 2FA
  // `app_ids` and `persona` are optional and will override any defaults set
  "app_ids": [730, 440], // defaults to none
  "persona": 3 // defaults to 1, see below for supported personas
}
```

#### Loading accounts

Paths to the account files can be specified either individually by providing multiple environment variables starting with `BOT_CONFIG_` or by providing a directory containing the account files using the `BOT_CONFIG_DIR` environment variable. The directory should contain only the account files and no other files.

#### App IDs

Multiple app IDs can be provided. If none are provided, the bot will idle no games. This list should be kept short to avoid being flagged by Steam.

#### Personas

The following personas are supported:

- 0: Offline
- 1: Online
- 2: Busy
- 3: Away
- 4: Snooze
- 5: Looking to trade
- 6: Looking to play
- 7: Invisible
