import { dbViral, dbBigData, cmdCache, getTargetRunner } from "../../Setup/Utilitaires/loader.js";
import Fuse from "fuse.js";
import { gameDetails } from "../../config/Game-data.js";

//  Traduction des Ids <--> Text

    //  Pseudo -> Ids
export const getSrcId = (pseudo) => {
    const row = dbViral.prepare(`SELECT user_id FROM users WHERE LOWER(username) = LOWER(?)`).get(pseudo);
    return row ? row.user_id : null;
};

    //  Text -> Ids
export const getIdFromText = (input, runnerCible) => {
    if (!input || input.trim() === '' || !cmdCache.jeux) return _fallbackRunner(runnerCible, input);

    const cleanInput = input.replace(/[?!,;:()]/g, ' ').replace(/\s+/g, ' ').trim();
    const words = cleanInput.split(/\s+/);

        //  Jeux
    let absoluteBestGame = null;
    let gameFirstIndex = -1;
    let gameLastIndex = -1;

    for (let start = 0; start < words.length; start++) {
        for (let end = start + 1; end <= words.length; end++) {
            const candidate = words.slice(start, end).join(' ');
            if (/^\d+$/.test(candidate)) {
                continue;
            }

            const gameResults = cmdCache.jeux.search(candidate);
            if (gameResults.length === 0) continue;

            const bestGameMatch = gameResults[0];
            const aliasCible = bestGameMatch.matches?.[0]?.value || bestGameMatch.item.name;
            const longeurCible = candidate.length;
            const dynamicThreshold = longeurCible <= 5 ? 0.12 : 0.38;
            const boostLongeur = longeurCible * 0.005;
            
            let bonusAcronymeSuffix = 0;
            let targetGameId = bestGameMatch.item.game_id;
            const item = bestGameMatch.item;

            const isRootGame = !item.parent_id || item.parent_id === item.game_id;

            if (isRootGame) {
                const parentNames = item.name.split(',').map(s => s.trim().toLowerCase());
                const parentShort = [...parentNames].sort((a, b) => a.length - b.length)[0];

                const enfantsRows = dbViral.prepare(`SELECT game_id, name FROM jeux WHERE parent_id = ? AND game_id != ?`).all(item.game_id, item.game_id);

                for (const enfant of enfantsRows) {
                    const enfantNames = enfant.name.split(',').map(s => s.trim().toLowerCase());
                    const suffixEnfant = enfantNames[0].replace(parentNames[0], '').replace(/^[:\-\s]+/, '').trim();
                    const chaineVirtuelleAttendue = `${parentShort} ${suffixEnfant}`.trim();
                    const chatCompletContientLeMot = cleanInput.toLowerCase().includes(chaineVirtuelleAttendue);

                    if (chatCompletContientLeMot && suffixEnfant.length > 0) {
                        targetGameId = enfant.game_id;
                        bonusAcronymeSuffix = 1.0;
                        break;
                    }
                }
            }

            const scorePondere = isRootGame ? (bestGameMatch.score - 0.15 - boostLongeur - bonusAcronymeSuffix) : (bestGameMatch.score - boostLongeur);

            if (bestGameMatch.score < dynamicThreshold) {
                if (!absoluteBestGame || scorePondere < absoluteBestGame.scorePondere) {
                    absoluteBestGame = {
                        id: targetGameId,
                        scorePondere,
                        start,
                        end
                    };
                }
            }
        }
    }

    if (!absoluteBestGame) {
        return { game_id: null, uid: null, texteRestant: input };
    }

        //  Catégorie
    let gId = absoluteBestGame.id;
    gameFirstIndex = absoluteBestGame.start;
    gameLastIndex = absoluteBestGame.end;
    const gameWords = words.slice(gameFirstIndex, gameLastIndex);
    const { gameName } = getNamesFromIds({ gId });
    console.log(`gameName : ${gameName}`);

    const afterGameWords = words.filter((_, idx) => idx < gameFirstIndex || idx >=gameLastIndex);
    const afterGameStr = afterGameWords.join(' ');

    let uid = null;
    let catFirstIndex = -1;
    let catLastIndex = -1;
    let usedCatWords = [];
    let allCateLabel = [];

    if (afterGameStr.trim()) {
        const gameRow = dbViral.prepare(`SELECT parent_id FROM jeux WHERE game_id = ?`).get(gId);
        const rootId = (gameRow?.parent_id && gameRow.parent_id !== gId) ? gameRow.parent_id : gId;
        const familyRows = dbViral.prepare(`SELECT game_id FROM jeux WHERE game_id = ? OR parent_id = ?`).all(rootId, rootId);
        const familyIds = familyRows.map(r => r.game_id);

        if (familyIds.length > 0) {
            const placeholder = familyIds.map(() => '?').join(',');

            const entities = dbBigData.prepare(`
                SELECT uid, game_id, variables_json
                FROM src_entities
                WHERE game_id IN (${placeholder})
                ORDER BY cat_pop DESC
            `).all(...familyIds);

            if (entities.length > 0) {
                const searchPool = entities.map(ent => {
                    const vars = JSON.parse(ent.variables_json);
                    const catLabel = vars.Category?.label || '';
                    const subCatTrue = Object.entries(vars)
                        .filter(([key, v]) => key !== 'Category' && v.isSub === true)
                        .map(([, v]) => v.label || '')
                        .join(' ');
                    
                    const allTerms = Object.values(vars).map(v => v.label || '').join(' ');

                    return {
                        uid: ent.uid,
                        game_id: ent.game_id,
                        searchString: `${catLabel} ${subCatTrue}`.trim(),
                        allTerms: allTerms.trim()
                    };
                });

                const catFinder = new Fuse(searchPool, {keys: ['searchString'], threshold: 0.4, ignoreLocation: true, includeScore: true});

                let bestCatMatch = null;
                let tousLesMatchsValides = [];
                for (let start = 0; start < words.length; start++) {
                    if (start >= gameFirstIndex && start < gameLastIndex) continue;

                    for (let end = start + 1; end <= words.length; end++) {
                        const candidate = words.slice(start, end).join(' ');
                        const catResults = catFinder.search(candidate);

                        if (catResults.length === 0) continue;

                        catResults.forEach(matchCat => {
                
                            const longeurCatCible = candidate.length;
                            const boostLongeurCat = longeurCatCible * 0.05;

                            const jeuTrouve = (matchCat.item.game_id === gId);
                            const malusFamille = jeuTrouve ? 0 : 0.50;

                            const scorePondere = matchCat.score - boostLongeurCat + malusFamille;

                            if (matchCat.score < 0.6 && scorePondere < 0.4) {
                                tousLesMatchsValides.push({
                                    txt: candidate,
                                    label: matchCat.item.searchString,
                                    score: scorePondere,
                                    uid: matchCat.item.game_id,
                                    allTerms: matchCat.item.allTerms,
                                    start,
                                    end
                                });
              
                                if (!bestCatMatch || scorePondere < bestCatMatch.scorePondere) {
                                    bestCatMatch = {
                                        uid: matchCat.item.uid,
                                        game_id: matchCat.item.game_id,
                                        scorePondere,
                                        start,
                                        end,
                                        allTerms: matchCat.item.allTerms
                                    };
                                }
                            }
                        });
                    }
                }

                tousLesMatchsValides.sort((a, b) => a.score - b.score);
                // 👑 TON LOG EN UNE PHRASE : Sécurisé avec des fallback au cas où il y a moins de 3 matchs trouvés !
                const m1 = tousLesMatchsValides[0] ? `[#1 ${tousLesMatchsValides[0].txt} -> ${tousLesMatchsValides[0].label} (${tousLesMatchsValides[0].score.toFixed(2)})]` : 'Vide';
                const m2 = tousLesMatchsValides[1] ? `[#2 ${tousLesMatchsValides[1].txt} -> ${tousLesMatchsValides[1].label} (${tousLesMatchsValides[1].score.toFixed(2)})]` : 'Vide';
                const m3 = tousLesMatchsValides[2] ? `[#3 ${tousLesMatchsValides[2].txt} -> ${tousLesMatchsValides[2].label} (${tousLesMatchsValides[2].score.toFixed(2)})]` : 'Vide';
                
                console.log(`|¢|¢ TOP 3 MATCHS ➔ ${m1} || ${m2} || ${m3}`);


                if (bestCatMatch) {
                    uid = bestCatMatch.uid;
                    catFirstIndex = bestCatMatch.start;
                    catLastIndex = bestCatMatch.end;
                    usedCatWords = words.slice(catFirstIndex, catLastIndex);
                    allCateLabel = bestCatMatch.allTerms.split(/\s+/);
                    gId = bestCatMatch.game_id;
                }
            }
        }
    }

    const indicesUtiles = [gameFirstIndex, gameLastIndex];
    if (catFirstIndex !== -1) {
        indicesUtiles.push(catFirstIndex, catLastIndex);
    }

    const indexPremierUtile = Math.min(...indicesUtiles);
    const indexDernierUtile = Math.max(...indicesUtiles);

    const listeNoirMotsRun = new Set([
        ...gameWords.map(w => w.toLowerCase()),
        ...usedCatWords.map(w => w.toLowerCase()),
        ...allCateLabel.map(w => w.toLowerCase())
    ]);

    const tableauMotsFin = [];
    for (let idx = 0; idx < words.length; idx++) {
        const motActuel = words[idx];

        if (idx >= indexPremierUtile && idx < indexDernierUtile) {
            if (listeNoirMotsRun.has(motActuel.toLowerCase())) {
                continue;
            }
        }

        tableauMotsFin.push(motActuel);
    }

    const texteRestant = tableauMotsFin.join(' ').trim();

    console.log(`| Base : "${input}" -> Reste : "${texteRestant}" | Jeu trouvé : ${gameName}, id trouvé : ${uid || gId}`);
    return { game_id: gId, uid, texteRestant };
};
        //  Fallback (dernier Pb)
const _fallbackRunner = (runnerCible, inputBase) => {
    if (!runnerCible) return { game_Id: null, uid: null, texteRestant: inputBase };
    const lastPb = dbBigData.prepare(`
        SELECT r.uid, e.game_id FROM current_records r
        JOIN src_entities e ON r.uid = e.uid
        WHERE r.runner_id = ? ORDER BY r.pb_date DESC LIMIT 1
    `).get(runnerCible);
    return { game_id: lastPb?.game_id || null, uid: lastPb?.uid || null, texteRestant: inputBase };
};

    //  Ids -> Text
export const getNamesFromIds = ({ gId, uid } = {}) => {
    let resolvedGameId = gId;
    let resolvedVars = null;

    //  Récupération du gId via uid
    if (uid) {
        const ent = dbBigData.prepare(`SELECT game_id, variables_json FROM src_entities WHERE uid = ?`).get(uid);

        if (ent) {
            resolvedGameId = resolvedGameId || ent.game_id;
            resolvedVars = ent.variables_json;
        }
    }

    //  Création du nom de jeu
    let gameName = resolvedGameId || 'jeu inconnu';
    if (resolvedGameId) {
        const gameRow = dbViral.prepare(`SELECT name, parent_id FROM jeux WHERE game_id = ?`).get(resolvedGameId);
        if (gameRow) {
            const names = gameRow.name.split(',').map(n => n.trim());
            const shortName = [...names].sort((a, b) => a.length - b.length)[0].toUpperCase();

        //  Cas enfant
            if (gameRow.parent_id && gameRow.parent_id !== resolvedGameId) {
                const parentRow = dbViral.prepare(`SELECT name FROM jeux WHERE game_id = ?`).get(gameRow.parent_id);
                if (parentRow) {
                    const parentNames = parentRow.name.split(',').map(n => n.trim());
                    const parentShort = [...parentNames].sort((a, b) => a.length - b.length)[0].toUpperCase();
                    const suffix = names[0].replace(parentNames[0], '').replace(/^[:\-\s]+/, '').trim();
                    gameName = suffix.length > 0 ? `${parentShort} : ${suffix}` : parentShort;
                } else {
                    gameName = shortName;
                }
            } else {
                gameName = shortName;
            }
        }
    }

    //  Création du nom de catégorie
    let catName = 'Catégorie inconnue';
    if (resolvedVars) {
        try {
            const vars = typeof resolvedVars === 'string' ? JSON.parse(resolvedVars) : resolvedVars;
            const baseLabel = vars.Category?.label || 'Sans nom';
            const subLabels = Object.entries(vars)
                .filter(([key, val]) => key !== 'Category' && val.isSub === true)
                .map(([, val]) => {
                    const cleaned = val.label.replace(new RegExp(baseLabel, 'gi'), '').trim();
                    return cleaned.length > 0 ? cleaned : val.label;
                })
                .filter(label => label.toLowerCase() !== baseLabel.toLowerCase());

            catName = subLabels.length > 0 ? `${baseLabel} (${subLabels.join(', ')})` : baseLabel;
        } catch (e) {
            console.error(`[ça pue du cul ...] getNameFromIds Parse error :`, e.message);
        }
    }

    return { gameName, catName };
};

    //  Titre -> Uid
        //  Regex
const regexSubTime = /\bsub\s*(-?\s*\w+|[0-9hms:]+)/gi;
const regexPromoEtCommandes = /![a-zA-Z0-9_-]+|\b(youtube|yt|discord|tiktok|tt|instagram|insta|twitter|linktree|site|vid[eé]o[s]?|nouvelle[s]?|clip[s]?|rediff|vod)\b/gi;
const regexChronosEtProgression = /\b\d{1,2}(:\d{2}){1,2}\b|\b(jour|day|essai|tentative|session|grind)\s*\d*\b|\b\d+([eè]me|[eè]re)\b/gi;
const regexMotsVidesSpeedrun = /\b(speedrun[n]?[e]?ur[s]?|run[n]?[e]?r?[s]?|pb|pr|wr|record[s]?|meilleur\s+temps|nouveau|nouvelle|j'ai|un|le|la|les|de|du|des|pour|avec|dans|sur|en|mais|tout|est|uniquement)\b/gi;

        //  Clean du titre
function _cleanStreamTitle(title) {
    if (!title) return '';

    let clean = title;

    clean = clean.replace(regexSubTime, '');
    clean = clean.replace(regexPromoEtCommandes, '');
    clean = clean.replace(regexChronosEtProgression, '');
    clean = clean.replace(/[^\w\s\dàâéèêëîïôöùûüçÀÂÉÈÊËÎÏÔÖÙÛÜÇ]/g, ' ');
    clean = clean.replace(regexMotsVidesSpeedrun, '');

    return clean.toLowerCase().replace(/\s+/g, ' ').trim();
}

        //  Montage de l'uid
export const getTitreUid = (live, runnerCible) => {
    try {
        if (!live || !live.game || !live.title) return null;

        const categorieTwitch = live.game.trim();
        if (categorieTwitch.toLowerCase() === 'just chatting' || categorieTwitch.toLowerCase() === 'discussion') {
            return null;
        }

        let titre = live.title.trim();
        titre = titre.replace(/speedrun([a-zA-Z0-9])/gi, 'speedrun $1');
        titre = titre.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, ' ');

        const estUnSpeedrun = /\b(speedrun|pb|pr|wr|record|run|grind|sub\s*\w+)\b/i.test(titre);
        if (!estUnSpeedrun) return null;

        titre = _cleanStreamTitle(titre);
        if (!titre) return null;

        titre = titre.toLowerCase();
        const motsJeux = categorieTwitch.toLowerCase().split(/\s+/);

        motsJeux.forEach(mot => {
            if (mot.length > 2) {
                const regexMot = new RegExp(`\\b${mot}\\b`, 'g');
                titre = titre.replace(regexMot, '');
            }
        });

        titre =  titre.replace(/\s+/g, ' ').trim();

        const input = `${categorieTwitch} ${titre}`.trim();
        const target = getIdFromText(input, 'force_no_fallback');

        console.log(
            `|¢|¢ DIAGNOSTIC TARGET POUR : "${titre.substring(0, 30)}..." |¢|¢\n` +
            `target existe = ${!!target} | type de target = ${typeof target}\n` +
            `target.uid = ${target?.uid || 'undefined'} | target.game_id = ${target?.game_id || 'undefined'}\n` +
            `target.category_id = ${target?.category_id || 'undefined'} | target.texteRestant = "${target?.texteRestant || ''}"`
        );

        if (!target?.uid && target?.game_id) {
            const topCatRow = dbBigData.prepare(`
                SELECT e.uid
                FROM src_entities e
                LEFT JOIN current_records r ON e.uid = r.uid AND r.runner_id = ?
                WHERE e.game_id = ?
                ORDER BY
                    (CASE WHEN r.uid IS NOT NULL THEN 1 ELSE 0 END) DESC,
                    e.cat_pop DESC
                LIMIT 1
            `).get(runnerCible, target.game_id);

            if (topCatRow?.uid) return topCatRow.uid;
        }

        return target ? target.uid : null;
        
    } catch (err) {
        console.error(`[ça pue du cul...] getTitreUid n'as pas pu trouver d'uid :`, err);
        return null;
    }
};

//  Conversion de temps

    //  Text -> Sec
export const timeToSec = (hms) => {
    if (!hms || typeof hms !== 'string' || hms.includes('Laissez')) return 0;

    const texte = hms.trim().toLowerCase();

    let resteSansMs = texte;
    let msEnSec = 0;

    if (texte.includes(',')) {
        const [avantVirgule, apresVirgule] = texte.split(',');
        const msStr = apresVirgule.match(/\d+/)?.[0] || 0;
        if (msStr) {
            msEnSec = Number(`0.${msStr}`) || 0;
        }
        resteSansMs = avantVirgule;
    }

    if (resteSansMs.includes('h')) {
        const [hBrut, reste] = resteSansMs.split('h');
        const h = Number(hBrut) || 0;

        const parts = reste.match(/\d+/g)?.map(Number) || [];
        const m = parts[0] || 0;
        const s = parts[1] || 0;

        return (h * 3600) + (m * 60) + s + msEnSec;
    }

    const parts = resteSansMs.match(/\d+/g)?.map(Number) || [];
    if (parts.length === 0) return msEnSec;

    if (parts.length === 3) {
        return (parts[0] * 3600) + (parts[1] * 60) + parts[2] + msEnSec;
    }

    if (parts.length === 2) {
        return (parts[0] * 60) + parts[1] + msEnSec;
    }

    return parts[0] + msEnSec;
};

    // Sec -> Text
export const secToTime = (s) => {
   if (s === null || s === undefined || isNaN(s) || s < 0) return '0:00';

   const h = Math.floor(s / 3600);
   const m = Math.floor((s % 3600) / 60);
   const sec = Math.floor(s % 60);
   const ms = Math.floor((s % 1) * 1000);

   const prefisHeure = h > 0 ? `${h}h` : '';
   const mstr = h > 0 ? m.toString().padStart(2, '0') : m.toString();

   let result = `${prefisHeure}${mstr}:${sec.toString().padStart(2, '0')}`;

   if (ms > 0 && s < 480) {
    const msStr = ms.toString().padStart(3, '0').replace(/0+$/, '');
    result += `.${msStr}`;
   }

   return result;
};

    //  Text -> Date
export const formatDate = (dateRow) => {
    if (!dateRow || typeof dateRow !== 'string') return null;

    const cleanStr = dateRow.trim().replace(/[-/]/g, '.');
    const blocks = cleanStr.split('.');

    if (blocks.length < 2 || blocks.length > 3) return null;

    const day = parseInt(blocks[0], 10);
    const month = parseInt(blocks[1], 10);
    let year = new Date().getFullYear();

    if (blocks.length === 3) {
        const yearStr = blocks[2];
        year = yearStr.length === 2 ? parseInt("20" + yearStr, 10) : parseInt(yearStr, 10);
    }

    const computedDate = new Date(year, month - 1, day);

    if (
        computedDate.getFullYear() === year &&
        computedDate.getMonth() === (month - 1) &&
        computedDate.getDate() === day
    ) {
        const mm = month.toString().padStart(2, '0');
        const jj = day.toString().padStart(2, '0');
        const dateISO = `${year}-${mm}-${jj}`;

        return dateISO;
    }

    return null;
};

    // Date -> Text
export const displayDate = (dateRow) => {
    if (!dateRow) return null;
    
    const d = new Date(typeof dateRow === 'number' ? dateRow * 1000 : dateRow);
    if (isNaN(d.getTime())) return null;
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().slice(-2)}`;
}

//  Formatage
export const formatResponse = (text, channel, runnerCible, pseudo, activeDrapeau) => {
    if (!text) return '';
    let texteFinal = text;

    //  Générateur de nombre
    if (texteFinal.includes('{random')) {
        texteFinal = texteFinal.replace(/\{random:(\d+)(?::(\d+))?\}/gi, (match, a, b) =>{
            const min = b !== undefined ? parseInt(a, 10) : 0;
            const max = b !== undefined ? parseInt(b, 10) : parseInt(a, 10);
            return Math.floor(Math.random() * (max - min + 1)) + min;
        });
    }

    //  User
    if (texteFinal.includes('{user}')) {
        texteFinal = texteFinal.replace('{user}', `@${pseudo}`);
    }

    //  Channel
    if (runnerCible) {
        texteFinal = texteFinal.replace(/\{channel\}/gi, runnerCible.toLowerCase());
    }

    //  Infos live
        //  Catégorie
    if (texteFinal.includes('{game}')) {
        const gameLive = channel.game.trim();
        texteFinal = texteFinal.replace('{game}', gameLive );
    }
        //  Titre
    if (texteFinal.includes('{title}')) {
        const titleLive = channel.title.trim();
        texteFinal = texteFinal.replace('{title}', titleLive );
    }

        //  Settings
    texteFinal = texteFinal.replace(/{([^}]+)}/g, (match, cleBalise) => {
        const cleNettoye = cleBalise.trim().toLowerCase();

        if (cmdCache.settings[cleNettoye] !== undefined) {
            return cmdCache.settings[cleNettoye];
        }
        return match;
    });

    return texteFinal.replace(/\s+/g, ' ').trim();
};
