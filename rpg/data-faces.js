/* Evolvlings: the face shown beside each line of a path conversation.
   Every speaker label (Spanish, as written in rpg/events-*.js) points to a face picture art/faces/<file>.png, cut by
   tools/ninja-faces.py from the Faceset of the Ninja Adventure character that draws that person in their event scene
   (CC0, see CREDITS.md). "Char~1" and "Char~2" are the same character with clothes recoloured, for two people who share
   a figure; "Char~d" is a darkened copy (a reflection). Voices without a body use an icon: "icon-light", "icon-sap",
   "icon-stone". The Caretaker's own lines show the face of the lead creature (art/faces/mon-<creature>.png).
   Loaded after rpg/data-people.js. */
"use strict";
(function (root) {
  const WHO = {
    // Prado Aurora
    "Pabilo": "OldMan", "Alvar": "Boy", "Guarda del Farol": "KnightGold", "Chico del portal": "Child", "Nim": "Child~1",
    "Vecina": "Villager2", "Penumbra": "NinjaMageBlack", "Tila": "Woman", "Niña del callejón": "EggGirl", "Brizna": "EggGirl",
    "Romero, jardinero": "Villager4", "Carretero de Albor": "Villager", "Ama Cira": "OldWoman",
    // Cráter
    "Fogarín": "FighterRed", "La vieja Ascua": "OldWoman~1", "Junco, enfriadora": "NinjaBlue", "Maese Fragua": "Samurai",
    "Minero de Hondura": "Caveman", "Miga, panadera": "Cavegirl", "Remache, escribano": "Inspector", "Guijo": "Child~2",
    "Madre de Guijo": "Cavegirl2", "Maese Tizón": "Monk2",
    // Bosque
    "Abrojo, guarda del Seto": "ManGreen", "Llovizna": "Princess", "Doña Agalla": "OldWoman~2", "Abuelo Liquen": "OldMan3",
    "Yedra": "Cavegirl2~1", "Bruma": "Villager3", "Niño del Bosque": "NinjaGreen",
    // Hondonada
    "Cierzo, guarda del Trono": "NinjaGray", "Calina, tejedora de niebla": "NinjaMageBlack~1", "Tordo, cartero de la Corte": "OldMan2",
    "Orvallo": "Villager3~1",
    // Lago
    "Sargazo, el que reza": "Shaman", "Anea": "EggBoy", "Madre Marejada": "SorcererBlack", "Berro": "Boy~1",
    "Abuela Nasa": "Villager5", "Cardo, aguador": "Villager~1", "Orilla": "Princess~1", "La del reflejo": "Princess~d",
    // Cuevas
    "Sordina, peregrina": "Monk", "Primer Picador Basalto": "Caveman2", "Pirita, picadora": "Cavegirl~1",
    "Sebo, el lamparero": "Sultan", "La pared": "icon-stone", "Lindero, agrimensor de Albor": "Inspector~1",
    // Altos
    "Ráfaga, mensajera del viento": "NinjaBlue~1", "Tormo, guarda del paso": "SamuraiBlue", "Tañido, campanero": "OldMan2~1",
    "Glosa, archivera del Trueno": "Inspector~2", "Centella, lectora de tormentas": "SorcererOrange", "Arpegio": "Master",
    "Céfira": "NinjaBlue2",
    // Fondo Blanco
    "Nevisca, soñadora del Turno": "Eskimo", "Yesca, cultivadora": "Woman~1", "Carrasca": "NinjaEskimo~1", "Nieve": "NinjaEskimo",
    "Granizo": "Eskimo~1", "Escarcha, guardia de la Regente": "KnightGold~1", "Regente Albina": "Princess~2",
    "Esporina": "Cavegirl2~2",
    // Corazón del Claro
    "Brezo, guarda del Tocón": "ManGreen~1", "Cincel, escultor": "FighterWhite", "Antífona, peregrina": "Monk~1",
    "Barrena, de los Pozos": "NinjaDark", "Hollín, farolero": "Knight", "Una voz clara": "icon-light", "Una voz oscura": "icon-sap",
    // era 2, La Calma
    "Cirio, guarda del tablón": "KnightGold~1", "Umbría": "NinjaMageBlack~1", "Lucerna Destello": "Princess", "Maestra de coro": "Inspector",
    "Brida, capataz": "NinjaDark", "Ceniza": "NinjaMageBlack", "Rey Lóbrego": "SorcererBlack",
    "Aurelia Albor": "Noble", "Recolector de la Torre": "Inspector~1", "Guarda de la matriarca": "KnightGold", "Comprador del Prado": "Villager5",
    "Concejala del Bosque": "Shaman",
    "Ola": "NinjaBlue~1", "Agente de la Casa Alba": "Inspector~2", "Cavador de las manos negras": "Caveman2", "Niño de la Hondonada": "Boy~1", "Coplo, cantor": "Monk2",
    "Candela Albor": "Villager3", "Jueza Albura": "Sultan", "Ampolla, sopladora": "Cavegirl", "Retoño": "Child~2", "Trueque, mercader": "Villager4",
    "Umbela, archivera de la Corte": "NinjaMageBlack~1", "Remanso": "EggBoy", "Cuarzo, cronista": "Caveman", "Paño, testigo": "Villager~1", "Lacre, sellador": "Villager3~1",
    "Bruna": "Child~1", "Jábega, tabernera": "Woman~1", "Esparto, pescador": "Hunter", "Vilano, comprador": "Noble",
    "Fogarín, Maestro del Gremio": "OldMan3", "Yunque, forjador": "Caveman2", "Escoria, obrera": "Cavegirl2", "Cobre, de las Casas": "Noble",
    "Chispa": "Child~2", "Hacha, leñadora": "Hunter", "Hulla, carbonera de la Corte": "NinjaMageBlack", "Ébano, archivero de la Corte": "NinjaGray",
    "Salitre, pescadora": "Woman", "Galena, minera": "Cavegirl~1", "Peaje, arriero": "Villager2", "Témpano, guardiana del hielo": "Eskimo~1",
    "Retama, guarda del Tocón": "OldWoman~2",
    "Cerillo": "Child", "Badajo, campanero de las Casas": "Villager", "Doña Ámbar": "OldWoman", "Abuela Candela": "OldWoman~1", "Pizarra, maestra": "Woman~1", "Fuelle, maestro joven": "Caveman", "Retoño, del Concejo": "OldMan", "Musgo, del Concejo": "OldMan2",
    "Doña Bruna": "OldWoman~2", "Ónix, guarda de las tumbas": "NinjaGray", "Reina Merma": "NinjaMageBlack~1", "Remanso, el viejo vidente": "OldMan2~1", "Nácar, de las Casas": "Princess", "Rada, de las Mareas": "Woman", "Plomo, capataz del Gremio": "Inspector", "Pizca": "Child~1",
    "Toldo, de los Altos": "Villager4", "Cizalla, compradora de afuera": "Hunter", "Romanza, mensajera": "Monk~1", "Copo": "Boy", "Carámbano, del Turno": "Eskimo", "Doña Nieve": "OldWoman~1",
    "Centeno, intendente del granero": "Villager3", "Lirio, de la Casa del Hielo": "Princess~2", "Moho, de la Casa de la Seta": "Boy~1", "Regente Cellisca": "NinjaEskimo",
    "Desvelo, voz de Los Que Oyen": "Monk2", "Pavesa, farolera": "OldWoman", "Abeto, del Concejo": "ManGreen~1", "Tizna, tejedora de la Corte": "NinjaMageBlack",
    "Chispa, forjadora": "OldWoman~1", "Pizca, de la Hondura": "Cavegirl~1", "Doña Rada": "OldWoman~2",
    // anywhere
    "Retal, el que va y viene": "Hunter", "Doña Alforja": "Noble",
  };
  // "OldWoman~1" -> "oldwoman-1", "Princess~d" -> "princess-d"
  const file = (v) => v.toLowerCase().replace("~", "-");
  root.EVFACES = { WHO, file, of: (esLabel) => (WHO[esLabel] ? "faces/" + file(WHO[esLabel]) + ".png" : null) };
})(typeof window !== "undefined" ? window : globalThis);
