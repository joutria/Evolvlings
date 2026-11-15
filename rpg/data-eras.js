/* Evolvlings: the ten eras of the Glade (plan: https://claude.ai/artifact/RFy6uGdhz9DJeW7e9ZfdkE).
   Each era is one turn of the lullaby cycle (thirst, waking, lullaby, price, forgetting). The Glade lives in one era
   at a time (EV.P.era, 1 = the Black Sap, the story the game had first). rpg/ui-eras.js moves it along; the events of
   each era say which one they belong to with need.era (lore.js needOk).
     ready    the era has content in the game (later eras are listed in the Chronicle as still to come)
     es / en  name, sub (one line under the name), intro (lines shown when it begins), soon (while not ready)
     ends     how the era can close: the flag the final choice sets, and its title and text for the Chronicle
     zones    texts of the zone that change in this era (desc, bossD, win, winText, verse), Spanish and English
     peoples  [flag, people] the peoples you can bring together in this era (all of them open the best ending)
     unite    flag set when every people of `peoples` is with you (the final conversation asks for it)
   An era begins once the one before it has closed: era 2 right after the Heart's guardian is beaten in era 1 (it is
   that victory's bill), the later ones when you retire your creature to the Hall of Fame after the era's final
   choice (its heir is born in the new era), or with "Let the years pass" in the Book's Chronicle. */
"use strict";
(function (root) {
  const ERAS = [
    { n: 1, ready: true,
      es: { name: "La Savia Negra", sub: "La luz de los Pozos despierta a la Raíz" },
      en: { name: "The Black Sap", sub: "The light of the Wells wakes the Root" },
      ends: [{ key: "calma", flag: null,
        es: { t: "La Calma", d: "Cantaste los ocho versos y la Raíz se durmió. La savia dejó de subir. Nadie preguntó si se había curado o solo dormido." },
        en: { t: "The Calm", d: "You sang the eight verses and the Root fell asleep. The sap stopped rising. Nobody asked whether it was cured or only sleeping." } }] },
    { n: 2, ready: true,
      es: { name: "La Calma", sub: "Unas semanas después, todo va demasiado bien",
        intro: ["Pasan unas semanas. La savia no sube. El Prado florece como nunca y los faroles brillan más que antes, porque una Raíz dormida no se resiste a que le saquen luz.",
          "Las Siete Casas declaran curado el Envés y firman la Ley del Regreso: los desplazados deben volver a sus tierras antes del invierno.",
          "En el Vado, Unísona no canta. Se queda mirando hacia el Corazón, como quien espera una noticia.",
          "Los guardianes de cada zona vuelven a estar inquietos. Cada pueblo te va a necesitar otra vez, y esta vez lo que decidas cambiará el Claro que encuentre la siguiente generación."] },
      en: { name: "The Calm", sub: "A few weeks later, everything is going too well",
        intro: ["A few weeks go by. The sap doesn't rise. The Meadow blooms as never before and the lanterns shine brighter than ever, because a sleeping Root doesn't resist having its light drawn.",
          "The Seven Houses declare the Underside cured and sign the Law of Return: the displaced must go back to their lands before winter.",
          "In the Ford, Unísona doesn't sing. It keeps looking towards the Heart, like someone waiting for news.",
          "The guardians of every zone are restless again. Every people will need you once more, and this time what you decide will change the Glade the next generation finds."] },
      peoples: [["u2_barrio", "barrio"], ["u2_luz", "luz"], ["u2_fuego", "fuego"], ["u2_planta", "planta"], ["u2_altos", "altos"], ["u2_sombra", "sombra"], ["u2_agua", "agua"], ["u2_piedra", "piedra"], ["u2_escarcha", "escarcha"]],
      unite: "e2_nueve",
      ends: [
        { key: "quinta", flag: "m2_quinta",
          es: { t: "La Quinta Estatua", d: "Cantaste más fuerte que nadie y te quedaste en el Corazón. La Raíz duerme otra generación; en el Vado hay una estatua nueva que todavía canta. Los pozos siguen abiertos." },
          en: { t: "The Fifth Statue", d: "You sang louder than anyone and stayed in the Heart. The Root sleeps another generation; in the Ford there's a new statue that still sings. The wells are still open." } },
        { key: "linea", flag: "m2_linea",
          es: { t: "La Línea Cerrada", d: "Los nueve pueblos dijeron juntos la condición del pacto, con Unísona de testigo. La Raíz se quedó despierta y empezó a curarse. Se cerraron todos los pozos y el Prado se quedó a oscuras." },
          en: { t: "The Closed Line", d: "The nine peoples spoke the pact's condition together, with Unísona as witness. The Root stayed awake and began to heal. Every well was closed and the Meadow went dark." } },
        { key: "ligero", flag: "m2_ligero",
          es: { t: "El Sueño Ligero", d: "Cantaste con los pueblos que vinieron. La Raíz duerme a medias: donde vino su pueblo la tierra está quieta, y donde no vino nadie la savia sigue saliendo." },
          en: { t: "The Light Sleep", d: "You sang with the peoples who came. The Root half sleeps: where its people came the ground is still, and where nobody came the sap keeps coming out." } },
      ],
      zones: {
        es: {
          aurora: { desc: "El Prado florece fuera de estación y cada noche hay más faroles. La matriarca nueva promete luz para el Barrio Apagado. En las juntas de las plazas, algo oscuro sube despacio.",
            bossD: "El Farol Sin Fondo, que bebe de un pozo que nadie ve.", win: "¡El Farol Sin Fondo se apaga un momento!", winText: "El farol parpadea y se queda a oscuras. Bajo la plaza, algo sigue tragando. {name} vuelve a casa sin saber si ganó algo." },
          crater: { desc: "Las forjas no paran: la matriarca encargó tubos tres veces más largos y paga por adelantado. El Fuego tiene silla en el Consejo por primera vez.",
            bossD: "La Forja Despierta, más caliente que nunca.", win: "¡La Forja Despierta se enfría!", winText: "El horno baja a un rojo apagado. Detrás, en las paredes, siguen apoyados los tubos largos. {name} vuelve a casa oliendo a vidrio." },
          forest: { desc: "El Bosque da fruta como nunca, toda a la vez. El Seto se marchita a destiempo y nadie sabe por qué.",
            bossD: "El Seto Hambriento, con flores negras en las puntas.", win: "¡El Seto Hambriento suelta sus raíces!", winText: "Las espinas secas caen al suelo. Debajo, las raíces siguen bebiendo de algún sitio hondo. {name} vuelve a casa con fruta demasiado dulce." },
          hollow: { desc: "La Hondonada está limpia y no tiene niebla. Las familias que volvieron por la Ley del Regreso viven en casas que ya no hacen sombra.",
            bossD: "El Trono Vacío, sin una sombra que lo cubra.", win: "¡El Trono Vacío se queda quieto!", winText: "El trono deja de crujir. No hay niebla que se aquiete, porque no hay niebla. {name} vuelve a casa con frío." },
          lake: { desc: "El Lago Espejo ya no refleja nada. Las Mareas volvieron a un agua limpia que no les enseña ni el ayer ni el mañana.",
            bossD: "La Que Mira desde Abajo, que ya no ve.", win: "¡La Que Mira desde Abajo cierra los ojos!", winText: "Cierra unos ojos que ya no veían. El agua sigue gris. {name} vuelve a casa sin su reflejo." },
          caves: { desc: "Las Cuevas callan. En la Noche del Eco los muertos de la Hondura no responden. Alguien abrió túneles nuevos que no están en ningún mapa viejo.",
            bossD: "El silencio de las cuevas, con la forma de su guardiana.", win: "¡El silencio de las cuevas se sienta!", winText: "Algo con la forma de Grava se sienta en la oscuridad y no dice nada. {name} vuelve a casa oyendo sus propios pasos." },
          heights: { desc: "Sin los tratos del Coro, en los Altos no se come este invierno. Familias enteras bajan al Prado con las cometas plegadas.",
            bossD: "La Veleta Mayor, sin voces que robar.", win: "¡La Veleta Mayor deja de girar!", winText: "La veleta se para. El viento que baja de las cumbres lleva gente, no mensajes. {name} vuelve a casa con una pluma azul en el pelo." },
          deep: { desc: "Las setas de los remedios mueren con la Calma, y los curados recaen. En la sala del Turno, los soñadores oyen por fin al rey, y el rey tiene sed.",
            bossD: "La Madre Micelio, que ya no encuentra savia de la que vivir.", win: "¡La Madre Micelio se recoge!", winText: "La Madre Micelio se encoge sobre las setas grises. Debajo, alguien sigue cavando. {name} vuelve a casa con la garganta seca." },
          heart: { desc: "La tierra del Tocón se hundió con la Calma y asoman cuatro estatuas. Cuatro coros rivales acampan alrededor. Abajo, la Raíz no consigue volver a dormirse.",
            bossD: "La Raíz en Vela, que no ataca por dolor sino por insomnio.", win: "¡La Raíz en Vela cae... y se levanta!", winText: "La Raíz cae y vuelve a levantarse, despierta. Cada nana la enfurece más. Tila y Nim te esperan en el Corazón: hay que decidir algo. {name} vuelve a casa sin poder dormir." },
        },
        en: {
          aurora: { desc: "The Meadow blooms out of season and every night there are more lanterns. The new matriarch promises light for the Dark Quarter. In the cracks of the squares, something dark is slowly rising.",
            bossD: "The Bottomless Lantern, drinking from a well nobody sees.", win: "The Bottomless Lantern goes out for a moment!", winText: "The lantern flickers and goes dark. Beneath the square, something keeps swallowing. {name} heads home unsure it won anything." },
          crater: { desc: "The forges never stop: the matriarch ordered tubes three times longer and pays in advance. For the first time the Fire has a seat on the Council.",
            bossD: "The Wakeful Forge, hotter than ever.", win: "The Wakeful Forge cools!", winText: "The furnace drops to a dull red. Behind it, the long tubes still lean against the walls. {name} heads home smelling of glass." },
          forest: { desc: "The Wood gives fruit as never before, all at once. The Hedge withers out of season and nobody knows why.",
            bossD: "The Hungry Hedge, with black flowers at its tips.", win: "The Hungry Hedge lets go of its roots!", winText: "The dry thorns fall to the ground. Underneath, the roots keep drinking from somewhere deep. {name} heads home with fruit that's too sweet." },
          hollow: { desc: "The Hollow is clean and has no mist. The families who came back under the Law of Return live in houses that cast no shade.",
            bossD: "The Empty Throne, with no shadow to cover it.", win: "The Empty Throne goes still!", winText: "The throne stops creaking. There's no mist to settle, because there's no mist. {name} heads home cold." },
          lake: { desc: "The Mirror Lake no longer reflects anything. The Tides came back to clean water that shows them neither yesterday nor tomorrow.",
            bossD: "She Who Watches from Below, who no longer sees.", win: "She Who Watches from Below closes her eyes!", winText: "She closes eyes that no longer saw. The water stays grey. {name} heads home without its reflection." },
          caves: { desc: "The Caves are silent. On the Night of the Echo the Hondura's dead don't answer. Someone opened new tunnels that are on no old map.",
            bossD: "The silence of the caves, shaped like its guardian.", win: "The silence of the caves sits down!", winText: "Something shaped like Grava sits down in the dark and says nothing. {name} heads home hearing its own footsteps." },
          heights: { desc: "Without the Choir's dealings, nobody eats in the Heights this winter. Whole families come down to the Meadow with their kites folded.",
            bossD: "The Great Weathervane, with no voices to steal.", win: "The Great Weathervane stops turning!", winText: "The weathervane stops. The wind coming down from the peaks carries people, not messages. {name} heads home with a blue feather in its hair." },
          deep: { desc: "The remedy mushrooms die with the Calm, and the cured fall ill again. In the Watch hall, the dreamers finally hear the king, and the king is thirsty.",
            bossD: "Mother Mycelium, who can no longer find sap to live on.", win: "Mother Mycelium draws back!", winText: "Mother Mycelium curls up over the grey mushrooms. Below, someone keeps digging. {name} heads home with a dry throat." },
          heart: { desc: "The Stump's ground sank with the Calm and four statues show through. Four rival choirs camp around it. Below, the Root can't get back to sleep.",
            bossD: "The Wakeful Root, attacking not from pain but from sleeplessness.", win: "The Wakeful Root falls... and rises!", winText: "The Root falls and rises again, awake. Every lullaby angers it more. Tila and Nim are waiting for you at the Heart: something has to be decided. {name} heads home unable to sleep." },
        },
      } },
    { n: 3, es: { name: "El Lago que Recuerda", sub: "Una generación después, todos quieren probar quién tuvo la culpa" }, en: { name: "The Lake that Remembers", sub: "A generation later, everyone wants to prove who was to blame" } },
    { n: 4, es: { name: "Las Forjas Hondas", sub: "Una campana que duerme a la Raíz sin cantor" }, en: { name: "The Deep Forges", sub: "A bell that puts the Root to sleep without a singer" } },
    { n: 5, es: { name: "El Invierno Largo", sub: "El pueblo del frío se vuelve el granero del Claro" }, en: { name: "The Long Winter", sub: "The people of the cold become the Glade's granary" } },
    { n: 6, es: { name: "La Corte de los Nombres", sub: "Todos tienen algo que olvidar, y la Corte lo vende" }, en: { name: "The Court of Names", sub: "Everyone has something to forget, and the Court sells it" } },
    { n: 7, es: { name: "Los Vientos Vendidos", sub: "Una canción en el viento del fondo se queda en todas las cabezas" }, en: { name: "The Sold Winds", sub: "A song on the deep wind sticks in every head" } },
    { n: 8, es: { name: "La Vigilia", sub: "Despiertan a la Raíz a propósito, y la Raíz habla" }, en: { name: "The Vigil", sub: "They wake the Root on purpose, and the Root speaks" } },
    { n: 9, es: { name: "La Sala de los Ecos", sub: "La piedra recuerda todo lo que pasó en el Claro" }, en: { name: "The Hall of Echoes", sub: "The stone remembers everything that happened in the Glade" } },
    { n: 10, es: { name: "La Estatua sin Cara", sub: "Todo llega al Corazón" }, en: { name: "The Faceless Statue", sub: "Everything comes to the Heart" } },
  ];
  const PEOPLES = {
    es: { barrio: "El Barrio Apagado", luz: "Las Casas del Farol", fuego: "El Gremio de la Brasa", planta: "El Concejo del Musgo", altos: "Los Altos", sombra: "La Corte Velada", agua: "Las Mareas Errantes", piedra: "La Hondura", escarcha: "El Fondo Blanco" },
    en: { barrio: "The Dark Quarter", luz: "The Lantern Houses", fuego: "The Ember Guild", planta: "The Moss Council", altos: "The Heights", sombra: "The Veiled Court", agua: "The Wandering Tides", piedra: "The Hondura", escarcha: "The White Deep" },
  };
  root.EVERAS = { ERAS, PEOPLES, era: (n) => ERAS.find((e) => e.n === n) || null };
})(typeof window !== "undefined" ? window : globalThis);
