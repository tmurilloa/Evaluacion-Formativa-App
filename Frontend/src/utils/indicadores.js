import {
    COBERTURA_MINIMA_ABSOLUTA,
    COBERTURA_MINIMA_PORCENTAJE,
    UMBRAL_BUENO,
    UMBRAL_CRITICO
} from '../config/umbrales.js'

// Cobertura de un docente: cuantos respondieron frente a cuantos debian.
// Si no hay matriculados registrados, rige solo el minimo absoluto.
export function evaluarCobertura(teacher) {
    const recibidas = teacher.studentEvaluationCount || 0
    const matriculados = teacher.enrolledStudents || 0

    if (matriculados > 0) {
    const porcentaje = recibidas / matriculados
    return {
        recibidas,
        matriculados,
        porcentaje,
      // Ambas condiciones: el porcentaje NO puede saltarse el piso absoluto.
        suficiente: porcentaje >= COBERTURA_MINIMA_PORCENTAJE &&
                    recibidas >= COBERTURA_MINIMA_ABSOLUTA,
      etiqueta: `${recibidas}/${matriculados} · ${Math.round(porcentaje * 100)}%`
    }
    }

    return {
    recibidas,
    matriculados: 0,
    porcentaje: null,
    suficiente: recibidas >= COBERTURA_MINIMA_ABSOLUTA,
    etiqueta: String(recibidas)
    }
}

// Estado del docente. La cobertura manda: sin muestra suficiente no se
// emite juicio de desempeno.
export function estadoDocente(teacher) {
    const cobertura = evaluarCobertura(teacher)

    if (cobertura.recibidas === 0 || !teacher.studentAverage) {
    return { label: 'Sin datos', cls: 'bg-secondary', cobertura }
    }
    if (!cobertura.suficiente) {
    return { label: 'Muestra insuficiente', cls: 'bg-light text-dark border', cobertura }
    }
    if (teacher.studentAverage >= UMBRAL_BUENO) {
    return { label: 'Bueno', cls: 'bg-success', cobertura }
    }
    if (teacher.studentAverage >= UMBRAL_CRITICO) {
    return { label: 'Atención', cls: 'bg-warning', cobertura }
    }
    return { label: 'Crítico', cls: 'bg-danger', cobertura }
}

// Docente en situacion critica CON muestra suficiente para afirmarlo.
// Unico lugar del codigo donde se compara contra UMBRAL_CRITICO para alertar.
export function esCritico(teacher) {
    const cobertura = evaluarCobertura(teacher)
    return cobertura.suficiente &&
            teacher.studentAverage > 0 &&
            teacher.studentAverage < UMBRAL_CRITICO
}
// Color de la tarjeta del promedio institucional
export function claseTarjetaPromedio(promedio) {
    if (!promedio || promedio <= 0) return 'bg-secondary'
    if (promedio >= UMBRAL_BUENO) return 'bg-success'
    if (promedio >= UMBRAL_CRITICO) return 'bg-warning'
    return 'bg-danger'
}