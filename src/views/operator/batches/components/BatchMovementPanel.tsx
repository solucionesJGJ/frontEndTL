import React, { useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import { type Garment } from '../../../../services/garment.service'
import { type MovementStatus } from '../../../../services/movementStatus.service'
import {
  type CreateIncidentPayload,
  type OperatorIncidentReason,
  type OperatorMovement,
} from '../../../../services/operatorMovement.service'
import { type OperatorBatchItem } from '../../../../services/operatorBatchItem.service'
import {
  buildBatchCurrentState,
  type BatchStatusBalance,
  type MovementAction,
  type OperatorBatchMovementForm,
} from '../hooks/useOperatorBatchDetail'

type BatchMovementPanelProps = {
  role: string | null
  canRegisterMovement: boolean
  batchGarments: Garment[]
  statuses: MovementStatus[]
  movements: OperatorMovement[]
  movementForm: OperatorBatchMovementForm
  selectedMovementItem: OperatorBatchItem | undefined
  selectedMovementGarment: Garment | undefined
  availableOriginStatuses: BatchStatusBalance[]
  availableMovementActions: MovementAction[]
  onMovementChange: (field: keyof OperatorBatchMovementForm, value: string | number) => void
  onSelectMovementGarment: (garmentId: string) => void | Promise<void>
  onApplyMovementAction: (
    fromStatusCode: string,
    toStatusCode: string,
    movementType: string,
    garmentId?: string,
  ) => void
  onSubmitMovement: () => void | Promise<void>
  onCreateIncident: (payload: CreateIncidentPayload) => Promise<boolean>
}

const BatchMovementPanel = ({
  role,
  canRegisterMovement,
  batchGarments,
  statuses,
  movements,
  movementForm,
  selectedMovementItem,
  selectedMovementGarment,
  availableOriginStatuses,
  availableMovementActions,
  onMovementChange,
  onSelectMovementGarment,
  onApplyMovementAction,
  onSubmitMovement,
  onCreateIncident,
}: BatchMovementPanelProps) => {
  /**
   * =====================================================
   * PERMISOS REALES
   * =====================================================
   *
   * Registrar movimientos operativos corresponde
   * exclusivamente a:
   *
   * - admin
   * - warehouse_operator
   *
   * client_operator NO debe ver el formulario.
   */

  const canOperateWarehouse = role === 'admin' || role === 'warehouse_operator'
  const canRegisterWarehouseMovement = canRegisterMovement && canOperateWarehouse
  const canConfirmClientReception = role === 'admin' || role === 'client_operator'

  /**
   * =====================================================
   * TRAZABILIDAD
   * =====================================================
   */

  const [showTraceability, setShowTraceability] = useState(false)

  /**
   * =====================================================
   * INCIDENCIAS
   * =====================================================
   */

  const [incidentVisible, setIncidentVisible] = useState(false)
  const [incidentGarmentId, setIncidentGarmentId] = useState('')
  const [incidentOriginStatusId, setIncidentOriginStatusId] = useState('')
  const [incidentAvailable, setIncidentAvailable] = useState(0)
  const [incidentQuantity, setIncidentQuantity] = useState(1)
  const [incidentReason, setIncidentReason] = useState<OperatorIncidentReason>('NOT_RECEIVED')
  const [incidentDescription, setIncidentDescription] = useState('')
  const [incidentSubmitting, setIncidentSubmitting] = useState(false)

  /**
   * =====================================================
   * PERMISOS INCIDENCIA
   * =====================================================
   */

  const canCloseIncidentFrom = (statusCode: string) => {
    if (role === 'admin') {
      return statusCode === 'PENDIENTE_RECEPCION' || statusCode === 'EN_TRASLADO'
    }

    if (role === 'warehouse_operator') {
      return statusCode === 'PENDIENTE_RECEPCION'
    }

    if (role === 'client_operator') {
      return statusCode === 'EN_TRASLADO'
    }

    return false
  }

  const openIncidentModal = (garmentId: string, statusId: string, available: number) => {
    setIncidentGarmentId(garmentId)

    setIncidentOriginStatusId(statusId)

    setIncidentAvailable(available)

    setIncidentQuantity(available)

    setIncidentReason('NOT_RECEIVED')

    setIncidentDescription('')

    setIncidentVisible(true)
  }

  const closeIncidentModal = () => {
    if (!incidentSubmitting) {
      setIncidentVisible(false)
    }
  }

  const submitIncident = async () => {
    const quantity = Number(incidentQuantity)

    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > incidentAvailable) {
      return
    }

    setIncidentSubmitting(true)

    try {
      const ok = await onCreateIncident({
        garment_id: incidentGarmentId,
        origin_status_id: incidentOriginStatusId,
        quantity,
        reason: incidentReason,
        description: incidentDescription.trim() || undefined,
      })

      if (ok) {
        setIncidentVisible(false)
      }
    } finally {
      setIncidentSubmitting(false)
    }
  }

  const incidentGarment = batchGarments.find((garment) => garment.id === incidentGarmentId)

  /**
   * =====================================================
   * ESTADO ACTUAL
   * =====================================================
   */

  const currentBatchState = useMemo(
    () => buildBatchCurrentState(movements, statuses, batchGarments),
    [movements, statuses, batchGarments],
  )

  /**
   * =====================================================
   * ESTADOS DESTINO
   * =====================================================
   */

  const destinationStatuses = useMemo(() => {
    const allowedCodes = new Set(availableMovementActions.map((action) => action.to))

    return statuses.filter((status) => allowedCodes.has(status.code))
  }, [statuses, availableMovementActions])

  const selectedOriginBalance = availableOriginStatuses.find(
    (stock) => stock.status_id === movementForm.from_status_id,
  )

  /**
   * =====================================================
   * RENDER
   * =====================================================
   */

  return (
    <>
      {/*
       * =====================================================
       * REGISTRAR MOVIMIENTO
       *
       * SOLO ADMIN / WAREHOUSE
       * =====================================================
       */}

      {canRegisterWarehouseMovement && (
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Registrar movimiento</strong>
          </CCardHeader>

          <CCardBody>
            <CRow className="mb-3">
              <CCol md={3}>
                <CFormSelect
                  label="Prenda"
                  value={movementForm.garment_id}
                  onChange={(event) => void onSelectMovementGarment(event.target.value)}
                >
                  <option value="">Seleccione prenda</option>

                  {batchGarments.map((garment) => (
                    <option key={garment.id} value={garment.id}>
                      {garment.code}

                      {' - '}

                      {garment.size || garment.description || 'Sin nombre'}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol md={3}>
                <CFormSelect
                  label="Estado origen"
                  value={movementForm.from_status_id}
                  onChange={(event) => onMovementChange('from_status_id', event.target.value)}
                >
                  <option value="">Sin origen / ingreso inicial</option>

                  {statuses
                    .filter((status) => {
                      if (status.id === movementForm.from_status_id) {
                        return true
                      }

                      return availableOriginStatuses.some((stock) => stock.status_id === status.id)
                    })
                    .map((status) => {
                      const stock = availableOriginStatuses.find(
                        (item) => item.status_id === status.id,
                      )

                      return (
                        <option key={status.id} value={status.id}>
                          {status.name}

                          {stock ? ` - Disponible: ${stock.quantity}` : ' - Estado sugerido'}
                        </option>
                      )
                    })}
                </CFormSelect>
              </CCol>

              <CCol md={3}>
                <CFormSelect
                  label="Estado destino"
                  value={movementForm.to_status_id}
                  onChange={(event) => onMovementChange('to_status_id', event.target.value)}
                >
                  <option value="">Seleccione destino</option>

                  {destinationStatuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol md={3}>
                <CFormSelect label="Tipo movimiento" value={movementForm.movement_type} disabled>
                  <option value="recepcion_planta">Recepción / proceso</option>

                  <option value="inicio_traslado">Inicio de traslado</option>

                  <option value="recepcion_cliente">Recepción cliente</option>

                  <option value="ajuste">Ajuste</option>
                </CFormSelect>
              </CCol>
            </CRow>

            {selectedMovementItem && (
              <CAlert color="info" className="mt-3">
                <strong>Prenda seleccionada:</strong> {selectedMovementGarment?.code}
                {' - '}
                {selectedMovementGarment?.size || selectedMovementGarment?.description || '-'}
                <br />
                <strong>Valor histórico unitario:</strong>
                {' $'}
                {Number(selectedMovementItem.unit_value || 0).toLocaleString('es-CL')}
                {' | '}
                <strong>Valor línea:</strong>
                {' $'}
                {Number(selectedMovementItem.calculated_total || 0).toLocaleString('es-CL')}
                <br />
                <strong>Enviada:</strong> {selectedMovementItem.quantity_sent}
                {' | '}
                <strong>Recibida:</strong> {selectedMovementItem.quantity_received}
                {' | '}
                <strong>Procesada:</strong> {selectedMovementItem.quantity_processed}
                {' | '}
                <strong>Reproceso:</strong> {selectedMovementItem.quantity_reprocessed}
                {' | '}
                <strong>Retornada:</strong> {selectedMovementItem.quantity_returned}
              </CAlert>
            )}

            {movementForm.garment_id && (
              <div className="mb-3">
                <strong>Estado actual de esta prenda en el lote:</strong>

                <div className="d-flex gap-2 flex-wrap mt-2">
                  {availableOriginStatuses.length > 0 ? (
                    availableOriginStatuses.map((stock) => (
                      <CBadge color="secondary" key={stock.id}>
                        {stock.status?.name}: {stock.quantity}
                      </CBadge>
                    ))
                  ) : (
                    <CBadge color="warning">Sin unidades disponibles en este lote</CBadge>
                  )}
                </div>
              </div>
            )}

            {movementForm.garment_id && availableMovementActions.length > 0 && (
              <div className="mb-3">
                <strong>Acciones disponibles:</strong>

                <div className="d-flex gap-2 flex-wrap mt-2">
                  {availableMovementActions.map((action) => (
                    <CButton
                      key={action.to}
                      color="primary"
                      size="sm"
                      variant="outline"
                      onClick={() => onApplyMovementAction(action.from, action.to, action.type)}
                    >
                      {action.label}
                    </CButton>
                  ))}
                </div>
              </div>
            )}

            <CRow className="mb-4">
              <CCol md={2}>
                <CFormInput
                  label="Cantidad"
                  type="number"
                  min={1}
                  max={selectedOriginBalance?.quantity}
                  value={movementForm.quantity}
                  onChange={(event) => onMovementChange('quantity', Number(event.target.value))}
                />
              </CCol>

              <CCol md={8}>
                <CFormTextarea
                  label="Notas"
                  rows={1}
                  value={movementForm.notes}
                  onChange={(event) => onMovementChange('notes', event.target.value)}
                />
              </CCol>

              <CCol md={2} className="d-flex align-items-end">
                <CButton color="primary" onClick={() => void onSubmitMovement()}>
                  Registrar
                </CButton>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      )}

      {/*
       * =====================================================
       * ESTADO ACTUAL DE LAS PRENDAS
       * =====================================================
       *
       * Esta tabla puede verla también el cliente.
       *
       * Las ACCIONES son controladas por rol.
       * =====================================================
       */}

      <CCard className="mb-4">
        <CCardHeader>
          <strong>Estado actual de las prendas</strong>
        </CCardHeader>

        <CCardBody>
          <CTable hover responsive>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Prenda</CTableHeaderCell>

                <CTableHeaderCell>Estado actual</CTableHeaderCell>

                <CTableHeaderCell>Cantidad</CTableHeaderCell>

                <CTableHeaderCell>Acción</CTableHeaderCell>
              </CTableRow>
            </CTableHead>

            <CTableBody>
              {currentBatchState.map((row) => {
                const canProcess =
                  canRegisterWarehouseMovement && row.status_code === 'PENDIENTE_RECEPCION'

                const canDispatch = canRegisterWarehouseMovement && row.status_code === 'EN_PROCESO'

                const canConfirmReception =
                  canConfirmClientReception && row.status_code === 'EN_TRASLADO'

                const canIncident = canCloseIncidentFrom(row.status_code)
                const hasAction = canProcess || canDispatch || canConfirmReception || canIncident

                return (
                  <CTableRow key={row.id}>
                    <CTableDataCell>
                      <strong>{row.garment_code}</strong>

                      {' - '}

                      {row.garment_name}
                    </CTableDataCell>

                    <CTableDataCell>
                      <CBadge color="info">{row.status_name}</CBadge>
                    </CTableDataCell>

                    <CTableDataCell>{row.quantity}</CTableDataCell>

                    <CTableDataCell>
                      <div className="d-flex flex-wrap gap-2">
                        {canProcess && (
                          <CButton
                            color="primary"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              onApplyMovementAction(
                                'PENDIENTE_RECEPCION',
                                'EN_PROCESO',
                                'recepcion_planta',
                                row.garment_id,
                              )
                            }
                          >
                            Procesar
                          </CButton>
                        )}

                        {/* {canDispatch && (
                          <CButton
                            color="success"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              onApplyMovementAction(
                                'EN_PROCESO',
                                'EN_TRASLADO',
                                'inicio_traslado',
                                row.garment_id,
                              )
                            }
                          >
                            Enviar a traslado
                          </CButton>
                        )} */}

                        {canConfirmReception && (
                          <CButton
                            color="warning"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              onApplyMovementAction(
                                'EN_TRASLADO',
                                'CERRADO',
                                'recepcion_cliente',
                                row.garment_id,
                              )
                            }
                          >
                            Confirmar recepción
                          </CButton>
                        )}

                        {canIncident && (
                          <CButton
                            color="danger"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openIncidentModal(row.garment_id, row.status_id, row.quantity)
                            }
                          >
                            Cerrar con incidencia
                          </CButton>
                        )}

                        {!hasAction && '-'}
                      </div>
                    </CTableDataCell>
                  </CTableRow>
                )
              })}

              {currentBatchState.length === 0 && (
                <CTableRow>
                  <CTableDataCell colSpan={4} className="text-center">
                    No hay saldo actual registrado para este lote
                  </CTableDataCell>
                </CTableRow>
              )}
            </CTableBody>
          </CTable>
        </CCardBody>
      </CCard>

      {/*
       * =====================================================
       * TRAZABILIDAD
       * =====================================================
       */}

      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Trazabilidad</strong>

          <CButton
            color="secondary"
            size="sm"
            variant="outline"
            onClick={() => setShowTraceability((current) => !current)}
          >
            {showTraceability ? 'Ocultar trazabilidad' : 'Ver trazabilidad'}
          </CButton>
        </CCardHeader>

        {showTraceability && (
          <CCardBody>
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Fecha</CTableHeaderCell>

                  <CTableHeaderCell>Prenda</CTableHeaderCell>

                  <CTableHeaderCell>Desde</CTableHeaderCell>

                  <CTableHeaderCell>Hacia</CTableHeaderCell>

                  <CTableHeaderCell>Cantidad</CTableHeaderCell>

                  <CTableHeaderCell>Tipo</CTableHeaderCell>

                  <CTableHeaderCell>Usuario</CTableHeaderCell>

                  <CTableHeaderCell>Notas</CTableHeaderCell>
                </CTableRow>
              </CTableHead>

              <CTableBody>
                {movements.map((movement) => (
                  <CTableRow key={movement.id}>
                    <CTableDataCell>
                      {new Date(movement.createdAt).toLocaleString('es-CL')}
                    </CTableDataCell>

                    <CTableDataCell>{movement.garment?.code || '-'}</CTableDataCell>

                    <CTableDataCell>
                      {movement.from_status?.name || 'Ingreso inicial'}
                    </CTableDataCell>

                    <CTableDataCell>{movement.to_status?.name || '-'}</CTableDataCell>

                    <CTableDataCell>{movement.quantity}</CTableDataCell>

                    <CTableDataCell>{movement.movement_type}</CTableDataCell>

                    <CTableDataCell>{movement.creator?.name || '-'}</CTableDataCell>

                    <CTableDataCell>{movement.notes || '-'}</CTableDataCell>
                  </CTableRow>
                ))}

                {movements.length === 0 && (
                  <CTableRow>
                    <CTableDataCell colSpan={8} className="text-center">
                      No hay movimientos registrados
                    </CTableDataCell>
                  </CTableRow>
                )}
              </CTableBody>
            </CTable>
          </CCardBody>
        )}
      </CCard>

      {/*
       * =====================================================
       * MODAL INCIDENCIA
       * =====================================================
       */}

      <CModal visible={incidentVisible} onClose={closeIncidentModal} backdrop="static">
        <CModalHeader>
          <CModalTitle>Cerrar con incidencia</CModalTitle>
        </CModalHeader>

        <CModalBody>
          <CAlert color="warning">
            Esta cantidad quedará resuelta como incidencia y no como recepción normal.
          </CAlert>

          <div className="mb-3">
            <strong>Prenda:</strong>{' '}
            {incidentGarment?.code || incidentGarment?.description || 'Prenda'}
          </div>

          <div className="mb-3">
            <strong>Disponible:</strong> {incidentAvailable}
          </div>

          <CFormInput
            className="mb-3"
            type="number"
            label="Cantidad"
            min={1}
            max={incidentAvailable}
            value={incidentQuantity}
            onChange={(event) => setIncidentQuantity(Number(event.target.value))}
          />

          <CFormSelect
            className="mb-3"
            label="Motivo"
            value={incidentReason}
            onChange={(event) => setIncidentReason(event.target.value as OperatorIncidentReason)}
          >
            <option value="NOT_RECEIVED">No recibido</option>

            <option value="MISSING">Faltante</option>

            <option value="DAMAGED">Dañado</option>

            <option value="DISPATCH_DIFFERENCE">Diferencia de despacho</option>

            <option value="OTHER">Otro</option>
          </CFormSelect>

          <CFormTextarea
            label="Observación"
            rows={3}
            value={incidentDescription}
            onChange={(event) => setIncidentDescription(event.target.value)}
            placeholder="Describe qué ocurrió con estas unidades"
          />
        </CModalBody>

        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            disabled={incidentSubmitting}
            onClick={closeIncidentModal}
          >
            Cancelar
          </CButton>

          <CButton
            color="danger"
            disabled={
              incidentSubmitting ||
              !Number.isInteger(Number(incidentQuantity)) ||
              Number(incidentQuantity) <= 0 ||
              Number(incidentQuantity) > incidentAvailable
            }
            onClick={() => void submitIncident()}
          >
            {incidentSubmitting ? 'Registrando...' : 'Cerrar incidencia'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default BatchMovementPanel
