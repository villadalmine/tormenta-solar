// dialogos.js — pools de diálogo (modo A: pre-generación con OpenRouter).
//
// ESTO ES UN EJEMPLO ESCRITO A MANO para que se vea la pinta de lo que generaría la IA.
// Regeneralo (sobrescribe este archivo) con:   node tools/gen-dialogos.mjs
// Es solo DATA. Para usarlo en el juego habría que enchufarlo en level.js/game.js
// (que lean de Dialogos.<clave> en vez de sus pools propios) — eso es un paso aparte.
const Dialogos = {
  // borrachín del VINO (quiere un sándwich de FIAMBRE): te tira algo random + frase
  borracho_vino: [
    'Te escupe un poco de tinto sin querer. “Este edificio era un banco, ¿sabés? Ahora el banco soy yo.” 🍷',
    'Te encaja un corcho en la mano. “¿Vos tenés cara de andar con un fiambrecito encima? Dale, no seas rata.”',
    'Te tira un diario de hace tres semanas. “Leé las malas noticias... o mejor traeme algo pa\' comer.” 📰',
    'Te alcanza media empanada fría. “Tomá, convidá... che, ¿un sanguche no tenés?”',
    'Eructa fuerte y te apunta con el dedo. “Vos sos de los buenos, se nota. Los buenos traen fiambre.”',
    'Te ofrece la última gota de la caja. “Salú, hermano. La vida es esto: un vinito y un pancito con jamón.”',
  ],
  // borrachín de la CERVEZA (quiere una DIOSA TROPICAL)
  borracho_cerveza: [
    'Te encaja un posavasos empapado. “¿Vos tomaste alguna vez una Diosa Tropical? Es poesía, pibe.” 🍺',
    'Te tira una tapita que rebota. “Nosotros cuidamos la entrada de ese edificio. Hay que ganarse el pase.”',
    'Te alcanza una lata aplastada. “Convidá algo dulce, no seas amarrete con los muchachos.”',
    'Hace la croqueta y casi se cae. “Una birra está buena... pero una Diosa, una Diosa te cambia el día.” 🍹',
    'Te muestra la lengua manchada de fernet. “Mezclo todo, pibe. Pero lo dulce es lo dulce.”',
  ],
  // borrachín del PORRO (con bajón, quiere un cacho de CARNE)
  borracho_porro: [
    'Te pasa el humo en la cara. “Uh, qué bajón, hermano... ¿no tenés un cachito de carne por ahí?” 🌬️',
    'Te encaja un papelito doblado. “Si los tres quedamos contentos, te abrimos el edificio, ¿me entendés o no?”',
    'Te alcanza una galletita pisada. “Antes esto era un banco. Ahora soy yo el banco. De nada.” 🏦',
    'Se queda mirando una baldosa diez segundos. “...¿qué me ibas a decir? Ah. Carne. Traé carne.”',
    'Tose y se ríe solo. “La munchies, viste. Un asadito y soy el hombre más feliz de Lavalle.” 🥩',
  ],
  // linyeras tirados (pisos pares en ruina)
  linyera_ruina: [
    '“...andá pasando, pibe... acá no hay nada... nada de nada...” 💀',
    '“¿Un puchito tenés? ...dejá, dejá, ya fue, ni te gastes.” 🚬',
    '“La tele esa anda, eh. Si la mirás de costado y entrecerrás los ojos.” 📺',
    '“No uses ese baño, hace una semana que chorrea solo. Es como una fuente, pero triste.” 🚽',
    '“Yo dormía en un piso de lujo... me corrieron... ahora vivo acá nomás, contra la humedad.”',
    '“Pasá tranqui, total acá ya no queda nada que romper, ni yo.” 🧱',
  ],
  // linyeras ex-millonarios que lloran su historia y te muestran la plata (loop)
  linyera_llanto: [
    '“Yo tenía TRES deptos en Puerto Madero... tres. (se quiebra) Agarrá del inodoro, total ya no me sirve...” 😭',
    '“Era gerente, traje, reuniones... un vacío de mierda. (llora) Hay guita en la caja fuerte, llevate.” 💼',
    '“Un cero kilómetro por cada día de la semana tenía. ¿Y para qué, pibe? (moquea) Sacá monedas, dale.” 🚗',
    '“Facturaba en dólares, ¿sabés? Dólares. Y mirame ahora. (suspira) Tomá, a mí ya no me hacen falta.”',
    '“Renuncié a todo y ¿sabés qué? Duermo mejor. (se le caen las lágrimas igual) Llevate lo que quieras.”',
  ],
  // la cola de la Casa de Cambio
  cola_dolar: [
    '“Saqué número a las cinco de la mañana, ¿eh? No me vengan a correr.” 🎫',
    '“¿Cómo que cerró la caja? ¡Si recién abrió, la pucha digo!” 😤',
    '“En mis tiempos esto se hacía en la vereda y más rápido, che.” 👴',
    '“Pedí el día en el laburo para ESTO. Para esto, hermano.” 💼',
    '“¿Vos también venís por los verdes? Bienvenido al quilombo nacional.”',
    '“Aguantá, nene, ya casi... no, mentira, falta un montón.” 👨‍👦',
  ],
  // gente esperando adentro de las cuevas del dólar
  cueva_gente: [
    '“Todo legal, ¿eh? Es para mi hijo, para cuando sea grande.” 👶',
    '“Si no ahorro en dólares, este país se va a la mierda, te lo firmo.” 🇦🇷',
    '“Yo en el peso no creo ni muerto. Verde abajo del colchón.” 💵',
    '“Vengo todos los meses, es mi cajita de ahorro. No le digas a nadie.” 🤫',
    '“Esto es un acto de fe, pibe. Patria o dólar, no hay otra.”',
    '“Mi viejo guardaba australes. Australes. ¿Entendés por qué desconfío?” 😩',
  ],
  // cueveros rechazando (cuevas 1 y 2)
  cuevero_rebote: [
    '“Uh, venís cargado de monedas... eso te marca, pibe. Andá a otro lado.”',
    '“Tenés cara de garca, no te ofendas. Pero acá no te cambio nada.”',
    '“Hoy no opero con caras nuevas. Volvé con una recomendación.”',
    '“¿Sos de la AFIP? Tenés una pinta... rajá, rajá.”',
  ],
  // Iorio en Cemento
  iorio: [
    '“¿Qué hacés, tragaleche? Traeme falopa y te toco Pibe Tigre, dale.” 🤘',
    '“Sin merca no hay recital, pibe. Así es la cosa, no la inventé yo.”',
    '“...la puta que te parió, dios sol. ¡Tano Marcello, agarrá la criolla que hacemos tango!” 🎻',
  ],
};
