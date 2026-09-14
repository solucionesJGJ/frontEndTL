import React from 'react'
import { CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'

import { type OperatorBatch } from '../../../../services/operatorBatch.service'

type BatchHeaderProps = {
  batch: OperatorBatch | null
  role: string | null
  canManageBatchItems: boolean
  onDispatch: () => void | Promise<void>
  onDispatchToClient: () => void | Promise<void>
}

const BatchHeader = ({
  batch,
  role,
  canManageBatchItems,
  onDispatch,
  onDispatchToClient,
}: BatchHeaderProps) => {
  /**
   * Cliente -> planta.
   */
  const canDispatchToPlant =
    canManageBatchItems && batch?.current_status?.code === 'BORRADOR_CLIENTE'

  /**
   * Planta -> cliente.
   *
   * FLUJO DEFINITIVO:
   *
   * EN_PROCESO -> EN_TRASLADO
   */
  const canDispatchToClient =
    (role === 'admin' || role === 'warehouse_operator') &&
    batch?.current_status?.code === 'EN_PROCESO'

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <strong>Detalle de lote</strong>
      </CCardHeader>

      <CCardBody>
        <CRow>
          <CCol md={3}>
            <strong>N° Lote:</strong>

            <div>{batch?.batch_number || '-'}</div>
          </CCol>

          <CCol md={3}>
            <strong>Cliente:</strong>

            <div>{batch?.client?.name || '-'}</div>
          </CCol>

          <CCol md={3}>
            <strong>Estado:</strong>

            <div>{batch?.current_status?.name || '-'}</div>
          </CCol>

          <CCol md={3}>
            <strong>Creado por:</strong>

            <div>{batch?.creator?.name || '-'}</div>
          </CCol>

          {canDispatchToPlant && (
            <CCol md={3} className="mt-3">
              <CButton color="success" onClick={() => void onDispatch()}>
                Despachar a planta
              </CButton>
            </CCol>
          )}

          {canDispatchToClient && (
            <CCol md={3} className="mt-3">
              <CButton color="success" onClick={() => void onDispatchToClient()}>
                Despachar a cliente
              </CButton>
            </CCol>
          )}
        </CRow>
      </CCardBody>
    </CCard>
  )
}

export default BatchHeader
