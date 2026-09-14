import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  createOperatorBatch,
  getOperatorBatches,
  evaluateOperatorBatch,
  changeOperatorBatchStatus,
  receiveOperatorBatch,
  previewOperatorBatchNumber,
  type OperatorBatch,
} from '../../../../services/operatorBatch.service'
import { getBatchItems } from '../../../../services/operatorBatchItem.service'
import { getClients, type Client } from '../../../../services/client.service'
import {
  getCurrentUser,
  isClientOperator,
  isAdmin,
  getCurrentRole,
} from '../../../../services/auth.service'
import { useFeedback } from '../../../../context/FeedbackContext'

/**
 * =====================================================
 * FORMULARIO
 * =====================================================
 */
export type OperatorBatchForm = {
  client_id: string
  batch_number: string
  origin_location: string
  destination_location: string
  notes: string
}

export const emptyOperatorBatchForm: OperatorBatchForm = {
  client_id: '',
  batch_number: '',
  origin_location: 'Cliente',
  destination_location: 'Planta',
  notes: '',
}

/**
 * =====================================================
 * HOOK
 * =====================================================
 */
export function useOperatorBatches() {
  const navigate = useNavigate()
  const { confirmAction, showAlert, showBackendError } = useFeedback()

  /**
   * =====================================================
   * USUARIO / PERMISOS
   * =====================================================
   */
  const currentUser = getCurrentUser()
  const currentUserClientId = currentUser?.client?.id || ''
  const clientOperator = isClientOperator()
  const adminUser = isAdmin()
  const role = getCurrentRole()
  const canCreateBatch = role === 'admin' || role === 'client_operator'
  const canOperatePlant = role === 'admin' || role === 'warehouse_operator'

  /**
   * =====================================================
   * ESTADOS
   * =====================================================
   */
  const [batches, setBatches] = useState<OperatorBatch[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [form, setForm] = useState<OperatorBatchForm>(emptyOperatorBatchForm)
  const [loading, setLoading] = useState(false)

  /**
   * =====================================================
   * PREVIEW DEL LOTE
   * =====================================================
   */
  const loadBatchPreview = useCallback(
    async (clientId: string) => {
      if (!clientId) {
        setForm((prev) => ({
          ...prev,
          batch_number: '',
          origin_location: 'Cliente',
          destination_location: 'Planta',
        }))

        return
      }

      try {
        const preview = await previewOperatorBatchNumber(clientId)

        setForm((prev) => ({
          ...prev,
          batch_number: preview.batch_number,
          origin_location: preview.origin_location,
          destination_location: preview.destination_location,
        }))
      } catch (error) {
        console.error(error)

        showBackendError(error, 'Error obteniendo número de lote')
      }
    },
    [showBackendError],
  )

  /**
   * =====================================================
   * CARGA GENERAL
   * =====================================================
   */
  const loadData = async () => {
    const [batchesData, clientsData] = await Promise.all([getOperatorBatches(), getClients()])

    setBatches(batchesData)

    if (clientOperator && currentUserClientId) {
      const client = clientsData.find((item) => item.id === currentUserClientId)

      if (client) {
        setClients([client])
      }

      setForm((prev) => ({
        ...prev,
        client_id: currentUserClientId,
      }))

      await loadBatchPreview(currentUserClientId)

      return
    }

    setClients(clientsData.filter((client) => client.active))
  }

  /**
   * =====================================================
   * DETALLE PARA CONFIRMACIONES
   * =====================================================
   */
  const getBatchConfirmDetails = useCallback(async (batchId: string) => {
    const items = await getBatchItems(batchId)

    return items.map((item) => ({
      item:
        item.garment?.size ||
        item.garment?.description ||
        item.garment?.code ||
        'Artículo sin nombre',
      quantity: item.quantity_sent,
    }))
  }, [])

  /**
   * =====================================================
   * CAMBIO DE ESTADO
   * =====================================================
   */
  const handleChangeStatus = async (
    batch: OperatorBatch,
    nextStatusCode: string,
    label: string,
  ) => {
    try {
      const details = await getBatchConfirmDetails(batch.id)
      const isClosed = nextStatusCode === 'CERRADO'

      const confirmed = await confirmAction({
        title: label,
        message: isClosed
          ? '¿Confirmas el cierre definitivo del lote recibido?'
          : '¿Confirmas cambiar el estado del lote?',
        showConformityCheck: true,
        observationLabel: isClosed ? 'Observaciones del cliente' : undefined,
        observationPlaceholder: isClosed ? 'Ejemplo: pedido recibido conforme' : undefined,
        confirmText: isClosed ? 'Cerrar lote' : 'Confirmar',
        color: isClosed ? 'danger' : 'primary',
        fields: [
          {
            label: 'Lote',
            value: batch.batch_number,
          },
          {
            label: 'Cliente',
            value: batch.client?.name,
          },
          {
            label: 'Estado actual',
            value: batch.current_status?.name,
          },
          {
            label: 'Nuevo estado',
            value: nextStatusCode,
          },
        ],
        details,
      })

      if (!confirmed.confirmed) {
        return
      }

      await changeOperatorBatchStatus(batch.id, nextStatusCode, confirmed.observation)

      showAlert('Estado actualizado correctamente', 'success')

      await loadData()
    } catch (error) {
      showBackendError(error, 'Error cambiando estado')
    }
  }

  /**
   * =====================================================
   * RECEPCIÓN
   * =====================================================
   */
  const handleReceive = async (batch: OperatorBatch) => {
    try {
      const details = await getBatchConfirmDetails(batch.id)

      const confirmed = await confirmAction({
        title: 'Recepcionar lote',
        message: '¿Confirmas la recepción de este lote en planta?',
        confirmText: 'Recepcionar',
        color: 'primary',
        fields: [
          {
            label: 'Lote',
            value: batch.batch_number,
          },
          {
            label: 'Cliente',
            value: batch.client?.name,
          },
          {
            label: 'Estado actual',
            value: batch.current_status?.name,
          },
        ],
        details,
      })

      if (!confirmed.confirmed) {
        return
      }

      await receiveOperatorBatch(batch.id)

      showAlert('Lote recepcionado correctamente', 'success')

      await loadData()
    } catch (error) {
      showBackendError(error, 'Error recepcionando lote')
    }
  }

  /**
   * =====================================================
   * EVALUACIÓN
   * =====================================================
   */
  const handleEvaluate = async (batch: OperatorBatch, canProcess: boolean) => {
    try {
      const details = await getBatchConfirmDetails(batch.id)

      const confirmed = await confirmAction({
        title: canProcess ? 'Enviar a proceso' : 'Derivar externo',
        message: canProcess
          ? '¿Confirmas que este lote puede procesarse en planta?'
          : '¿Confirmas que este lote debe derivarse externamente?',
        confirmText: canProcess ? 'Procesar' : 'Derivar',
        color: canProcess ? 'primary' : 'warning',
        fields: [
          {
            label: 'Lote',
            value: batch.batch_number,
          },
          {
            label: 'Cliente',
            value: batch.client?.name,
          },
          {
            label: 'Estado actual',
            value: batch.current_status?.name,
          },
          {
            label: 'Nuevo estado',
            value: canProcess ? 'En Proceso' : 'Derivado Externo',
          },
        ],
        details,
      })

      if (!confirmed.confirmed) {
        return
      }

      await evaluateOperatorBatch(batch.id, canProcess)

      showAlert(
        canProcess
          ? 'Lote enviado a proceso correctamente'
          : 'Lote derivado externamente correctamente',
        'success',
      )

      await loadData()
    } catch (error) {
      showBackendError(error, 'Error evaluando lote')
    }
  }

  /**
   * =====================================================
   * FORMULARIO
   * =====================================================
   */
  const handleChange = (field: keyof OperatorBatchForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleClientChange = async (clientId: string) => {
    handleChange('client_id', clientId)

    await loadBatchPreview(clientId)
  }

  /**
   * =====================================================
   * CREAR LOTE
   * =====================================================
   */
  const handleSubmit = async () => {
    /**
     * Número generado por backend.
     */
    if (!form.batch_number.trim()) {
      showAlert('Número de lote es obligatorio', 'warning')

      return
    }

    /**
     * Admin debe seleccionar cliente.
     */
    if (adminUser && !form.client_id) {
      showAlert('Cliente es obligatorio', 'warning')

      return
    }

    /**
     * Operador cliente necesita
     * cliente asociado.
     */
    if (clientOperator && !currentUser?.client?.id) {
      showAlert('Tu usuario no tiene cliente asociado', 'danger')

      return
    }

    const selectedClientId = clientOperator ? currentUser?.client?.id : form.client_id

    if (!selectedClientId) {
      showAlert('Debe seleccionar un cliente', 'warning')

      return
    }

    const selectedClient = clients.find((client) => client.id === selectedClientId)

    const confirmed = await confirmAction({
      title: 'Crear lote',
      message: 'Se creará el siguiente lote:',
      confirmText: 'Crear',
      color: 'primary',
      fields: [
        {
          label: 'Número',
          value: form.batch_number,
        },
        {
          label: 'Cliente',
          value: selectedClient?.name || currentUser?.client?.name || '-',
        },
        {
          label: 'Origen',
          value: form.origin_location,
        },
        {
          label: 'Destino',
          value: form.destination_location,
        },
      ],
    })

    if (!confirmed.confirmed) {
      return
    }

    try {
      setLoading(true)

      await createOperatorBatch({
        client_id: selectedClientId,
        notes: form.notes,
      })

      showAlert('Lote creado correctamente', 'success')

      setForm({
        ...emptyOperatorBatchForm,
        client_id: clientOperator ? currentUser?.client?.id || '' : '',
      })

      /**
       * Para client_operator cargamos
       * inmediatamente el siguiente
       * número disponible.
       */
      if (clientOperator && currentUser?.client?.id) {
        await loadBatchPreview(currentUser.client.id)
      }

      await loadData()
    } catch (error) {
      showBackendError(error, 'Error creando lote')
    } finally {
      setLoading(false)
    }
  }

  /**
   * =====================================================
   * NAVEGACIÓN
   * =====================================================
   */
  const handleContinueReception = (batchId: string) => {
    navigate(`/operator/batches/${batchId}`)
  }

  const handleOpenBatch = (batchId: string) => {
    navigate(`/operator/batches/${batchId}`)
  }

  /**
   * =====================================================
   * CARGA INICIAL
   * =====================================================
   */
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)

        await loadData()
      } catch (error) {
        showBackendError(error, 'Error cargando lotes')
      } finally {
        setLoading(false)
      }
    }

    void load()

    // Carga inicial de la vista.
    // No debe repetirse en cada render.

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * =====================================================
   * API DEL HOOK
   * =====================================================
   */
  return {
    // Datos
    batches,
    clients,
    form,
    loading,

    // Usuario / permisos
    currentUser,
    role,
    clientOperator,
    adminUser,
    canCreateBatch,
    canOperatePlant,

    // Formulario
    handleChange,
    handleClientChange,
    handleSubmit,

    // Operaciones
    handleReceive,
    handleEvaluate,
    handleChangeStatus,

    // Navegación
    handleOpenBatch,
    handleContinueReception,

    // Recargas explícitas
    loadData,
    loadBatchPreview,
  }
}
