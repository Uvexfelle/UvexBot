import { syncGame } from "../../Api/SRC/src-fetch.js";
import { dbBigData, dbViral } from "../../Setup/Utilitaires/loader.js";
import { displayDate, getIdFromText, getNamesFromIds, getTitreUid, secToTime } from "./Utilitaire.js";


//  Réponse
const TEMPLATES = {
    //  Erreur global
    global: {
        erreurJeu: `Il me faut un nom de jeu, ex : Super Mario Odyssey`,
        casserole: `Aie ! problème de casserole imo...`,
    },
    //  Pb
    pb: {
        noRecord: `Aucun record trouvé pour le moment o7`,
        pasDeRecord: (nomJeu, nomCat) => `Pas de record sur ${nomJeu} ${nomCat}`,
        derniersPb: (text) => `Voici mon/mes dernier(s) Pb : ${text}`,
        resultat: (nomJeu, nomCat, temps, date, rank) => `${nomJeu} ${nomCat} : ${temps} fais le ${date} ${rank}`.trim(),
    },
    //  Wr
    wr: {
        pasDeWr: (nomJeu) => `Aucun record trouvé pour ${nomJeu}`,
        resultat: (nomJeu, nomCat, temps, runner) => `World record sur ${nomJeu} ${nomCat} : ${temps} par ${runner}`,
    },
    //  Pb progress
    pbprogress: {
        aucunRecord: (nomJeu) => `Aucun record trouvé pour ${nomJeu}`,
        aucunHistorique: (nomJeu) => `Aucun historique de pb pour ${nomJeu}`,
        aucunPb: `Aucun pb enregistré`,
        seulPb: (nomJeu, nomCat, temps, date) => `Je n'ai fait qu'un seul pb sur ${nomJeu} ${nomCat} : ${temps} fait le ${date}`,
        resultat: (nomJeu, nomCat, dateFirst, chaine) => `Mon premier pb sur ${nomJeu} ${nomCat} a été fait le ${dateFirst} : ${chaine}`,
    },
    //  Pb periode
    pbperiode: {
        aucunPb: (nomJeu, label) => `Aucun pb enregistré sur ${nomJeu} ${label} o7`,
        resultat: (label, liste) => `Mes pb ${label} : ${liste}`,
        tronque: `...(trop de pb !!)`,
        erreurDate: `Format de période invalide (Ex: !pb- smo any% 2026)`,
    },
    //  Top
    top: {
        pasDeLeaderboard: `C'est ff j'ai pas de leaderboard la`,
        aucunUid: `Dsl, je ne sais pas quel leaderboard tu veux voir (Ex: !top 5 smo any)`,
        resultat: (limit, nomJeu, nomCat, top) => `Top ${limit} ${nomJeu} ${nomCat} : ${top}`,
    },
    //  Spoiltime
    spoiltime: {
        pasEnSpeedrun: `Est-ce qu'on est vraiment en speedrun ?? si c'est le cas je suis dsl je ne peux pas t'aider...`,
        erreur: `PERDU`,
        resultat: (nomJeu, nomCat, estimation) => `Je peux dire avec certitude que sur ${nomJeu} ${nomCat}, il vas finir ça run en ...... ${estimation} OMG OMG OMG !!!!!`
    }
};

//  Formatage réponse personnalisé
const rawOutPut = (message, prefix, activeDrapeau) => {
    let corps = message;
    if (activeDrapeau === 'user') {
        corps = corps.charAt(0).toLowerCase() + corps.slice(1);
    }
    return `${prefix}${corps}`;
};

//  Moteur des infos speedrun.com
export const getPbWrResponse = async (cmdName, inputRestant, runnerCible, live, activeDrapeau) => {
    try {
    //  Tri global des infos
        const prefix = (activeDrapeau === 'user') ? `{user}, ` : '';

        let gameId = null;
        let uid = null;
        let texteRestant = inputRestant?.trim()

        //  Détection du jeu/catégorie
        if (texteRestant) {
            const target = getIdFromText(texteRestant, runnerCible);
            if (target) {
                gameId = target.game_id;
                uid = target.uid;
                texteRestant = target.texteRestant;
            }
        }

        //  Mise à jour des infos via Src
        if (gameId) {
            const gameFamilyRow = dbViral.prepare(`
                SELECT parent_id, enfants_id FROM jeux WHERE game_id = ?
            `).get(gameId);
            const parentId = gameFamilyRow?.parent_id || null;
            const enfantsIds = gameFamilyRow?.enfants_id || null;

            const allUsers = dbViral.prepare(`SELECT user_id FROM users`).all();
            const usersId = allUsers.map(row => row.user_id);

            const cacheRow = dbBigData.prepare(`
                SELECT MAX(last_update) AS last_update FROM src_entities WHERE game_id = ?
            `).get(gameId);

            const timeNow = Math.floor(Date.now() / 1000);
            const lastStamp = cacheRow?.last_update ? parseInt(cacheRow.last_update, 10) : 0;
            const ecart = timeNow - lastStamp;

            if (ecart >= 64800) {
                console.log(`¢ Jeu obsolète de plus de 18h !!!! Synchronisation forcé pour ${gameId}`);
                try {
                    await syncGame(gameId, usersId, parentId, enfantsIds);
                } catch (err) {
                    console.error(`[ça pue du cul...] Maj de jeu vas pas bien :`, err);
                }
            }

            else if (ecart >= 3600) {
                console.log(`¢ Jeu obsolète de plus d'1h, on remet tout ça à jour :3`);
                syncGame(gameId, usersId, parentId, enfantsIds).catch(err => {
                    console.error(`[ça pue du cul...] Maj de jeu vas pas bien :`, err);
                });
            }

        }

        //  Switch
        switch (cmdName) {

        //  Pb
            case 'Pb': {
            //  Trois derniers Pb
                if (!inputRestant) {
                    const rows = dbBigData.prepare(`
                        SELECT r.uid, r.pb_src_time, r.pb_manual_time, r.pb_rank, r.predicted_rank, r.pb_date, e.cat_pop
                        FROM current_records r
                        JOIN src_entities e ON r.uid = e.uid
                        WHERE r.runner_id = ?
                        ORDER BY r.pb_date DESC LIMIT 3
                    `).all(runnerCible);
                //  Pas de record
                    if (rows.length === 0) return TEMPLATES.pb.noRecord;

                //  Récupéraation des infos
                    const text = rows.map(r => {
                        const { gameName, catName } = getNamesFromIds({ uid: r.uid });
                        const finalTime = r.pb_src_time ?? r.pb_manual_time;
                        const finalRank = r.pb_src_time !== null ? r.pb_rank : r.predicted_rank;
                        const rankLabel = finalRank ? `(#${finalRank}/${r.cat_pop})` : '';
                        return TEMPLATES.pb.resultat(gameName, catName, secToTime(finalTime), displayDate(r.pb_date), rankLabel);
                    }).join(' • ');

                // Réponse
                    return rawOutPut(TEMPLATES.pb.derniersPb(text), prefix, activeDrapeau);
                }
        
        //  Récupération Pb via gameId
                if (!uid && gameId) {
            //  Pb du jeu
                    const monDernierPb = dbBigData.prepare(`
                        SELECT r.uid FROM current_records r
                        JOIN src_entities e ON r.uid = e.uid
                        WHERE r.runner_id = ? AND e.game_id = ?
                        ORDER BY r.pb_date DESC LIMIT 1
                    `).get(runnerCible, gameId);

                    if (monDernierPb) {
                        uid = monDernierPb.uid;
                    } else {
            //  Récupération de la famille
                        const gameRow = dbViral.prepare(`SELECT parent_id, enfants_id FROM jeux WHERE game_id = ?`).get(gameId);
                        const rootId = (gameRow?.parent_id) ? gameRow.parent_id : gameId;

                        const familyRows = dbViral.prepare(`SELECT game_id FROM jeux WHERE game_id = ? OR parent_id = ?`).all(rootId, rootId);
                        const familyIds = familyRows.map(f => f.game_id);

                        if (familyIds.length > 0) {
                            const placeholders = familyIds.map(() => '?').join(',');

            // Pb famille
                            const pbFamille = dbBigData.prepare(`
                                SELECT r.uid FROM current_records r
                                JOIN src_entities e ON r.uid = e.uid
                                WHERE r.runner_id = ? AND e.game_id IN (${placeholders})
                                ORDER BY r.pb_date DESC LIMIT 1
                            `).get(runnerCible, ...familyIds);

                            if (pbFamille) uid = pbFamille.uid;
                        }
                    }
                }

        //  Récupération Pb via Uid
                const res = dbBigData.prepare(`
                    SELECT r.pb_src_time, r.pb_manual_time, r.pb_rank, r.predicted_rank, r.pb_date, e.cat_pop
                    FROM current_records r
                    JOIN src_entities e ON r.uid = e.uid
                    WHERE r.runner_id = ? AND r.uid = ?
                `).get(runnerCible, uid);
                const { gameName, catName } = getNamesFromIds({ gId: gameId, uid: uid });

            //  Pas de record
                if (!res) {
                    return rawOutPut(TEMPLATES.pb.pasDeRecord(gameName, catName), prefix, activeDrapeau);
                }

            //  Récupération des infos
                const tempsFinal = res.pb_src_time ?? res.pb_manual_time;
                const rangFinal = res.pb_src_time !== null ? res.pb_rank : res.predicted_rank;
                const rankInfo = rangFinal ? `(#${rangFinal}/${res.cat_pop})` : '';

            //  Réponse
                return rawOutPut(TEMPLATES.pb.resultat(gameName, catName, secToTime(tempsFinal), displayDate(res.pb_date), rankInfo), prefix, activeDrapeau);
            }

        //  Wr
            case 'Wr': {
            //  Récupération des Wr
                //  Si y'a un uid
                let wrRow = dbBigData.prepare(`
                    SELECT wr_time, wr_runner, uid FROM world_records WHERE uid = ?
                `).get(uid);

                //  Si y'a que le jeu
                if (!wrRow) {
                    const monPb = dbBigData.prepare(`
                        SELECT r.uid FROM current_records r
                        JOIN src_entities e ON r.uid = e.uid
                        WHERE runner_id = ? AND e.game_id = ?
                        ORDER BY pb_date DESC LIMIT 1
                    `).get(runnerCible, gameId);

                //  Fallback sur le dernier pb
                    if (monPb) {
                    //lastPb
                        wrRow = dbBigData.prepare(`
                            SELECT wr_time, wr_runner, uid FROM world_records WHERE uid = ?
                        `).get(monPb.uid);
                    }
                }

                    //wr lié
                if (!wrRow) {
                    wrRow = dbBigData.prepare(`
                        SELECT w.wr_time, w.wr_runner, w.uid FROM world_records w
                        JOIN src_entities e ON w.uid = e.uid
                        WHERE e.game_id = ?
                        ORDER BY e.cat_pop DESC LIMIT 1
                    `).get(gameId);
                }

                //  Récupération des infos
                const { gameName, catName } = getNamesFromIds({ gId: gameId, uid: wrRow?.uid });
                if (!wrRow) return TEMPLATES.wr.pasDeWr(gameName);

                // Réponse
                return rawOutPut(TEMPLATES.wr.resultat(gameName, catName, secToTime(wrRow.wr_time), wrRow.wr_runner), prefix, activeDrapeau);
            }

        //  Pb progress
            case 'Pb progress': {
            //  Récupéraiton des historique via Uid
                //  Historique
                const historyRows = dbBigData.prepare(`
                    SELECT h_time, h_date, is_pb FROM run_history
                    WHERE uid = ? AND runner_id = ? AND is_pb >= 1
                    ORDER BY h_date ASC
                `).all(uid, runnerCible);

                // Actuel
                const currentRec = dbBigData.prepare(`
                    SELECT pb_src_time, pb_manual_time, pb_date
                    FROM current_records
                    WHERE uid = ? AND runner_id = ?
                `).get(uid, runnerCible);

            //  Récupération des infos
                const { gameName, catName } = getNamesFromIds({ gId: gameId, uid: uid });
                if (!currentRec && historyRows.length === 0) {
                    return TEMPLATES.pbprogress.aucunHistorique(gameName);
                }

                //  Tri des Temps
                const currentTime = currentRec?.pb_src_time ?? currentRec?.pb_manual_time;

                const bestPerDay = new Map();
                historyRows.forEach(r => {
                    const day = r.h_date?.split('T')[0] || r.h_date;
                    if (!bestPerDay.has(day) || r.h_time < bestPerDay.get(day).h_time) {
                        bestPerDay.set(day, { h_time: r.h_time, h_date: r.h_date, is_pb: r.is_pb });
                    }
                });

                let chronologie = Array.from(bestPerDay.values());

                if (currentTime && currentRec?.pb_date) {
                    const currentDay = currentRec.pb_date?.split('T')[0] || currentRec.pb_date;
                    const existingDay = chronologie.find(r => (r.h_date?.split('T') || r.h_date) === currentDay);
                    if (!existingDay) { 
                        chronologie.push({ h_time: currentTime, h_date: currentRec.pb_date, is_pb: 1 });
                    } else if (currentTime < existingDay.h_time) {
                        existingDay.h_time = currentTime;
                    }
                }

                chronologie.sort((a, b) => new Date(a.h_date) - new Date(b.h_date));

            //  Choix des temps affiché
                let pbOnly = [];
                let bestSoFar = Infinity;
                for (const r of chronologie) {
                    if (r.h_time < bestSoFar) {
                        bestSoFar = r.h_time;
                        pbOnly.push(r);
                    }
                }

                if (pbOnly.length === 0) return TEMPLATES.pbprogress.aucunPb;

                //  Premier et dernier Pb
                const firstPb = pbOnly[0];
                const currentPb = pbOnly[pbOnly.length - 1];
                const dateFirstStr = displayDate(firstPb.h_date);
                const dateCurrentStr = displayDate(currentPb.h_date);

                if (pbOnly.length === 1) {
                    return rawOutPut(TEMPLATES.pbprogress.seulPb(gameName, catName, secToTime(firstPb.h_time), displayDate(firstPb.h_date)), prefix, activeDrapeau);
                }

                //  Nombre max affiché
                const maxPbs = pbOnly.length <= 5
                    ? pbOnly.length
                    : Math.min(8, Math.floor(pbOnly.length / 2) + 2);
                
                let selection = [];

                if (pbOnly.length <= maxPbs) {
                    selection = pbOnly;
                } else {
                    selection.push(firstPb);

                //  Pb intermediaire
                    const intermediaires = pbOnly.slice(1, -1).map(run => {
                        let score = 0;
                        const totalMinutes = run.h_time / 60;

                    //  Mise en poids des temps "sub"
                        const paliers = [3600, 1800, 900, 600, 300];
                        paliers.forEach(p => {
                            if (run.h_time <= p && pbOnly.find(r => r.h_time > p)) score += 1.5;
                        });

                        if (Math.floor(totalMinutes) % 10 === 9) score += 0.8;
                        if (Math.floor(totalMinutes) % 5 === 4) score += 0.4;

                        const idx = pbOnly.indexOf(run);
                        if (idx > 0) {
                            const gapAvant = pbOnly[idx - 1].h_time - run.h_time;
                            score += (gapAvant / 60) * 0.2;
                        }

                    //  Mise en poids des Pb via le nombre de jour d'écart
                        const joursDepuisDebut = (new Date(run.h_date) - new Date(firstPb.h_date)) / (1000 * 60 * 60 * 24);
                        const joursTotal = (new Date(currentPb.h_date) - new Date(firstPb.h_date)) / (1000 * 60 * 60 * 24);
                        score += (joursDepuisDebut / Math.max(joursTotal, 1)) * 0.3;

                        if (run.is_pb === 2) score += 5;

                        return { ...run, score };
                    });

                    //  Choix final
                    intermediaires.sort((a, b) => b.score - a.score);

                    const choisis = [];
                    for (const run of intermediaires) {
                        if (choisis.length >= maxPbs - 2) break;
                        const tropProche = choisis.some(c => {
                            const diff = Math.abs(new Date(c.h_date) - new Date(run.h_date)) / (1000 * 60 * 60 * 24);
                            return diff < 7;
                        });
                        if (!tropProche) choisis.push(run);
                    }

            //  Construction réponse
                    choisis.sort((a, b) => new Date(a.h_date) - new Date(b.h_date));
                    selection.push(...choisis);
                    selection.push(currentPb);
                }

                const milieu = selection.slice(1, -1).map(p => `${secToTime(p.h_time)} (${displayDate(p.h_date)})`).join('->');
                const chainePbs = [
                    secToTime(firstPb.h_time),
                    milieu,
                    `${secToTime(currentPb.h_time)} (${dateCurrentStr})`
                ].filter(Boolean).join('->');

            //  Réponse
                return rawOutPut(TEMPLATES.pbprogress.resultat(gameName, catName, dateFirstStr, chainePbs), prefix, activeDrapeau);
            }

        //  Pb periode
            case 'Pb periode': {
                let segmentDateBrut = texteRestant;
                let dateDebutSql = null;
                let dateFinSql = null;
                let labelPeriode = '';

            //  Récupération de la date cible
                const matchMois = segmentDateBrut.match(/^(\d{1,2})\/(\d{2,4})[\s\wà-]+(\d{1,2})\/(\d{2,4})$/i);
                const matchAnneesSeules = segmentDateBrut.trim().match(/^(\d{4}|\d{2})[\s\wà-]+(\d{4}|\d{2})$/i);
            
                //  Format MM/AA - MM/AA
                if (matchMois) {
                    const moisDebutRaw = matchMois[1];
                    const anneeDebutRaw = matchMois[2];
                    const moisFinRaw = matchMois[3];
                    const anneeFinRaw = matchMois[4];

                    const moisDebut = moisDebutRaw.padStart(2, '0');
                    const moisFin = moisFinRaw.padStart(2, '0');
                    const anneeDebut = anneeDebutRaw.length === 2 ? `20${anneeDebutRaw}` : anneeDebutRaw;
                    const anneeFin = anneeFinRaw.length === 2 ? `20${anneeFinRaw}` : anneeFinRaw;

                    dateDebutSql = `${anneeDebut}-${moisDebut}-01`;
                    dateFinSql = `${anneeFin}-${moisFin}-31`;
                    labelPeriode = `entre le ${moisDebut}/${anneeDebut.slice(-2)} et le ${moisFin}/${anneeFin.slice(-2)}`;
                }

                //  Format AA - AA
                else if (matchAnneesSeules) {
                    const anneeDebutRaw = matchAnneesSeules[1];
                    const anneeFinRaw = matchAnneesSeules[2];

                    const anneeDebut = anneeDebutRaw.length === 2 ? `20${anneeDebutRaw}` : anneeDebutRaw;
                    const anneeFin = anneeFinRaw.length === 2 ? `20${anneeFinRaw}` : anneeFinRaw;

                    dateDebutSql = `${anneeDebut}-01-01`;
                    dateFinSql = `${anneeFin}-12-31`;
                    labelPeriode = `en ${anneeDebut}-${anneeFin.slice(-2)} `;
                }

                //  Formaat AAAA
                else if (/^\d{2}$|^\d{4}$/.test(segmentDateBrut.trim())) {
                    const anneeRaw = segmentDateBrut.trim();
                    let anneeCible = anneeRaw.length === 2 ? `20${anneeRaw}` : anneeRaw;
                    dateDebutSql = `${anneeCible}-01-01`;
                    dateFinSql = `${anneeCible}-12-31`;
                    labelPeriode = `en ${anneeCible}`;
                }

                //  Fallback année en cours
                else {
                    dateDebutSql = `1967-01-01`;
                    dateFinSql = `2067-12-31`;
                    labelPeriode = `depuis le début`;
                }

            //  Recherch sql
                //famille
                const gameRow = dbViral.prepare(`SELECT parent_id FROM jeux WHERE game_id = ?`).get(gameId);
                const rootId = (gameRow?.parent_id && gameRow.parent_id !== gameId) ? gameRow.parent_id : gameId;
                const familyRows = dbViral.prepare(`SELECT game_id FROM jeux WHERE game_id = ? OR parent_id = ?`).all(rootId, rootId);
                const familyIds = familyRows.map(r => r.game_id);

                //historique
                const conditionsHist = [`r.runner_id = ?`, `r.h_date BETWEEN ? AND ?`, `r.is_pb >= 1`];
                const paramHist = [runnerCible, dateDebutSql, dateFinSql];

                //actuel
                const conditionCurr = [`c.runner_id = ?`, `c.pb_date BETWEEN ? AND ?`];
                const paramCurr = [runnerCible, dateDebutSql, dateFinSql];

                //  Spécificité si Uid
                if (uid) {
                    conditionsHist.push(`r.uid = ?`);
                    paramHist.push(uid);
                    conditionCurr.push(`c.uid = ?`);
                    paramCurr.push(uid);
                } 
                
                else if (gameId) {
                    const placeholders = familyIds.map(() => '?').join(',');
                    conditionsHist.push(`r.uid IN (SELECT uid FROM src_entities WHERE game_id IN (${placeholders}))`);
                    paramHist.push(...familyIds);
                    conditionCurr.push(`c.uid IN (SELECT uid FROM src_entities WHERE game_id IN (${placeholders}))`);
                    paramCurr.push(...familyIds);
                }

                //historique
                const historyRows = dbBigData.prepare(`
                    SELECT r.uid, r.h_time, r.h_date FROM run_history r
                    WHERE ${conditionsHist.join(' AND ')}
                    ORDER BY r.h_date ASC
                `).all(...paramHist);

                //actuel
                const currentRows = dbBigData.prepare(`
                    SELECT c.uid, c.pb_src_time, c.pb_manual_time, c.pb_date FROM current_records c
                    WHERE ${conditionCurr.join(' AND ')}
                `).all(...paramCurr);

            //  Tri des données
                const seenKeys = new Set(historyRows.map(r => `${r.uid}-${r.h_time}`));
                for (const c of currentRows) {
                    const finalTime = c.pb_src_time ?? c.pb_manual_time;
                    const key = `${c.uid}-${finalTime}`;
                    if (!seenKeys.has(key)) {
                        historyRows.push({ uid: c.uid, h_time: finalTime, h_date: c.pb_date });
                        seenKeys.add(key);
                    }
                }

                //  Sécurité aucun pb
                const totalRuns = historyRows.length;
                if (totalRuns === 0) {
                    const nomFiltreJeu = uid ? ` sur ${getNamesFromIds({ uid }).gameName}` : '';
                    return rawOutPut(TEMPLATES.pbperiode.aucunPb(nomFiltreJeu, labelPeriode), prefix, activeDrapeau);
                }

                historyRows.sort((a, b) => new Date(a.h_date) - new Date(b.h_date));

                //  Regroupement par jeu
                let arbreGene = {};
                let compteurCombinaison = 0;
                let totalTempsAffiches = 0

                historyRows.forEach(r => {
                    const entities = dbBigData.prepare(`SELECT game_id FROM src_entities WHERE uid = ?`).get(r.uid);
                    if (!entities) return;

                    const gameRow = dbViral.prepare(`SELECT parent_id FROM jeux WHERE game_id = ?`).get(entities.game_id);
                    const rootId = (gameRow?.parent_id && gameRow.parent_id !== entities) ? gameRow.parent_id : entities.game_id;

                    if (!arbreGene[rootId]) arbreGene[rootId] = {};
                    if (!arbreGene[rootId][r.uid]) {
                        arbreGene[rootId][r.uid] = [];
                        compteurCombinaison++;
                    }

                    if (totalTempsAffiches < 10) {
                        const dateCourte = displayDate(r.h_date).slice(0, 5);

                        arbreGene[rootId][r.uid].push(`${secToTime(r.h_time)} (${dateCourte})`);
                        totalTempsAffiches++;
                    }
                });

                if (compteurCombinaison > 5) {
                    const totalJeuxDistincts = Object.keys(arbreGene).length;
                    const chaineSynthese = `Un total de ${totalRuns} reocrds enregistrés sur ${compteurCombinaison} caté pour ${totalJeuxDistincts} jeux différents.`;
                    return rawOutPut(TEMPLATES.pbperiode.resultat(labelPeriode, chaineSynthese), prefix, activeDrapeau);
                }

                let blocsJeuxFinaux = [];

                Object.entries(arbreGene).forEach(([rootId, categoriesObj]) => {
                    let blocsCategorieDuJeu = [];

                    Object.entries(categoriesObj).forEach(([uid, listeChronos]) => {
                        if (listeChronos.length === 0) return;

                        const { catName } = getNamesFromIds({ uid });

                        if (totalRuns > 10) {
                            blocsCategorieDuJeu.push(`${catName} (${listeChronos.length} Pb)`);
                        } else {
                            blocsCategorieDuJeu.push(`${catName} ${listeChronos.join(', ')}`);
                        }
                    });

                    if (blocsCategorieDuJeu.length === 0) return;

                    const {gameName} = getNamesFromIds({ gId: rootId });
                    blocsJeuxFinaux.push(`[${gameName}] ${blocsCategorieDuJeu.join(' - ')}`);
                });

                const chaineJeuxGrouopes = blocsJeuxFinaux.join(' • ')
                const pharseAvecCompteurs = `(${totalRuns} record${totalRuns > 1 ? 's' : '' } sur ${compteurCombinaison} catégorie${compteurCombinaison > 1 ? 's' : '' }) : ${chaineJeuxGrouopes}`;

                return rawOutPut(TEMPLATES.pbperiode.resultat(labelPeriode, pharseAvecCompteurs), prefix, activeDrapeau);
            }

        //  Top
            case 'Top': {
                const matchLimit = texteRestant.match(/^\d+/);
                const chiffrePivot = matchLimit ? parseInt(matchLimit, 10) : 5;

            //  Récupération des infos
                const leaderboardRow = dbBigData.prepare(`
                    SELECT lead_json FROM src_entities WHERE uid = ?
                `).get(uid);

                const leaderboard = leaderboardRow?.lead_json ? JSON.parse(leaderboardRow.lead_json) : [];

                const { gameName, catName } = getNamesFromIds({ gId: gameId, uid: uid });
                if (!Array.isArray(leaderboard) || leaderboard.length === 0) return TEMPLATES.top.pasDeLeaderboard;

            //  Découpe
                let tableauDecoupe = [];
                let limitTemplateLabel = chiffrePivot;

                //  Top 10
                if (chiffrePivot >= 11) {
                    const indexPivot = chiffrePivot - 1;

                    const indexDebut = Math.max(0, indexPivot - 3);
                    const indexFin = Math.min(leaderboard.length, indexPivot + 3);

                    tableauDecoupe = leaderboard.slice(indexDebut, indexFin);

                    const rangReelDebut = indexDebut + 1;
                    const rangReelFin = indexFin;
                    limitTemplateLabel = `${rangReelDebut}-${rangReelFin}`;
                }

                //  Volet -3 + 2
                else {
                    tableauDecoupe = leaderboard.slice(0, chiffrePivot);
                }

                const topText = tableauDecoupe
                    .map(r => {
                        const joueur = r.player?.name || r.playerName || 'Inconnu';
                        const placeRang = r.rank || r.place || '?';
                        return `#${placeRang} ${secToTime(r.time)} par ${joueur}`;
                    }).join(' • ');

            //  Réponse
                return rawOutPut(TEMPLATES.top.resultat(limitTemplateLabel, gameName, catName, topText), prefix, activeDrapeau);

            }

        //  SpoilTime
            case 'SpoilTime': {
                let res = null;

            //  Catégorie via titre
                if (!gameId && !uid) {
                    uid = getTitreUid(live);
                    res = dbBigData.prepare(`
                        SELECT r.pb_manual_time, r.pb_src_time, r.pb_rank, r.predicted_rank, r.uid,
                            e.game_id, e.cat_pop, e.lead_json, e.variables_json, w.wr_time
                        FROM current_records r
                        JOIN src_entities e ON r.uid = e.uid
                        JOIN world_records w ON r.uid = w.uid
                        WHERE r.runner_id = ? AND r.uid = ?
                        LIMIT 1
                    `).get(runnerCible, uid);
                }

            //  Catégorie popularity
                if (!res && gameId) {
                    res = dbBigData.prepare(`
                        SELECT r.pb_manual_time, r.pb_src_time, r.pb_rank, r.predicted_rank, r.uid,
                            e.game_id, e.cat_pop, e.lead_json, e.variables_json, w.wr_time
                        FROM current_records r
                        JOIN src_entities e ON r.uid = e.uid
                        JOIN world_records w ON r.uid = w.uid
                        WHERE r.runner_id = ? AND e.game_id = ?
                        ORDER BY e.cat_pop DESC, r.pb_date DESC
                        LIMIT 1
                    `).get(runnerCible, gameId);
                }

            //  Family
                if (!res && gameId) {
                    const gameRow = dbViral.prepare(`SELECT parent_id FROM jeux WHERE game_id = ?`).get(gId);
                    const rootId = gameRow?.parent_id ? gameRow.parent_id : gId;

                    const familyRows = dbViral.prepare(`
                        SELECT game_id FROM jeux
                        WHERE game_id = ? OR parent_id = ?
                        OR (enfants_id IS NOT NULL AND LOWER(',' || enfants_id || ',') LIKE LOWER('%,' || ? || ',%'))
                    `).all(rootId, rootId, rootId);

                    const familyIds = familyRows.map(r => r.game_id);
                    if (familyIds.length > 0) {
                        const placeholders = familyIds.map(() => '?').join(',');
                        res = dbBigData.prepare(`
                            SELECT r.pb_manual_time, r.pb_src_time, r.pb_rank, r.predicted_rank, r.uid,
                                e.game_id, e.cat_pop, e.lead_json, e.variables_json, w.wr_time
                            FROM current_records r
                            JOIN src_entities e ON r.uid = e.uid
                            JOIN world_records w ON r.uid = w.uid
                            WHERE r.runner_id = ? AND e.game_id IN (${placeholders})
                            ORDER BY e.cat_pop DESC, r.pb_date DESC
                            LIMIT 1
                        `).get(runnerCible, ...familyIds);
                     }
                }
                if (!res) return rawOutPut(TEMPLATES.spoiltime.pasEnSpeedrun, prefix, activeDrapeau);

                const { gameName, catName } = getNamesFromIds({ gId: res.game_id, uid: res.uid });

            //  Tirage aux sort
                //  Infos numéraire
                const board = JSON.parse(res.lead_json);
                const total = res.cat_pop || 1;
                const myRank = res.pb_rank || res.predicted_rank || total;
                const myPb = res.pb_src_time || res.pb_manual_time;
                const wrTime = res.wr_time;

                const gapToWr = myPb - wrTime;
                const qualityRatio = myRank / total;
                const bulle = (gapToWr * qualityRatio) + (wrTime * 0.01);

                let timeMin = myPb - bulle;
                const timeMax = myPb + bulle;

                let finalMin = timeMin;
                if (timeMin < wrTime) {
                    const diffPerte = timeMax - myPb;
                    finalMin = wrTime - diffPerte;
                }

                const rankChaos = Math.min(total, myRank * 2);
                const timeChaos = board.find(p => p.rank === rankChaos)?.time || (myPb + (bulle * 5));
                let reservoir = [];

                //  Algorithm de génération de nombre
                const generatTickets = (nombre, min, max, pivot) => {
                    for (let i = 0; i < nombre; i++) {
                        const estUnGain = Math.random() < 0.75;
                        let ticket;
                        if (estUnGain) {
                            ticket = Math.random() * (pivot - min) + min;
                        } else {
                            ticket = Math.random() * (max - pivot) + pivot;
                        }
                        reservoir.push(ticket);
                    }
                };

                //  Tirage des possibilité
                generatTickets(500, finalMin, timeMax, myPb);
                generatTickets(500, wrTime, timeChaos, myPb);

                const tiragePeloton = Math.random() < 0.75;
                let finalSec;

                //  Tirage final
                if (tiragePeloton) {
                    finalSec = reservoir[Math.floor(Math.random() * 500)];
                } else {
                    finalSec = reservoir[500 + Math.floor(Math.random() * 500)];
                }

            //  Réponse
                return rawOutPut(TEMPLATES.spoiltime.resultat(gameName, catName, secToTime(finalSec)), prefix, activeDrapeau);
            }
        }

    } catch (err) {
        console.error(`[ça pue du cul...] Pb_wr_engine : `, err);
        return TEMPLATES.global.casserole;
    }
};