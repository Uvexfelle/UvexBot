import tmi from 'tmi.js';
import { getBotResponse } from '../../Commandes/Cmd-Cerveau.js';
import { getCurrentTimeUTC2, getTargetRunner } from '../../Setup/Utilitaires/loader.js';


//cache id
const cacheId = {};

export const getBroadcasterId = async (loginName) => {
    if (cacheId[loginName]) return cacheId[loginName];

    const response = await fetch(`https://api.twitch.tv/helix/users?login=${loginName}`, {
        headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${process.env.TWITCH_AUTH.replace('oauth:', '')}`
        }
    });
    const json = await response.json();
    const id = json.data?.[0]?.id;

    if (id) cacheId[loginName] = id;
    return id;
};

//identifiant
export const startTwitchClient = () => {
console.log("Ma chaîne est :", process.env.TWITCH_CHAN);
const client = new tmi.Client({
    options: {
        debug: false //log
    },
    identity: {
        username: process.env.TWITCH_USER,
        password: process.env.TWITCH_AUTH
    },
    channels: [process.env.TWITCH_CHAN]
});

//connexion à twitch
client.connect().catch(error => {
    console.error("impossible de se connecter à twitch o7 :", error);
});

//lecture du titre et catégorie
const getStreamInfo = async (broadcaster_id) => {
    try{
    const tokenNettoye = process.env.TWITCH_AUTH.replace('oauth:', '');
    const url = `https://api.twitch.tv/helix/channels?broadcaster_id=${broadcaster_id}`;
    
    const response = await fetch(url, {
        headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${tokenNettoye}`
        }
    });

    const json = await response.json();
    const data = json.data?.[0];
    
    return {
        game: data?.game_name || "Just Chatting",
        title: data?.title || "Pas de titre"
    };
} catch (err) {
    console.error(`Erreur Helix API :`, err);
    return { game: "Just Chatting", title: "Erreur Live" };
}
};

//lecture du chat INTANKABLE
client.on('message', async (channel, tags, message, self) => {
    if (self) return;

    const pseudo = tags['display-name'];
    let nomDeLaChaine = getTargetRunner(channel);

    console.log(`[${getCurrentTimeUTC2()}] ${pseudo} : ${message}`);
    try {
        const broadId = await getBroadcasterId(nomDeLaChaine);
        const live = await getStreamInfo(broadId);
        const resultat = await getBotResponse(message, nomDeLaChaine, live, client, channel, tags, pseudo);
    }catch (err){
        console.error(`Erreur lors du traitement du message :`, err.message);
    }
});
};