import { dbBigData, dbViral } from "../../Setup/Utilitaires/loader.js"
import { fetchRawWrHistory } from "./src-apiV2.js";


//  Historique des Wr par jeux
export const syncWrHistory = async (gId, callBack = {}) => {
    const entities = dbBigData.prepare(`SELECT uid FROM src_entities WHERE game_id = ?`).all(gId);
    if (!entities.length) return;

    const jeuRow = dbViral.prepare(`SELECT name FROM jeux WHERE game_id = ?`).get(gId);
    const gameName = jeuRow?.name ? jeuRow.name.split(',')[0].trim() : gId;

    const results = [];
    for (let i = 0; i < entities.length; i += 20) {
        const batch = entities.slice(i, i + 20);
        const batchResults = await Promise.all(batch.map(ent => fetchRawWrHistory(ent.uid)));
        results.push(...batchResults.filter(r => r !== null));
        if (i + 20 < entities.length) { await new Promise(r => setTimeout(r, 600)); }
    }

    callBack.onGameStart?.(gameName, results.length);

    const cacheUsers = dbViral.prepare(`SELECT user_id, username FROM users`).all();
    const cacheMetaEntities = dbBigData.prepare(`SELECT uid, variables_json FROM src_entities WHERE game_id = ?`).all(gId);

    const userMap = new Map(cacheUsers.map(u => [u.user_id, u.username]));
    const entitiesMetaMap = new Map(cacheMetaEntities.map(e => [e.uid, e.variables_json]));

    const stmtInsertWrHistory = dbBigData.prepare(`
        INSERT INTO run_history (uid, runner_id, runner_name, h_date, h_time, h_video, is_pb)
        VALUES (?, ?, ?, ?, ?, ?, 0)
        ON CONFLICT(uid, runner_id, h_time) DO UPDATE SET
            is_pb = CASE WHEN run_history.is_pb = 1 THEN 2 ELSE run_history.is_pb END,
            h_video = excluded.h_video
    `);

    dbBigData.transaction(() => {
        for (const { uid, data } of results) {
            if (!data?.runList?.length) { callBack.onCatDone?.(); continue; }

            const metaVarsRaw = entitiesMetaMap.get(uid);
            const vars = metaVarsRaw ? JSON.parse(metaVarsRaw) : null;
            const catName = vars?.Category?.label || vars?.category?.label || '?';

            for (const run of data.runList) {
                const playerId = run.playerIds?.[0] || null;
                if (!playerId) continue;
                const playerObj = data.playerList?.find(p => p.id === playerId);

                const playerName = playerObj ? (playerObj.name || userMap.get(playerId) || 'Guest') : 'Guest';
                const date = new Date(run.date * 1000).toISOString().split('T')[0];

                stmtInsertWrHistory.run(uid, playerId, playerName, date, run.time, run.video || null);
                callBack.onRun?.(`${gameName} | ${catName} | ${playerName} | ${run.time}s`);
            }
            callBack.onCatDone?.();
        }
    })();
};