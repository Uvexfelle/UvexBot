import { client } from "tmi.js";
import { dbViral, dbBigData } from "../../Setup/Utilitaires/loader.js";
import { formatResponse, getSrcId, secToTime, getTitreUid, getIdFromText, getNamesFromIds } from "./Utilitaire.js";

//  Automatique
const cachePatterns = {};

try {
    const toutesLesCommandes = dbViral.prepare(`SELECT pattern, response, type FROM commandes WHERE pattern IS NOT NULL`).all();

    for (const cmd of toutesLesCommandes) {
        if (cmd.type?.toLowerCase() === 'auto') {
            continue;
        }

        const declencheurs = cmd.pattern.split(',').map(p => p.trim().toLowerCase());

        for (const trigger of declencheurs) {
            cachePatterns[trigger] = cmd.response;
        }
    }
} catch (cachErr) {
    console.error(`[ça pue du cul...] cachePatterns vas pas bien... :`, cachErr);
}

const lastExec = {};
let lastGlobalPostTick = 0;

export const handleAutoTicker = async (client, horlogeTicks, globalChatCounter) => {
    try {

        if (horlogeTicks - lastGlobalPostTick < 2) return;

        const allAuto = dbViral.prepare(`
            SELECT name, pattern, response as resp
            FROM commandes
            WHERE type = 'auto' AND on_off = 0
        `).all();

        const sortedAutos = allAuto.sort((a, b) => {
            const prioA = parseInt(a.pattern.split(',')[2]) || 5;
            const prioB = parseInt(b.pattern.split(',')[2]) || 5;
            return prioB - prioA;
        });

        for (const auto of sortedAutos) {
            const [delaiMin, minMsgReq] = auto.pattern.split(',').map(Number);
            const last = lastExec[auto.name] || { tick: 0, msgIndex: 0 };

            const ticksRequis = delaiMin * 6;

            const ecartTicks = horlogeTicks - last.tick;
            const ecartMessages = globalChatCounter - last.msgIndex;

            if (ecartTicks >= ticksRequis && ecartMessages >= minMsgReq) {
                let messageFinal = auto.resp;

                const motsResp = auto.resp.trim().split(/\s+/);

                if (motsResp.length === 1 && motsResp[0].startsWith('!')) {
                    const triggerCible = motsResp[0].toLowerCase();

                    if (cachePatterns[triggerCible]) {
                        messageFinal = cachePatterns[triggerCible];
                    } else {
                        console.error(`[ça pue du cul...] handleAutoTicker l'alias "${triggerCible}" n\'existe pas dans le cache ????!?!?`);
                    }
                }

                const channel = client.getChannels()[0] || `#${process.env.TWITCH_CHAN}`;

                const msgPropre = formatResponse(messageFinal, channel, null, null, null);
                pushToBuffer(client, channel, msgPropre);

                const botName = client.getUsername();
                console.log(`[Ticker auto] ${botName} : ${msgPropre}`);

                lastExec[auto.name] = { tick: horlogeTicks, msgIndex: globalChatCounter };
                lastGlobalPostTick = horlogeTicks;

                break;
            }
        }
    } catch (err) {
        console.log(`[ça pue du cul...] handleAutoTicker vas pas bien.... :`, err);
    }
};

//  Regex
    //  Randomisateur de réponse
function getRandomResponse(responses) {
    if (!Array.isArray(responses) || responses.length === 0) return '';
    return responses[Math.floor(Math.random() * responses.length)];
}

    //  Regex
const pk = /^pk|pq|pourquoi/i;
const ce = /c.est|sait|veu/i;
const nop = /(?:\bsur\b(?!.*\b(super.*mario.*od[iy]s|smo|botw|zelda)\b))?/i;
const notLikeThis = /^à|le|combien|cmb/i;
const stop = /cesTbcptrOpdurpourquecesOitpifferaumilieudUnefrAserandome/;

const cleanPrefix = /^(sur|le|la|en|pour|de|du|des|dans)\s+/i;
const cleanGameWords = /\b(le|les)\s+jeux?\s*(de|du|des)?\b/gi;

const botw100 = /(zel(?!.*\b(totk|tea|(é|e)cho|eow|wind|thw|ss|skywar|oot|ocari|tp|twil)\b).*100\s?%|100\s?%.*zel|botw.*100\s?%|100\s?%.*botw)/i;
const global100 = /le.*100\s?%/i;
const pbMatch = /[st]on (pb|pr(?:\s|$)|recor(?!.* heur)|meilleur (tem|recor|scor))/i;
const wrMatch = /(wr|world recor|temp.*premi|reco.*mond|best.*ever)/i;
const askPbDefinition = /\bpb\b.*\?/i;
const heureMatch = /(me.|fai|chan|reset|modifi).*(heur|\bh\b|\bleur|minut|dat|le.*meilleur (tem|recor|scor))/i;
const langueComprendre = /(compr[ae]|\bli).*(chinoi|japonai)/i;
const langueMatch = /(me.|jou|jeu|c.est|\bc\b|ses|sait|\bs\b|s.est).*langu|chinoi|fran.ai|japonai|.nglai/i;
const topperFirst = /(?:\bpremi.*?\b((h)?ar+iet+(e)?|top*er)\b|\b((h)?ar+iet+(e)?|top*er)\b.*?\b(premi|first))/i;
const redondance = /fair(e)? l(e|a) m.me (jeu|chos)/i;

    //  Logique
export const RegexEngine = (q) => {

    const hasPk = pk.test(q);
    const hasNop = nop.test(q);
    let match;

    if (!hasPk && global100.test(q)) {
        //  100%
        const botwGameId = '76rqjqd8';
        const detected = getIdFromText(q, 'FORCE_NO_FALLBACK');

        if (detected && detected.game_id === botwGameId) {
            return {
                trigger: '',
                input: getRandomResponse([
                    `{user} le speedrun Botw 100% arrive dans l'année`,
                    `Ça arrive courant d'année le speedrun Botw 100% {user}, patience`,
                    `Let me cook {user} . Ça prend du temps, le speedrun est long à apprendre !! `
                ]),
                drapeau: 'finalMsg'
            };
        }

        return {
            trigger: '',
            input: getRandomResponse([
                `{user} Lama n'aime pas faire les 100%`,
                `{user} Le 100% ? Très peu pour Lama lamatMdr `,
                `C'est un peu long le 100% non lamatHein ? Je vais laisser ça aux autres. lamatPet `,
                `{user} 100% ? Non je veux : "Finir, vite."`,
                `Lama fini les jeu vite {user} , pas à 100% lamatCool `
            ]),
            drapeau: 'finalMsg'
        };
    }

        //  Pb
    if (!hasPk && !/\bg.\b|ça|chanc|bat|explos|proch.?\b|\bloin\b|te[chk]ni/i.test(q) && (match = q.match(pbMatch)) && hasNop) {
        const indexFinMatch = match.index + match[0].length;
        let reste = q.slice(indexFinMatch).trim();
        
        reste = reste.replace(cleanPrefix, '').trim();
        reste = reste.replace(cleanGameWords, '');
        reste = reste.replace(/[!?,.;:]/g, '').trim();
        if (reste.length <= 2) reste = '';

        return {
            trigger: '!pb',
            input: reste,
            drapeau: 'user'
        };
    }

        //  Wr
    if (!hasPk && !/bat|pile|\bplus\b|\bloin\b/i.test(q) && (match = q.match(wrMatch)) && hasNop) {
        const indexFinMatch = q.indexOf(match) + match.length;
        let reste = q.slice(indexFinMatch).trim();
        
        reste = reste.replace(cleanPrefix, '').trim();
        reste = reste.replace(cleanGameWords, '');
        reste = reste.replace(/[!?,.;:]/g, '').trim();
        if (reste.length <= 2) reste = '';

        return {
            trigger: '!wr',
            input: reste,
            drapeau: 'user'
        };
    }

        //  Explication timer détaillé
    if (!hasPk && !/\bg.\b|ça|chanc|bat|explos|proch.?\b|\bloin\b|te[chk]ni/i.test(q) && pbMatch.test(q) && hasNop) {
        return {
            trigger: '',
            input: `{user} Les petit temps en gris qui définit pb et best sont dans l'ordre 1. le temps qu'il a mis pour faire ce segment dans son PB et 2. le Best désigne le meilleur temps qu'il a jamais eu sur ce segment (gold). lamatNote La différence est donc normal et les temps sont similaire si il a fait son gold pendant son pb et que c'est encore le cas :3 `,
            drapeau: 'finalMsg'
        };
    }

        //  Définition Pb
    if (!hasPk && ce && askPbDefinition.test(q)) {
        return {
            trigger: '',
            input: `{user} Le PB ou Personal Best, est le meilleur temps personel :3 lamatNote `,
            drapeau: 'finalMsg'
        };
    }

        //  Heure graine
    if (!notLikeThis && heureMatch.test(q)) {
        return {
            trigger: '',
            input: `{user} Regarde ça pour avoir la réponse :3 : https://twitch.tv `,
            drapeau: 'finalMsg'
        };
    }

        //  Comprendre le japonais
    if (langueComprendre.test(q)) {
        return {
            trigger: '',
            input: `{user} non Lamatrak ne sait pas le lire mais c'est plus rapide pour les dialogues :3`,
            drapeau: 'finalMsg'
        };
    }

        //  Langue
    if (!notLikeThis && langueMatch.test(q)) {
        return {
            trigger: '!langue',
            input: null,
            drapeau: 'user'
        };
    }

        //  Topper First
    if (topperFirst.test(q)) {
        return {
            trigger: '',
            input: getRandomResponse([
                `{user} Hariet first ???? Lama sait joué en fait !!!!! bien sur qu'il fait Topper first lamatGrr lamatGrr lamatGrr `,
                `Il fait Topper first bien évidemment, faire Hariet first... Mais ça vas pô ou quoi làààà. `
            ]),
            drapeau: 'finalMsg'
        };
    }

        //  Redondance
    if (redondance.test(q)) {
        return {
            trigger: '',
            input: getRandomResponse([
                `{user} Oui tu as raison il déteste ça, merci à toi de lui ouvrir les yeux. lamatRage lamatRage lamatRage `,
                `{user} Merci de lui rappeler à quel point il déteste ça ! Ta fine analyse m'époustoufle lamatLoupe `
            ]),
            drapeau: 'finalMsg'
        };
    }

    return null;
};
