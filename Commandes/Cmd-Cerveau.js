import { cmdCache, dbViral, getCurrentTimeUTC2, IS_CMD_LOCK, IS_DEV_MODE } from "../Setup/Utilitaires/loader.js";
import { formatResponse, getSrcId } from "./Moteur/Utilitaire.js";
import { getPbWrResponse } from "./Moteur/Pb-Wr-engine.js";
import { cmdModeration } from "./Moteur/Modération.js"
import { handleAutoTicker, RegexEngine } from "./Moteur/Cmd-basique.js";


//  Buffer
    //  Configuration
const messageQueue = [];
let isSending = false;
const rateLimiteInterval = 367;
const antiDoublonTimout = 1000;
const cmdTimeout = 30000;

let lastMessageSentTime = 0;
const lastSentMessages = new Map();
const lastSentCmd = new Map();

const stmtTotalCount = dbViral.prepare(`UPDATE commandes SET total_count = COALESCE(total_count, 0) + 1 WHERE name = ?`);

    //  Réponse
export const pushToBuffer = (client, channel, cmd, text) => {
    if (!text) return;

        //  Protection anti doublons
    const channelHistory = lastSentMessages.get(channel) || {};
    const lastSentTime = channelHistory[text] || 0;

    if (Date.now() - lastSentTime < antiDoublonTimout) {
        return;
    }

        //  Mis à jour de l'historique
    channelHistory[text] = Date.now();
    lastSentMessages.set(channel, channelHistory);

        //  Envoie
    const tempsEcoule = Date.now() - lastMessageSentTime;

    if (!isSending && messageQueue.length === 0 && tempsEcoule >= rateLimiteInterval) {
        client.say(channel, text);
        lastMessageSentTime = Date.now();
        console.log(`[${getCurrentTimeUTC2()}] UvexBot : ${text}`);
    }
    else {
        messageQueue.push({ channel, text });
        if (!isSending) {
            isSending = true;

            const tempsAttenteRequis = Math.max(0, rateLimiteInterval - tempsEcoule);
            setTimeout(() => processQueue(client), tempsAttenteRequis);
        }
    }
};

    //  Videnge d'historique
const processQueue = (client) => {
    if (messageQueue.length === 0) {
        isSending = false;
        return;
    }
    const nextMessage = messageQueue.shift();

    client.say(nextMessage.channel, nextMessage.text);
    lastMessageSentTime = Date.now();
    console.log(`[${getCurrentTimeUTC2()}] UvexBot : ${nextMessage.text}`);

    setTimeout(() => processQueue(client), rateLimiteInterval);
};

//  Géstionaire de réponse
export const getBotResponse = async (userMessage, channelName, live, client, channel, tags, pseudo) => {
    try {
        if (!channelName) return null;

        const runnerCible = getSrcId(channelName) || channelName;

    //  Message automatique
        await handleAutoTicker(client, channel, 1);

    //  Nettoyage du message
        const messageBrut = userMessage.trim();
        if (!messageBrut) return null;

        //  Découpage du trigger
        const words = messageBrut.split(/\s+/);

        let trigger = '';
        let inputRestant = '';

            //suppression du @
        if (words[0] && words[0].startsWith('@')) {
            trigger = words[1] ? words[1].toLowerCase() : '';
            inputRestant = words.slice(2).join(' ');
        } else {
            trigger = words[0] ? words[0].toLowerCase() : '';
            inputRestant = words.slice(1).join(' ');
        }

        if (!trigger) return null;

    //  Routage commande
        let retourBrute = null;
        let finalId = 'inconnu';
        let activeDrapeau = 'inconnu';

        //  Commandes
        let cmd = cmdCache.commandes[trigger];

        //  Regex
        const regexMatch = RegexEngine(messageBrut);
        activeDrapeau = regexMatch?.drapeau;

        // Regex trouvé
        if (regexMatch) {
            //  Réponse direct d'une regex
            if (activeDrapeau === 'finalMsg') {
                retourBrute = regexMatch.input;
                finalId = 'regex-direct';
            //  Détection de commandes
            } else if (regexMatch.trigger) {
                //  via le trigger
                if (cmd) {
                    inputRestant = words.slice(1).join(' ');
                    activeDrapeau = 'inconnu';
                //  via language naturel
                } else {
                trigger = regexMatch.trigger.toLowerCase();
                inputRestant = regexMatch.input;
                cmd = cmdCache.commandes[trigger];
                }
            }
        }

        if (!retourBrute && !trigger) return null;

        if (!retourBrute && cmd && cmd.on_off === 0) {
            const cmdHistory = lastSentCmd.get(channel) || {};
            const lastCmdTime = cmdHistory[cmd.name] || 0;
            const tempsEcoule = Date.now() - lastCmdTime;
            const cmdNoCd = (cmd.name.toLowerCase() === 'pb' || cmd.name.toLowerCase() === 'wr') || cmd.type.toLowerCase() === 'modération';

            if (IS_DEV_MODE === false && tempsEcoule < cmdTimeout && !cmdNoCd) {
                return null;
            }
            cmdHistory[cmd.name] = Date.now();
            lastSentCmd.set(channel, cmdHistory);

            switch (cmd.type.toLowerCase()) {

        //  Modération
                case 'modération':
                    const isMod = tags.mod === true || tags.badges?.moderator === '1';
                    const isStreamer = tags.badges?.broadcaster === '1';

                    if (isMod || isStreamer) {
                        await cmdModeration(messageBrut, pseudo, cmd, runnerCible, client, channel);
                        cmd.total_count = (cmd.total_count || 0) + 1;
                        stmtTotalCount.run(cmd.name);
                    }
                    return null;

        //  Speedrun
                case 'speedrun':
                    retourBrute = await getPbWrResponse(cmd.name, inputRestant, runnerCible, live, activeDrapeau);
                    finalId = 'speedrun-engine';
                    cmd.total_count = (cmd.total_count || 0) + 1;
                    stmtTotalCount.run(cmd.name);
                    break;

        //  Commande statique
                case 'static':
                    const execptions = ['SpoilTime', 'TestLive']
                    if (IS_CMD_LOCK && !execptions.includes(cmd.name)) {
                        return null;
                    }
                    retourBrute = cmd.response;
                    finalId = 'static-command';
                    cmd.total_count = (cmd.total_count || 0) + 1;
                    stmtTotalCount.run(cmd.name);
                    break;

        //  Envoie automatique
                case 'auto':
                    return null;
            }
        }
        if (!retourBrute) return null;

    //  Formatage des réponse
        const texteFinal = formatResponse(retourBrute, live, channelName, pseudo);

        if (!texteFinal) return null;

    //  Envoie via buffer
        pushToBuffer(client, channel, cmd, texteFinal);

        return { text: texteFinal, id: finalId };

    } catch (err) {
        console.error(`[ça pue du cul...] Cmd-cerveau vas pas bien :`, err);
        return null;
    }
};