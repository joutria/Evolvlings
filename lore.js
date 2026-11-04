/* Evolvlings — lore data (eventos con diálogo, Escritos y frases de carga)
 * Fuente: biblia del mundo, pestaña "Cómo se revela" (https://claude.ai/artifact/42UGYufJJ1iCzo5DzZGCzH)
 *
 * Pensado para encajar con rpg.js:
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

  function needOk(need, P) {
    if (!need) return true;
    const flags = (P && P.flags) || {};
    if (need.layer && loreLayer(P && P.cleared) < need.layer) return false;
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
            "Marejada moja los dedos y toca la frente de tus criaturas. «Que el agua os esconda.» Orilla baja la mirada.",
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
  // from: "event" | "chest" | "shop" | "guardian" · zone: dónde sale en cofres · unlock: condición extra
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
      es: { title: "Lista en la pared de la Sala", text: "Voces apagadas: el abuelo Pizarra. La niña que cantaba en Agua. Un peregrino de Luz cuyo verso hablaba de una luz prestada. Dos hermanos del Trueno. Cada día escribo menos nombres. O quedan menos, o recuerdo menos." },
      en: { title: "List on the wall of the Hall", text: "Voices gone silent: grandfather Slate. The girl who sang in Water. A Light pilgrim whose verse spoke of borrowed light. Two Thunder brothers. Each day I write fewer names. Either fewer remain, or I remember fewer." } },
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

  const api = { loreLayer, needOk, LORE_EVENTS, LORE_EVT, LORE_ESCRITOS, LORE_HILOS, LORE_EPILOGOS, LORE_LOADING, loadingLine };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.EvoLore = api;
})(typeof window !== "undefined" ? window : this);
