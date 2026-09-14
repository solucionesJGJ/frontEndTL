import React from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import { useOperatorBatches } from './hooks/useOperatorBatches'
import { getBatchActions } from './utils/batchStatusActions'

const OperatorBatches = () => {
  const {
    batches,
    clients,
    form,
    loading,
    role,
    clientOperator,
    canCreateBatch,
    canOperatePlant,
    handleChange,
    handleClientChange,
    handleSubmit,
    handleReceive,
    /*  handleEvaluate, */
    handleChangeStatus,
    handleOpenBatch,
    handleContinueReception,
  } = useOperatorBatches()

  return (
    <CCard>
      <CCardHeader>
        <strong>Creación de lotes</strong>
      </CCardHeader>

      <CCardBody>
        {/*
         * =====================================================
         * CREACIÓN
         * =====================================================
         */}

        {canCreateBatch && (
          <>
            <CRow className="mb-3">
              <CCol md={4}>
                <CFormSelect
                  label="Cliente"
                  value={form.client_id}
                  disabled={clientOperator}
                  onChange={(e) => void handleClientChange(e.target.value)}
                >
                  <option value="">Seleccione cliente</option>

                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}

                      {client.rut ? ` (${client.rut})` : ''}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol md={3}>
                <CFormInput label="Número de lote" value={form.batch_number} disabled />
              </CCol>

              <CCol md={3}>
                <CFormInput label="Origen" value={form.origin_location} disabled />
              </CCol>

              <CCol md={2}>
                <CFormInput label="Destino" value={form.destination_location} disabled />
              </CCol>
            </CRow>

            <CRow className="mb-4">
              <CCol md={8}>
                <CFormTextarea
                  label="Notas"
                  rows={1}
                  value={form.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                />
              </CCol>

              <CCol md={4} className="d-flex align-items-end">
                <CButton color="primary" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Guardando...' : 'Crear lote'}
                </CButton>
              </CCol>
            </CRow>
          </>
        )}

        {/*
         * =====================================================
         * LISTADO
         * =====================================================
         */}

        <CTable hover responsive>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>N° Lote</CTableHeaderCell>

              <CTableHeaderCell>Cliente</CTableHeaderCell>

              <CTableHeaderCell>Origen</CTableHeaderCell>

              <CTableHeaderCell>Destino</CTableHeaderCell>

              <CTableHeaderCell>Estado</CTableHeaderCell>

              <CTableHeaderCell>Creado por</CTableHeaderCell>

              <CTableHeaderCell>Recepción</CTableHeaderCell>

              <CTableHeaderCell>Acciones</CTableHeaderCell>
            </CTableRow>
          </CTableHead>

          <CTableBody>
            {batches.map((batch) => {
              const statusCode = batch.current_status?.code
              const reception = batch.reception_summary
              const receptionStatus = reception?.status || 'ZERO'
              const totalSent = Number(reception?.total_sent || 0)
              const totalReceived = Number(reception?.total_received || 0)
              const totalPending = Number(reception?.total_pending || 0)
              const availableActions = getBatchActions(role, statusCode)

              return (
                <CTableRow key={batch.id}>
                  <CTableDataCell>
                    <strong>{batch.batch_number}</strong>
                  </CTableDataCell>

                  <CTableDataCell>{batch.client?.name || '-'}</CTableDataCell>

                  <CTableDataCell>{batch.origin_location || '-'}</CTableDataCell>

                  <CTableDataCell>{batch.destination_location || '-'}</CTableDataCell>

                  <CTableDataCell>{batch.current_status?.name || '-'}</CTableDataCell>

                  <CTableDataCell>{batch.creator?.name || '-'}</CTableDataCell>

                  <CTableDataCell>
                    {receptionStatus === 'ZERO' && (
                      <div>
                        <strong>Pendiente</strong>

                        <div className="small text-body-secondary">
                          {totalReceived} / {totalSent} recibidas
                        </div>
                      </div>
                    )}

                    {receptionStatus === 'PARTIAL' && (
                      <div>
                        <strong className="text-warning">Parcial</strong>

                        <div className="small">
                          {totalReceived} / {totalSent} recibidas
                        </div>

                        <div className="small text-body-secondary">Pendientes: {totalPending}</div>
                      </div>
                    )}

                    {receptionStatus === 'COMPLETE' && (
                      <div>
                        <strong className="text-success">Completa</strong>

                        <div className="small">
                          {totalReceived} / {totalSent} recibidas
                        </div>
                      </div>
                    )}
                  </CTableDataCell>

                  <CTableDataCell>
                    <div className="d-flex gap-2 flex-wrap">
                      {/*
                       * -----------------------------
                       * DETALLE
                       * -----------------------------
                       */}

                      <CButton color="primary" size="sm" onClick={() => handleOpenBatch(batch.id)}>
                        Ver detalle
                      </CButton>

                      {/*
                       * -----------------------------
                       * RECEPCIÓN
                       * -----------------------------
                       */}
                      {/*  {canOperatePlant
                                                &&
                                                statusCode === 'PENDIENTE_RECEPCION'
                                                &&
                                                receptionStatus === 'ZERO'
                                                && (

                                                    <CButton
                                                        color="success"
                                                        size="sm"
                                                        onClick={
                                                            () =>
                                                                void handleReceive(
                                                                    batch,
                                                                )
                                                        }
                                                    >
                                                        Recepcionar lote
                                                    </CButton>

                                                )}


                                            {canOperatePlant
                                                &&
                                                statusCode === 'PENDIENTE_RECEPCION'
                                                &&
                                                receptionStatus === 'PARTIAL'
                                                && (

                                                    <CButton
                                                        color="warning"
                                                        size="sm"
                                                        onClick={
                                                            () =>
                                                                handleContinueReception(
                                                                    batch.id,
                                                                )
                                                        }
                                                    >
                                                        Continuar recepción
                                                    </CButton>

                                                )} */}
                      {/*
                       * -----------------------------
                       * EVALUACIÓN / PROCESO
                       *
                       * Este botón conserva el flujo
                       * especial evaluateOperatorBatch.
                       * -----------------------------
                       */}

                      {/*  {
                                                        canOperatePlant
                                                        &&
                                                        statusCode ===
                                                        'RECEPCIONADO'
                                                        && (

                                                            <CButton
                                                                color="primary"
                                                                size="sm"
                                                                onClick={
                                                                    () =>
                                                                        void handleEvaluate(
                                                                            batch,
                                                                            true,
                                                                        )
                                                                }
                                                            >

                                                                Procesar

                                                            </CButton>

                                                        )
                                                    } */}

                      {/*
                       * -----------------------------
                       * ACCIONES SEGÚN ESTADO / ROL
                       *
                       * Aquí aparecerá, entre otras:
                       *
                       * RECEPCIONADO
                       * → Enviar a traslado
                       *
                       * EN_PROCESO
                       * → Reproceso
                       * → Preparar despacho
                       *
                       * etc.
                       * -----------------------------
                       */}

                      {availableActions.map((action) => (
                        <CButton
                          key={action.code}
                          color={action.color}
                          size="sm"
                          onClick={() => void handleChangeStatus(batch, action.code, action.label)}
                        >
                          {action.label}
                        </CButton>
                      ))}
                    </div>
                  </CTableDataCell>
                </CTableRow>
              )
            })}

            {batches.length === 0 && (
              <CTableRow>
                <CTableDataCell colSpan={8} className="text-center">
                  {loading ? 'Cargando lotes...' : 'No hay lotes registrados'}
                </CTableDataCell>
              </CTableRow>
            )}
          </CTableBody>
        </CTable>
      </CCardBody>
    </CCard>
  )
}

export default OperatorBatches
