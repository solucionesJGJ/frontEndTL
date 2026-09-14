import { useEffect, useMemo, useState } from 'react'

import { getClients, type Client } from '../../../../services/client.service'
import {
  getMovementStatuses,
  type MovementStatus,
} from '../../../../services/movementStatus.service'
import { getStock, type StockItem } from '../../../../services/stock.service'

/*
 * =====================================================
 * ESTADOS FUNCIONALES VISIBLES EN STOCK
 * =====================================================
 *
 * BORRADOR_CLIENTE no pertenece a Stock:
 * todavía es un lote editable por el cliente.
 *
 * Los códigos internos se mantienen por ahora
 * para no romper el backend.
 *
 * Más adelante, al modificar backend y BD,
 * podremos normalizar definitivamente estos estados.
 * =====================================================
 */

const FUNCTIONAL_STOCK_STATUSES: Record<string, string> = {
  PENDIENTE_RECEPCION: 'Despachado a planta',
  EN_PROCESO: 'Procesado',
  EN_TRASLADO: 'En traslado',
  RETORNADO_CLIENTE: 'Cerrado',
}

/*
 * =====================================================
 * HOOK
 * =====================================================
 */

export const useStock = () => {
  /*
   * =================================================
   * ESTADO
   * =================================================
   */

  const [stock, setStock] = useState<StockItem[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [statuses, setStatuses] = useState<MovementStatus[]>([])
  const [clientId, setClientId] = useState('')
  const [statusId, setStatusId] = useState('')
  const [loading, setLoading] = useState(false)

  /*
   * =================================================
   * TOTAL DE UNIDADES VISIBLES
   * =================================================
   */

  const totalQuantity = useMemo(() => {
    return stock.reduce((total, item) => {
      return total + Number(item.quantity || 0)
    }, 0)
  }, [stock])

  /*
   * =================================================
   * CARGAR DATOS BASE
   * =================================================
   */

  const loadBaseData = async () => {
    const [clientsData, statusesData] = await Promise.all([getClients(), getMovementStatuses()])

    /*
     * Clientes activos
     */

    setClients(clientsData.filter((client) => client.active))

    /*
     * Solo estados funcionales
     * para el nuevo flujo.
     */

    const functionalStatuses = statusesData
      .filter((status) =>
        Object.prototype.hasOwnProperty.call(FUNCTIONAL_STOCK_STATUSES, status.code),
      )
      .map((status) => ({
        ...status,

        /*
         * Mantenemos el ID y código real,
         * pero mostramos el nombre
         * simplificado al usuario.
         */

        name: FUNCTIONAL_STOCK_STATUSES[status.code] ?? status.name,
      }))

    setStatuses(functionalStatuses)
  }

  /*
   * =================================================
   * CARGAR STOCK
   * =================================================
   */

  const loadStock = async (
    selectedClientId: string,

    selectedStatusId: string,
  ) => {
    const data = await getStock({
      client_id: selectedClientId || undefined,
      status_id: selectedStatusId || undefined,
    })

    /*
     * =================================================
     * SOLO STOCK REAL
     * =================================================
     *
     * Si una fila histórica quedó con cantidad 0,
     * no tiene sentido mostrarla como stock actual.
     */

    const visibleStock = data.filter((item) => Number(item.quantity || 0) > 0)

    setStock(visibleStock)
  }

  /*
   * =================================================
   * FILTRO CLIENTE
   * =================================================
   */

  const handleClientChange = (value: string) => {
    setClientId(value)
  }

  /*
   * =================================================
   * FILTRO ESTADO
   * =================================================
   */

  const handleStatusChange = (value: string) => {
    setStatusId(value)
  }

  /*
   * =================================================
   * LIMPIAR FILTROS
   * =================================================
   */

  const clearFilters = () => {
    setClientId('')

    setStatusId('')
  }

  /*
   * =================================================
   * CARGA INICIAL
   * =================================================
   */

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)

        await loadBaseData()
      } catch (error) {
        console.error('Error cargando datos base de stock:', error)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  /*
   * =================================================
   * RECARGAR STOCK CUANDO CAMBIAN FILTROS
   * =================================================
   */

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)

        await loadStock(clientId, statusId)
      } catch (error) {
        console.error('Error cargando stock:', error)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [clientId, statusId])

  /*
   * =================================================
   * API PÚBLICA DEL HOOK
   * =================================================
   */

  return {
    stock,
    clients,
    statuses,
    clientId,
    statusId,
    loading,
    totalQuantity,
    handleClientChange,
    handleStatusChange,
    clearFilters,
  }
}
