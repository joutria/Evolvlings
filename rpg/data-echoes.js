/* Evolvlings: decisions that come back, and how each person's story ends (lore critique, fix 4).
   ECHOES   a line added to a later conversation when an earlier choice set its flag. It is said right after the
            lines of node `node` of event `ev` (zone/id), by `who` (a speaker of that event, or null = narration).
            The Spanish line is the reference for names (hearNames), as in the events themselves.
   EPI      how each person's story ends. The texts live in lore.js (LORE_EPILOGOS, one per char + end). A story
            closes the first time you win a guardian fight once the zone `zone` is calmed and your lore layer
            (lore.js loreLayer) is at least `layer`, and only after you know `know` (default: the person themselves;
            null = no name needed). The first rule whose `any` flag is set picks the end; the last rule has no `any`.
            `page` is the person whose page in the Book (Gente del Claro) shows it (default: char). */
"use strict";
(function (root) {
  const ECHOES = [
    { ev: "aurora/farolera", node: "a", flag: "delatasteTila", who: "tila",
      es: "Ah, el de buen ojo. El guarda me contó que lo apuntó todo. Tranquilo: yo también apunto.",
      en: "Ah, the one with the good eye. The warden told me he wrote it all down. Don't worry: I keep notes too." },
    { ev: "aurora/farolera", node: "a", flag: "pagasteMulta", who: "tila",
      es: "Alguien pagó la multa de la vecina. No te lo agradezco, que no te lo pedí. Pero la sopa estaba buena, ¿verdad?",
      en: "Someone paid the neighbour's fine. I won't thank you, I didn't ask. But the soup was good, wasn't it?" },
    { ev: "aurora/farolero", node: "a", flag: "alvarEstrellas", who: "pabilo",
      es: "Ahora la Torre manda encender dos faroles más por calle. Dicen que el nieto de la señora se escapó a ver no sé qué.",
      en: "Now the Tower has two more lanterns lit on every street. They say the lady's grandson slipped out to see something or other." },
    { ev: "crater/tizon", node: "a", flag: "damOpen", who: "tizon",
      es: "Por cierto: alguien abrió una compuerta de la presa. Dos forjas se agrietaron de calor y tuve que despedir a tres enfriadoras. Si me entero de quién fue, le doy un abrazo de los de forja. De los que rompen.",
      en: "By the way: someone opened a sluice on the dam. Two forges cracked from the heat and I had to let three coolers go. If I find out who it was, I'll give them a forge hug. The kind that breaks things." },
    { ev: "caves/semillas", node: "a", flag: "mapasRobados", who: "basalto",
      es: "Alguien le robó los mapas al agrimensor de Albor. ¿Sabes qué hicieron? Mandaron tres agrimensores. Y esta vez, con guardas.",
      en: "Someone stole the maps from the Albor surveyor. You know what they did? They sent three surveyors. With wardens, this time." },
    { ev: "hollow/regreso", node: "a", flag: "chivato", who: "penumbra",
      es: "Hace poco un Cuidador llamó a los guardas junto a la verja. Desde entonces, a los del Barrio nos cuentan dos veces al entrar a los Pozos.",
      en: "Not long ago a Caretaker called the wardens at the gate. Since then they count us Quarter folk twice on the way into the Wells." },
    { ev: "hollow/regreso", node: "a", flag: "tapadoHueco", who: "penumbra",
      es: "Mi hijo vuelve a casa con tierra en las uñas y no me dice de dónde. Pero ya no vuelve solo de miedo. Alguien le ayudó.",
      en: "My son comes home with earth under his nails and won't tell me where from. But he doesn't come back scared anymore. Someone helped him." },
    { ev: "lake/flotan", node: "a", flag: "orillaContara", who: null,
      es: "Algunos cantan sin mirar a Madre Marejada. Orilla habló, y nadie sabe todavía qué hacer con lo que dijo.",
      en: "Some of them sing without looking at Mother Marejada. Orilla spoke, and nobody knows yet what to do with what she said." },
    { ev: "lake/flotan", node: "a", flag: "diarioEnterrado", who: null,
      es: "Orilla está sentada en una barca, apartada de todos. Cuando te ve, se da la vuelta.",
      en: "Orilla sits in a boat, away from everyone. When she sees you, she turns her back." },
    { ev: "heights/cadenas", node: "a", flag: "pasoAbierto", who: "tormo",
      es: "Y ahora baja gente del Fondo Blanco por un túnel nuevo en la nieve. Me han puesto a vigilar ese también. Con la misma manta.",
      en: "And now folk from the White Deep come down through a new tunnel in the snow. They've put me on that one too. Same blanket." },
    // era 2, La Calma (rpg/events-era2.js): what you chose in the first era comes back in the second
    { ev: "aurora/e2-velada", node: "abuela", flag: "alvarEstrellas", who: "alvar",
      es: "Desde aquella noche en que me escapé a ver las estrellas, mi abuela deja una ventana sin farol. Dice que es para acordarse de algo.",
      en: "Ever since the night I slipped out to see the stars, my grandmother leaves one window without a lantern. She says it's so she remembers something." },
    { ev: "crater/e2-tubos", node: "para", flag: "damOpen", who: "tizon",
      es: "Y no me hables de presas. Desde que alguien abrió aquella compuerta, en el Consejo me miran como si yo supiera quién fue.",
      en: "And don't talk to me about dams. Ever since someone opened that sluice, the Council looks at me as if I knew who did it." },
    { ev: "lake/e2-ciego", node: "orilla", flag: "diarioEnterrado", who: "orilla",
      es: "El cuaderno que enterraste lo desenterré yo, con las uñas. No te lo perdono. Pero aquí está, y lo leo.",
      en: "The notebook you buried, I dug up myself, with my nails. I don't forgive you. But here it is, and I'm reading it." },
    { ev: "caves/e2-noche", node: "a", flag: "mapasRobados", who: "pirita",
      es: "Dicen que alguien le robó los mapas al agrimensor de Albor. Mandaron tres más. Los túneles nuevos los cavaron esos tres.",
      en: "They say someone stole the Albor surveyor's maps. They sent three more. Those three dug the new tunnels." },
    { ev: "heights/e2-bajan", node: "a", flag: "pasoAbierto", who: "tormo",
      es: "Y por el túnel de la nieve siguen bajando los del Fondo Blanco. Ahora bajan todos, de arriba y de abajo. El Prado no va a dar abasto.",
      en: "And the White Deep folk keep coming down through the snow tunnel. Now everyone comes down, from above and below. The Meadow won't cope." },
    { ev: "hollow/e2-nombres", node: "a", flag: "chivato", who: "ceniza",
      es: "Espera. Tú eres quien llamó a los guardas en la verja, ¿no? Te reconozco. No sé por qué te estoy hablando.",
      en: "Wait. You're the one who called the wardens at the gate, aren't you? I recognise you. I don't know why I'm talking to you." },
    { ev: "deep/e2-setas", node: "esporina", flag: "albinaHija", who: "esporina",
      es: "Mi madre me mandó una manta la semana pasada. Sin nota. Es lo primero que me manda en veinte años. Supongo que alguien le contó algo.",
      en: "My mother sent me a blanket last week. No note. It's the first thing she's sent me in twenty years. I suppose someone told her something." },
  ];

  const EPI = {
    tila: { zone: "aurora", layer: 2, rules: [{ end: "A", any: ["delatasteTila", "tilaCold", "reportedShadow", "chivato"] }, { end: "B" }] },
    aurelia: { zone: "aurora", layer: 1, know: "alvar", page: "alvar", rules: [{ end: "A", any: ["alvarEstrellas"] }, { end: "B" }] },
    tizon: { zone: "crater", layer: 2, rules: [{ end: "B", any: ["damOpen", "olaNamed"] }, { end: "A" }] },
    liquen: { zone: "forest", layer: 2, rules: [{ end: "A", any: ["bellotaNina", "liquenNina", "semillaLiquen"] }, { end: "B" }] },
    orilla: { zone: "lake", layer: 2, rules: [{ end: "A", any: ["orillaContara", "orillaHeard"] }, { end: "B" }] },
    ola: { zone: "lake", layer: 3, rules: [{ end: "B", any: ["olaFired"] }, { end: "A", any: ["olaDelivered", "damOpen"] }, { end: "C", any: ["reflejoOla"] }, { end: "A" }] },
    nim: { zone: "hollow", layer: 3, rules: [{ end: "B", any: ["chivato"] }, { end: "A", any: ["cartaPenumbra", "penumbraHondonada", "tapadoHueco"] }, { end: "B" }] },
    grava: { zone: "caves", layer: 3, know: null, rules: [{ end: "B", any: ["gravaSang"] }, { end: "A" }] },
    basalto: { zone: "caves", layer: 3, rules: [{ end: "A", any: ["basaltoConfiesa", "basaltoAsked"] }, { end: "B" }] },
    coplo: { zone: "heights", layer: 3, rules: [{ end: "A", any: ["coploTruth"] }, { end: "B" }] },
    esporina: { zone: "deep", layer: 3, rules: [{ end: "B", any: ["albinaHija"] }, { end: "C", any: ["pasoAbierto"] }, { end: "A" }] },
    marejada: { zone: "heart", layer: 4, rules: [{ end: "A", any: ["orillaContara", "verdadMareas"] }, { end: "B" }] },
  };

  // the echo lines for one node of one conversation, given the flags you hold
  const echoesFor = (key, node, flags) => ECHOES.map((e, i) => [e, i]).filter(([e]) => e.ev === key && e.node === node && flags[e.flag]);
  // which end a story gets with these flags
  const epiEnd = (ch, flags) => { const r = EPI[ch].rules.find((x) => !x.any || x.any.some((f) => flags[f])); return r && r.end; };

  root.EVECHO = { ECHOES, EPI, echoesFor, epiEnd };
})(typeof window !== "undefined" ? window : globalThis);
