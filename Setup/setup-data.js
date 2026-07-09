import cliProgress from "cli-progress";
import { existsSync, mkdirSync } from 'fs';
import { dbBigData, dbViral, getCurrentTimeUTC2 } from "./Utilitaires/loader.js";
import { initDb } from "./Utilitaires/init-db.js";
import { listeJeux, listeUsers } from "../config/Src-data.js";
import { listeInfo, listeCommandes } from "../config/Cmd-simple.js";
import { syncGame, syncJeux, syncPbHistory } from "../Api/SRC/src-fetch.js";
import { syncWrHistory } from "../Api/SRC_V2/src-fetchV2.js";


//  Skip d'étape
const args = process.argv.slice(2);
const skipCurrent = args.includes(`-current`);
const skipHistory = args.includes(`-history`);

//  Barre de progression
const multiBar = new cliProgress.MultiBar({
    format: `{titre} | {bar} | {percentage}% | {value}/{total} | {msg}`,
    barCompleteChar: `\u2764`,
    barIncompleteChar: `\u2022`,
    hideCursor: true,
    clearOnComplete: false
}, cliProgress.Presets.shades_classic);

//  Premier setup
async function runSetup() {
    console.log(`${getCurrentTimeUTC2()} --- Lancement du setup ---\n`);

    //  Data checker
    if (!existsSync('./Data')) {
        mkdirSync('./Data');
    }

    //  Création des Sql
    initDb();

    //  ProgressBar
        //infos utiles
    const nbUsers = listeUsers.length;
    const nbJeux = listeJeux.length;
    const nbEntities = skipCurrent ? 0 : dbBigData.prepare(`SELECT COUNT(*) as c FROM src_entities`).get().c;
    const totalGlobal = 3 + nbJeux + (skipCurrent ? 0 : nbJeux) + (skipHistory ? 0 : nbUsers + nbEntities);

        //différentes barres de progrès
    const barGlobal = multiBar.create(totalGlobal, 0, { titre: `Global`, msg: 'Démarrage...' });
    const barActive = multiBar.create(1, 0, { titre: 'Étape ', msg: '...' });
    const barDetail = multiBar.create(1, 0, { titre: 'Détails ', msg: '...\n\n\n'});

//  Inscription des infos config
    barActive.setTotal(4);
    barActive.update(0, { msg: `Inscription des données de base` });

    //  Sql
        //commandes
    const stmtCmd = dbViral.prepare(`
       INSERT INTO commandes (name, pattern, response, category, type)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET
        response = excluded.response,
        category = excluded.category
    `);

        //infos commandes
    const stmtInfo = dbViral.prepare(`
        INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

        //jeu
    const stmtJeux = dbViral.prepare(`
        INSERT INTO jeux (game_id, name) VALUES (?, ?) ON CONFLICT(game_id) DO UPDATE SET name = excluded.name
    `);

        //users
    const stmtUsers = dbViral.prepare(`
       INSERT INTO users (user_id, username) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET username = excluded.username 
    `);

    //  Écriture
    dbViral.transaction(() => {
        //commandes
        for (const cmd of listeCommandes) {
            stmtCmd.run(cmd.name || cmd.pattern.substring(1), cmd.pattern, cmd.resp, cmd.cat || 'Général', cmd.type || 'Static');
        }
        //infos commaandes
        for (const info of listeInfo) {
            stmtInfo.run(info.key, info.value);
        }
        //jeu
        for (const jeu of listeJeux) {
            stmtJeux.run(jeu.srcId, [jeu.label, ...jeu.aliases].join(', '));
        }
        //users
        for (const user of listeUsers) {
            stmtUsers.run(user.id, user.name);
        }
    })();

    barActive.update(4, { msg: 'Infos ok' });
    barGlobal.increment(2, { msg: 'Retranscription ok' });

//  Recherche des jeux
    barActive.setTotal(listeUsers.length);
    barActive.update(0, { msg: 'Découverte des jeux en cours...' });

    const usrIds = listeUsers.map(u => u.id);
    for (const u of listeUsers) {
        barActive.increment({ msg: `SyncJeux ${u.name}` });
        await syncJeux(u.id, {
            onJeu: (gameName) => {
                barDetail.update(0, { msg: `Recherche : ${gameName}` });
            }
        });
        barGlobal.increment({ msg: `Jeux ${u.name} done` });
    }

    //  Mise en cache des jeux
    const toutLesJeux = dbViral.prepare(`SELECT game_id, name, parent_id, enfants_id FROM jeux`).all();

//  Recherche des Pb-Wr
    if (!skipCurrent) {
        barActive.setTotal(toutLesJeux.length);
        barActive.update(0, { msg: `Sync caté...` });

    //  Batching
        const JEUX_LIMIT = 2;
        for (let i = 0; i < toutLesJeux.length; i += JEUX_LIMIT) {
            const batch = toutLesJeux.slice(i, i + JEUX_LIMIT);

        //progressBar
            batch.forEach(jeu => {
                const  nomCourt = jeu.name?.split(',')[0] || jeu.game_id;
                barActive.increment({ msg: nomCourt });
            });

    //  Recherche des données
            await Promise.all(batch.map(async (jeu) => {
                const nomCourt = jeu.name?.split(',')[0] || jeu.game_id;
                await syncGame(jeu.game_id, usrIds, jeu.parent_id, jeu.enfants_id);
                barGlobal.increment({ msg: `${nomCourt} fait yeahhhh !!!!` });
            }));

        //attente
            await new Promise(r => setTimeout(r, 300));
        }
    } else {
        multiBar.log(`[SKIP] -current : étape ignorée\n`);
    }

// Historique
    if (!skipHistory) {
        barActive.setTotal(nbUsers);
        barActive.update(0, { titre: 'Pb    ', msg: 'Démarrage...' });

        //  Historique des Pb
        for (const usr of listeUsers) {
            barActive.increment({ msg: usr.name });
            await syncPbHistory(usr.id, {
                onStart: (count) => multiBar.log(`[Pb] ${usr.name} -> ${count} runs\n`),
                onRun: (msg) => {
                    barGlobal.increment({ msg });
                    multiBar.log(`[Pb] ${msg}`);
                },
                onSkip: (msg) => multiBar.log(`[Skip] ${msg}`)
            });
        }

        //  Historique des Wr
        barActive.setTotal(toutLesJeux.length);
        barActive.update(0, { titre: `Wr    `, msg: `Démarrage...` });

        for (const jeu of toutLesJeux) {
            const nomCourt = jeu.name?.split(',')[0] || jeu.game_id;
            barActive.increment({ msg: nomCourt });
            await syncWrHistory(jeu.game_id, {
                onGameStart: (gameName, nbCats) => {
                    barDetail.setTotal(nbCats);
                    barDetail.update(0, { msg: gameName });
                },
                onRun: (msg) => {
                    barGlobal.increment({ msg });
                    multiBar.log(`[Wr] ${msg}`);
                },
                onCatDone: () => barDetail.increment()
            });
        }
    } else {
        multiBar.log(`[Skip] -history : historique ignoré\n`);
    }

    barGlobal.update(totalGlobal, { msg: 'Tout est okay on a fini :9 '});
    multiBar.stop();

//  Vidage du cache
    dbViral.pragma(`wal_checkpoint(TRUNCATE)`);
    dbBigData.pragma(`wal_checkpoint(TRUNCATE)`);

//  Fermeture des db
    dbViral.close();
    dbBigData.close();

    console.log(`\n Setup terminé ${getCurrentTimeUTC2()}`);
}

runSetup().catch(err => {
    multiBar.stop();
    console.error(`[ça pue du cul...] setup-data vas pas bien...`, err.message);
    console.error(err);
});