import express from 'express';
import cors from 'cors';
import { dbViral, reloadBotCache } from './Utilitaires/loader.js';
import { startTwitchClient } from '../Api/Twitch/Twitch-client.js';
import { handleAutoTicker } from '../Commandes/Moteur/Cmd-basique.js';


//  Serveur
const app = express();
const port = 42067;

//  Horloge
let horlogeTicks = 0;
let globalChatCounter = 0;

app.use(cors());
app.use(express.json());

const run = async () => {
    try {
//  Mise à jour et cache des données
        reloadBotCache();

//  Début d'écoute du chat twitch
        const client = await startTwitchClient();

    //  Lancement de l'horloge
        setInterval(async () => {
            horlogeTicks++;
            await handleAutoTicker(client, horlogeTicks, globalChatCounter);
        }, 10000);

    } catch (err) {
        console.error(`Initialisation échouée.... o7 la team :`, err);
    }
};
run();

//  Incrémentation de l'horloge
export const incrementerCompteurChat = () => { globalChatCounter++; };

//  Serveur Web
app.get('/', (req, res) => {
    res.json({ status: 'En ligne', ticks: horlogeTicks, message: globalChatCounter });
});

app.listen(port, () => {
    console.log(`ETTTTTTTTT c'est partie, tout le monde en route !!!`);
});