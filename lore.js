/* Evolvlings — lore data (eventos con diálogo, Escritos y frases de carga)
 * Fuente: biblia del mundo, pestaña "Cómo se revela" (https://claude.ai/artifact/42UGYufJJ1iCzo5DzZGCzH)
 *
 * Pensado para encajar con rpg/ (antes rpg.js):
 *  - LORE_EVT tiene la misma forma que EVT[lang][key] ({ t, c, o }) para que eventHtml() lo pinte igual.
 *  - Los efectos van declarados en `fx` (uno por opción) en vez de un switch, para aplicarlos con una sola función.
 *    Claves de fx, todas opcionales:
 *      xp, coins (ganar)  · cost (gastar Chispas: EV.spendCoins)  · heal / hurt (fracción de vida del equipo)
 *      foeBuff (igual que X.nextFoeBuff)  · card (true = X.eventCard)  · fight (true = X.eventFight)
 *      flag (string o lista: se pone a 1 en EV.P.flags)  · escrito (id de LORE_ESCRITOS que se desbloquea)
 *  - LORE_HILOS: pares de Escritos que, juntos, desbloquean una línea en el Grimorio.
 *  - LORE_EPILOGOS: una línea por final de cada personaje; se muestran cuando el juego pone su `flag`.
 *  - `need` decide si el evento puede salir: { layer, flag, anyFlag, zone }. Si no se cumple, rollEvent() no lo elige.
 *  - `cNeed[i]` (opcional): flag necesaria para que se muestre la opción i (si falta, la opción no aparece).
 *
 * Capa de revelación del jugador (1 a 4), según guardianes vencidos en EV.P.cleared:
 *  1 = inicio · 2 = las tres zonas del Día vencidas · 3 = las tres del Envés · 4 = los Altos y el Fondo Blanco.
 */
(function (root) {
  "use strict";

  const DAY = ["aurora", "crater", "forest"];
  const NIGHT = ["hollow", "lake", "caves"];
  const FAR = ["heights", "deep"];

  function loreLayer(cleared) {
    const c = cleared || {};
    const all = (zs) => zs.every((z) => (c[z] || 0) > 0);
    if (all(DAY) && all(NIGHT) && all(FAR)) return 4;
    if (all(DAY) && all(NIGHT)) return 3;
    if (all(DAY)) return 2;
    return 1;
  }

  // the ten eras (rpg/data-eras.js): the Glade lives in one era at a time (P.era, 1 by default). In era 1 the layer
  // counts the guardians ever beaten (P.cleared); in a later era, only those beaten since it began (P.eraWins).
  const eraOf = (P) => (P && P.era) || 1;
  const layerOf = (P) => (eraOf(P) > 1 ? loreLayer(P && P.eraWins) : loreLayer(P && P.cleared));
  // need.era: the era an event belongs to (a number, or [first, last]); events without one belong to era 1.
  // opt.anyEra skips that check (the common events of the road: campfires, chests...).
  // need.eraWin: a zone whose guardian you must have beaten in this era.
  function needOk(need, P, opt) {
    if (!(opt && opt.anyEra)) {
      const e = eraOf(P), ne = (need && need.era) || 1;
      if (Array.isArray(ne) ? e < ne[0] || e > ne[1] : e !== ne) return false;
    }
    if (!need) return true;
    const flags = (P && P.flags) || {};
    if (need.layer && layerOf(P) < need.layer) return false;
    if (need.eraWin && !((P && P.eraWins) || {})[need.eraWin]) return false;
    if (need.flag && !flags[need.flag]) return false;
    if (need.anyFlag && !need.anyFlag.some((f) => flags[f])) return false;
    return true;
  }

  /* ---------- Eventos ---------- */
  // zone: dónde puede salir · need: condición · fx: efectos por opción
  const LORE_EVENTS = {
    lowlight: { zone: "aurora", need: { layer: 1 },
      fx: [ { cost: 30, heal: 0.2, flag: "nimSeen" }, { xp: 10, escrito: "umbral" }, { xp: 4, flag: "tilaCold" } ] },
    nightshift: { zone: "aurora", need: { anyFlag: ["nimSeen", "tilaCold"], layer: 2 },
      fx: [ { fight: true, xp: 8, flag: "alborGate" }, { card: true, flag: "rootLight" }, { coins: 50, flag: "reportedShadow" } ] },
    seer: { zone: "lake", need: { layer: 2 },
      fx: [ { xp: 16, flag: "orillaHeard" }, { foeBuff: -15, flag: "marejadaBlessing" }, { card: true, flag: "sawRootLantern" } ] },
    lena: { zone: "crater", need: { layer: 2 },
      fx: [ { coins: 20, xp: 10, flag: "tizonFriend" }, { xp: 12, flag: "olaNamed" }, { xp: 8, flag: "olaFired" } ] },
    echo: { zone: "caves", need: { layer: 3 },
      cNeed: ["unisona", null, null],
      fx: [ { foeBuff: -25, xp: 10, flag: "gravaSang" }, { xp: 10 }, { xp: 14, flag: "basaltoAsked" } ] },
    skylog: { zone: "heights", need: { layer: 3 },
      fx: [ { xp: 18, flag: "coploTruth" }, { coins: 40, flag: "cefiraKept" }, { xp: 6, escrito: "trueno" } ] },
  };

  const LORE_EVT = {
    es: {
      lowlight: { t: "Es de noche en el Vado. Tila mira su aceitera vacía. «Me han vuelto a bajar la ración. Dicen que el barrio no puede gastar lo que no paga. Si esta calle se apaga, los de abajo saldrán a buscar luz a otra parte.»",
        c: ["Darle aceite (30 Chispas)", "Preguntarle quién bajó la ración", "Decirle que será por seguridad"],
        o: ["«Esta noche no se apaga.» Al irte, algo se mueve bajo los adoquines: dos ojillos que te miran y desaparecen.",
            "«Un decreto. Siempre es un decreto. Nadie lo firma con su nombre.» Te da una copia arrugada. (Nuevo Escrito)",
            "«¿La seguridad de quién?» Tila se da la vuelta. A la noche siguiente, su calle está a oscuras."] },
      nightshift: { t: "Una sombra cubierta de polvo dorado camina hacia las afueras del Prado, donde no hay nada. «No me preguntes el nombre. Ya no es mío. Trabajo de noche. Es un honor. Eso dice el Rey.»",
        c: ["Seguirla", "Darle algo de comer", "Avisar a un guarda"],
        o: ["Llegas a una verja con el sello de Albor. Un guarda de Luz te corta el paso. «Aquí no hay nada que ver.»",
            "Come deprisa, como si no tuviera permiso. Te deja una piedra tibia que brilla por dentro y huele a savia.",
            "El guarda te da unas Chispas «por tu civismo». La sombra no se vuelve a mirarte."] },
      seer: { t: "Orilla está arrodillada junto a un charco del Arroyo. «El agua de aquí es poca, pero no miente. ¿Quieres que mire por ti?» Antes de que respondas, Madre Marejada se interpone: «Mi nieta tiene los ojos turbios. No hagas caso de lo que diga.»",
        c: ["Escuchar a Orilla", "Obedecer a la Madre", "Mirar el agua tú mismo"],
        o: ["«La luz bebe de la raíz. Lo he visto tres veces. Nadie quiere saber de qué luz hablo.» Marejada se va sin decir nada.",
            "Marejada moja los dedos y toca la frente de tus criaturas. «Que el agua los esconda.» Orilla baja la mirada.",
            "En el reflejo ves un farol con raíces en vez de pie, bebiendo del fondo hasta dejarlo negro. Cuando levantas la vista, las dos se han ido."] },
      lena: { t: "En la forja, Maese Tizón se limpia las manos. «Busco a alguien que me traiga mineral del borde del Envés. Pago bien. Aquí nadie regala nada; por eso todo vale algo.» Detrás de él, una enfriadora de las Mareas se venda las manos en silencio.",
        c: ["Aceptar el encargo", "Preguntarle el nombre a la enfriadora", "Denunciar el accidente al Gremio"],
        o: ["Tizón te da la mano como a un igual. «Vuelve cuando quieras. A ti te pago entero.»",
            "«Ola.» Te mira un momento. «Si ves a mi hermana, dile que estoy bien.» No lo está.",
            "Tizón lo niega delante de todos. El Gremio te cree a medias y despide a la enfriadora «para evitar problemas»."] },
      echo: { t: "Grabado en la roca, con letra temblorosa: «Aquí sigue Grava. Que nadie diga lo contrario.» Desde el fondo de la cueva, una voz canta media canción y se calla.",
        c: ["Cantar la nana con Unísona", "Seguir adelante", "Volver y preguntar a Basalto"],
        o: ["Unísona canta la otra mitad. Durante un largo rato, la cueva entera suena. Luego, silencio, pero un silencio distinto.",
            "Sigues. La voz no vuelve a cantar.",
            "Basalto no levanta la vista de su mesa. «Grava murió. Yo mismo la vi.» Le tiembla un poco la mano."] },
      skylog: { t: "Coplo te espera en un mirador de los Altos. «Necesito el registro del tiempo de la Casa del Trueno. Busco una canción vieja, no una tormenta.» Cuando lo encuentras, la semana en que se cerraron los pasos dice: «despejado, viento suave del este».",
        c: ["Llevárselo a Coplo", "Llevárselo a Céfira", "Guardártelo"],
        o: ["Coplo lo lee y se queda callado mucho rato. «Entonces no hubo tormenta.» Esa noche no canta en la plaza.",
            "Céfira lo dobla sin leerlo. «Hay cosas que el viento no necesita contar.» Te paga bien.",
            "Lo guardas en la mochila. Pesa más de lo que parece. (Nuevo Escrito)"] },
    },
    en: {
      lowlight: { t: "Night in the Ford. Tila stares at her empty oil can. \"They cut my ration again. They say the quarter can't spend what it doesn't pay for. If this street goes dark, the folk below will go looking for light somewhere else.\"",
        c: ["Give her oil (30 Chispas)", "Ask who cut the ration", "Tell her it must be for safety"],
        o: ["\"It won't go out tonight.\" As you leave, something moves under the cobbles: two small eyes that watch you and vanish.",
            "\"A decree. It's always a decree. Nobody signs it with their name.\" She hands you a crumpled copy. (New Writing)",
            "\"Whose safety?\" Tila turns away. The next night, her street is dark."] },
      nightshift: { t: "A shadow covered in golden dust walks toward the edge of the Meadow, where there's nothing. \"Don't ask my name. It isn't mine anymore. I work nights. It's an honour. That's what the King says.\"",
        c: ["Follow her", "Give her something to eat", "Tell a warden"],
        o: ["You reach a gate with the Albor seal. A Light warden blocks the way. \"Nothing to see here.\"",
            "She eats fast, as if she wasn't allowed. She leaves you a warm stone that glows inside and smells of sap.",
            "The warden gives you some Chispas \"for your civic spirit\". The shadow never looks back at you."] },
      seer: { t: "Orilla kneels by a puddle of the Stream. \"There's little water here, but it doesn't lie. Shall I look for you?\" Before you can answer, Mother Marejada steps in: \"My granddaughter has clouded eyes. Pay no mind to what she says.\"",
        c: ["Listen to Orilla", "Obey the Mother", "Look into the water yourself"],
        o: ["\"The light drinks from the root. I've seen it three times. Nobody wants to know which light I mean.\" Marejada leaves without a word.",
            "Marejada wets her fingers and touches your creatures' brows. \"May the water hide you.\" Orilla looks down.",
            "In the reflection you see a lantern with roots instead of a stand, drinking from the depths until they turn black. When you look up, both are gone."] },
      lena: { t: "At the forge, Master Tizón wipes his hands. \"I need someone to bring me ore from the edge of the Underside. I pay well. Nobody gives anything away here; that's why everything's worth something.\" Behind him, a cooler from the Tides silently bandages her hands.",
        c: ["Take the job", "Ask the cooler her name", "Report the accident to the Guild"],
        o: ["Tizón shakes your hand like an equal. \"Come back anytime. You I pay in full.\"",
            "\"Ola.\" She looks at you for a moment. \"If you see my sister, tell her I'm fine.\" She isn't.",
            "Tizón denies it in front of everyone. The Guild half believes you and lets the cooler go \"to avoid trouble\"."] },
      echo: { t: "Carved in the rock, in a shaky hand: \"Grava is still here. Let no one say otherwise.\" From the depths of the cave, a voice sings half a song and falls silent.",
        c: ["Sing the lullaby with Unísona", "Keep going", "Go back and ask Basalto"],
        o: ["Unísona sings the other half. For a long while the whole cave rings. Then silence, but a different kind.",
            "You go on. The voice doesn't sing again.",
            "Basalto doesn't look up from his table. \"Grava died. I saw it myself.\" His hand shakes a little."] },
      skylog: { t: "Coplo waits for you at a lookout in the Heights. \"I need the weather log of the House of Thunder. I'm after an old song, not a storm.\" When you find it, the week the passes closed reads: \"clear, gentle east wind\".",
        c: ["Take it to Coplo", "Take it to Céfira", "Keep it"],
        o: ["Coplo reads it and goes quiet for a long time. \"So there was no storm.\" He doesn't sing in the square that night.",
            "Céfira folds it without reading. \"Some things the wind doesn't need to tell.\" She pays you well.",
            "You tuck it in your pack. It weighs more than it looks. (New Writing)"] },
    },
  };

  /* ---------- Escritos (cartas sin efecto en combate, se leen en el Grimorio) ---------- */
  // from: "event" | "chest" | "shop" | "guardian" · zone: dónde sale en cofres · unlock: condición extra · era: desde qué era cuenta (1 si falta)
  const LORE_ESCRITOS = [
    { id: "umbral", layer: 1, from: "event", kind: "decree",
      es: { title: "Ley del Umbral, artículo cuarto", text: "Los faroles de los asentamientos provisionales recibirán la ración mínima de aceite, en atención a que sus ocupantes no contribuyen al sostenimiento de la luz común. Firmado: el Consejo de las Casas." },
      en: { title: "Threshold Law, article four", text: "The lanterns of provisional settlements shall receive the minimum oil ration, given that their occupants do not contribute to the upkeep of the common light. Signed: the Council of Houses." } },
    { id: "balada", layer: 1, from: "shop", zone: "heights", kind: "song",
      es: { title: "La Balada del Agua Podrida", text: "Bajó el agua del Envés / y lo verde se hizo negro. / Si una Marea te ofrece de beber, / dale las gracias y no bebas." },
      en: { title: "The Ballad of the Rotten Water", text: "Down came the water from the Underside / and the green turned black. / If a Tide offers you a drink, / say thank you, and don't." } },
    { id: "farolero", layer: 1, from: "chest", zone: "aurora", kind: "book",
      es: { title: "Primer libro del farolero", text: "Cada mañana el sol nos presta su luz. Por eso un buen farolero nunca la malgasta, y la devuelve alumbrando a quien no tiene. ¿De dónde viene la luz de tu farol? ¡Del sol, claro!" },
      en: { title: "The Lamplighter's First Book", text: "Every morning the sun lends us its light. That's why a good lamplighter never wastes it, and pays it back by lighting those who have none. Where does your lantern's light come from? From the sun, of course!" } },
    { id: "cartaSombra", layer: 2, from: "chest", zone: "hollow", kind: "letter",
      es: { title: "Carta sin entregar", text: "Pequeño mío: aquí abajo la piedra brilla como si tuviera fiebre. No te asustes si vuelvo con las manos doradas. El capataz dice que es honor. Yo digo que es pan. No digas tu nombre a nadie, ni siquiera a la farolera. Te quiero con los dos nombres." },
      en: { title: "Undelivered letter", text: "My little one: down here the stone glows as if it had a fever. Don't be scared if I come home with golden hands. The foreman says it's an honour. I say it's bread. Don't tell anyone your name, not even the lamplighter. I love you with both names." } },
    { id: "cuentas", layer: 2, from: "chest", zone: "crater", kind: "ledger",
      es: { title: "Libro de cuentas del Gremio, hoja suelta", text: "Faroles para la Casa Albor: 412 de 1.000. Enfriadoras: 12. Jornal: medio. Accidentes: no consta. Al margen, con otra letra: «Ola, manos. Que no se apunte.»" },
      en: { title: "Guild ledger, loose page", text: "Lanterns for House Albor: 412 of 1,000. Coolers: 12. Wage: half. Accidents: none recorded. In the margin, another hand: \"Ola, hands. Don't write it down.\"" } },
    { id: "seto", layer: 2, from: "chest", zone: "forest", kind: "speech",
      es: { title: "Palabras al Concejo bajo el Roble", text: "El Seto no es un muro. Es un abrazo que dura hasta la primavera. Cuando la savia se retire, lo dejaremos marchitar, y la semilla volverá a viajar como siempre. Tienen mi palabra de anciano." },
      en: { title: "Words to the Council beneath the Oak", text: "The Hedge is not a wall. It is an embrace that lasts until spring. When the sap recedes, we will let it wither, and the seed will travel again as it always has. You have my word as an elder." } },
    { id: "marejada", layer: 3, from: "chest", zone: "lake", kind: "diary", unlock: { flag: "marejadaBlessing" },
      es: { title: "Diario de Marejada, hace diez años", text: "Hoy el lago me ha enseñado un farol con raíces que bebía del fondo hasta dejarlo negro. No lo entiendo. Lo apunto para no olvidarlo, y no lo digo en voz alta para que no me crean loca." },
      en: { title: "Marejada's diary, ten years ago", text: "Today the lake showed me a lantern with roots, drinking from the depths until they turned black. I don't understand it. I write it down so I won't forget, and I don't say it aloud so they won't think me mad." } },
    { id: "pozo", layer: 3, from: "chest", zone: "aurora", kind: "report", unlock: { flag: "alborGate" },
      es: { title: "Informe del Pozo Tercero", text: "Profundidad: 140 brazas. La luz sale cada vez más oscura; se recomienda doble filtro. Las cuadrillas de sombra rinden un tercio más que las de Luz. Sin incidentes que reportar. Varios trabajadores con manos doradas." },
      en: { title: "Report on the Third Well", text: "Depth: 140 fathoms. The light comes up darker each time; double filtering is advised. Shadow crews outperform Light crews by a third. No incidents to report. Several workers with golden hands." } },
    { id: "recibo", layer: 3, from: "chest", zone: "caves", kind: "receipt", unlock: { flag: "basaltoAsked" },
      es: { title: "Recibo de la Casa Albor", text: "Recibidos del Primer Picador los mapas completos de las Cuevas del Eco, incluida la Sala de los Ecos. A cambio: cuarenta casas en la ladera sur del Cráter. Sello de Albor." },
      en: { title: "Receipt from House Albor", text: "Received from the First Pick the complete maps of the Echo Caves, including the Hall of Echoes. In exchange: forty houses on the southern slope of the Crater. Seal of Albor." } },
    { id: "trueno", layer: 3, from: "event", kind: "log",
      es: { title: "Registro del Trueno, semana del cierre", text: "Día 1: despejado, viento suave del este. Día 2: despejado. Día 3: despejado; la sabia del Soplo anuncia tormenta y se cierran los pasos. Día 4: despejado. Centella pide que conste que no está de acuerdo. (Tachado.)" },
      en: { title: "Thunder log, the week of the closing", text: "Day 1: clear, gentle east wind. Day 2: clear. Day 3: clear; the sage of the Breath announces a storm and the passes are closed. Day 4: clear. Centella asks that her disagreement be recorded. (Crossed out.)" } },
    { id: "velo", layer: 3, from: "guardian", zone: "hollow", kind: "secret",
      es: { title: "Fragmento del Velo", text: "Lo que todo rey debe saber y ningún súbdito: ya perdimos una tierra. Nos dispersamos. Durante cien años fuimos sombras de otros. Un pueblo sin trono es polvo. Haz lo que haga falta para que haya trono." },
      en: { title: "Fragment of the Veil", text: "What every king must know and no subject: we have lost a land before. We scattered. For a hundred years we were the shadows of others. A people without a throne is dust. Do whatever it takes so there is a throne." } },
    { id: "aurelia", layer: 4, from: "guardian", zone: "aurora", kind: "letter",
      es: { title: "Nota de Aurelia, sin enviar", text: "L.: te escribo usando tu nombre, el de verdad, porque es la única forma que tengo de pedirte perdón sin que nadie lo sepa. El barrio no es tuyo. Nunca pude dártelo. Pero esta noche, en vez de quemar esta carta, la guardo. Quizá eso también sea cobardía." },
      en: { title: "Aurelia's unsent note", text: "L.: I write to you using your name, the true one, because it's the only way I have to ask your forgiveness without anyone knowing. The quarter isn't yours. I never could give it to you. But tonight, instead of burning this letter, I keep it. Perhaps that is cowardice too." } },
    { id: "esporina", layer: 4, from: "shop", zone: "deep", kind: "recipe",
      es: { title: "Cuaderno de Esporina", text: "Remedio de capuchón negro: crece más rápido donde la savia es más espesa. La más espesa que he encontrado no está en el Envés. Está bajo el Prado, en las afueras, donde hay una verja." },
      en: { title: "Esporina's notebook", text: "Black-cap remedy: grows fastest where the sap is thickest. The thickest I have found is not in the Underside. It is beneath the Meadow, on the outskirts, where there is a gate." } },
    { id: "oido", layer: 4, from: "guardian", zone: "deep", kind: "inscription",
      es: { title: "Lo que se dice al oído", text: "Grabado por dentro de la puerta de la Tumba Helada, con mil letras distintas, la misma frase: «El rey no existe. Ahora el rey eres tú.» La última línea es reciente y está escrita con mano firme." },
      en: { title: "What is whispered", text: "Carved on the inside of the Frozen Tomb's door, in a thousand different hands, the same sentence: \"The king does not exist. Now the king is you.\" The last line is recent, written in a steady hand." } },
    { id: "nanas", layer: 4, from: "event", kind: "song", unlock: { flag: "unisona" },
      es: { title: "Dos nanas", text: "«Duerme, luz, que el sol te presta…» (Prado). «Duerme, sombra, que la noche te guarda…» (Hondonada). Escritas una al lado de la otra, con la misma música. Alguien ha subrayado las notas que coinciden: son todas." },
      en: { title: "Two lullabies", text: "\"Sleep, little light, the sun lends you…\" (Meadow). \"Sleep, little shadow, the night keeps you…\" (Hollow). Written side by side, to the same tune. Someone has underlined the notes that match: all of them." } },

    /* --- Escritos de las historias de personajes (pestaña "Historias" de la biblia). `char` = de quién habla. --- */
    { id: "candil", char: "tila", layer: 1, from: "chest", zone: "aurora", kind: "ledger",
      es: { title: "Libro de calles de la Casa Candil", text: "Calle del Pozo Viejo: 14 faroles. Calle del Mercado: 9. Calle de los Tintes: 11. Las tres, tachadas con tinta de la Casa Albor. Última anotación, con letra de niña: «Calle del barrio nuevo: 6 faroles. A cargo de Tila. Sin apellido.»" },
      en: { title: "Street book of House Candil", text: "Old Well Street: 14 lanterns. Market Street: 9. Dyers' Street: 11. All three crossed out in House Albor ink. Last entry, in a child's hand: \"New quarter street: 6 lanterns. In Tila's care. No surname.\"" } },
    { id: "perdon", char: "tila", layer: 2, from: "chest", zone: "aurora", kind: "decree",
      es: { title: "Orden de perdón", text: "Se perdona a la farolera Tila, antes de la Casa Candil, el robo de once medidas de aceite de los almacenes de Albor, a propuesta de la matriarca. Al margen, a mano: «Se parece a alguien que conocí. No a ella: a mí.»" },
      en: { title: "Order of pardon", text: "The lamplighter Tila, formerly of House Candil, is pardoned for the theft of eleven measures of oil from the Albor stores, at the matriarch's request. In the margin, by hand: \"She reminds me of someone I knew. Not her mother. Me.\"" } },
    { id: "guijarro", char: "nim", layer: 2, from: "chest", zone: "aurora", kind: "object",
      es: { title: "Un guijarro con una muesca", text: "Penumbra se lo dio a Nim la última mañana, sin decir de dónde lo había sacado. Tiene grabada una raya corta: el signo de la Hondura para «aquí sigue alguien». Nim no sabe leerlo. Lo lleva siempre." },
      en: { title: "A notched pebble", text: "Penumbra gave it to Nim on the last morning, without saying where it came from. A short line is carved into it: the Deep-folk sign for \"someone is still here\". Nim can't read it. He carries it always." } },
    { id: "adoquin", char: "nim", layer: 2, from: "chest", zone: "aurora", kind: "drawing",
      es: { title: "Dibujo en un adoquín", text: "Carbón sobre piedra: una verja, un señor de luz con la boca muy abierta, una sombra con las manos amarillas que camina sin querer. Debajo, una palabra tachada tantas veces que ya no se lee. Nadie dibuja un nombre si no es para borrarlo." },
      en: { title: "Drawing on a cobblestone", text: "Charcoal on stone: a gate, a man of light with his mouth wide open, a shadow with yellow hands walking against its will. Below, a word scratched out so many times it can't be read. Nobody draws a name except to erase it." } },
    { id: "charcos", char: "orilla", layer: 2, from: "chest", zone: "lake", kind: "diary",
      es: { title: "Lo que vi en los charcos", text: "Primer charco: un farol con raíces. Segundo: el mismo farol, más grande. Tercero: el farol bebiendo y, muy al fondo, una tumba de hielo que gotea. No sé qué es la tumba. Nadie me deja preguntar." },
      en: { title: "What I saw in the puddles", text: "First puddle: a lantern with roots. Second: the same lantern, bigger. Third: the lantern drinking and, far below, a tomb of ice, dripping. I don't know what the tomb is. Nobody lets me ask." } },
    { id: "piedras", char: "orilla", layer: 2, from: "chest", zone: "lake", kind: "note",
      es: { title: "Nota escrita en una barca", text: "Hoy los niños del Prado cantaban mientras nos tiraban piedras. La melodía era bonita. Eso es lo que más me dolió: que alguien se hubiera tomado la molestia de hacerla bonita." },
      en: { title: "Note written on a boat", text: "Today the Meadow children sang while they threw stones at us. The tune was pretty. That's what hurt the most: that someone had bothered to make it pretty." } },
    { id: "cartaOla", char: "ola", layer: 2, from: "event", kind: "letter", unlock: { flag: "olaLetter" },
      es: { title: "Carta de Ola, nunca enviada", text: "Orilla: trabajo en un sitio donde el agua sirve para que otros no se quemen. Tiene gracia, ¿no? Aquí hay un chico del Fuego que no se ríe de mí. Se quema igual que yo. No se lo digas a la abuela." },
      en: { title: "Ola's letter, never sent", text: "Orilla: I work somewhere water is used so others don't get burned. Funny, isn't it? There's a Fire boy here who doesn't laugh at me. He burns just like I do. Don't tell Grandmother." } },
    { id: "compuerta", char: "ola", layer: 3, from: "chest", zone: "crater", kind: "note",
      es: { title: "Nota doblada en un guante", text: "Ola: la compuerta se abre con dos manos, y una se quema. Pon tú la otra. Esta noche, cuando la forja duerma. Si sale mal, que sea juntos. F." },
      en: { title: "Note folded in a glove", text: "Ola: the sluice opens with two hands, and one of them burns. You bring the other. Tonight, when the forge sleeps. If it goes wrong, let it go wrong together. F." } },
    { id: "voces", char: "grava", layer: 3, from: "chest", zone: "caves", kind: "inscription",
      es: { title: "Lista en la pared de la Sala", text: "Voces apagadas: el abuelo Pizarra. La niña que cantaba en la lengua del Agua. Un peregrino de Luz cuyo verso hablaba de una luz prestada. Dos hermanos del Trueno. Cada día escribo menos nombres. O quedan menos, o recuerdo menos." },
      en: { title: "List on the wall of the Hall", text: "Voices gone silent: grandfather Slate. The girl who sang in the Water tongue. A Light pilgrim whose verse spoke of borrowed light. Two Thunder brothers. Each day I write fewer names. Either fewer remain, or I remember fewer." } },
    { id: "sombraTunel", char: "grava", layer: 3, from: "chest", zone: "caves", kind: "inscription",
      es: { title: "Grabado junto a la grieta del este", text: "Hoy encontré a una sombra cavando donde no debía. Tenía las manos de oro y miedo de su propio nombre. La saqué por esta grieta y le di mi guijarro. Que alguien, en algún sitio, sepa que aquí sigue alguien." },
      en: { title: "Carving by the east crack", text: "Today I found a shadow digging where it shouldn't. It had golden hands and was afraid of its own name. I led it out through this crack and gave it my pebble. May someone, somewhere, know that someone is still here." } },
    { id: "anuncio", char: "basalto", layer: 1, from: "chest", zone: "crater", kind: "decree",
      es: { title: "Anuncio de la Hondura", text: "La Hondura comunica que la Guardiana del Eco, Grava, ha muerto en las Cuevas. No hay cuerpo que velar. El Primer Picador lo vio con sus propios ojos. Partimos al amanecer. Nadie se queda atrás, porque ya no queda nadie." },
      en: { title: "Notice of the Deep-folk", text: "The Deep-folk announce that the Keeper of the Echo, Grava, has died in the Caves. There is no body to watch over. The First Pick saw it with his own eyes. We leave at dawn. No one stays behind, because no one is left." } },
    { id: "flores", char: "basalto", layer: 2, from: "chest", zone: "caves", kind: "note",
      es: { title: "Tarjeta atada a unas flores secas", text: "Para Grava, que no está. De quien no volvió. (La letra es grande y torpe, de alguien que escribe poco y pica mucho.)" },
      en: { title: "Card tied to dried flowers", text: "For Grava, who is not here. From the one who did not go back. (The handwriting is large and clumsy, from someone who writes little and digs a lot.)" } },
    { id: "versos", char: "coplo", layer: 2, from: "chest", zone: "heights", kind: "notebook",
      es: { title: "Cuaderno de versos de Coplo", text: "Verso de la Piedra: incompleto. Verso del Agua: me lo cantó una barquera, pero no entera. Nana del Prado: ¿parte del Canto? La nana de las sombras tiene la misma música. Comprobar. Anotación posterior: «No me dio tiempo. Tenía un encargo.»" },
      en: { title: "Coplo's book of verses", text: "Stone verse: incomplete. Water verse: a boatwoman sang it to me, but not all of it. Meadow lullaby: part of the Song? The shadows' lullaby has the same tune. Check. Later note: \"Didn't have time. I had a commission.\"" } },
    { id: "acta", char: "coplo", layer: 3, from: "chest", zone: "heights", kind: "record",
      es: { title: "Acta del Coro de los Tres", text: "Sesión de cierre. El sabio del Verso pregunta a su hijo si el viento trae tormenta. El hijo responde que sí. Votos: Verso, cerrar. Trueno, abrir. Soplo, cerrar. Se cierran los pasos. Que conste que el sabio del Verso no oyó la respuesta: la leyó en los labios." },
      en: { title: "Minutes of the Choir of Three", text: "Closing session. The sage of the Verse asks his son whether the wind brings a storm. The son says yes. Votes: Verse, close. Thunder, open. Breath, close. The passes are closed. Let it be noted that the sage of the Verse did not hear the answer: he read it on the lips." } },
    { id: "invierno", char: "esporina", layer: 3, from: "chest", zone: "deep", kind: "diary",
      es: { title: "Cuaderno del invierno", text: "Día 40 junto a la tumba. Quedamos once. El hielo gotea y por la grieta se ve el fondo. No hay nadie. Lo he mirado tres veces. Albina, ¿lo sabías cuando me pediste que me quedara?" },
      en: { title: "Winter notebook", text: "Day 40 by the tomb. Eleven of us left. The ice drips and through the crack you can see the bottom. There is no one. I've looked three times. Albina, did you know when you asked me to stay?" } },
    { id: "receta", char: "esporina", layer: 2, from: "chest", zone: "crater", kind: "recipe",
      es: { title: "Receta para unas manos quemadas", text: "Para la enfriadora de las manos quemadas: capuchón negro machacado, dos veces al día, sin agua. Pagado por alguien del Gremio que no quiere dar su nombre. Lleva hollín en las uñas y pregunta demasiado por ella." },
      en: { title: "Recipe for burned hands", text: "For the cooler with the burned hands: crushed black-cap, twice a day, no water. Paid for by someone from the Guild who won't give his name. Soot under his nails, and too many questions about her." } },
    { id: "nocheSinLuna", char: "aurelia", layer: 3, from: "chest", zone: "aurora", kind: "diary",
      es: { title: "Página de un diario de juventud", text: "Noche Sin Luna. Me he escapado al Vado. Un chico de la Sombra me ha dicho su nombre de verdad, así, sin más, como quien regala una flor. No pienso escribirlo. Pero tampoco pienso olvidarlo nunca." },
      en: { title: "Page from a girlhood diary", text: "Moonless Night. I slipped away to the Ford. A Shadow boy told me his true name, just like that, the way you'd give someone a flower. I won't write it down. But I will never forget it either." } },
    { id: "alvar", char: "aurelia", layer: 4, from: "guardian", zone: "aurora", kind: "report",
      es: { title: "Informe del médico de la Casa", text: "El joven Alvar presenta vetas oscuras en ambos brazos. Ningún tratamiento de las Casas surte efecto. Se ha informado a la matriarca de que existe un remedio, prohibido por decreto suyo. La matriarca no ha respondido. Lleva dos noches con la luz encendida." },
      en: { title: "House physician's report", text: "Young Alvar shows dark veins in both arms. No House treatment has any effect. The matriarch has been informed that a remedy exists, banned by her own decree. The matriarch has not replied. Her light has been on for two nights." } },
    { id: "adelanto", char: "tizon", layer: 3, from: "chest", zone: "crater", kind: "contract",
      es: { title: "Contrato de adelanto", text: "La Casa Albor adelanta al Yunque Tizón el acero para la prueba de Maestro Mayor. A cambio, el Gremio atenderá los encargos de la Casa con prioridad durante diez años, sin discutir precio. Firma de Tizón, muy apretada, como si le costara." },
      en: { title: "Advance contract", text: "House Albor advances to Anvil Tizón the steel for the Master's trial. In exchange, the Guild will serve the House's orders first for ten years, without haggling. Tizón's signature, pressed hard, as if it hurt." } },
    { id: "tos", char: "tizon", layer: 2, from: "chest", zone: "crater", kind: "note",
      es: { title: "Nota en el bolsillo de un delantal", text: "Comprar más de lo de la seta. Que no se entere nadie del Gremio. Si preguntan, es para la tos. Y que la chica del Agua no sepa quién paga." },
      en: { title: "Note in an apron pocket", text: "Buy more of the mushroom stuff. Nobody in the Guild finds out. If they ask, it's for the cough. And the Water girl mustn't know who's paying." } },
    { id: "bellota", char: "liquen", layer: 2, from: "chest", zone: "forest", kind: "record",
      es: { title: "Registro del Concejo, año de la crecida", text: "Un niño de las tierras bajas del Envés planta una bellota en la linde. Se le permite quedarse. Nombre: Liquen. Nadie se opone en tres días. La semilla viaja." },
      en: { title: "Council record, the year of the flood", text: "A boy from the low lands of the Underside plants an acorn at the edge. He is allowed to stay. Name: Liquen. No one objects in three days. The seed travels." } },
    { id: "silencio", char: "liquen", layer: 3, from: "chest", zone: "forest", kind: "diary",
      es: { title: "Hoja suelta del Largo Silencio", text: "Largo Silencio, el año pasado. Escuché a la Raíz. Tosía. No lo diré en el Concejo: si lo oyen, querrán abrir la Cripta, y fuera del bosque las semillas no durarán un invierno. Este año no habrá Largo Silencio." },
      en: { title: "Loose page from the Long Silence", text: "Long Silence, last year. I listened to the Root. It was coughing. I won't say it in Council: if they hear it, they'll want to open the Vault, and outside the wood the seeds won't last a winter. This year there will be no Long Silence." } },
    { id: "acuerdo", char: "marejada", layer: 2, from: "chest", zone: "aurora", kind: "contract",
      es: { title: "Acuerdo de agua", text: "Las Mareas podrán sacar agua de los pozos del Prado mientras se mantenga la paz. La Casa Albor determinará qué es la paz. Marca de la Madre de las Aguas: una gota dibujada con mano firme." },
      en: { title: "Water agreement", text: "The Tides may draw water from the Meadow wells as long as peace is kept. House Albor will determine what peace is. Mark of the Mother of Waters: a drop, drawn with a steady hand." } },
    { id: "ayunos", char: "marejada", layer: 3, from: "chest", zone: "lake", kind: "record",
      es: { title: "Cuenta de ayunos de la Madre", text: "Cuarenta y dos noches seguidas sin comer después del ocaso. Nadie sabe por qué ayuna la Madre. Las barcas creen que reza por el agua. Ella no lo desmiente." },
      en: { title: "Tally of the Mother's fasts", text: "Forty-two nights in a row without eating after dusk. Nobody knows why the Mother fasts. The boats believe she prays for water. She doesn't deny it." } },
    /* --- Escritos de la era 2, La Calma (rpg/events-era2.js): solo cuentan desde esa era (`era`) --- */
    { id: "e2-libro-albor", era: 2, layer: 1, from: "event", kind: "ledger", unlock: { flag: "e2_libroAlbor" },
      es: { title: "Cuaderno rojo de los pozos de Albor", text: "Año 1: un pozo, luz para la Torre. Año 9: cuatro pozos, luz para tres Casas; el agua del Lago baja un palmo. Año 21: once pozos; las primeras gotas negras, «por el calor». Año 32, con otra letra: «Cavamos más hondo para no molestar. Más hondo no hay otra cosa. Hay lo mismo, más cerca». Debajo, la letra de Aurelia, de joven: «No se lo digo a madre»." },
      en: { title: "Red notebook of the Albor wells", text: "Year 1: one well, light for the Tower. Year 9: four wells, light for three Houses; the Lake drops a hand's breadth. Year 21: eleven wells; the first black drops, \"from the heat\". Year 32, in another hand: \"We dig deeper so as not to disturb. Deeper there is nothing else. There is the same thing, closer.\" Below, in Aurelia's hand, young: \"I won't tell mother.\"" } },
    { id: "e2-verso-cira", era: 2, layer: 1, from: "event", kind: "song", unlock: { flag: "e2_versoCira" },
      es: { title: "El verso de Ama Cira", text: "Escrito en el reverso de un mapa, tres veces, con una palabra distinta cada vez: «Y si despiertas, no estarás sin nadie; / lo que tomamos lo vamos a devolver». Al margen: «No es para dormir. Mi abuela lo cantaba cuando creía que yo ya dormía»." },
      en: { title: "Old Cira's verse", text: "Written on the back of a map, three times, with one word different each time: \"And if you wake, you won't wake alone; / what we have taken, we will give back.\" In the margin: \"It isn't for sleeping. My grandmother sang it when she thought I was asleep.\"" } },
    { id: "e2-encargos", era: 2, layer: 1, from: "event", kind: "ledger", unlock: { flag: "e2_libroGremio" },
      es: { title: "Encargos del Gremio de la Brasa", text: "Casa Destello: 200 tubos largos, pagados por adelantado. Entregados: 190 («diez rotos en el temple»). Casa Alba, Casa Orza, Casa Brasa: 600 tubos. Entrega por el túnel norte, de noche. Sello de Maese Fragua. Al pie, con la letra de Remache: «Aquí nadie miente. Solo nadie pregunta»." },
      en: { title: "Orders of the Ember Guild", text: "House Destello: 200 long tubes, paid in advance. Delivered: 190 (\"ten broken in tempering\"). House Alba, House Orza, House Brasa: 600 tubes. Delivery by the north tunnel, at night. Seal of Master Fragua. At the foot, in Remache's hand: \"Nobody lies here. Nobody asks, that's all.\"" } },
    { id: "e2-tablillas", era: 2, layer: 1, from: "event", kind: "record", unlock: { flag: "e2_tablillas" },
      es: { title: "Las tablillas de la Cripta", text: "Copiadas a mano por una niña con una cuchara y un Cuidador. Árbol cargado. Árbol pelado, y debajo alguien que canta frente a un círculo. Árbol común, cuarenta veces. Árbol cargado. Árbol pelado, alguien que canta. Así hasta donde llega la vela. La última tablilla clavada tiene un árbol cargado. La siguiente todavía no está." },
      en: { title: "The Crypt tablets", text: "Copied by hand by a girl with a spoon and a Caretaker. Laden tree. Bare tree, and below it someone singing before a circle. Ordinary tree, forty times. Laden tree. Bare tree, someone singing. On and on, as far as the candle reaches. The last tablet nailed up has a laden tree. The next one isn't there yet." } },
    { id: "e2-carta-grieto", era: 2, layer: 1, from: "event", kind: "letter", unlock: { flag: "e2_cartaGrieto" },
      es: { title: "Carta sin dirección", text: "Sello: una pala cruzada con una lámpara. «Mamá: no estoy en la Hondonada. Los carros de la Casa Alba no fueron a la casa del puente. Nos bajaron por un túnel. Picamos de noche. Las paredes están tibias. Me pagan, no te preocupes. No digas a nadie dónde estoy, porque no sé dónde estoy. Tu hijo, Grieto.»" },
      en: { title: "Letter with no address", text: "Seal: a shovel crossed with a lamp. \"Mum: I'm not in the Hollow. House Alba's carts didn't go to the bridge house. They took us down a tunnel. We dig at night. The walls are warm. They pay me, don't worry. Don't tell anyone where I am, because I don't know where I am. Your son, Grieto.\"" } },
    { id: "e2-pagina-cantora", era: 2, layer: 1, from: "event", kind: "record", unlock: { flag: "e2_paginaLeida" },
      es: { title: "Página seca del cuaderno de hule", text: "Letra muy vieja, de otra mano: «Tres generaciones sin ver. Los peces nacían ciegos. Vino una de nosotras, la que mejor cantaba. Dijo: si alguien tiene que quedarse, que sea alguien que quiera. Lloró en el lago, porque se despedía. Después subió al Corazón y no bajó. El lago vio esa misma noche. Le pusimos su nombre a la orilla del norte. Después lo olvidamos»." },
      en: { title: "Dried page from the oilcloth notebook", text: "Very old handwriting, from another hand: \"Three generations without seeing. Fish were born blind. One of us came, the one who sang best. She said: if someone has to stay, let it be someone who wants to. She wept in the lake, because she was saying goodbye. Then she went up to the Heart and didn't come down. The lake saw that same night. We named the north shore after her. Then we forgot.\"" } },
    { id: "e2-mapa-doce", era: 2, layer: 1, from: "event", kind: "report", unlock: { flag: "e2_mapasNuevos" },
      es: { title: "Mapa del pozo doce", text: "Corte del subsuelo del Prado, con el sello de Destello. Los Pozos Ciegos bajan en abanico desde la Hondonada y el túnel sur. El doce baja tanto que hubo que atar tres cuerdas. Al fondo, la letra de Lindero: «la roca se hunde y vuelve, como una piel». Si está firmado, una raya roja cruza el mapa: «Debajo de esta raya, la roca deja de ser roca»." },
      en: { title: "Map of well twelve", text: "Cross-section of the ground under the Meadow, with Destello's seal. The Blind Wells fan down from the Hollow and the south tunnel. Twelve goes so deep that three cords had to be tied together. At the bottom, Lindero's hand: \"the rock sinks and comes back, like skin.\" If signed, a red line crosses the map: \"Below this line, the rock stops being rock.\"" } },
    { id: "e2-cielo-limpio", era: 2, layer: 1, from: "event", kind: "record", unlock: { flag: "e2_registroCefira" },
      es: { title: "Registro del cielo limpio", text: "Copia de Glosa, archivera del Trueno, del cuaderno de tapas azules. Semana del éxodo: cielo limpio, viento flojo del norte, ninguna nube en seis días. Al margen, otra letra: «Que no salga del archivo». Al pie, más chico: «Desde la Calma, ninguna tormenta en los Altos. Todos los vientos bajan hacia el Corazón, cada día un poco más fuerte. Como quien toma aire para gritar»." },
      en: { title: "Record of the clear sky", text: "Glosa the Thunder archivist's copy from the blue-covered notebook. Week of the exodus: clear sky, light north wind, not a cloud in six days. In the margin, another hand: \"Not to leave the archive.\" At the bottom, smaller: \"Since the Calm, not one storm in the Heights. Every wind goes down towards the Heart, a little stronger each day. Like someone drawing breath to shout.\"" } },
    { id: "e2-lista-antifona", era: 2, layer: 3, from: "event", kind: "record", unlock: { flag: "e2_inventario" },
      es: { title: "Pedazo de la lista de lo tomado", text: "Un trozo del rollo de Antífona. Arriba, letra muy vieja: «Lo primero que se tomó fue la luz. La bebió una polilla. Después, todos quisimos». Debajo, de muchas manos: el agua del lago que veía; la piedra que hablaba; el aceite de los Pozos; la savia de las setas; los tubos largos; las cometas vendidas. Si Cira cantó su verso, al final, en letra grande: «Lo que tomamos lo vamos a devolver»." },
      en: { title: "Piece of the list of what was taken", text: "A scrap of Antífona's roll. At the top, very old writing: \"The first thing taken was the light. A moth drank it. After that, we all wanted some.\" Below, in many hands: the water of the lake that saw; the stone that spoke; the oil of the Wells; the sap of the mushrooms; the long tubes; the sold kites. If Cira sang her verse, at the end, in big letters: \"What we have taken, we will give back.\"" } },
    /* --- Escritos de la era 3, El Lago que Recuerda (rpg/events-era3.js) --- */
    { id: "e3-cuaderno-hule", era: 3, layer: 1, from: "event", kind: "record", unlock: { flag: "e3_cuadernoAlbor" },
      es: { title: "El cuaderno de Aurelia, leído por su nieta", text: "Al margen del cuaderno de los Albor, una letra nueva, redonda, de muchacha: «La abuela sabía. Lo escribió todo: los pozos, los tubos largos, la Raíz que bebía. Lo escribió para alguien que viniera después. Vine yo. No la salva. Pero la abuela no mintió: solo calló. Lo voy a decir en el Juicio con esto en la mano, y no con agua. — C.»" },
      en: { title: "Aurelia's notebook, read by her granddaughter", text: "In the margin of the Albor notebook, a new hand, round, a girl's: \"Grandmother knew. She wrote it all down: the wells, the long tubes, the Root that drank. She wrote it for someone who would come after. I came. It doesn't save her. But Grandmother didn't lie: she only kept quiet. I'll say it at the Trial with this in my hand, and not with water. — C.\"" } },
    { id: "e3-cortes-glosa", era: 3, layer: 2, from: "event", kind: "record", unlock: { flag: "e3_listaCortes" },
      es: { title: "Los cortes de la Velada", text: "Lista de Glosa, por orden de venta. Primero: la cara de la matriarca cuando vio el suelo (vendido cuarenta veces). Segundo: la Corte cavando bajo la plaza (treinta y una). Tercero: los faroles de las Casas encendiéndose a la vez (veintinueve). Al final, sin vender ninguna vez: los niños del Barrio durmiendo en la calle mientras arriba bailaban. Al pie: «Lo que nadie compra también pasó»." },
      en: { title: "The cuts of the Night of Lanterns", text: "Glosa's list, in order of sales. First: the matriarch's face when she saw the ground (sold forty times). Second: the Court digging under the square (thirty-one). Third: the Houses' lanterns lighting all at once (twenty-nine). At the end, never sold once: the Quarter children sleeping in the street while above they danced. At the bottom: \"What nobody buys happened too.\"" } },
    { id: "e3-hojas-liquen", era: 3, layer: 2, from: "event", kind: "record", unlock: { flag: "e3_hojasCopiadas" },
      es: { title: "Hojas del Abuelo Liquen (copia)", text: "Copiadas por los chicos del Bosque, de la caja de Llovizna. «Vine al Bosque con una bellota. Me dejaron entrar. Cerré el Seto detrás de mí.» «La nana de antes tenía un verso más. No me acuerdo cuál.» «Si un día el Bosque se olvida de por qué olvida, que alguien le lea esto.» «Llovizna canta mal. No se lo digan.»" },
      en: { title: "Grandpa Liquen's leaves (copy)", text: "Copied by the Wood's young ones, from Llovizna's box. \"I came to the Wood with an acorn. They let me in. I closed the Hedge behind me.\" \"The old lullaby had one more verse. I don't remember which.\" \"If one day the Wood forgets why it forgets, let someone read it this.\" \"Llovizna sings badly. Don't tell her.\"" } },
  ];

  /* ---------- Hilos del Grimorio: dos Escritos que juntos revelan algo ---------- */
  const LORE_HILOS = [
    { id: "h_guijarro", a: "guijarro", b: "sombraTunel", es: "El guijarro de Nim es el de Grava. Su madre pasó por las Cuevas, y alguien la sacó de allí.", en: "Nim's pebble is Grava's. His mother passed through the Caves, and someone led her out." },
    { id: "h_perdon", a: "perdon", b: "nocheSinLuna", es: "Aurelia perdonó a Tila porque se vio a sí misma: la chica que una vez se escapó al Vado.", en: "Aurelia pardoned Tila because she saw herself: the girl who once slipped away to the Ford." },
    { id: "h_grava", a: "anuncio", b: "voces", es: "El anuncio dice que Grava murió. La pared sigue recibiendo nombres nuevos.", en: "The notice says Grava died. The wall keeps getting new names." },
    { id: "h_manos", a: "receta", b: "tos", es: "Quien paga los remedios de Ola es el mismo que ordenó no apuntar su accidente.", en: "The one paying for Ola's remedies is the same one who ordered her accident left off the books." },
    { id: "h_tormenta", a: "acta", b: "trueno", es: "No hubo tormenta. El voto que cerró los pasos se decidió con una palabra de Coplo.", en: "There was no storm. The vote that closed the passes turned on one word from Coplo." },
    { id: "h_piedras", a: "piedras", b: "balada", es: "La canción que acompañaba las piedras es la balada más vendida de Coplo.", en: "The song that went with the stones is Coplo's best-selling ballad." },
    { id: "h_paz", a: "acuerdo", b: "marejada", es: "Marejada vio la verdad hace diez años, y firmó un acuerdo que le prohíbe decirla.", en: "Marejada saw the truth ten years ago, and signed an agreement that forbids her to say it." },
    { id: "h_bellota", a: "bellota", b: "seto", es: "El anciano que cerró el bosque llegó a él como desplazado, plantando una bellota.", en: "The elder who closed the wood came to it as a displaced child, planting an acorn." },
  ];

  /* ---------- Epílogos: una línea por final, se leen en el Grimorio al terminar cada historia ---------- */
  // flag = la que el juego pone al cerrar esa historia con ese final
  const LORE_EPILOGOS = [
    { char: "tila", end: "A", flag: "end_tila_A", es: "La Casa Candil vuelve a tener nombre. En la Torre del Alba hay una farolera muy puntual que nunca canta.", en: "House Candil has its name back. In the Tower of Dawn there's a very punctual lamplighter who never sings." },
    { char: "tila", end: "B", flag: "end_tila_B", es: "La calle no gasta aceite. Los vecinos la llaman la Calle de Tila, aunque Tila sigue sin apellido.", en: "The street burns no oil. The neighbours call it Tila's Street, though Tila still has no surname." },
    { char: "nim", end: "A", flag: "end_nim_A", es: "Penumbra tardó nueve días en volver a hablarle. El décimo, le dijo su propio nombre verdadero.", en: "It took Penumbra nine days to speak to him again. On the tenth, she told him her own true name." },
    { char: "nim", end: "B", flag: "end_nim_B", es: "Las cartas de su madre siguen llegando. Nim las guarda bajo el adoquín, junto al guijarro.", en: "His mother's letters keep coming. Nim keeps them under the cobblestone, beside the pebble." },
    { char: "orilla", end: "A", flag: "end_orilla_A", es: "La nueva Madre llevó a su pueblo de vuelta al Lago. El agua sigue turbia, pero ya no se la presta nadie.", en: "The new Mother led her people back to the Lake. The water is still clouded, but no one lends it to them anymore." },
    { char: "orilla", end: "B", flag: "end_orilla_B", es: "Abuela y nieta leen el agua juntas, de noche. Ninguna de las dos ha vuelto a mentir sobre lo que ve.", en: "Grandmother and granddaughter read the water together at night. Neither has lied about what she sees again." },
    { char: "ola", end: "A", flag: "end_ola_A", es: "Un Fuego vive en el campamento de las Mareas. Le han dado una barca, y la está aprendiendo a no quemar.", en: "A Fire lives in the Tides' camp. They gave him a boat, and he's learning not to burn it." },
    { char: "ola", end: "B", flag: "end_ola_B", es: "Cada mes llega al campamento dinero sin firma. Orilla sabe de quién es por cómo huele a carbón.", en: "Every month unsigned money reaches the camp. Orilla knows whose it is by the smell of coal." },
    { char: "ola", end: "C", flag: "end_ola_C", es: "Ola volvió del Lago sin reflejo. Dice que no lo echa de menos; nunca le gustó verse al lado de su hermana.", en: "Ola came back from the Lake with no reflection. She says she doesn't miss it; she never liked seeing herself beside her sister." },
    { char: "grava", end: "A", flag: "end_grava_A", es: "Si hablas en el centro de la Sala, ahora te contesta una voz más. Es la más vieja y la más paciente.", en: "If you speak in the middle of the Hall, one more voice answers now. The oldest, and the most patient." },
    { char: "grava", end: "B", flag: "end_grava_B", es: "Medio de piedra, Grava enseña el verso a los niños de la Hondura. Les pide que pongan las manos en la roca.", en: "Half stone, Grava teaches the verse to the Deep-folk children. She asks them to put their hands on the rock." },
    { char: "basalto", end: "A", flag: "end_basalto_A", es: "Ya no es Primer Picador. En la Hondura lo llaman «el que volvió», y él no corrige a nadie.", en: "He is no longer First Pick. The Deep-folk call him \"the one who went back\", and he corrects no one." },
    { char: "basalto", end: "B", flag: "end_basalto_B", es: "Cuarenta casas, cuarenta chimeneas. Basalto ya no oye ninguna, ni siquiera con las manos en la pared.", en: "Forty houses, forty chimneys. Basalto can't hear any of them now, not even with his hands on the wall." },
    { char: "coplo", end: "A", flag: "end_coplo_A", es: "Nadie le paga por su canción nueva. Es la primera que la gente se aprende sin que se la paguen.", en: "Nobody pays him for his new song. It's the first one people learn without being paid to." },
    { char: "coplo", end: "B", flag: "end_coplo_B", es: "Coplo canta en todas las plazas del Claro. Su cuaderno de versos sigue en la misma página.", en: "Coplo sings in every square of the Glade. His book of verses is still open to the same page." },
    { char: "esporina", end: "A", flag: "end_esporina_A", es: "Las Setas viven aparte, y no deben nada a nadie. Albina sigue soñando por un rey que todos saben falso.", en: "The Mushrooms live apart and owe no one anything. Albina still dreams for a king everyone knows is false." },
    { char: "esporina", end: "B", flag: "end_esporina_B", es: "El rey ha soñado que todos los desplazados son un solo pueblo. Lo han soñado dos personas, juntas.", en: "The king dreamed that all the displaced are one people. Two people dreamed it, together." },
    { char: "esporina", end: "C", flag: "end_esporina_C", es: "Los pasos de los Altos están abiertos para siempre. En el Fondo Blanco nadie sabe a quién se lo deben.", en: "The passes of the Heights are open for good. In the White Deep nobody knows whom they owe it to." },
    { char: "aurelia", end: "A", flag: "end_aurelia_A", es: "El Prado está a oscuras por primera vez en diez años. Dicen que esa noche se vieron las estrellas.", en: "The Meadow is dark for the first time in ten years. They say the stars came out that night." },
    { char: "aurelia", end: "B", flag: "end_aurelia_B", es: "Alvar se ha curado. La Torre del Alba brilla más que nunca, y en la caja fuerte sigue una carta sin enviar.", en: "Alvar is cured. The Tower of Dawn shines brighter than ever, and an unsent letter is still in the safe." },
    { char: "tizon", end: "A", flag: "end_tizon_A", es: "El primer Fuego del Consejo de las Casas votó en su primera sesión. Votó como le pidieron.", en: "The first Fire on the Council of Houses voted in his first session. He voted as he was asked." },
    { char: "tizon", end: "B", flag: "end_tizon_B", es: "En el campamento de las Mareas arde una brasa del Cráter. Nadie la ha apagado todavía.", en: "A coal from the Crater burns in the Tides' camp. No one has put it out yet." },
    { char: "liquen", end: "A", flag: "end_liquen_A", es: "Cada pueblo guarda ahora una parte de la Cripta. Fuera del bosque crece un roble joven junto a uno muy viejo.", en: "Every people now keeps part of the Vault. Outside the wood, a young oak grows beside a very old one." },
    { char: "liquen", end: "B", flag: "end_liquen_B", es: "El Bosque Hondo es una isla cerrada y verde. Junto al Roble Sentado hay ahora dos ancianos que no hablan.", en: "The Deep Wood is a closed green island. Beside the Seated Oak there are now two elders who don't speak." },
    { char: "marejada", end: "A", flag: "end_marejada_A", es: "Una anciana vive sola en la orilla del Lago corrompido. Dicen que lo vigila para que nadie más se ahogue.", en: "An old woman lives alone on the shore of the corrupted Lake. They say she watches it so no one else drowns." },
    { char: "marejada", end: "B", flag: "end_marejada_B", es: "En el Corazón del Claro, la primera voz que se oyó fue la de una anciana pidiendo perdón.", en: "In the Heart of the Glade, the first voice heard was an old woman asking forgiveness." },
    // era 2 (La Calma)
    { char: "destello", end: "A", flag: "end_destello_A", es: "Destello cierra un pozo cada luna, el más hondo primero. El Barrio la llama traidora los lunes y la vuelve a elegir los viernes.", en: "Destello closes one well every moon, the deepest first. The Quarter calls her a traitor on Mondays and elects her again on Fridays." },
    { char: "destello", end: "B", flag: "end_destello_B", es: "Destello y tú siguen siendo enemigos educados. Cada invierno te manda una lámpara de regalo, siempre apagada.", en: "Destello and you are still polite enemies. Every winter she sends you a lamp as a gift, always unlit." },
    { char: "destello", end: "C", flag: "end_destello_C", es: "Destello guardó la verdad en un cajón con llave. Dicen que de noche lo abre, la lee y lo vuelve a cerrar.", en: "Destello locked the truth in a drawer. They say at night she opens it, reads it and locks it again." },
    { char: "e2aurelia", end: "A", flag: "end_e2aurelia_A", es: "El cuaderno de los Albor se leyó en la plaza. La gente oyó «Albor» y no «la Raíz», como ella dijo. Aurelia riega su geranio y no baja al Prado.", en: "The Albor notebook was read in the square. People heard “Albor” and not “the Root”, as she said they would. Aurelia waters her geranium and doesn't go down to the Meadow." },
    { char: "e2aurelia", end: "B", flag: "end_e2aurelia_B", es: "Aurelia sigue guardando el cuaderno. Una vez al mes alguien toca su puerta para pedirlo; nunca es la persona que ella espera.", en: "Aurelia still keeps the notebook. Once a month someone knocks to ask for it; it's never the person she's waiting for." },
    { char: "e2aurelia", end: "C", flag: "end_e2aurelia_C", es: "El cuaderno de los Albor llegó a otras manos. Aurelia nunca preguntó qué se hizo con él, y nadie se lo contó.", en: "The Albor notebook reached other hands. Aurelia never asked what was done with it, and nobody told her." },
    { char: "penumbra", end: "A", flag: "end_penumbra_A", es: "En el Vado hay más cintas bordadas que camas. Penumbra borda una más cada vez que llega alguien, y no pregunta de dónde viene.", en: "In the Ford there are more embroidered ribbons than beds. Penumbra embroiders one more each time someone arrives, and doesn't ask where from." },
    { char: "penumbra", end: "B", flag: "end_penumbra_B", es: "Penumbra dejó de bordar cintas. Ahora borda pañuelos, con la canción del taller, para no perder el ritmo de la aguja.", en: "Penumbra stopped embroidering ribbons. Now she embroiders handkerchiefs, to the workshop song, so as not to lose the needle's rhythm." },
    { char: "penumbra", end: "C", flag: "end_penumbra_C", es: "Penumbra sigue bordando nombres a quien se los pide. Cobra poco, cose despacio y nunca borda el suyo.", en: "Penumbra still embroiders names for whoever asks. She charges little, sews slowly and never embroiders her own." },
    { char: "fogarin", end: "A", flag: "end_fogarin_A", es: "Fogarín y Ola hacen tubos juntos, uno de fuego y uno de agua. Cuando los apuntan al Corazón, cada año cantan un poco menos roncos.", en: "Fogarín and Ola make tubes together, one of fire and one of water. When they point them at the Heart, each year they sing a little less hoarse." },
    { char: "fogarin", end: "B", flag: "end_fogarin_B", es: "Fogarín tiene una pared llena de tubos que cantan. Los usa para saber dónde no cavar. Todavía nadie le hace caso.", en: "Fogarín has a wall full of singing tubes. He uses them to know where not to dig. Nobody listens to him yet." },
    { char: "fogarin", end: "C", flag: "end_fogarin_C", es: "Fogarín sigue soplando el fuelle de otros. A veces, de noche, sopla un tubo vacío para ver si canta.", en: "Fogarín still works other people's bellows. Sometimes, at night, he blows into an empty tube to see if it sings." },
    { char: "llovizna", end: "A", flag: "end_llovizna_A", es: "Llovizna canta la canción del Bosque en una esquina del Prado, para los chicos del Barrio. No da luz. Da ganas de quedarse.", en: "Llovizna sings the Wood's song on a Meadow corner, for the Quarter's children. It gives no light. It makes you want to stay." },
    { char: "llovizna", end: "B", flag: "end_llovizna_B", es: "Llovizna cuida criaturas en el Vado. Los domingos vuelve al Bosque a ver al abuelo, con la cuchara.", en: "Llovizna looks after creatures in the Ford. On Sundays she goes back to the Wood to see her grandfather, spoon in hand." },
    { char: "llovizna", end: "C", flag: "end_llovizna_C", es: "Llovizna se quedó en el Bosque. Lo que el abuelo Liquen va olvidando, ella lo escribe en hojas secas y lo guarda en una caja.", en: "Llovizna stayed in the Wood. Whatever Grandpa Liquen forgets, she writes on dry leaves and keeps in a box." },
    { char: "ceniza", end: "A", flag: "end_ceniza_A", es: "Ceniza sigue oyendo el grito de la plaza, pero ya no la llama a ella. Duerme con la ventana abierta, para comprobarlo.", en: "Ceniza still hears the cry from the square, but it doesn't call her any more. She sleeps with the window open, to make sure." },
    { char: "ceniza", end: "B", flag: "end_ceniza_B", es: "Ceniza vive en el Vado y te sigue a todas partes. A veces se para en la puerta y se pregunta de quién es.", en: "Ceniza lives in the Ford and follows you everywhere. Sometimes she stops at the door and wonders whose she is." },
    { char: "ceniza", end: "C", flag: "end_ceniza_C", es: "Ceniza tiene las palmas quemadas para siempre. Dice que es lo único suyo que nadie le puso.", en: "Ceniza's palms are scarred for good. She says it's the only thing of hers nobody put there." },
    { char: "brida", end: "A", flag: "end_brida_A", es: "Brida sacó a todos de los Pozos Ciegos y perdió el nombre que le dio la matriarca. Ahora firma con una pala dibujada.", en: "Brida got everyone out of the Blind Wells and lost the name the matriarch gave her. Now she signs with a drawn shovel." },
    { char: "brida", end: "B", flag: "end_brida_B", es: "Brida sigue apuntando nombres en la boca del túnel. Los del nueve los tacha antes de que bajen.", en: "Brida still writes down names at the tunnel mouth. The ones for nine she crosses out before they go down." },
    { char: "brida", end: "C", flag: "end_brida_C", es: "Brida conservó su nombre y su tabla. Cada invierno la tabla tiene menos nombres, y ella no pregunta por qué.", en: "Brida kept her name and her board. Every winter the board has fewer names, and she doesn't ask why." },
    { char: "e2basalto", end: "A", flag: "end_e2basalto_A", es: "Basalto dejó el pico en la roca. Cada noche la Hondura golpea las paredes de los Pozos Ciegos, de dos en dos, para que nadie duerma tranquilo encima.", en: "Basalto left his pick in the rock. Every night the Hondura knocks on the walls of the Blind Wells, two by two, so nobody sleeps easy above them." },
    { char: "e2basalto", end: "B", flag: "end_e2basalto_B", es: "Basalto derrumbó la galería sobre los Pozos Ciegos. Los pozos se taparon, y él no volvió a hablar en el centro de la Sala.", en: "Basalto brought the gallery down on the Blind Wells. The wells were sealed, and he never spoke in the middle of the Hall again." },
    { char: "e2basalto", end: "C", flag: "end_e2basalto_C", es: "Basalto guardó el pico detrás de la puerta. Lo mira todas las mañanas, y todas las mañanas lo deja ahí.", en: "Basalto put his pick behind the door. He looks at it every morning, and every morning he leaves it there." },
    { char: "cefira", end: "A", flag: "end_cefira_A", es: "Céfira bajó al Prado y pidió en voz alta. Fue lo que más le costó en la vida. Ahora habla poco, pero todos la escuchan.", en: "Céfira went down to the Meadow and asked out loud. It was the hardest thing she ever did. Now she speaks little, but everyone listens." },
    { char: "cefira", end: "B", flag: "end_cefira_B", es: "Céfira no volvió a hablar en público. Habla con las manos, con Arpegio, y a veces se ríen juntos.", en: "Céfira never spoke in public again. She speaks with her hands, with Arpegio, and sometimes they laugh together." },
    { char: "cefira", end: "C", flag: "end_cefira_C", es: "Céfira sigue mirando por la ventana. Cuenta a los que bajan, y no dice nada.", en: "Céfira still looks out of the window. She counts the ones going down, and says nothing." },
    { char: "e2esporina", end: "A", flag: "end_e2esporina_A", es: "Esporina dejó la pala. Cura con soñadores y caldo; tiene los labios partidos como todos, y dice que vale la pena.", en: "Esporina put down her shovel. She heals with dreamers and broth; her lips are split like everyone's, and she says it's worth it." },
    { char: "e2esporina", end: "B", flag: "end_e2esporina_B", es: "Esporina cura a todo el Barrio con setas de savia. Cada vez que cava, algo se da vuelta en el fondo, y ella cava igual.", en: "Esporina heals the whole Quarter with sap mushrooms. Every time she digs, something turns over down below, and she digs anyway." },
    { char: "e2esporina", end: "C", flag: "end_e2esporina_C", es: "Esporina sigue buscando un remedio que no pida savia. Tiene el sombrero lleno de notas por dentro.", en: "Esporina is still looking for a remedy that needs no sap. The inside of her hat is full of notes." },
    { char: "albina", end: "A", flag: "end_albina_A", es: "Albina hace guardia en la enfermería los jueves. Es la que peor venda, y la que más tiempo se queda.", en: "Albina takes the infirmary shift on Thursdays. She's the worst at bandaging, and the one who stays longest." },
    { char: "albina", end: "B", flag: "end_albina_B", es: "La corona de Albina se vendió en tres pedazos. Ella guardó el clavo del que colgaba y lo lleva al cuello.", en: "Albina's crown was sold in three pieces. She kept the nail it hung from and wears it round her neck." },
    { char: "albina", end: "C", flag: "end_albina_C", es: "Albina sigue con la corona puesta. Su hija la visita una vez al año, en silencio, y le acomoda el pelo.", en: "Albina still wears the crown. Her daughter visits once a year, in silence, and tidies her hair." },
    { char: "e2nim", end: "A", flag: "end_e2nim_A", es: "Nim no volvió a cantar en un coro. Canta su nana entera en la puerta del Barrio, una vez al año, gratis.", en: "Nim never sang in a choir again. He sings his whole lullaby at the Quarter's gate, once a year, for free." },
    { char: "e2nim", end: "B", flag: "end_e2nim_B", es: "Nim se quedó a tu lado. Su madre dejó de escribirle y empezó a visitarlo, enojada, cada semana.", en: "Nim stayed by your side. His mother stopped writing and started visiting him, angry, every week." },
    { char: "e2nim", end: "C", flag: "end_e2nim_C", es: "Nim sigue con la duda. Es el único del Vado que siempre pregunta a quién le cuesta la otra forma.", en: "Nim still has his doubts. He's the only one in the Ford who always asks who the other way costs." },
    // era 3 (El Lago que Recuerda)
    { char: "candela", end: "A", flag: "end_candela_A", es: "El cuaderno de hule se leyó en el Juicio. Candela no defendió a su abuela ni la acusó: leyó en voz alta y se fue. Ahora vende pan en el Barrio, sin apellido.", en: "The oilcloth notebook was read at the Trial. Candela neither defended her grandmother nor accused her: she read aloud and left. Now she sells bread in the Quarter, with no surname." },
    { char: "candela", end: "B", flag: "end_candela_B", es: "Candela bebió hasta ver a su abuela sola con el cuaderno. Desde entonces bebe una copa por luna, siempre la misma, para ver si la abuela lo abre. Nunca lo abre.", en: "Candela drank until she saw her grandmother alone with the notebook. Since then she drinks one cup a moon, always the same, to see if her grandmother opens it. She never does." },
    { char: "candela", end: "C", flag: "end_candela_C", es: "Candela no bebió ni encontró nada. Defiende a su abuela en cada esquina, con la voz cada vez más alta, como quien tapa un ruido.", en: "Candela neither drank nor found anything. She defends her grandmother on every corner, her voice louder each time, like someone drowning out a noise." },
    { char: "albura", end: "A", flag: "end_albura_A", es: "La jueza Albura dijo delante de los nueve pueblos que no sabía. La destituyeron esa misma semana. Ahora la buscan para que diga que no sabe en otros juicios.", en: "Judge Albura said before the nine peoples that she didn't know. They removed her that same week. Now people seek her out to say she doesn't know at other trials." },
    { char: "albura", end: "B", flag: "end_albura_B", es: "Albura selló la Crónica que se firmó y no volvió a hablar de ella. Su hija la visita los domingos y le dice su nombre al entrar, por si acaso.", en: "Albura sealed the Chronicle that was signed and never spoke of it again. Her daughter visits on Sundays and says her name on the way in, just in case." },
    { char: "albura", end: "C", flag: "end_albura_C", es: "Albura siguió sellando juicios hasta que le temblaron las manos. Dice que la herida se cerró. Nunca dice cuál.", en: "Albura went on sealing trials until her hands shook. She says the wound closed. She never says which one." },
    { char: "trueque", end: "A", flag: "end_trueque_A", es: "Trueque sigue mostrando la noche entera, gratis, en el mirador. Vende frasquitos al lado, más caros que nunca. Dice que una cosa paga la otra.", en: "Trueque still shows the whole night, free, at the lookout. He sells little flasks next to it, dearer than ever. He says one pays for the other." },
    { char: "trueque", end: "B", flag: "end_trueque_B", es: "Trueque se hizo rico vendiendo pedazos. Tiene una casa en el Prado y un perro que no deja entrar a nadie del Barrio.", en: "Trueque got rich selling pieces. He has a house in the Meadow and a dog that won't let anyone from the Quarter in." },
    { char: "trueque", end: "C", flag: "end_trueque_C", es: "Trueque sigue en el mirador con su toldo a rayas. Cuando le preguntan qué vende, dice «lo mismo que siempre», y nadie sabe qué contestar.", en: "Trueque is still at the lookout under his striped awning. When asked what he sells, he says “the same as ever”, and nobody knows what to answer." },
    { char: "retono", end: "A", flag: "end_retono_A", es: "Retoño habla en el Concejo por los jóvenes. Lo primero que logró fue que se pudiera preguntar. Lo segundo todavía no lo dijo.", en: "Retoño speaks at the Council for the young. The first thing he won was the right to ask. He still hasn't said the second." },
    { char: "retono", end: "B", flag: "end_retono_B", es: "Retoño se quedó en la orilla con los que bajan al lago. Cuenta a los que vuelven. La silla chica del Concejo sigue vacía.", en: "Retoño stayed on the shore with the ones who go down to the lake. He counts the ones who come back. The Council's small chair is still empty." },
    { char: "retono", end: "C", flag: "end_retono_C", es: "Retoño sigue bajando a la orilla de noche. A veces lo acompaña algún viejo del Concejo. Nadie bebe. Hablan hasta que sale el sol.", en: "Retoño still goes down to the shore at night. Sometimes an old Council member goes with him. Nobody drinks. They talk until the sun comes up." },
    { char: "umbela", end: "A", flag: "end_umbela_A", es: "Umbela sigue en la Corte, sin velo. Ordena el archivo de los muertos y no saluda a los que no la saludan. Son menos cada año.", en: "Umbela is still at the Court, without a veil. She keeps the archive of the dead and doesn't greet those who don't greet her. There are fewer each year." },
    { char: "umbela", end: "B", flag: "end_umbela_B", es: "Umbela vive en el Vado y lleva el archivo de las criaturas con letra perfecta. Corrigió todas tus fechas. No te lo perdona.", en: "Umbela lives at the Ford and keeps the creatures' archive in perfect handwriting. She corrected all your dates. She hasn't forgiven you for them." },
    { char: "umbela", end: "C", flag: "end_umbela_C", es: "Umbela tiene una raya gris en la puerta. La Corte la necesita para buscar papeles y la llama de noche, por la puerta de atrás.", en: "Umbela has a grey stripe on her door. The Court needs her to find papers and calls on her at night, by the back door." },
    { char: "e3lobrego", end: "A", flag: "end_e3lobrego_A", es: "El rey Lóbrego dijo en el Juicio que no preguntó. Murió ese invierno. En su tumba, la Corte escribió «Rey». Alguien, de noche, agregó «que no preguntó».", en: "King Lóbrego said at the Trial that he didn't ask. He died that winter. On his tomb, the Court wrote “King”. Someone, at night, added “who didn't ask”." },
    { char: "e3lobrego", end: "B", flag: "end_e3lobrego_B", es: "Lóbrego bebió la muerte de Noctua y no se la contó a nadie más que a ti. Desde entonces deja la puerta del Trono abierta, por si alguien quiere preguntarle.", en: "Lóbrego drank Noctua's death and told no one but you. Since then he leaves the Throne's door open, in case anyone wants to ask him." },
    { char: "e3lobrego", end: "C", flag: "end_e3lobrego_C", es: "Lóbrego murió con la copa sin tocar en el estante. La Corte la guarda en la bodega, entre las otras, con su nombre en la etiqueta.", en: "Lóbrego died with the cup untouched on the shelf. The Court keeps it in the cellar, among the others, with his name on the label." },
    { char: "bruna", end: "A", flag: "end_bruna_A", es: "Bruna camina con una sombra de niebla que le tejió Calina. Los otros chicos de la Hondonada le piden una igual. Calina ya no da abasto.", en: "Bruna walks with a shadow of mist Calina wove for her. The other Hollow children ask for one just like it. Calina can't keep up." },
    { char: "bruna", end: "B", flag: "end_bruna_B", es: "Bruna canta la nana al sol todos los días. La sombra no volvió. Pero algo pálido la sigue cuando canta, y ella dice que con eso le alcanza.", en: "Bruna sings the lullaby to the sun every day. Her shadow hasn't come back. But something pale follows her when she sings, and she says that's enough." },
    { char: "bruna", end: "C", flag: "end_bruna_C", es: "Bruna no tiene sombra y ya no la busca. Dice que así nadie la puede pisar.", en: "Bruna has no shadow and doesn't look for it any more. She says that way nobody can step on it." },
    { char: "remanso", end: "A", flag: "end_remanso_A", es: "Remanso dejó de beber. Cuida criaturas y pesca en el río, no en el lago. A veces se queda mirando el agua, y se va antes de que lo llame.", en: "Remanso stopped drinking. He looks after creatures and fishes in the river, not the lake. Sometimes he stands staring at the water, and leaves before it calls him." },
    { char: "remanso", end: "B", flag: "end_remanso_B", es: "Remanso vio a su padre. Siguió bebiendo después. Tiene los ojos claros, casi blancos, y sonríe cuando nadie le habla.", en: "Remanso saw his father. He went on drinking afterwards. His eyes are pale, almost white, and he smiles when nobody is talking to him." },
    { char: "remanso", end: "C", flag: "end_remanso_C", es: "Remanso bebe por los que pagan. Es el mejor vidente de las Mareas. No se acuerda de cuántos años tiene.", en: "Remanso drinks for whoever pays. He's the best seer of the Tides. He doesn't remember how old he is." },
    { char: "e3ola", end: "A", flag: "end_e3ola_A", es: "Las Mareas son guardianas del lago. Cobran poco y sacan menos. Ola murió en una casa, como quería, con su hermana al lado.", en: "The Tides are guardians of the lake. They charge little and draw less. Ola died in a house, as she wanted, with her sister beside her." },
    { char: "e3ola", end: "B", flag: "end_e3ola_B", es: "Ola firmó con las Casas y tiene papeles de la orilla norte. Las Mareas ya no vagan. Tampoco se acuerdan de por qué vagaban.", en: "Ola signed with the Houses and has papers for the north shore. The Tides no longer wander. Nor do they remember why they did." },
    { char: "e3ola", end: "C", flag: "end_e3ola_C", es: "Ola sigue contando barriles en un cuaderno. Tacha un número cada semana y escribe uno más chico. Nunca llega a cero.", en: "Ola still counts barrels in a notebook. Every week she crosses out a number and writes a smaller one. It never reaches zero." },
    { char: "e3orilla", end: "A", flag: "end_e3orilla_A", es: "Orilla camina por la plaza hundida cuando baja el agua, con la mano en las paredes. Los chicos de las Mareas la siguen y aprenden a leer con los dedos.", en: "Orilla walks the sunken square when the water is low, her hand on the walls. The Tides children follow her and learn to read with their fingers." },
    { char: "e3orilla", end: "B", flag: "end_e3orilla_B", es: "Orilla se sentó en la orilla a contar las luces que se apagan. Sigue ahí. Dicen que ya no cuenta luces: cuenta a los que pasan sin mirarla.", en: "Orilla sat on the shore to count the lights going out. She's still there. They say she no longer counts lights: she counts those who pass without looking at her." },
    { char: "e3orilla", end: "C", flag: "end_e3orilla_C", es: "Orilla se quedó ciega del todo. Dice que es mejor: ya no tiene que mirar el lago para saber lo que le falta.", en: "Orilla went completely blind. She says it's better: she no longer has to look at the lake to know what it's missing." },
    { char: "cuarzo", end: "A", flag: "end_cuarzo_A", es: "Cuarzo dejó la pared con lo que tenía. Ahora la gente se cuenta las noches en voz alta en la Sala, y él solo escucha, con el cincel en el cinturón.", en: "Cuarzo left the wall with what it held. Now people tell each other their nights aloud in the Hall, and he just listens, chisel at his belt." },
    { char: "cuarzo", end: "B", flag: "end_cuarzo_B", es: "Cuarzo borró los nombres de su abuelo para grabar más Veladas. Todos los años, en la Noche del Eco, grita esos nombres solo, en la sala, de memoria.", en: "Cuarzo erased his grandfather's names to carve more Nights of Lanterns. Every year, on the Night of the Echo, he shouts those names alone in the hall, from memory." },
    { char: "cuarzo", end: "C", flag: "end_cuarzo_C", es: "Cuarzo sigue grabando, en túneles cada vez más hondos. Encontró grabados más viejos que los suyos. No le dijo a nadie lo que dicen.", en: "Cuarzo keeps carving, in ever deeper tunnels. He found carvings older than his own. He hasn't told anyone what they say." },
    { char: "e3nevisca", end: "A", flag: "end_e3nevisca_A", es: "Nevisca duerme para la Raíz con la mitad de los soñadores. Sueña blanco. Dice que alguien tiene que acordarse por la Raíz, aunque sea con sueños prestados.", en: "Nevisca sleeps for the Root with half the dreamers. She dreams white. She says someone has to remember for the Root, even with borrowed dreams." },
    { char: "e3nevisca", end: "B", flag: "end_e3nevisca_B", es: "El Fondo cobra el doble por cada sueño. Nevisca lleva la cuenta. Tiene leña de sobra y nada que soñar.", en: "The Deep charges double for every dream. Nevisca keeps the accounts. She has firewood to spare and nothing to dream." },
    { char: "e3nevisca", end: "C", flag: "end_e3nevisca_C", es: "Nevisca sigue recibiendo en el Turno a los que llegan con huecos. Les da caldo y les pregunta qué les falta. Casi nunca saben.", en: "Nevisca still takes in, at the Watch, those who arrive with holes. She gives them broth and asks what they're missing. They almost never know." },
    { char: "e3nieve", end: "A", flag: "end_e3nieve_A", es: "Nieve le devolvió su hermano al lago. Patina todas las tardes sobre el agujero, que ya se cerró. Se ríe cuando se cae.", en: "Nieve gave her brother back to the lake. She skates every afternoon over the hole, which has closed now. She laughs when she falls." },
    { char: "e3nieve", end: "B", flag: "end_e3nieve_B", es: "Nieve bebió la caída de su hermano. Ya no patina. Tiene su risa y no sabe dónde ponerla.", en: "Nieve drank her brother's fall. She doesn't skate any more. She has his laugh and doesn't know where to put it." },
    { char: "e3nieve", end: "C", flag: "end_e3nieve_C", es: "La copa sigue en la ventana de Nieve, con la cera intacta. Cada mañana la saluda. Algunos vecinos también.", en: "The cup is still in Nieve's window, wax intact. Every morning she says hello to it. Some of the neighbours do too." },
    { char: "e4fogarin", end: "A", flag: "end_e4fogarin_A", es: "Fogarín murió sin tocar la Campana con sus manos. Pidió que lo enterraran en el Vado, no en el Cráter. En su tumba no dice Maestro. Dice «aprendiz del fuelle».", en: "Fogarín died without touching the Bell with his own hands. He asked to be buried at the Ford, not in the Crater. His tomb doesn't say Master. It says “bellows apprentice”." },
    { char: "e4fogarin", end: "B", flag: "end_e4fogarin_B", es: "Fogarín murió rico, con veinte hornos hondos a su nombre. Las manos se le pusieron grises el último año. Las escondía en los bolsillos del delantal.", en: "Fogarín died rich, with twenty deep furnaces in his name. His hands went grey in his last year. He hid them in his apron pockets." },
    { char: "e4fogarin", end: "C", flag: "end_e4fogarin_C", es: "Fogarín siguió siendo Maestro hasta el final. Cada mañana bajaba a la boca de los hornos hondos, miraba las manos de los que salían, y no decía nada.", en: "Fogarín stayed Master to the end. Every morning he went down to the mouth of the deep furnaces, looked at the hands of those coming out, and said nothing." },
    { char: "yunque", end: "A", flag: "end_yunque_A", es: "Yunque vive en el Vado con un brazo de piedra apoyado en un cabestrillo. Les cuenta a los chicos el nombre del primer forjador. Lo dice siempre en voz alta.", en: "Yunque lives at the Ford with a stone arm resting in a sling. He tells the kids the first smith's name. He always says it out loud." },
    { char: "yunque", end: "B", flag: "end_yunque_B", es: "Yunque terminó la Campana y se quedó quieto, sentado al pie de la tercera estatua. Ahora hay dos figuras en la base. La gente no sabe cuál es cuál.", en: "Yunque finished the Bell and went still, sitting at the foot of the third statue. Now there are two figures on the base. People don't know which is which." },
    { char: "yunque", end: "C", flag: "end_yunque_C", es: "Yunque siguió forjando con una mano. Cuando la otra se le puso gris también, se quedó en la boca de los hornos, enseñando a los jóvenes a golpear con cuidado.", en: "Yunque kept forging with one hand. When the other went grey too, he stayed at the furnace mouth, teaching the young ones to strike with care." },
    { char: "escoria", end: "A", flag: "end_escoria_A", es: "Escoria ya no mueve las manos. Las lleva levantadas, de piedra, en cada reunión del Gremio. Nadie se anima a votar contra los obreros delante de ella.", en: "Escoria can't move her hands anymore. She carries them raised, made of stone, to every Guild meeting. Nobody dares vote against the workers in front of her." },
    { char: "escoria", end: "B", flag: "end_escoria_B", es: "Escoria tiene las manos blandas otra vez, por la resina. Pero el Bosque se acuerda de por qué. Cuando pasa por la ladera, los leñadores no la saludan.", en: "Escoria's hands are soft again, thanks to the resin. But the Forest remembers why. When she passes the slope, the woodcutters don't greet her." },
    { char: "escoria", end: "C", flag: "end_escoria_C", es: "Escoria sigue gritando en la escalinata del Gremio. Ya no tiene voz, solo un silbido. Igual la escuchan. O hacen como que sí.", en: "Escoria still shouts on the Guild steps. She has no voice left, only a whistle. They listen anyway. Or they pretend to." },
    { char: "cobre", end: "A", flag: "end_cobre_A", es: "Cobre vive en la casa de las paredes desnudas con su madre. No compraron nada más. Los chicos del Barrio entran a jugar sin pedir permiso.", en: "Cobre lives in the house with bare walls, with his mother. They never bought anything again. The Quarter kids come in to play without asking." },
    { char: "cobre", end: "B", flag: "end_cobre_B", es: "La Casa de Cobre quebró. Cobre trabaja en los baños del Lago, cobrando la entrada. Cuando entra un obrero, mira para otro lado y no le cobra.", en: "The House of Cobre went bankrupt. Cobre works at the Lake baths, taking the entrance fee. When a worker comes in, he looks the other way and doesn't charge." },
    { char: "cobre", end: "C", flag: "end_cobre_C", es: "Cobre sigue comprando turnos de Campana, aunque la Campana ya no se toca. Tiene el tablero lleno de casilleros pagados. Dice que algún día van a valer.", en: "Cobre still buys Bell turns, though the Bell is no longer rung. His board is full of paid squares. He says one day they'll be worth something." },
    { char: "chispa", end: "A", flag: "end_chispa_A", es: "Chispa forja en frío, sin nada rojo, en una forja chica de la ladera sur. Sus clavos están torcidos. Los compran igual, porque duran.", en: "Chispa forges cold, with nothing red, at a small forge on the south slope. Her nails are crooked. People buy them anyway, because they last." },
    { char: "chispa", end: "B", flag: "end_chispa_B", es: "Chispa es la mejor forjadora de su generación. Tiene una mano gris entera y la otra a medias. Hace herramientas que nadie más sabe hacer.", en: "Chispa is the best smith of her generation. One hand is wholly grey and the other half. She makes tools nobody else can make." },
    { char: "chispa", end: "C", flag: "end_chispa_C", es: "Chispa dejó de forjar. Dice que no quiere aprender lo que le cuesta las manos. Vende pan con Candela. A veces mira los hornos desde lejos.", en: "Chispa stopped forging. She says she doesn't want to learn what costs you your hands. She sells bread with Candela. Sometimes she watches the furnaces from afar." },
    { char: "hacha", end: "A", flag: "end_hacha_A", es: "Hacha habla en el Concejo con el hacha apoyada en la silla. El Bosque planta tres por uno y sangra a la Madre de a poco. Los brotes del claro tienen ya su altura.", en: "Hacha speaks at the Council with her axe leaning on her chair. The Forest plants three for one and bleeds the Mother little by little. The saplings in the clearing are already as tall as she is." },
    { char: "hacha", end: "B", flag: "end_hacha_B", es: "Hacha ya no corta. No queda qué. Vende la leña de los tocones a la Corte, la misma que antes le peleaba. Las dos se tratan de usted.", en: "Hacha doesn't cut anymore. There's nothing left. She sells stump wood to the Court, the same Court she used to fight. They're very formal with each other." },
    { char: "hacha", end: "C", flag: "end_hacha_C", es: "Hacha sigue talando y plantando, tres por uno. Se le mueren dos de cada tres. Cuenta los que quedan como quien cuenta hijos.", en: "Hacha keeps cutting and planting, three for one. Two of every three die. She counts the survivors the way you count children." },
    { char: "hulla", end: "A", flag: "end_hulla_A", es: "Hulla va por la Hondonada sin velo. Los chicos de la Corte la imitan. Tose todas las noches, pero dice que ahora por lo menos tose con la cara al aire.", en: "Hulla goes about the Hollow without a veil. The Court kids copy her. She coughs every night, but she says at least now she coughs with her face to the air." },
    { char: "hulla", end: "B", flag: "end_hulla_B", es: "Hulla vende carbón por otra puerta de atrás. Siempre hay otra. Las Casas lo saben y lo compran igual, más barato.", en: "Hulla sells charcoal through another back door. There's always another. The Houses know and buy it anyway, cheaper." },
    { char: "hulla", end: "C", flag: "end_hulla_C", es: "Hulla sigue cubriendo el carbón con lonas para que no se vea desde arriba. Su sobrino trabaja en el horno de al lado. Tose igual que ella.", en: "Hulla still covers the charcoal with tarps so it can't be seen from above. Her nephew works at the next kiln. He coughs just like her." },
    { char: "ebano", end: "A", flag: "end_ebano_A", es: "Ébano dejó el archivo de la Corte. Ahora recorre los pueblos con una caja de copias. Deja una en cada pared que encuentra.", en: "Ébano left the Court archive. Now he travels the villages with a box of copies. He leaves one on every wall he finds." },
    { char: "ebano", end: "B", flag: "end_ebano_B", es: "Ébano guarda la lista bajo llave. Envejeció esperando el momento justo para mostrarla. Todavía espera.", en: "Ébano keeps the list under lock and key. He grew old waiting for the right moment to show it. He's still waiting." },
    { char: "ebano", end: "C", flag: "end_ebano_C", es: "Ébano sigue en el archivo, ordenando papeles viejos. A veces encuentra otro nombre tachado. Ya no se sorprende.", en: "Ébano is still in the archive, sorting old papers. Sometimes he finds another crossed-out name. It no longer surprises him." },
    { char: "merma", end: "A", flag: "end_merma_A", es: "La Reina Merma compra noches solo para las tierras vacías del norte. La Corte es más pobre. En el Barrio ya no escupen al pasar frente al Trono. Casi nunca.", en: "Queen Merma buys nights only for the empty northern lands. The Court is poorer. In the Quarter they no longer spit when they pass the Throne. Hardly ever." },
    { char: "merma", end: "B", flag: "end_merma_B", es: "Merma dejó de ser Reina después de que se supo todo. Vive en una casa chica de la Hondonada. Lleva las cuentas del Concejo del Bosque, que no sabe sumar.", en: "Merma stopped being Queen once everything came out. She lives in a small house in the Hollow. She keeps the books for the Forest Council, which can't add." },
    { char: "merma", end: "C", flag: "end_merma_C", es: "Merma sigue firmando papeles en el Trono, con la puerta abierta. Las monedas de la familia del Barrio siguen en el suelo. Las pisa todas las mañanas.", en: "Merma still signs papers on the Throne, with the door open. The Quarter family's coins are still on the floor. She steps on them every morning." },
    { char: "salitre", end: "A", flag: "end_salitre_A", es: "Salitre maneja las válvulas del Lago con una llave colgada del cuello. El agua dejó de bajar. Su cuaderno tiene más palabras que números.", en: "Salitre runs the Lake valves with a key round her neck. The water stopped dropping. Her notebook has more words than numbers." },
    { char: "salitre", end: "B", flag: "end_salitre_B", es: "Salitre tiene un cofre lleno de monedas y una orilla seca. Cobra cada semana. Anota la vergüenza en la última hoja, en una sola palabra.", en: "Salitre has a chest full of coins and a dry shore. She collects every week. She writes the shame on the last page, in a single word." },
    { char: "salitre", end: "C", flag: "end_salitre_C", es: "Salitre sigue juntando pescado cocido en la orilla sur. Lo lleva al Barrio. Huele a metal. Comen igual.", en: "Salitre still gathers cooked fish on the south shore. She takes it to the Quarter. It smells of metal. They eat it anyway." },
    { char: "galena", end: "A", flag: "end_galena_A", es: "Galena es la Primera Picadora de la Hondura. Ningún túnel caliente se abre sin que lo vote toda la Hondura. Lee una pared en voz alta cada noche.", en: "Galena is the First Pick of the Hondura. No hot tunnel opens unless the whole Hondura votes on it. She reads a wall out loud every night." },
    { char: "galena", end: "B", flag: "end_galena_B", es: "Galena selló todo lo que encontró. Dice que la Hondura sabe guardar, y que guardar también es cuidar. Sus nietos no saben qué hay detrás de las paredes.", en: "Galena sealed everything she found. She says the Hondura knows how to keep things, and keeping is caring too. Her grandchildren don't know what lies behind the walls." },
    { char: "galena", end: "C", flag: "end_galena_C", es: "Galena sigue picando en los túneles calientes. Golpea dos veces antes de empezar cada turno. A veces le contestan.", en: "Galena still digs in the hot tunnels. She knocks twice before every shift. Sometimes something answers." },
    { char: "peaje", end: "A", flag: "end_peaje_A", es: "Peaje lleva sal, lana y versos por los pasos. Nada que queme. Los Altos ganan menos. La nieve volvió a ser blanca en el camino del norte.", en: "Peaje carries salt, wool and verses over the passes. Nothing that burns. The Heights earn less. The snow on the north road is white again." },
    { char: "peaje", end: "B", flag: "end_peaje_B", es: "Peaje cobra una moneda por lingote y la manda al Cráter cada luna. Lleva quince años haciéndolo. Tiene las palmas quemadas de agarrar lonas calientes.", en: "Peaje charges one coin per ingot and sends it to the Crater every moon. He's done it for fifteen years. His palms are burnt from gripping hot tarps." },
    { char: "peaje", end: "C", flag: "end_peaje_C", es: "Peaje sigue guiando carretas calientes por el paso. Dos pueblos de la ladera ya no existen. Él los saluda igual cuando pasa.", en: "Peaje still leads hot carts over the pass. Two villages on the slope no longer exist. He greets them anyway as he goes by." },
    { char: "tempano", end: "A", flag: "end_tempano_A", es: "El hielo del Fondo dejó de gotear en las salas altas. Témpano vive ahí, con un brasero que no prende nunca. Dice que es para que el fuego sepa que no lo necesitan.", en: "The Deep's ice stopped dripping in the upper halls. Témpano lives there, with a brazier she never lights. She says it's so the fire knows it isn't needed." },
    { char: "tempano", end: "B", flag: "end_tempano_B", es: "El Fondo Blanco vive en las cuevas de la cumbre. Abajo queda un lago tibio donde antes había hielo eterno. Témpano baja una vez por año a mirarlo.", en: "The White Deep lives in the summit caves now. Below there's a warm lake where there used to be everlasting ice. Témpano goes down once a year to look at it." },
    { char: "tempano", end: "C", flag: "end_tempano_C", es: "Témpano sigue poniendo baldes debajo de las goteras. Cada año, más baldes. Los cuenta. Dice que es lo único que el Fondo tiene para contar.", en: "Témpano still sets buckets under the leaks. Every year, more buckets. She counts them. She says it's all the Deep has left to count." },
  ];

  /* ---------- Frases de carga: rumores vagos de lo que pasa en el mundo ---------- */
  // layer: capa mínima para que salga. Nunca dicen la causa; solo lo que se ve o se oye.
  const LORE_LOADING = [
    { layer: 1, es: "Dicen que esta semana se han encendido cien faroles nuevos en el Prado.", en: "They say a hundred new lanterns were lit in the Meadow this week." },
    { layer: 1, es: "En el tablón del Vado hay un decreto nuevo. Nadie se para a leerlo entero.", en: "There's a new decree on the Ford's noticeboard. Nobody stops to read all of it." },
    { layer: 1, es: "Un juglar de los Altos canta en la plaza una canción sobre agua podrida. Se vende bien.", en: "A minstrel from the Heights sings about rotten water in the square. It sells well." },
    { layer: 1, es: "Anoche alguien vio una barca vacía bajando por el Arroyo seco.", en: "Last night someone saw an empty boat drifting down the dry Stream." },
    { layer: 1, es: "Las forjas del Cráter ya no se apagan ni de noche.", en: "The Crater's forges no longer go out, not even at night." },
    { layer: 1, es: "En el Bosque Hondo han plantado espinos en hilera. Crecen muy deprisa.", en: "Thorns have been planted in a row in the Deep Wood. They grow very fast." },
    { layer: 1, es: "Una niña de Luz asegura que la luz de su farol huele a tierra mojada.", en: "A Light girl swears her lantern's light smells of wet earth." },
    { layer: 1, es: "Se busca: criaturas para escoltar carros de aceite hacia el Prado. Buena paga.", en: "Wanted: creatures to escort oil carts to the Meadow. Good pay." },
    { layer: 2, es: "En el Barrio Apagado falta gente. Sus vecinos dicen que «trabajan de noche».", en: "People are missing in the Dark Quarter. Their neighbours say they \"work nights\"." },
    { layer: 2, es: "Han visto sombras con polvo dorado en las manos comprando pan al amanecer.", en: "Shadows with golden dust on their hands were seen buying bread at dawn." },
    { layer: 2, es: "El Concejo del Musgo ha cancelado el Largo Silencio de este otoño. Nadie dice por qué.", en: "The Moss Council has cancelled this autumn's Long Silence. Nobody says why." },
    { layer: 2, es: "Una enfriadora del Cráter ha dejado de escribir a su familia.", en: "A cooler from the Crater has stopped writing to her family." },
    { layer: 2, es: "Las Mareas celebraron la Gran Bajada alrededor de un charco. Leyeron poco.", en: "The Tides held the Great Ebb around a puddle. They didn't read much." },
    { layer: 2, es: "La Casa Albor ha comprado cuarenta casas en la ladera sur del Cráter.", en: "House Albor has bought forty houses on the Crater's southern slope." },
    { layer: 2, es: "Un viejo minero repite que en las Cuevas del Eco todavía se oye cantar.", en: "An old miner keeps saying you can still hear singing in the Echo Caves." },
    { layer: 2, es: "Los guardas del Farol ya no dejan cruzar hacia el Envés después del ocaso.", en: "The Lantern wardens no longer let anyone cross into the Underside after dusk." },
    { layer: 3, es: "En los Altos discuten si aquella tormenta llegó a caer. Nadie recuerda haberse mojado.", en: "In the Heights they argue whether that storm ever broke. Nobody remembers getting wet." },
    { layer: 3, es: "Varios robles del Bosque Hondo siguen verdes por fuera y huecos por dentro.", en: "Several oaks in the Deep Wood are still green outside and hollow inside." },
    { layer: 3, es: "El Rey Lóbrego no ha salido de su tienda en tres días.", en: "King Lóbrego hasn't left his tent in three days." },
    { layer: 3, es: "Una sacerdotisa de las Mareas ha prohibido a su nieta mirar el agua en público.", en: "A priestess of the Tides has forbidden her granddaughter to read the water in public." },
    { layer: 3, es: "Desde el Fondo Blanco llegan rumores de una tumba que gotea.", en: "Rumours rise from the White Deep of a tomb that drips." },
    { layer: 3, es: "Los nuevos del Fondo Blanco cuentan sus sueños en voz alta cada mañana. A los del Vado les da escalofríos.", en: "The newcomers from the White Deep tell their dreams aloud every morning. It gives the Ford folk the shivers." },
    { layer: 3, es: "Alguien ha dejado un ramo de flores secas en la entrada de las Cuevas. Lleva el nombre de Grava.", en: "Someone left a bunch of dried flowers at the Caves' entrance. It bears Grava's name." },
    { layer: 3, es: "La verja de las afueras del Prado tiene ahora el doble de guardas.", en: "The gate on the Meadow's outskirts now has twice the wardens." },
    { layer: 4, es: "Los soñadores del Fondo Blanco dicen que el rey ha dejado de hablarles. La Regente dice que no.", en: "The White Deep's dreamers say the king has stopped speaking to them. The Regent says otherwise." },
    { layer: 4, es: "Una curandera vende remedios de noche en el Vado. Los guardas miran hacia otro lado.", en: "A healer sells remedies at night in the Ford. The wardens look the other way." },
    { layer: 4, es: "Un farol del Prado se ha apagado solo, al mediodía. Nadie sabe cómo volver a encenderlo.", en: "A lantern in the Meadow went out on its own, at noon. Nobody knows how to relight it." },
    { layer: 4, es: "En el Barrio Apagado, dos nanas distintas se cantan ya con la misma voz.", en: "In the Dark Quarter, two different lullabies are now sung in a single voice." },
    { layer: 4, es: "Bajo el Corazón del Claro algo late más despacio que antes.", en: "Beneath the Heart of the Glade, something beats slower than before." },
    { layer: 4, es: "Coplo ha cambiado la letra de su balada. Ahora casi nadie le paga por ella.", en: "Coplo changed the words of his ballad. Now hardly anyone pays for it." },
  ];

  function loadingLine(P, lang, rnd) {
    const L = loreLayer(P && P.cleared);
    const pool = LORE_LOADING.filter((x) => x.layer <= L);
    const r = (rnd || Math.random)();
    const pick = pool[Math.floor(r * pool.length)];
    return pick ? pick[lang === "en" ? "en" : "es"] : "";
  }

  const api = { loreLayer, needOk, eraOf, layerOf, LORE_EVENTS, LORE_EVT, LORE_ESCRITOS, LORE_HILOS, LORE_EPILOGOS, LORE_LOADING, loadingLine };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.EvoLore = api;
})(typeof window !== "undefined" ? window : this);
