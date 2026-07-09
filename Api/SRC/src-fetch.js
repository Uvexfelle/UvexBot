import { listeJeux } from "../../config/Src-data.js";
import { dbBigData, dbViral } from "../../Setup/Utilitaires/loader.js"
import { 
    fetchRawJeux, fetchGameNameFamiliy,
    fetchRawVariables, fetchRawLeaderboard,
    fetchRawPbHistory
        } from "./src-api.js";
import fs from 'fs';


//  Listes des jeux découvert
const logDiscovery = (srcId, label, abbr = '') => {
    const filePath = `./Data/jeux-découvert.txt`;

    //  Doublons cheker config
    const isInConfig = listeJeux.some(g => g.srcId === srcId);
    if (isInConfig) return;

    //  Doublons cheker .txt
    let fileContent = '';
    if (fs.existsSync(filePath)) fileContent = fs.readFileSync(filePath, 'utf8');
    if (fileContent.includes(srcId)) return;

    //  Écriture
    const aliasStr = abbr ? `${abbr}` : ``;
    const cleanLabel = label.replace(/'/g, "\\'");
    const logEntry = `    { label: '${cleanLabel}', aliases: ['${aliasStr}'], srcId: '${srcId}' },\n`;

    fs.appendFileSync(filePath, logEntry);
};

//  Cataloguage des jeux
export const syncJeux = async (userId, callBack = {}) => {

    //  Recherche des jeux avec pb
    const pbs = await fetchRawJeux(userId);

    //  Sql
        //nouveau jeu via pb
        const stmtInsertJeu = dbViral.prepare(`INSERT INTO jeux (game_id) VALUES (?) ON CONFLICT(game_id) DO NOTHING`);
        //nommage
    const stmtNaming = dbViral.prepare(`SELECT game_id FROm jeux WHERE game_json IS NULL LIMIT 1`);
        //nouveaux jeu
    const stmtUpdateInconnu = dbViral.prepare(`
        UPDATE jeux SET name = COALESCE(name, 'Inconnu'), parent_id = ?, enfants_id = 'Orphelin', game_json = '{}'
        WHERE game_id = ?
    `);
        //récupéraiton des enfants
    const stmtGetExistingEnfants = dbViral.prepare(`SELECT enfants_id FROM jeux WHERE game_id = ?`);
        //update final
    const stmtUpdateJeuTotal = dbViral.prepare(`
        UPDATE jeux SET name = ?, parent_id = ?, enfants_id = ?, series_id = ?, game_json = ?
        WHERE game_id = ?
    `);
        //enfants
    const stmtInsertChild = dbViral.prepare(`
        INSERT INTO jeux (game_id, parent_id, enfants_id)
        VALUES (?, ?, ?)
        ON CONFLICT(game_id) DO UPDATE SET
            parent_id = excluded.parent_id,
            enfants_id = excluded.enfants_id
    `);
        //parents
    const stmtInsertParent = dbViral.prepare(`
       INSERT INTO jeux (game_id) VALUES (?)
       ON CONFLICT(game_id) DO UPDATE SET game_json = NULL
    `);

    // Inserssion des nouveaux jeux via Pb
    dbViral.transaction(() => {
        for (const pb of pbs) {
            stmtInsertJeu.run(pb.run.game);
        }
    })();

    //  Nommage
    let running = true;
    while (running) {
        const row = stmtNaming.get();
        if (!row) {
            running = false;
            break;
        }

    //  Réunification des familles
        const gId = row.game_id;
        const gameInfo = await fetchGameNameFamiliy(gId);

        if (!gameInfo || !gameInfo.name) {
            stmtUpdateInconnu.run(gId, gId);
            continue;
        }

        //infos global du jeux
        const config = listeJeux.find(g => g.srcId === gId);
        const mesAlias = config?.aliases || [];
        let parts = [gameInfo.name];
        //split des aliases
        if (gameInfo.abbreviation) parts.push(gameInfo.abbreviation);
        const uniqueParts = [...new Set([...parts, ...mesAlias])];
        const finalName = uniqueParts.join(', ');
        //familles
        const parentId = gameInfo.parentId || gId;
        const uniqueFamilyIds = [...new Set(gameInfo.family.map(f => f.id))];
        let enfantsIds = uniqueFamilyIds.length > 0 ? uniqueFamilyIds.join(', ') : 'Orphelin';

        //  Récupération de la famille
        if (gameInfo.parentId && gameInfo.family.length === 0) {
            const existing = stmtGetExistingEnfants.get(gId);
            if (existing?.enfants_id && existing.enfants_id !== 'Orphelin' && existing.enfants_id.trim().length > 0) {
                enfantsIds = existing.enfants_id;
            }
        }
            //inserssion des jeux découvert
        stmtUpdateJeuTotal.run(finalName, parentId, enfantsIds, gameInfo.seriesId || null, JSON.stringify(gameInfo.rawGameJson), gId);

        //  Inserssion des enfants
        if (gameInfo.family.length > 0) {
            dbViral.transaction(() => {
                for (const child of gameInfo.family) {
                    stmtInsertChild.run(child.id, parentId, enfantsIds);
                }
            })();
        }

        //  Recherche du parent si c'est un enfant
        if (gameInfo.parentId) {
            stmtInsertParent.run(gameInfo.parentId);
        }

        callBack.onJeu?.(finalName.split(',')[0]);

        //  Pause d'api
        await new Promise(r => setTimeout(r, 600));
    }

    //  Mise à jour final
    const tousLesJeux = dbViral.prepare(`SELECT game_id, enfants_id FROM jeux`).all();
    const stmtUpdateFamilleRelation = dbViral.prepare(`
       UPDATE jeux SET parent_id = ?, enfants_id = ?
       WHERE game_id = ? AND (enfants_id IS NULL OR enfants_id = 'Orphelin') 
    `);

    //  Récurssion
    dbViral.transaction(() => {
        for (const jeu of tousLesJeux) {
            if (jeu.enfants_id && jeu.enfants_id !== 'Orphelin') {
                const enfants = jeu.enfants_id.split(',').map(id => id.trim());
                for (const singleEnfantId of enfants) {
                    stmtUpdateFamilleRelation.run(jeu.game_id, jeu.enfants_id, singleEnfantId);
                }
            }
        }
    })();

    //  Log dans le .txt
    const finalScan = dbViral.prepare(`SELECT game_id, name FROM jeux WHERE name IS NOT NULL`).all();
    for (const game of finalScan) {
        logDiscovery(game.game_id, game.name.split(',')[0].trim(), game.name.split(',')[1]?.trim() || '');
    }
};

//  Récupération des leaderboard
export const syncGame = async (gId, userId, parent, adelphes, callbacks = {}) => {   
    //  Récupéraiton des variables
    const meta = await fetchRawVariables(gId);
    if (!meta || !meta.categories) return;

        //  Limite de courtoisie
    const concurrencyLimit = 10;

    // Sql
        //  Catégorie
    const stmtInsertEntity = dbBigData.prepare(`
       INSERT INTO src_entities (uid, game_id, parent_id, enfants_id, variables_json, cat_pop, lead_json, cat_json, last_update)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(uid) DO UPDATE SET
            cat_pop = excluded.cat_pop,
            lead_json = excluded.lead_json,
            cat_json = excluded.cat_json,
            last_update = excluded.last_update
    `);

        //  Wr
            //mise à jour
    const stmtUpdateWr = dbBigData.prepare(`
        UPDATE world_records
        SET wr_time = ?, wr_video = ?, last_update = ?
        WHERE uid = ? 
    `);
            //remplacement
    const stmtReplaceWr = dbBigData.prepare(`
        UPDATE world_records
        SET wr_time = ?, wr_runner_id = ?, wr_runner = ?, wr_date = ?, wr_video = ?, last_update = ?
        WHERE uid = ?
    `);
    const stmtActuelWr = dbBigData.prepare(`
        SELECT wr_time, wr_date, wr_runner_id, wr_runner, wr_video
        FROM world_records
        WHERE uid = ?
    `);
            //nouveau
    const stmtInsertWr = dbBigData.prepare(`
        INSERT INTO world_records (uid, wr_time, wr_runner_id, wr_runner, wr_date, wr_video, last_update)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        //  Pb
            //mise à jour
    const stmtUpdatePb = dbBigData.prepare(`
        UPDATE current_records
        SET pb_src_time = ?, pb_rank = ?, pb_video = ?, last_update = ?
        WHERE runner_id = ? AND uid = ?
    `);
            //remplacement
    const stmtReplacePb = dbBigData.prepare(`
        UPDATE current_records
        SET pb_src_time = ?, pb_manual_time = NULL, pb_date = ?, pb_rank = ?, pb_video = ?, last_update = ?
        WHERE runner_id = ? AND uid = ?
    `);
            //actuel
    const stmtActuelPb = dbBigData.prepare(`
        SELECT pb_manual_time, pb_src_time, pb_date, pb_rank
        FROM current_records
        WHERE runner_id = ? AND uid = ?
    `);
            //nouveau
    const stmtInsertPb = dbBigData.prepare(`
        INSERT INTO current_records (runner_id, uid, pb_src_time, pb_date, pb_rank, pb_video, last_update)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        //  Historique
    const stmtHistorique = dbBigData.prepare(`
        INSERT INTO run_history (uid, runner_id, runner_name, h_date, h_time, h_video, is_pb)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(uid, runner_id, h_time) DO NOTHING
    `);
        //  Username
    const stmtUsername = dbViral.prepare(`SELECT username FROM users WHERE user_id = ?`);

    //  Remplissage des infos du jeu
    const processLb = async (cat, vars = {}) => {
        
        //  Récupération du leaderboard
        const rsltLeaderboard = await fetchRawLeaderboard(gId, cat.id, vars);
        if (!rsltLeaderboard || !rsltLeaderboard.lb) return;

        const lb = rsltLeaderboard.lb;
        const catJson = rsltLeaderboard.cat;
        if (!lb.runs || lb.runs.length === 0) return;

        //  Création de l'uid
        const sortedVars = Object.keys(vars).sort().reduce((obj, key) => { obj[key] = vars[key]; return obj;}, {});
        const uid = `${gId}-${cat.id}-${JSON.stringify(sortedVars)}`;

        //  Création du dico
        const hybride = { 'Category': {label: cat.name, id: cat.id, isSub: false } };
        cat.variables.forEach(v => {
            const valId = vars[v.id] || v.values.default;
            if (valId) {
                hybride[v.name] = { id: valId, label: v.values.values[valId]?.label || valId, isSub: v['is-subcategory'] };
            }
        });

        //  Mise en page du leaderboard
        const leaderboardData = lb.runs.map(r => {
            const pId = r.run.players[0]?.id || null;
            const pObj = lb.players?.data?.find(p => p.id === pId);
            return { place: r.place, time: r.run.times.primary_t, player: { id: pId, name: pObj?.names?.international || 'Guest' }};
        });

        // Infos Wr
        const top1 = lb.runs[0];
        if (!top1) return;

        const wrId = top1.run.players[0]?.id || null;
        const wrObj = lb.players?.data?.find(p => p.id === wrId);
        const wrName = wrObj?.names?.international || 'Guest';
        const wrVideo = top1.run.videos?.links?.[0]?.uri || null;
        const wrTime = top1.run.times.primary_t;
        const wrDate = top1.run.date;
        const localWr = stmtActuelWr.get(uid);

        const timeNow = Math.floor(Date.now() / 1000);

        //  Inserssion
           //  Catégorie
        stmtInsertEntity.run(uid, gId, parent, adelphes, JSON.stringify(hybride), lb.runs.length, JSON.stringify(leaderboardData), JSON.stringify(catJson), timeNow);

            //  Wr
        if (localWr) {
            if (wrDate === localWr.wr_date) {
                stmtUpdateWr.run(wrTime, wrVideo, timeNow, uid);   
            } else {
                const wrAndPb = userId.includes(localWr.wr_runner_id);
                const estceIsPb = wrAndPb ? 2 : 0;
                stmtHistorique.run(uid, localWr.wr_runner_id, localWr.wr_runner, localWr.wr_date, localWr.wr_time, localWr.wr_video, estceIsPb);
                stmtReplaceWr.run(wrTime, wrId, wrName, wrDate, wrVideo, timeNow, uid);
                }
            } else {
                stmtInsertWr.run(uid, wrTime, wrId, wrName, wrDate, wrVideo, timeNow)
            }

            //  Pb
        dbBigData.transaction(() => {
            for (const usrId of userId) {
                const userRun = lb.runs.find(r => r.run.players.some(p => p.id === usrId));
                if (!userRun) continue;

                const srcTime = userRun.run.times.primary_t;
                const pbName = stmtUsername.get(usrId);
                const srcVideo = userRun.run.videos?.links?.[0]?.uri || null;
                const srcDate = userRun.run.date;
                const srcRank = userRun.place;
                const localPb = stmtActuelPb.get(usrId, uid);

                if (localPb) {
                    if (srcDate === localPb.pb_date) {
                        stmtUpdatePb.run(srcTime, srcRank, srcVideo, timeNow, usrId, uid);
                    } else {
                        const oldge = localPb.pb_src_time ?? localPb.pb_manual_time;
                        const isPb2 = localPb.pb_rank === 1 ? 2 : 1;
                        stmtHistorique.run(uid, usrId, pbName.username, localPb.pb_date, oldge, srcVideo, isPb2);
                        stmtReplacePb.run(srcTime, srcDate, srcRank, srcVideo, timeNow, usrId, uid);
                    }
                } else {
                    stmtInsertPb.run(usrId, uid, srcTime, srcDate, srcRank, srcVideo, timeNow);
                }
            }
        })();
        callbacks.onLb?.(uid);
    
    };

    //  Mixage des variables en caté réelle
    const cartesian = (arrays) => {
        if (arrays.length === 0) return [{}];
        return arrays.reduce((acc, { varId, values }) => acc.flatMap(existing => values.map(valId => ({ ...existing, [varId]: valId }))), [{}]);
    };

    //  Bouclage des leaderboards
    for (const cat of meta.categories) {
        const subCatVars = [];
        for (const v of cat.variables) {
            if (v['is-subcategory']) {
                subCatVars.push({ varId: v.id, values: Object.keys(v.values.values) });
            }
        }

        const combos = cartesian(subCatVars);
        const queue = combos.map(combos => ({ ...combos }));

        //  Mix en twist des caté
        for (let i = 0; i < queue.length; i += concurrencyLimit) {
            const batch = queue.slice(i, i + concurrencyLimit);
            await Promise.all(batch.map(vars => processLb(cat, vars)));
            if (i + concurrencyLimit < queue.length) {
                await new Promise(r => setTimeout(r, 600));
            }
        }
        callbacks.onCat?.(cat.name);
    }
};

// Récupération des historiques pb
export const syncPbHistory = async (userId, callbacks = {}) => {
    
    //  Récupération des pb
    const runs = await fetchRawPbHistory(userId);
    if (!runs || !runs.length) return;

    //  Mise en cache des infos
    const cacheEntities = dbBigData.prepare(`SELECT uid FROM src_entities`).all();
    const cacheUsers = dbViral.prepare(`SELECT user_id, username FROM users`).all();
    const cacheJeux = dbViral.prepare(`SELECT game_id, name FROM jeux`).all();

    const userMap = new Map(cacheUsers.map(u => [u.user_id, u.username]));
    const jeuxMap = new Map(cacheJeux.map(j => [j.game_id, j.name.split(',')[0].trim()]));

    //  SQL 
        //historique des pb
    const stmtInsertHistory = dbBigData.prepare(`
       INSERT INTO run_history (uid, runner_id, runner_name, h_date, h_time, h_video, is_pb)
       VALUES (?, ?, ?, ?, ?, ?, 1)
       ON CONFLICT(uid, runner_id, h_time) DO NOTHING 
    `);

    //  Mise en forme des data
    dbBigData.transaction(() => {
        for (const run of runs) {
            if (run.status?.status === 'rejected' || !run.times?.primary_t || run.level) continue;
            
            //  Recherche d'uid
            const targetPrefix = `${run.game}-${run.category}`;

            let matchedUid = null;
            const entitiesFiltrees = cacheEntities.filter(e => e.uid.startsWith(targetPrefix));

            //  Filtage des uid de la caté
            for (const ent of entitiesFiltrees) {
                const parties = ent.uid.split('-');
                if (parties.length < 3) continue;
                try {
                    const uidVars = JSON.parse(parties.slice(2).join('-'));
                    const allMatch = Object.entries(uidVars).every(([varId, valId]) => run.values && run.values[varId] === valId);
                    if (allMatch) { matchedUid = ent.uid; break; }
                } catch (e) { continue; }
            }

            //  Sécurité si pas de variables
            if (!matchedUid) {
                const uidBaseForm = `${run.game}-${run.category}-{}`;
                const baseExists = cacheEntities.find(e => e.uid === uidBaseForm);
                if (baseExists) {
                    matchedUid = baseExists.uid;
                } else {
                callbacks.onSkip?.(`uid non trouvé : ${run.id}`);
                continue;
                }
            }

            const runnerName = userMap.get(userId) || 'Runner';
            const video = run.videos?.links?.[0]?.uri || null;

    //  Inserssion de l'historique des pb  
            stmtInsertHistory.run(matchedUid, userId, runnerName, run.date, run.times.primary_t, video);
            callbacks.onRun?.(`${jeuxMap.get(run.game) || '?'} | ${runnerName} | ${run.times.primary_t}s`);
        }
    })();
};