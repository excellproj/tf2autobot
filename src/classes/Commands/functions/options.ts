import SteamID from 'steamid';
import { promises as fsp } from 'fs';

import Bot from '../../Bot';
import CommandParser from '../../CommandParser';
import { getOptionsPath, JsonOptions, removeCliOptions } from '../../Options';

import { deepMerge } from '../../../lib/tools/deep-merge';
import validator from '../../../lib/validator';
import log from '../../../lib/logger';

export function optionsCommand(steamID: SteamID, bot: Bot): void {
    const liveOptions = deepMerge({}, bot.options) as JsonOptions;
    // remove any CLI stuff
    removeCliOptions(liveOptions);

    const commands = liveOptions.commands;
    const detailsExtra = liveOptions.detailsExtra;

    delete liveOptions.commands;
    delete liveOptions.detailsExtra;

    bot.sendMessage(steamID, `/code ${JSON.stringify(liveOptions, null, 4)}`);
    void promiseDelay(1000);
    bot.sendMessage(steamID, `/code ${JSON.stringify({ commands: commands }, null, 4)}`);
    void promiseDelay(1000);
    bot.sendMessage(steamID, `/code ${JSON.stringify({ detailsExtra: detailsExtra }, null, 4)}`);
}

function promiseDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
}

export function updateOptionsCommand(steamID: SteamID, message: string, bot: Bot): void {
    const opt = bot.options;

    const params = CommandParser.parseParams(CommandParser.removeCommand(message)) as unknown;

    const optionsPath = getOptionsPath(opt.steamAccountName);
    const saveOptions = deepMerge({}, opt) as JsonOptions;
    removeCliOptions(saveOptions);

    if (Object.keys(params).length === 0) {
        const msg = '⚠️ Missing properties to update.';
        if (steamID) bot.sendMessage(steamID, msg);
        else log.warn(msg);
        return;
    }

    const knownParams = params as JsonOptions;

    if (typeof knownParams.discordWebhook === 'object') {
        if (knownParams.discordWebhook.ownerID !== undefined) {
            // THIS IS WHAT IS NEEDED ACTUALLY
            knownParams.discordWebhook.ownerID = String(knownParams.discordWebhook.ownerID);
        }
        if (knownParams.discordWebhook.displayName !== undefined) {
            knownParams.discordWebhook.displayName = String(knownParams.discordWebhook.displayName);
        }
        if (knownParams.discordWebhook.embedColor !== undefined) {
            // AND ALSO THIS
            knownParams.discordWebhook.embedColor = String(knownParams.discordWebhook.embedColor);
        }
    }

    const result: JsonOptions = deepMerge(saveOptions, knownParams);

    const errors = validator(result, 'options');
    if (errors !== null) {
        const msg = '❌ Error updating options: ' + errors.join(', ');
        if (steamID) bot.sendMessage(steamID, msg);
        else log.error(msg);
        return;
    }

    fsp.writeFile(optionsPath, JSON.stringify(saveOptions, null, 4), { encoding: 'utf8' })
        .then(() => {
            deepMerge(opt, saveOptions);
            const msg = '✅ Updated options!';

            if (typeof knownParams.game === 'object') {
                if (knownParams.game.playOnlyTF2 !== undefined && knownParams.game.playOnlyTF2 === true) {
                    bot.client.gamesPlayed([]);
                    bot.client.gamesPlayed(440);
                }

                if (knownParams.game.customName !== undefined && typeof knownParams.game.customName === 'string') {
                    bot.client.gamesPlayed([]);
                    bot.client.gamesPlayed(
                        (
                            knownParams.game.playOnlyTF2 !== undefined
                                ? knownParams.game.playOnlyTF2
                                : opt.game.playOnlyTF2
                        )
                            ? 440
                            : [knownParams.game.customName, 440]
                    );
                }
            }

            if (typeof knownParams.statistics === 'object') {
                if (knownParams.statistics.sendStats !== undefined) {
                    if (knownParams.statistics.sendStats.enable === true) {
                        bot.handler.sendStats();
                    } else {
                        bot.handler.disableSendStats();
                    }

                    if (knownParams.statistics.sendStats.time !== undefined) {
                        bot.handler.sendStats();
                    }
                }
            }

            if (knownParams.autobump !== undefined) {
                if (knownParams.autobump === true) {
                    bot.listings.setupAutorelist();
                    bot.handler.disableAutoRefreshListings();
                } else {
                    bot.listings.disableAutorelistOption();
                    bot.handler.enableAutoRefreshListings();
                }
            }

            if (knownParams.normalize === 'object') {
                void bot.inventoryManager.getInventory.fetch();
            }

            if (knownParams.autokeys !== undefined) {
                bot.handler.autokeys.check();
                if (knownParams.autokeys.enable !== undefined && !knownParams.autokeys.enable) {
                    bot.handler.autokeys.disable();
                }
                bot.handler.autokeys.check();
                bot.handler.updateAutokeysStatus();
            }

            if (steamID) return bot.sendMessage(steamID, msg);
            else return log.info(msg);
        })
        .catch(err => {
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            const msg = `❌ Error saving options file to disk: ${err}`;
            if (steamID) bot.sendMessage(steamID, msg);
            else log.error(msg);
            return;
        });
}
