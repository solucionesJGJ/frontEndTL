import React, { useEffect, useState } from 'react'

import BatchDispatchModal, {
  type BatchDispatchModalSubmit,
} from './components/BatchDispatchModal'
import BatchHeader from './components/BatchHeader'
import BatchItems from './components/BatchItems'
import BatchMovementPanel from './components/BatchMovementPanel'
import { useOperatorBatchDetail } from './hooks/useOperatorBatchDetail'
import {
  dispatchBatchToClient,
  getDispatchDriverShifts,
  type DispatchDriverShift,
} from '../../../services/operatorBatch.service'
import {
  getDispatchGuideByBatch,
  getDispatchGuidePdf,
  type DispatchGuide,
} from '../../../services/dispatchGuide.service'
import { useFeedback } from '../../../context/FeedbackContext'

const OperatorBatchDetail = () => {
  const {
    batch,
    items,
    statuses,
    movements,
    itemForm,
    movementForm,
    editingItemId,
    role,
    canManageBatchItems,
    canMoveStock,
    canManageItems,
    isClient,
    batchGarments,
    selectedMovementItem,
    selectedMovementGarment,
    availableOriginStatuses,
    availableGarments,
    selectedItemGarment,
    itemPreviewTotal,
    batchTotal,
    handleItemChange,
    handleMovementChange,
    handleSubmitItem,
    handleEditItem,
    handleRemoveItem,
    handleCancelItem,
    getAvailableMovementActions,
    handleSelectMovementGarment,
    applyMovementAction,
    handleSubmitMovement,
    handleConfirmReception,
    handleCreateIncident,
    handleDispatchBatch,
    loadData,
  } = useOperatorBatchDetail()

  const { confirmAction, showAlert, showBackendError } = useFeedback()

  /**
   * =====================================================
   * GUÍA DE DESPACHO DEL LOTE
   * =====================================================
   */

  const [dispatchGuide, setDispatchGuide] =
    useState<DispatchGuide | null>(null)

  const [loadingDispatchGuide, setLoadingDispatchGuide] =
    useState(false)

  /**
   * =====================================================
   * DESPACHO PLANTA -> CLIENTE
   * =====================================================
   */

  const [dispatchModalVisible, setDispatchModalVisible] =
    useState(false)

  const [dispatchShifts, setDispatchShifts] = useState<
    DispatchDriverShift[]
  >([])

  const [loadingDispatchShifts, setLoadingDispatchShifts] =
    useState(false)

  const [dispatchSubmitting, setDispatchSubmitting] =
    useState(false)

  /**
   * =====================================================
   * CARGAR GUÍA DEL LOTE
   * =====================================================
   */

  const loadDispatchGuide = async () => {
    if (!batch) {
      setDispatchGuide(null)

      return
    }

    if (role !== 'admin' && role !== 'warehouse_operator') {
      setDispatchGuide(null)

      return
    }

    try {
      setLoadingDispatchGuide(true)

      const guide = await getDispatchGuideByBatch(batch.id)

      setDispatchGuide(guide)
    } catch (error: any) {
      /**
       * Un lote puede legítimamente no tener guía.
       *
       * Ejemplos:
       *
       * - todavía está en proceso
       * - fue despachado sin guía
       *
       * En esos casos no mostramos error al usuario.
       */
      const status = error?.response?.status

      if (status === 404) {
        setDispatchGuide(null)

        return
      }

      setDispatchGuide(null)

      showBackendError(error, 'Error cargando guía de despacho')
    } finally {
      setLoadingDispatchGuide(false)
    }
  }

  /**
   * =====================================================
   * VER PDF GUÍA
   * =====================================================
   */

  const handleViewDispatchGuide = async () => {
    if (!dispatchGuide) {
      showAlert(
        'El lote no tiene una guía de despacho asociada',
        'warning',
      )

      return
    }

    if (!dispatchGuide.engine_document_id) {
      showAlert(
        'La guía todavía no tiene un PDF disponible',
        'warning',
      )

      return
    }

    try {
      const pdf = await getDispatchGuidePdf(dispatchGuide.id)

      const pdfUrl = URL.createObjectURL(pdf)

      const newWindow = window.open(pdfUrl, '_blank')

      if (!newWindow) {
        URL.revokeObjectURL(pdfUrl)

        showAlert(
          'El navegador bloqueó la apertura del PDF',
          'warning',
        )

        return
      }

      /**
       * Liberamos el objeto después de un tiempo
       * prudente para permitir que la nueva pestaña
       * termine de cargar el PDF.
       */
      window.setTimeout(() => {
        URL.revokeObjectURL(pdfUrl)
      }, 60000)
    } catch (error) {
      showBackendError(error, 'Error obteniendo PDF de la guía')
    }
  }

  /**
   * =====================================================
   * IMPRIMIR PDF GUÍA
   * =====================================================
   */

  const handlePrintDispatchGuide = async () => {
    if (!dispatchGuide) {
      showAlert(
        'El lote no tiene una guía de despacho asociada',
        'warning',
      )

      return
    }

    if (!dispatchGuide.engine_document_id) {
      showAlert(
        'La guía todavía no tiene un PDF disponible',
        'warning',
      )

      return
    }

    try {
      const pdf = await getDispatchGuidePdf(dispatchGuide.id)

      const pdfUrl = URL.createObjectURL(pdf)

      const printWindow = window.open(pdfUrl, '_blank')

      if (!printWindow) {
        URL.revokeObjectURL(pdfUrl)

        showAlert(
          'El navegador bloqueó la ventana de impresión',
          'warning',
        )

        return
      }

      /**
       * Esperamos que el visor PDF cargue antes
       * de solicitar la impresión.
       */
      window.setTimeout(() => {
        try {
          printWindow.focus()
          printWindow.print()
        } catch {
          /**
           * Algunos visores PDF del navegador
           * no permiten disparar print()
           * automáticamente.
           *
           * En ese caso el PDF queda abierto
           * y puede imprimirse normalmente
           * desde el visor.
           */
        }
      }, 1500)

      window.setTimeout(() => {
        URL.revokeObjectURL(pdfUrl)
      }, 60000)
    } catch (error) {
      showBackendError(error, 'Error obteniendo PDF de la guía')
    }
  }

  /**
   * =====================================================
   * ABRIR MODAL DE DESPACHO
   * =====================================================
   */

  const openDispatchToClient = async () => {
    if (!batch) {
      return
    }

    if (role !== 'admin' && role !== 'warehouse_operator') {
      showAlert(
        'No tienes permisos para despachar el lote desde planta',
        'warning',
      )

      return
    }

    if (batch.current_status?.code !== 'EN_PROCESO') {
      showAlert(
        'El lote debe estar en proceso para ser despachado al cliente',
        'warning',
      )

      return
    }

    setDispatchModalVisible(true)

    setLoadingDispatchShifts(true)

    try {
      const shifts = await getDispatchDriverShifts()

      setDispatchShifts(shifts)
    } catch (error) {
      setDispatchShifts([])

      showBackendError(error, 'Error cargando jornadas activas')
    } finally {
      setLoadingDispatchShifts(false)
    }
  }

  /**
   * =====================================================
   * CERRAR MODAL DE DESPACHO
   * =====================================================
   */

  const closeDispatchModal = () => {
    if (dispatchSubmitting) {
      return
    }

    setDispatchModalVisible(false)
  }

  /**
   * =====================================================
   * CONFIRMAR DESPACHO PLANTA -> CLIENTE
   * =====================================================
   */

  const handleDispatchToClient = async (
    payload: BatchDispatchModalSubmit,
  ) => {
    if (!batch) {
      return
    }

    /**
     * =============================================
     * CON GUÍA
     * =============================================
     */

    if (payload.generateGuide && !payload.driverShiftId) {
      showAlert(
        'Debe seleccionar una jornada activa para generar la guía',
        'warning',
      )

      return
    }

    /**
     * =============================================
     * SIN GUÍA
     *
     * SEGUNDA CONFIRMACIÓN.
     * =============================================
     */

    let confirmedWithoutGuide = false

    if (!payload.generateGuide) {
      const confirmation = await confirmAction({
        title: 'Despachar sin guía',
        message:
          'Este lote será enviado al cliente SIN generar una guía de despacho DTE52. ¿Confirmas que deseas continuar?',
        confirmText: 'Sí, despachar sin guía',
        color: 'danger',
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
            value: 'En traslado',
          },
        ],
      })

      if (!confirmation.confirmed) {
        return
      }

      confirmedWithoutGuide = true
    }

    /**
     * =============================================
     * EJECUTAR
     * =============================================
     */

    setDispatchSubmitting(true)

    try {
      const response = await dispatchBatchToClient(batch.id, {
        generate_guide: payload.generateGuide,
        confirm_without_guide: payload.generateGuide
          ? undefined
          : confirmedWithoutGuide,
        driver_shift_id: payload.generateGuide
          ? payload.driverShiftId
          : null,
        notes: payload.notes || null,
      })

      setDispatchModalVisible(false)

      /**
       * Guía solicitada pero Motor falló.
       *
       * El despacho físico quedó registrado.
       */
      if (
        response.data.guide_requested &&
        !response.data.guide_processed
      ) {
        showAlert(
          response.data.guide_error
            ? `${response.message}. ${response.data.guide_error}`
            : response.message,
          'warning',
        )
      } else {
        showAlert(response.message, 'success')
      }

      /**
       * Recargamos primero el lote.
       */
      await loadData()

      /**
       * Si se solicitó guía, la cargamos
       * inmediatamente para mostrarla
       * en el BatchHeader.
       */
      if (payload.generateGuide) {
        await loadDispatchGuide()
      }
    } catch (error) {
      showBackendError(error, 'Error despachando lote al cliente')
    } finally {
      setDispatchSubmitting(false)
    }
  }

  /**
   * =====================================================
   * ACCIONES DE MOVIMIENTO DESDE LA TABLA
   * =====================================================
   */

  const handleApplyMovementAction = (
    fromStatusCode: string,
    toStatusCode: string,
    movementType: string,
    garmentId?: string,
  ) => {
    /**
     * =================================================
     * PLANTA -> CLIENTE
     *
     * EN_PROCESO -> EN_TRASLADO
     * =================================================
     */

    if (
      fromStatusCode === 'EN_PROCESO' &&
      toStatusCode === 'EN_TRASLADO' &&
      (role === 'admin' || role === 'warehouse_operator')
    ) {
      void openDispatchToClient()

      return
    }

    /**
     * =================================================
     * RECEPCIÓN CLIENTE
     *
     * EN_TRASLADO -> CERRADO
     * =================================================
     */

    if (
      fromStatusCode === 'EN_TRASLADO' &&
      toStatusCode === 'CERRADO' &&
      (role === 'admin' || role === 'client_operator')
    ) {
      const targetGarmentId =
        garmentId || movementForm.garment_id

      if (!targetGarmentId) {
        showAlert('Debe seleccionar una prenda', 'warning')

        return
      }

      void handleConfirmReception(targetGarmentId)

      return
    }

    /**
     * =================================================
     * MOVIMIENTOS OPERATIVOS NORMALES
     * =================================================
     */

    applyMovementAction(
      fromStatusCode,
      toStatusCode,
      movementType,
      garmentId,
    )
  }

  /**
   * =====================================================
   * INTERCEPTAR REGISTRO MANUAL
   * =====================================================
   */

  const handleSubmitMovementProtected = async () => {
    const fromStatus = statuses.find(
      (status) => status.id === movementForm.from_status_id,
    )

    const toStatus = statuses.find(
      (status) => status.id === movementForm.to_status_id,
    )

    /**
     * =================================================
     * EN_PROCESO -> EN_TRASLADO
     * =================================================
     */

    if (
      fromStatus?.code === 'EN_PROCESO' &&
      toStatus?.code === 'EN_TRASLADO' &&
      (role === 'admin' || role === 'warehouse_operator')
    ) {
      await openDispatchToClient()

      return
    }

    /**
     * =================================================
     * EN_TRASLADO -> CERRADO
     * =================================================
     */

    if (
      fromStatus?.code === 'EN_TRASLADO' &&
      toStatus?.code === 'CERRADO' &&
      (role === 'admin' || role === 'client_operator')
    ) {
      if (!movementForm.garment_id) {
        showAlert('Debe seleccionar una prenda', 'warning')

        return
      }

      await handleConfirmReception(
        movementForm.garment_id,
      )

      return
    }

    /**
     * =================================================
     * MOVIMIENTO NORMAL
     * =================================================
     */

    await handleSubmitMovement()
  }

  /**
   * =====================================================
   * CARGAR GUÍA CUANDO CAMBIA EL LOTE
   * =====================================================
   */

  useEffect(() => {
    if (!batch?.id) {
      setDispatchGuide(null)

      return
    }

    if (role !== 'admin' && role !== 'warehouse_operator') {
      setDispatchGuide(null)

      return
    }

    void loadDispatchGuide()
  }, [batch?.id, role])

  /**
   * =====================================================
   * ACCIONES DISPONIBLES
   * =====================================================
   */

  const availableMovementActions =
    getAvailableMovementActions()

  /**
   * =====================================================
   * RENDER
   * =====================================================
   */

  return (
    <>
      {/*
       * =====================================================
       * DATOS DEL LOTE
       * =====================================================
       */}

      <BatchHeader
        batch={batch}
        role={role}
        canManageBatchItems={canManageBatchItems}
        dispatchGuide={dispatchGuide}
        loadingDispatchGuide={loadingDispatchGuide}
        onDispatch={handleDispatchBatch}
        onDispatchToClient={openDispatchToClient}
        onViewDispatchGuide={handleViewDispatchGuide}
        onPrintDispatchGuide={handlePrintDispatchGuide}
      />

      {/*
       * =====================================================
       * PRENDAS DEL LOTE
       * =====================================================
       */}

      <BatchItems
        batch={batch}
        items={items}
        availableGarments={availableGarments}
        selectedItemGarment={selectedItemGarment}
        itemForm={itemForm}
        editingItemId={editingItemId}
        itemPreviewTotal={itemPreviewTotal}
        batchTotal={batchTotal}
        canManageBatchItems={canManageBatchItems}
        canManageItems={canManageItems}
        isClient={isClient}
        onItemChange={handleItemChange}
        onSubmitItem={handleSubmitItem}
        onEditItem={handleEditItem}
        onRemoveItem={handleRemoveItem}
        onCancelItem={handleCancelItem}
      />

      {/*
       * =====================================================
       * MOVIMIENTOS
       * =====================================================
       */}

      <BatchMovementPanel
        role={role}
        canRegisterMovement={canMoveStock}
        batchGarments={batchGarments}
        statuses={statuses}
        movements={movements}
        movementForm={movementForm}
        selectedMovementItem={selectedMovementItem}
        selectedMovementGarment={selectedMovementGarment}
        availableOriginStatuses={availableOriginStatuses}
        availableMovementActions={availableMovementActions}
        onMovementChange={handleMovementChange}
        onSelectMovementGarment={handleSelectMovementGarment}
        onApplyMovementAction={handleApplyMovementAction}
        onSubmitMovement={handleSubmitMovementProtected}
        onCreateIncident={handleCreateIncident}
      />

      {/*
       * =====================================================
       * DESPACHO PLANTA -> CLIENTE
       * =====================================================
       */}

      <BatchDispatchModal
        visible={dispatchModalVisible}
        batch={batch}
        shifts={dispatchShifts}
        loadingShifts={loadingDispatchShifts}
        submitting={dispatchSubmitting}
        onClose={closeDispatchModal}
        onSubmit={handleDispatchToClient}
      />
    </>
  )
}

export default OperatorBatchDetail