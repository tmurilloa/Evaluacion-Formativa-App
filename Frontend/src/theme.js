// PALETA INSTITUCIONAL UNAL
// Espejo en JavaScript de las variables CSS de src/styles.css (:root).
// Recharts y los estilos inline no pueden leer variables CSS, por eso este
// archivo existe. Es el UNICO sitio donde puede haber un color escrito a
// mano fuera de styles.css. Si cambias un valor aqui, cambialo tambien alla.

export const COLORES = {
  verde:        '#98b647',  // --unal-green
  rojo:         '#A61C31',  // --unal-red
  verdeOscuro:  '#466B3F',  // --unal-green-dark
  rojoOscuro:   '#76232F',  // --unal-red-dark
  grisOscuro:   '#565A5C',  // --unal-gray-dark
  grisClaro:    '#B1B2B0',  // --unal-gray-light
  naranja:      '#c76b4e',  // solo para la escala de puntajes
  fondoSuave:   '#f8f9fa', // --light-color
  naranjaOscuro: '#a8552f', // variante del naranja sobre fondo claro
}

// Series categoricas (torta de distribucion de evaluaciones)
export const COLORES_SERIE = [
    COLORES.verdeOscuro,
    COLORES.verde,
    COLORES.rojo,
    COLORES.grisClaro
]

// Escala 1..5, de peor a mejor
export const COLORES_PUNTAJE = [
    COLORES.rojo,
    COLORES.naranja,
    COLORES.grisClaro,
    COLORES.verde,
    COLORES.verdeOscuro
]

// Tonos suaves para chips de terminos frecuentes
export const COLORES_CHIP = {
    fondo:  '#eef3e0',
    texto:  '#3c5a2f',
    borde:  '#d4e0b8'
}