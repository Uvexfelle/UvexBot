import { dbBigData, dbViral } from "../../Setup/Utilitaires/loader.js";
import { pushToBuffer } from "../Cmd-Cerveau.js";
import { formatDate, getIdFromText, getNamesFromIds, secToTime, timeToSec } from "./Utilitaire.js";

//  Utilitaires
let activeMessageListener = null;
let timeoutId = null;

    //  Fonction utile
        //  Déterminer la place via un temps
function getPredictedRank(uid, newTime) {
    try {
        const entity = dbBigData.prepare(`SELECT lead_json FROM src_entities WHERE uid = ?`).get(uid);
        if (!entity || !entity.lead_json) {
            return null
        };

        const board = JSON.parse(entity.lead_json);
        if (!Array.isArray(board) || board.length === 0) {
            return null
        };

        const sortedBoard = [...board].sort((a,b) => a.time - b.time);

        const index = sortedBoard.findIndex(run => newTime <= run.time);

        if (index === -1) return sortedBoard.length + 1;
        return sortedBoard[index].place;
    } catch (e) {
        console.error(`[ça pue du cul...] getPredictedRank vas pas bien :`, e);
        return null;
    }
}

//  Commande de la modération
export const cmdModeration = async (userMessage, pseudo, runnerCible, client, channel) => {
    try {

        //  Nettoyage de l'input
        const cleanMessage = userMessage.trim();
        const words = cleanMessage.split(/\s+/);
        const commandeMod = words[0].toLowerCase();

        //  Switch
        switch (commandeMod) {

            //  !AddPb
            case '!addpb': {
                //  Infos
                if (words.length < 3) return;

                    //  Temps
                const timeSec = timeToSec(words[1]);
                if (!timeSec) return;

                    //  Date
                const lastWord = words[words.length - 1];
                let formattedDate = formatDate(lastWord);
                let gameAndCateWords = [];

                if (formattedDate) {
                    gameAndCateWords = words.slice(2, -1);
                } else {
                    formattedDate = new Date().toISOString().split('T')[0];
                    gameAndCateWords = words.slice(2);
                }

                    //  Jeux
                const gameAndCatStr = gameAndCateWords.join(' ');

                    //  Ancien Pb
                const target = getIdFromText(gameAndCatStr, runnerCible);
                if (!target || !target.game_id && !target.uid) return;

                    //  FallBack pas de catégorie
                if (!target.uid && target.game_id) {
                    const { gameName } = getNamesFromIds({ game_id: target.game_id });
                    pushToBuffer(client, channel, `@${pseudo}, j'ai trouvé le jeu ${gameName} mais n'est pas réussi à trouvé de caté`);
                    return;
                }

                const currentRecord = dbBigData.prepare(`
                    SELECT pb_src_time, pb_manual_time, pb_rank, pb_date, pb_video
                    FROM current_records WHERE runner_id = ? AND uid = ?
                `).get(runnerCible, target.uid);

                        //  Temps
                const currentTimeReference = currentRecord ? (currentRecord.pb_src_time ?? currentRecord.pb_manual_time) : null;

                if (currentTimeReference !== null && timeSec === currentTimeReference && formattedDate === currentRecord.pb_date) {
                    pushToBuffer(client, channel, `@${pseudo} record déjà enregistré.`);
                    return;
                }

                        //  Rank
                const predictedRank = getPredictedRank(target.uid, timeSec);
                const { gameName, catName } = getNamesFromIds({ uid: target.uid });

                if (currentTimeReference !== null) {
                    pushToBuffer(client, channel, `${pseudo} On met à jour ${gameName} - ${catName} ${secToTime(currentTimeReference)} avec ${secToTime(timeSec)} ? !confirm pour validé`);
                } else {
                    pushToBuffer(client, channel, `${pseudo} premier pb sur ${gameName} - ${catName} de ${secToTime(timeSec)} ?? !confirm pour validé`);
                }

                //  Confirmation
                const messageListener = (ch, tags, msg, self) => {
                    if (self) return;

                    if (ch === channel && tags.username === pseudo.toLowerCase()) {
                        const response = msg.trim().toLowerCase();

                        if (response === '!confirm') {
                            clearTimeout(timeoutId);
                            client.off('message', messageListener);

                //  Transaction
                            try {
                    //  Historique
                                const runTransaction = dbBigData.transaction(() => {
                                    if (currentRecord && currentTimeReference !== null) {
                                        const runnerNameRow = dbViral.prepare(`SELECT username FROM users WHERE user_id = ?`).get(runnerCible);
                                        const runnerName = runnerNameRow ? runnerNameRow.username : 'Inconnu';
                                        const isPb = currentRecord.pb_rank === 1 ? 2 : 1;
                                        dbBigData.prepare(`
                                            INSERT OR IGNORE INTO run_history (uid, runner_id, runner_name, h_date, h_time, h_video, is_pb)
                                            VALUES (?, ?, ?, ?, ?, ?, ?)
                                        `).run(target.uid, runnerCible, runnerName, currentRecord.pb_date, currentTimeReference, currentRecord.pb_video, isPb);
                                    }

                    //  Record actuel
                    console.log(`formattedDate 4 : ${formattedDate}`);
                                    dbBigData.prepare(`
                                        INSERT INTO current_records (runner_id, uid, pb_manual_time, pb_src_time, pb_date, pb_rank, predicted_rank, pb_video, last_update)
                                        VALUES (?, ?, ?, NULL, ?, NULL, ?, NULL, ?)
                                        ON CONFLICT(runner_id, uid) DO UPDATE SET
                                            pb_manual_time = excluded.pb_manual_time,
                                            pb_src_time = NULL,
                                            pb_date = excluded.pb_date,
                                            pb_rank = NULL,
                                            predicted_rank = excluded.predicted_rank,
                                            pb_video = NULL,
                                            last_update = excluded.last_update
                                    `).run(runnerCible, target.uid, timeSec, formattedDate, predictedRank, Math.floor(Date.now() / 1000));
                                });

                                runTransaction();
                                pushToBuffer(client, channel, `c'est fait @${pseudo} !!`);
                            } catch (sqlErr) {
                                console.error(`[ça pue du cul...] !addPb transaction sql ne vas pas bien :`, sqlErr.message);
                                pushToBuffer(client, channel, `ça à foirée cheffe la transaction sql elle pue du cul`);
                            }
                        }

                //  Sécurité erreur
                        else if (response === '!cancel') {
                            pushToBuffer(client, channel, `On arrête tout Noted`);
                            clearTimeout(timeoutId);
                            client.off('message', messageListener);
                        }
                    }
                };

                client.on('message', messageListener);

                timeoutId = setTimeout(() => {
                    client.off('message', messageListener);
                }, 30000);

                break;
            }

            default:
                break;
        }

    } catch (err) {
        console.error(`[ça pue du cul...] cmdModeration vas pas bien :`, err);
    }
};