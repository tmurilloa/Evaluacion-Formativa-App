// =========================================================================
// PARAMETROS DE INTERPRETACION DEL INSTRUMENTO

// --- Cobertura (representatividad de la muestra) -------------------------

// Piso absoluto de evaluaciones para que el promedio sea interpretable.
// Justificacion: con menos de 5 respuestas una sola evaluacion mueve el
// promedio mas de 0.2 puntos, y el anonimato se debilita (en un grupo
// pequeno es posible inferir quien dijo que).
export const COBERTURA_MINIMA_ABSOLUTA = 5

// Proporcion minima de matriculados que deben responder. Se aplica solo si
// el docente tiene registrado su numero de matriculados; si no, rige el
// piso absoluto. 0.30 es un criterio conservador de uso comun.
export const COBERTURA_MINIMA_PORCENTAJE = 0.30

// --- Semaforo de desempeno ----------------------------------------------

// Cortes sobre la escala 1-5 de percepcion estudiantil.
// CALIBRAR contra la distribucion real: si el promedio institucional supera
// 4.2, casi todos saldran "Bueno" y el semaforo pierde poder de
// discriminacion; en ese caso subir ambos cortes (p. ej. 4.3 / 3.7).
export const UMBRAL_BUENO = 4.0
export const UMBRAL_CRITICO = 3.0

// --- Brecha autoevaluacion vs. percepcion estudiantil --------------------

// CONVENCION UNICA EN TODA LA APP:
//     brecha = promedio estudiantes - promedio autoevaluacion
// Negativa => el docente se califica mas alto que sus estudiantes.
// 0.5 es el 10% del rango de la escala; por debajo de eso la diferencia no se distingue del ruido de muestreo.
export const BRECHA_RELEVANTE = 0.5

// --- Presentacion de respuestas abiertas ---------------------------------

// Respuestas mostradas en pantalla por pregunta. El resto sigue disponible
// en la exportacion CSV.
export const RESPUESTAS_VISIBLES = 10

// --- Analisis de texto ---------------------------------------------------

export const TERMINOS_TOP_N = 8
export const TERMINO_LONGITUD_MINIMA = 4
export const BIGRAMAS_TOP_N = 5
export const BIGRAMA_FRECUENCIA_MINIMA = 2