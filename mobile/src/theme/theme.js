export const THEME = {
  colors: {
    // Nocturnal Editorial Palette
    background: '#0F1B2D',       // Azul Tinta Profundo
    backgroundLight: '#132238',  // Fondo alterno sutil
    surface: '#182842',          // Azul Noche Elevado (Cards, modales)
    surfaceElevated: '#1E3252',  // Superficie con mayor elevación
    surfaceBorder: '#263D61',    // Bordes sutiles para tarjetas

    accent: '#E8A33D',           // Ámbar Dorado (Botones primarios, estrellas, acentos)
    accentHover: '#F0B45B',      // Ámbar claro
    accentPressed: '#CF8B26',    // Ámbar oscuro
    accentSubtle: 'rgba(232, 163, 61, 0.15)', // Fondo ámbar translúcido

    textPrimary: '#F4EFE6',      // Hueso / Marfil
    textSecondary: '#A2B4CE',    // Niebla Estelar / Azul grisáceo suave
    textMuted: '#6B82A6',        // Texto terciario / Placeholders

    // Alertas y estados
    alert: '#C1573A',            // Terracota Apagado (Sanciones, multas, vencidos)
    alertBg: 'rgba(193, 87, 58, 0.18)',
    alertBorder: 'rgba(193, 87, 58, 0.4)',

    success: '#34D399',          // Verde esmeralda suave
    successBg: 'rgba(52, 211, 153, 0.15)',
    successBorder: 'rgba(52, 211, 153, 0.35)',

    warning: '#FBBF24',
    warningBg: 'rgba(251, 191, 36, 0.15)',
  },
  typography: {
    fontFamilyTitle: 'serif',
    fontFamilyBody: 'System',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
  },
  borderRadius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    full: 9999,
  }
};
