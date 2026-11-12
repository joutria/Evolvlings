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
    // anywhere
    "Retal, el que va y viene": "Hunter", "Doña Alforja": "Noble",
  };
  // "OldWoman~1" -> "oldwoman-1", "Princess~d" -> "princess-d"
  const file = (v) => v.toLowerCase().replace("~", "-");
  root.EVFACES = { WHO, file, of: (esLabel) => (WHO[esLabel] ? "faces/" + file(WHO[esLabel]) + ".png" : null) };
})(typeof window !== "undefined" ? window : globalThis);
