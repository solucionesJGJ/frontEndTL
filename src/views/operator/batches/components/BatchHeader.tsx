import React from 'react'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
} from '@coreui/react'

import { type OperatorBatch } from '../../../../services/operatorBatch.service'
import { type DispatchGuide } from '../../../../services/dispatchGuide.service'

type BatchHeaderProps = {
  batch: OperatorBatch | null
  role: string | null
  canManageBatchItems: boolean
  dispatchGuide: DispatchGuide | null
  loadingDispatchGuide: boolean
  onDispatch: () => void | Promise<void>
  onDispatchToClient: () => void | Promise<void>
  onViewDispatchGuide: () => void | Promise<void>
  onPrintDispatchGuide: () => void | Promise<void>
}

const getGuideStatusColor = (status?: string | null) => {
  const normalizedStatus = status?.trim().toLowerCase()

  if (
    normalizedStatus === 'accepted' ||
    normalizedStatus === 'aceptado' ||
    normalizedStatus === 'aceptada'
  ) {
    return 'success'
  }

  if (
    normalizedStatus === 'error' ||
    normalizedStatus === 'rejected' ||
    normalizedStatus === 'rechazado' ||
    normalizedStatus === 'rechazada'
  ) {
    return 'danger'
  }

  if (
    normalizedStatus === 'processing' ||
    normalizedStatus === 'procesando'
  ) {
    return 'warning'
  }

  return 'secondary'
}

const BatchHeader = ({
  batch,
  role,
  canManageBatchItems,
  dispatchGuide,
  loadingDispatchGuide,
  onDispatch,
  onDispatchToClient,
  onViewDispatchGuide,
  onPrintDispatchGuide,
}: BatchHeaderProps) => {
  /**
   * Cliente -> planta.
   */
  const canDispatchToPlant =
    canManageBatchItems &&
    batch?.current_status?.code === 'BORRADOR_CLIENTE'

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

  /**
   * Admin y bodega pueden consultar
   * la guía asociada al lote.
   */
  const canViewDispatchGuide =
    role === 'admin' || role === 'warehouse_operator'

  /**
   * El PDF solamente está disponible
   * si existe una guía y el Motor ya
   * generó un documento.
   */
  const hasGuidePdf =
    Boolean(dispatchGuide) &&
    Boolean(dispatchGuide?.engine_document_id)

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <strong>Detalle de lote</strong>
      </CCardHeader>

      <CCardBody>
        {/*
         * =====================================================
         * DATOS DEL LOTE
         * =====================================================
         */}

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
        </CRow>

        {/*
         * =====================================================
         * ACCIONES DEL LOTE
         * =====================================================
         */}

        {(canDispatchToPlant || canDispatchToClient) && (
          <CRow className="mt-3">
            {canDispatchToPlant && (
              <CCol md="auto">
                <CButton
                  color="success"
                  onClick={() => void onDispatch()}
                >
                  Despachar a planta
                </CButton>
              </CCol>
            )}

            {canDispatchToClient && (
              <CCol md="auto">
                <CButton
                  color="success"
                  onClick={() => void onDispatchToClient()}
                >
                  Despachar a cliente
                </CButton>
              </CCol>
            )}
          </CRow>
        )}

        {/*
         * =====================================================
         * GUÍA DE DESPACHO
         * =====================================================
         *
         * Solamente visible para:
         *
         * - admin
         * - warehouse_operator
         *
         * Si el lote fue despachado sin guía,
         * simplemente no mostramos este bloque.
         * =====================================================
         */}

        {canViewDispatchGuide && dispatchGuide && (
          <>
            <hr className="my-4" />

            <CRow className="align-items-end">
              <CCol md={3}>
                <strong>Guía de despacho:</strong>

                <div>
                  {dispatchGuide.engine_folio
                    ? `N° ${dispatchGuide.engine_folio}`
                    : 'Pendiente de folio'}
                </div>
              </CCol>

              <CCol md={3}>
                <strong>Estado guía:</strong>

                <div className="mt-1">
                  <CBadge
                    color={getGuideStatusColor(
                      dispatchGuide.engine_status ||
                      dispatchGuide.status,
                    )}
                  >
                    {dispatchGuide.engine_status ||
                      dispatchGuide.status ||
                      'Pendiente'}
                  </CBadge>
                </div>
              </CCol>

              <CCol md={3}>
                <strong>Fecha emisión:</strong>

                <div>{dispatchGuide.departure_date || '-'}</div>
              </CCol>

              <CCol md={3}>
                <div className="d-flex gap-2">
                  <CButton
                    color="primary"
                    size="sm"
                    disabled={!hasGuidePdf}
                    onClick={() =>
                      void onViewDispatchGuide()
                    }
                  >
                    Ver guía
                  </CButton>

                  <CButton
                    color="secondary"
                    size="sm"
                    disabled={!hasGuidePdf}
                    onClick={() =>
                      void onPrintDispatchGuide()
                    }
                  >
                    Imprimir
                  </CButton>
                </div>
              </CCol>
            </CRow>

            {!hasGuidePdf && (
              <CRow className="mt-2">
                <CCol md={12}>
                  <small className="text-body-secondary">
                    La guía existe, pero su PDF todavía no está
                    disponible.
                  </small>
                </CCol>
              </CRow>
            )}
          </>
        )}

        {canViewDispatchGuide &&
          loadingDispatchGuide &&
          !dispatchGuide && (
            <CRow className="mt-3">
              <CCol md={12}>
                <small className="text-body-secondary">
                  Consultando guía de despacho...
                </small>
              </CCol>
            </CRow>
          )}
      </CCardBody>
    </CCard>
  )
}

export default BatchHeader