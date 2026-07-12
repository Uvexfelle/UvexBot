//  Template :
//      {key: '', value: ' ' },
//      {name: '', pattern: '!', resp: '', category: 'général', type: 'static'},

//  Information/liens
export const listeInfo = [

    //  Liens résaux
    {key: 'DiscordLink', value: 'Discord : https://discord.gg/dMtceUyj4t ' },
    {key: 'InstagramLink', value: 'Instagram : https://www.instagram.com/lamatrak_/ ' },
    {key: 'YoutubeLink', value: 'Youtube principal : https://www.youtube.com/@lamatrak_  • Youtube secondaire : https://www.youtube.com/@lelamatrak' },
    {key: 'TikTokLink', value: 'Tik Tok : https://www.tiktok.com/@lamatrak_ ' },
    {key: 'TwitterLink', value: 'Twitter : https://twitter.com/Lamatrak_ ' },

    {key: 'video', value: 'J\'ai enfin un RECORD DU MONDE sur Mario Odyssey https://youtu.be/G11UkrO1wJE' },

    //  Config
    {key: 'Cpu', value: 'Cpu : Ryzen 7 9700x ' },
    {key: 'Gpu', value: 'Gpu : Rtx 3080 ' },
    {key: 'Ram', value: 'Ram : 32go ddr5 6000 cl36 ' },
    {key: 'Cm', value: 'Carte mère : Asrock x870 pro ' },
    {key: 'Alim', value: 'Alim : Rm 850Watt' },
    {key: 'Case', value: 'Case Phanteks xt pro ULTRA ' },
    {key: 'Ssd', value: 'Ssd : 2To ssd m.2 5.0 ' }

];

//  Commandes
export const listeCommandes = [
    //  Test
    {name: 'TestLive', pattern: '!testLive,!w,!q', resp: 'on joue à {game} et le titre c\'est {title}', category: 'général', type: 'static'},

    //  Utilitaires
    {name: 'Backseat', pattern: '!backseat,!bs', resp: 'Le basckseat ça veut dire donner des conseils non sollicités et ça vaut un ban !!', category: 'général', type: 'static' },
    {name: 'Spoil', pattern: '!spoil', resp: 'Le spoil c\'est mal, évitez de le faire svp :3', category: 'général', type: 'static' },
    {name: 'Video', pattern: '!video,!videos,!vidéo,!vidéos', resp: '{video}', category: 'général', type: 'static' },
    {name: 'Don', pattern: '!don,!dons,!soutient,!tip', resp: 'Les dons sont extrêmement appréciés. En plus de ça, c\'est le moyen de soutien qui subit le moins de taxe. Si cela vous convient, vous avez la possibilité de m\'en faire un en utilisant ce lien : https://streamlabs.com/{channel}/tip', category: 'général', type: 'static'},
    {name: 'regleStream', pattern: '!rules,!rule,!loi', resp: '"| 1. Pas d\'insultes | 2. Ne JAMAIS demander de reset | 3. Ne pas parler du nombre de viewer"', category: 'général', type: 'static'},
    {name: 'SubMobile', pattern: '!mobile,!subMobile', resp: 'Sur mobile les subs sont 30% plus cher (à cause des store qui prennent un gros poucentage) donc passe par ce lien pour les avoirs au prix PC: https://www.twitch.tv/subs/{channel}',category: 'général', type: 'static'},

    //  Réseaux
    {name: 'Reseaux', pattern: '!resaux,!rsx,!linktree,!resau,!res,!social,réseaux,!réseau', resp: '{TikTokLink} • {InstagramLink} • {TwitterLink} • {YoutubeLink} • {DiscordLink}', category: 'réseaux', type: 'static'},

    {name: 'Discord', pattern: '!discord,!disc', resp: '{DiscordLink}', category: 'réseaux', type: 'static'},
    {name: 'Instagram', pattern: '!instagram,!instagrame,!insta,!ig', resp: '{InstagramLink}', category: 'réseaux', type: 'static'},
    {name: 'Youtube', pattern: '!youtube,!yt', resp: '{YoutubeLink} • Youtube redifusion', category: 'réseaux', type: 'static'},
    {name: 'Tik Tok', pattern: '!tiktok,!tik,!tt,!tok', resp: '{TiktokLink}', category: 'réseaux', type: 'static'},
    {name: 'Twitter', pattern: '!twitter,!twit,!x', resp: '{TwitterLink}', category: 'réseaux', type: 'static'},

    //  Config
    {name: 'Config', pattern: '!config,!setup', resp: '{Cpu} • {Gpu} • {Ram} • {Cm} • {Alim} • {Ssd} • {Case}', category: 'config', type: 'static'},

    {name: 'Cpu', pattern: '!cpu,!proc,!processeur', resp: '{Cpu}', category: 'config', type: 'static'},
    {name: 'Gpu', pattern: '!gpu,!cg', resp: '{Gpu}', category: 'config', type: 'static'},
    {name: 'Ram', pattern: '!ram', resp: '{Ram}', category: 'config', type: 'static'},
    {name: 'Cm', pattern: '!cm', resp: '{Cm}', category: 'config', type: 'static'},
    {name: 'Alim', pattern: '!alimentation,!alim', resp: '{Alim}', category: 'config', type: 'static'},
    {name: 'Case', pattern: '!case,!boitier', resp: '{Case}', category: 'config', type: 'static'},
    {name: 'Ssd', pattern: '!ssd,!stockage', resp: '{Ssd}', category: 'config', type: 'static'},

    //  Utilitaires
    {name: '7Tv', pattern: '!7tv', resp: 'Tu ne vois pas d\'emote ici -> gold <- télécharge l\'extension 7tv https://7tv.app/', category: 'utilitaires', type: 'static'},
    {name: 'MultiPov', pattern: '!multi,!allPov,!POV', resp: 'Voici les 3 pov pour ce soir (paqmanlive n\'est pas en live ) : https://kadgar.net/live/Niniste/Lamatrak/general_mass', category: 'utilitaires', type: 'static'},
    {name: 'Âge', pattern: '!age,!âge', resp: 'Lamatrak à {random:12:35}ans ^^', category: 'utilitaires', type: 'static'},
    {name: 'Hi', pattern: '!hi', resp: 'https://clips.twitch.tv/ScrumptiousLachrymosePieRickroll-x5RDAuSQ_77XFBE0', category: 'utilitaires', type: 'static'},

        //  Automatique
    {name: '7tv', pattern: '15,25,3', resp: 'Tu ne vois pas d\'emote ici -> PartyParrot PartyParrot PartyParrot <- télécharge l\'extension 7tv -> https://7tv.app/', category: 'automatique', type: 'auto'},
    {name: 'Linktree', pattern: '35,25,7', resp: '!rsx', category: 'automatique', type: 'auto'},
    {name: 'Hellofresh', pattern: '20,10,10', resp: '!hellofresh', category: 'automatique', type: 'auto'},

    //  Speedrun
    {name: 'Langue', pattern: '!langue', resp: 'je joue en {game_lang} parce que les dialogues sont plus rapide', category: 'speedrun', type: 'static'},
    {name: 'Tuto', pattern: '!tuto', resp: 'Je fais des tutos speedrun sur mon Tiktok ! (y\'a une playlist) https://www.tiktok.com/@lamatrak_ Sur mon Youtube aussi ! https://www.youtube.com/@Lamatrak_/playlists', category: 'speedrun', type: 'static'},
    {name: 'SpoilTime', pattern: '!spoilTime,!st,!timerun,!tr', resp: '', category: 'speedrun', type: 'speedrun'},
    {name: 'Pb', pattern: '!pb', resp: '', category: 'speedrun', type: 'speedrun'},
    {name: 'Wr', pattern: '!wr', resp: '', category: 'speedrun', type: 'speedrun'},
    {name: 'Pb progress', pattern: '!pbprogress', resp: '', category: 'speedrun', type: 'speedrun'},
    {name: 'Pb periode', pattern: '!pbperiode,!pbdate', resp: '', category: 'speedrun', type: 'speedrun'},
    {name: 'Top', pattern: '!top', resp: '', category: 'speedrun', type: 'speedrun'},
    {name: 'Add Pb', pattern: '!addpb', resp: '', category: 'modération', type: 'modération'},
    {name: 'Wr periode', pattern: '!wrperiode', resp: '', category: 'speedrun', type: 'old'},

        //  SMO
    {name: 'CRC', pattern: '!crc', resp: 'Le cappy return cancel est un bug qui consiste à téléporter cappy là où Mario regarde. La distance, elle, est identique à la distance vertical qu\'il y a entre Mario et cappy. En gros, on envoie cappy loin vers le bas, puis on le teleporte sur un checkpoint en face de Mario.', category: 'speedrun smo', type: 'static'},
    {name: 'Giggler', pattern: '!giggler', resp: 'Nouvelle route de metro (je sais le faire et c\'est swag) https://clips.twitch.tv/AnnoyingSullenBottleSpicyBoy-2oCPhL7S0RrT5pmz', category: 'speedrun smo', type: 'static'},
    {name: 'HeureGraine', pattern: '!heure,!graine,!graines,!heures', resp: 'Pour savoir pourqoui je change d\'heure en début de run : https://clips.twitch.tv/FineWildBeanThunBeast-Z-5eKSkRtW8cHCsK', category: 'speedrun smo', type: 'static'},
    {name: 'Star%', pattern: '!star%,!star', resp: 'La star% (16min58WR) est une catégorie qui consiste à récupérer une étoile le plus rapidement possible. Pour cela il doit passer par pleins de tableaux et faire un saut très compliqué à luncheon (bruncheon) noté 7.5/10 en trickjump', category: 'speedrun smo', type: 'static'},
    {name: 'Talkatoo', pattern: '!talkatoo,!talkato,talk', resp: 'le Talkatoo% est une catégorie de speedrun de Mario Odyssey qui consiste a prendre UNIQUEMENT les lunes que me donne le perroquet et les story moon.', category: 'speedrun smo', type: 'static'},
    {name: 'InputOverlay', pattern: '!input', resp: 'l\'input overlay qui bouge: https://github.com/fruityloops1/HOS-InputDisplay/releases', category: 'speedrun smo', type: 'static'},
    {name: 'MinimumCapture', pattern: '!minimumCapture,!mc', resp: 'Le "minimum capture" est une catégorie qui consiste à finir le jeu en ayant le moins de capture possible. Actuellement le minimum est de 3. (cable à cap et ruined, et bowser) https://www.tiktok.com/@lamatrak_/video/7336226540008623392', category: 'speedrun smo', type: 'static'},
    {name: 'Trickjump', pattern: '!trickjump,!tj', resp: 'Voici le dock pour avoir la liste de tout les Trickjump lamatNote : https://docs.google.com/spreadsheets/d/1KyoO4JIwR9WZUVzsgXjAL0V0_q8YS9CN4vM9q543V3Q/edit?gid=1052751587#gid=1052751587', category: 'speedrun smo', type: 'static'},

        //  BOTW
    {name: 'Skew', pattern: '!skew', resp: 'Le skew (de l\'anglais "de travers") est le fait que Link se retrouve penché lorsqu\'on lui enlève son bouclier durant un shield surf. Ce glitch est utilisé pour clip à travers certains murs.', category: 'speedrun botw', type: 'static'},

    //  Infos
    {name: 'CodeAmi', pattern: '!ami,!code,!codeami,!amis!,codeamis', resp: 'Mon code ami Switch : sw-6206-7130-9824', category: 'infos', type: 'static'},
    {name: 'Code', pattern: '!code', resp: 'Pas de code pour le moment', category: 'infos', type: 'static'},
    {name: 'Ds', pattern: '!ds', resp: 'Mon jeu préféré mario bros Ds c\'est mario bros Ds', category: 'infos', type: 'static'},
    {name: 'Emulateur', pattern: '!emulateur,!emu', resp: 'Lama utilise Citra comme émulateur pour la 3Ds', category: 'infos', type: 'static'},
    {name: 'Google', pattern: '!google', resp: 'Voici un site pour poser toutes tes questions : https://www.google.come/ très pratique pour y trouver ces réponse lamatLoupe', category: 'infos', type: 'static'},
    {name: 'FinJeBois', pattern: '!fin', resp: 'le dernier épisode de je bois dans n\'importe quoi https://twitter.com/Lamatrak_/status/1607378203005313024', category: 'infos', type: 'static'},
    {name: 'Dodo', pattern: '!dodo,!sommeil', resp: 'https://clips.twitch.tv/RelievedFreezingDonkeyHoneyBadger-Piod2IW9_oYWo4VG', category: 'infos', type: 'static'},
    {name: 'Tournoi', pattern: '!tournoi,!TDF,!td', resp: 'Il n\'y a pas de tournoi du dimanche sur MKWorld, on espère que ça arrive bientôt', category: 'infos', type: 'static'},
    {name: 'PracticeMod', pattern: '!practice,!prac', resp: 'mon practice mod: https://github.com/fruityloops1/smo-practice-2', category: 'infos', type: 'static'},

    //  Shiny
    {name: 'Shiny', pattern: '!shiny,!sh,!chroma,!chromatique', resp: 'j\'ai eu 3 shiny en stream, fait !spiritombe, !rayquaza ou !ouisticram pour voir les clips ', category: 'shiny', type: 'static'},

    {name: 'Spiritombe', pattern: '!spiritombe,!shiny3', resp: 'https://clips.twitch.tv/ComfortableSquareFloofNomNom-wRfJBKPDNJ4tlWsr', category: 'shiny', type: 'static'},
    {name: 'Rayquaza', pattern: '!rayquaza,!shiny2', resp: 'https://clips.twitch.tv/QuaintRoundPresidentThisIsSparta-oRB-RxGYA61qlbrJ', category: 'shiny', type: 'static'},
    {name: 'Ouisticram', pattern: '!ouisticram,!shiny1', resp: 'https://clips.twitch.tv/DeafAbnegateOpossumArgieB8-xoFhfDibYGNAoe1k', category: 'shiny', type: 'static'},

    //  Troll
    {name: 'Sienna', pattern: '!sienna', resp: 'La plus belle', category: 'troll', type: 'static'},
    {name: 'Pistou', pattern: '!pistou,!pistout,!pist', resp: 'Le plus beau', category: 'troll', type: 'static'},
    {name: 'Lamatrak', pattern: '!lamatrak,!lama', resp: 'Le plus beau', category: 'troll', type: 'static'},
    {name: 'Lamainmagik', pattern: '!lamainmagik,!lamainmagique', resp: 'La plus belle', category: 'troll', type: 'static'},
    {name: 'Flag', pattern: '!fcp,!flag', resp: 'lamatFcgif lamatFcgif lamatFcgif lamatFcgif lamatFcgif lamatFcgif lamatFcgif lamatFcgif lamatFcgif lamatFcgif lamatFcgif lamatFcgif lamatFcgif lamatFcgif lamatFcgif lamatFcgif lamatFcgif lamatFcgif lamatFcgif', category: 'troll', type: 'static'}

    //  Sponsore

];