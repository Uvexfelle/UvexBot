import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import Fuse from 'fuse.js';
import { existsSync, mkdirSync } from 'fs';
import { listeCommandes, listeInfo } from '../../config/Cmd-simple.js';
import { listeUsers } from '../../config/Src-data.js';


//  Loader
dotenv.config({ path: '.env', override: true, quiet: true });

//  Data cheker
if (!existsSync('./Data')) {
    mkdirSync('./Data');
}

//  Ouverture des bases de donnée
export const dbViral = new Database('./Data/database.sqlite');
export const dbBigData = new Database('./Data/src_bigData.sqlite');

// Cache 
export const cmdCache = {
    commandes: {},
    settings: {},
    jeux: null
};

    //  Mise en cache
export const reloadBotCache = () => {
    try {
        //  Mise à jour des données
            //  Transaction
                //commandes
        const stmtCmd = dbViral.prepare(`
            INSERT INTO commandes (name, pattern, response, total_count, category, type)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
                pattern = excluded.pattern,
                response = excluded.response,
                category = excluded.category
        `);
                //settings
        const stmtKey = dbViral.prepare(`
            INSERT INTO settings (key, value)
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value
        `);
                //user
        const stmtUser = dbViral.prepare(`
            INSERT INTO users (user_id, username)
            VALUES (?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                username = excluded.username
        `);

            //  Écriture
        dbViral.transaction(() => {
                //commandes
            for (const cmd of listeCommandes) {
                stmtCmd.run(cmd.name || cmd.pattern.substring(1), cmd.pattern, cmd.resp, cmd.total_count || 0, cmd.category, cmd.type || 'static');
            }
                //settings
            for (const key of listeInfo) {
                stmtKey.run(key.key, key.value);
            }
                //user
            for (const user of listeUsers) {
                stmtUser.run(user.id, user.name);
            }
        })();

        //  Cache de mise à jour
        const newCacheCmd = {};
        const newCacheKey = {};

            //  Préparation settings
        const tousLesSettings = dbViral.prepare(`SELECT key, value FROM settings`).all();
        for (const item of tousLesSettings) {
            newCacheKey[item.key.toLowerCase()] = item.value;
        }

            //  Préparation commandes
        const toutesLesCmd = dbViral.prepare(`SELECT id, pattern, name, type, response, on_off, total_count FROM commandes`).all();
        for (const cmd of toutesLesCmd) {
            const declencheursBruts = cmd.pattern || cmd.name;
            if (!declencheursBruts) continue;

            const declencheurs = declencheursBruts.split(',').map(p => p.trim().toLowerCase());
            for (const trigger of declencheurs) {
                newCacheCmd[trigger] = {
                    id: cmd.id,
                    name: cmd.name,
                    type: cmd.type,
                    response: cmd.response,
                    total_count: cmd.total_count || 0,
                    on_off: cmd.on_off,
                    patternOriginal: cmd.pattern
                };
            }
        }
            //  Préparation Liste de jeux
        const allGamesRaw = dbViral.prepare(`SELECT game_id, name, parent_id, enfants_id FROM jeux WHERE name IS NOT NULL`).all();
        const mapGameFuse = allGamesRaw.map(g => ({
            game_id: g.game_id,
            name: g.name,
            parent_id: g.parent_id,
            enfants_id: g.enfants_id,
            aliases: g.name.split(',').map(s => s.trim().toLowerCase())
        }));

        const nouvelIndexFuse = new Fuse(mapGameFuse, {
            keys: ['name', 'aliases'],
            threshold: 0.3,
            includeMatches: true,
            includeScore: true,
            ignoreLocation: true
        });

        //  Rassemblement des cache
        cmdCache.settings = newCacheKey;
        cmdCache.commandes = newCacheCmd;
        cmdCache.jeux = nouvelIndexFuse;
    } catch (err) {
    }
};

export const updateCacheSettingsDirect = (key, value) => {
    cmdCache.settings[key.toLowerCase()] = value;
};

export const updateCacheCmdDirect = (trigger, objCommande) => {
    cmdCache.commandes[trigger.toLowerCase()] = {
        id: objCommande.id,
        type: objCommande.type,
        response: objCommande.response,
        category: objCommande.category,
        on_off: objCommande.on_off,
        total_count: objCommande.total_count || 0,
        patternOriginal: objCommande.pattern
    };
};

export const removeCacheCmdDirect = (trigger) => {
    delete cmdCache.commandes[trigger.toLowerCase()];
};

//  Arrêt des commandes
export const IS_CMD_LOCK = true;
//  Dérivation pour test
export const IS_DEV_MODE = true;
//  Joint channel id src
export const getTargetRunner = (channel) => {
    const chan = (channel || '').toLowerCase().replace('#', '');
    if (IS_DEV_MODE && chan === 'missuvex') {
        return 'lamatrak';
    }
    return chan;
};

//  Obtention de l'heure
export const getCurrentTimeUTC2 = () => {
    const mtn = new Date();
    const dateStr = mtn.toLocaleDateString('en-CA', { timeZone: 'Europe/Zurich' });
    const heureStr = mtn.toLocaleTimeString('fr-CH', { timeZone: 'Europe/Zurich', hour12: false });
    return `${dateStr} (${heureStr})`;
};