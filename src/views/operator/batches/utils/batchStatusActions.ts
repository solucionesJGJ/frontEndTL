export type BatchActionColor = 'primary' | 'success' | 'warning' | 'danger' | 'secondary' | 'info'

export type BatchAction = {
  label: string
  code: string
  color: BatchActionColor
}

/**
 * =========================================================
 * ACCIONES GLOBALES DEL LOTE
 * =========================================================
 *
 * IMPORTANTE:
 *
 * Este archivo solamente controla acciones que afectan
 * al lote COMPLETO.
 *
 * Los movimientos parciales de prendas:
 *
 * PENDIENTE_RECEPCION -> EN_PROCESO
 * EN_PROCESO          -> EN_TRASLADO
 *
 * se realizan desde el detalle del lote y NO dependen
 * de estas reglas.
 *
 * =========================================================
 */

export function getBatchActions(role?: string | null, statusCode?: string | null): BatchAction[] {
  if (!role || !statusCode) {
    return []
  }

  /**
   * =====================================================
   * PLANTA
   * =====================================================
   *
   * Planta trabaja principalmente desde el detalle:
   *
   * - recepción individual
   * - procesamiento
   * - despacho parcial a traslado
   *
   * No exponemos acciones globales mientras exista
   * posibilidad de cantidades parciales.
   */

  if (role === 'warehouse_operator') {
    return []
  }

  /**
   * =====================================================
   * CLIENTE
   * =====================================================
   *
   * El cierre será implementado con checklist de
   * cantidades recibidas.
   *
   * Por ahora NO permitimos cierre global directo.
   */

  if (role === 'client_operator') {
    return []
  }

  /**
   * =====================================================
   * ADMIN
   * =====================================================
   *
   * Admin tampoco debe saltarse el flujo por cantidades.
   * Las contingencias deben pasar por el mismo motor
   * logístico para mantener stock y trazabilidad.
   */

  if (role === 'admin') {
    return []
  }

  return []
}
