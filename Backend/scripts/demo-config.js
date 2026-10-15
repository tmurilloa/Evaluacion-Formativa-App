// =========================================================================
// ESCENARIO DE LA DEMO
//
// Este es el UNICO archivo que hay que editar para cambiar la demo.
// Despues de guardarlo:   npm run seed:demo
//
// OJO: seed:demo BORRA todas las evaluaciones, docentes, padron y planes
// de mejoramiento, y los vuelve a crear desde este archivo.
// =========================================================================

// Misma semilla = mismos datos en cada corrida. Cambiala si quieres otra
// variacion aleatoria del mismo escenario.
export const SEMILLA = 2026

// Categorias del instrumento. Deben escribirse EXACTAMENTE asi:
//   'Carácter docente'
//   'Competencias pedagógicas'
//   'Dominio disciplinar'
//   'Contexto'
//   'Producción de conocimiento pedagógico'

// --- Directivos ------------------------------------------------------------
// Pon aqui TU cuenta de directivo. El padron se reconstruye desde este
// archivo: quien no este aqui ni en DOCENTES entra como estudiante.
export const DIRECTIVOS = [
    { email: 'demo.directivo1+clerk_test@unal.edu.co', name: 'Directivo Demo' }
]

// --- Docentes --------------------------------------------------------------
// Los correos deben coincidir EXACTAMENTE con las cuentas creadas en Clerk.
//
//   matriculados    estudiantes del curso (define el % de cobertura)
//   evaluaciones    cuantos estudiantes lo evaluaron (0 = ninguno)
//   estudiantes     promedio que le dan los estudiantes. Dos formas:
//                     4.2                      -> igual en todas las categorias
//                     { 'Contexto': 3.1, ... } -> un valor por categoria
//                                                 (hay que poner las cinco)
//   autoevaluacion  igual que 'estudiantes'; null = no se autoevaluo
//   comentarios     (opcional) respuestas abiertas de sus estudiantes;
//                   si no se ponen, se usan las RESPUESTAS_GENERALES
export const DOCENTES = [
    {
    // BUENO. Fuerte en su disciplina, flojo en conectar con el contexto.
        email: 'demo.docente1+clerk_test@unal.edu.co',
        name: 'Ana Restrepo',
        subject: 'Cálculo I',
        matriculados: 25,
        evaluaciones: 8,
        estudiantes: {
            'Carácter docente': 4.7,
            'Competencias pedagógicas': 4.5,
            'Dominio disciplinar': 4.8,
            'Contexto': 3.9,
            'Producción de conocimiento pedagógico': 4.2
            },
    autoevaluacion: 4.3,
    comentarios: [
        'Explica muy bien y responde las dudas con paciencia.',
        'Domina el tema y los ejemplos son muy claros.',
        'Podria relacionar mas los temas con casos reales.'
    ]
    },
    {
    // CRITICO + PUNTO CIEGO. Se autoevalua en 4.5; sus estudiantes le dan ~2.6.
    email: 'demo.docente2+clerk_test@unal.edu.co',
    name: 'Carlos Muñoz',
    subject: 'Física II',
    matriculados: 20,
    evaluaciones: 7,
    estudiantes: {
        'Carácter docente': 3.0,
        'Competencias pedagógicas': 2.2,
        'Dominio disciplinar': 3.4,
        'Contexto': 2.5,
        'Producción de conocimiento pedagógico': 2.6
    },
    autoevaluacion: 4.5,
    comentarios: [
        'Va muy rapido y no explica bien los ejercicios.',
        'No responde las dudas en clase.',
        'Deberia dar mas tiempo para las entregas.',
        'Los criterios de evaluacion no son claros.'
    ]
    },
    {
    // MUESTRA INSUFICIENTE. 6 evaluaciones superan el piso de 5,
    // pero sobre 40 matriculados son el 15%.
    email: 'demo.docente3+clerk_test@unal.edu.co',
    name: 'Luisa Cardona',
    subject: 'Programación',
    matriculados: 40,
    evaluaciones: 6,
    estudiantes: 3.6,
    autoevaluacion: null
    },
    {
    // SIN DATOS. Solo se autoevaluo.
    email: 'demo.docente4+clerk_test@unal.edu.co',
    name: 'Jorge Betancur',
    subject: 'Bases de Datos',
    matriculados: 15,
    evaluaciones: 0,
    estudiantes: null,
    autoevaluacion: 4.0
    }
]

// --- Retroalimentacion de la direccion -------------------------------------
//   tipo: 'individual' (un solo docente) o 'colectiva' (dos o mas)
//   docentes: correos, tal como estan en DOCENTES
export const RETROALIMENTACIONES = [
    {
        tipo: 'individual',
        docentes: ['demo.docente2+clerk_test@unal.edu.co'],
        period: '2026-1',
        comments: 'Hay una diferencia importante entre su autoevaluación y la percepción de sus estudiantes, sobre todo en competencias pedagógicas.',
        goal: 'Reducir la brecha en competencias pedagógicas a menos de 0.5 puntos',
        actions: 'Asistir al taller de estrategias didácticas y acordar un acompañamiento de aula',
        indicators: 'Promedio estudiantil de la categoría en la siguiente evaluación',
        deadline: '2026-11-30'
    },
    {
    tipo: 'colectiva',
    docentes: ['demo.docente1+clerk_test@unal.edu.co', 'demo.docente2+clerk_test@unal.edu.co', 'demo.docente3+clerk_test@unal.edu.co'],
    period: '2026-1',
    comments: 'Contexto es la categoría con el puntaje institucional más bajo.',
    goal: 'Incorporar casos del contexto regional en cada curso',
    actions: 'Diseñar al menos una actividad por corte ligada a un problema local',
    indicators: 'Promedio institucional de la categoría Contexto',
    deadline: '2026-12-15'
    }
]

// --- Respuestas abiertas por defecto ----------------------------------------
// Palabras repetidas a proposito para que los terminos frecuentes y las
// expresiones (bigramas) tengan algo que mostrar.
export const RESPUESTAS_GENERALES = [
    'Explica bien los temas y responde las dudas.',
    'El material del curso es claro y los ejemplos ayudan.',
    'Deberia dar mas tiempo para las entregas.',
    'Mas ejercicios practicos durante la clase.',
    'Va un poco rapido en algunos temas.'
]