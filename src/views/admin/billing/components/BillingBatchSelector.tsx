import React from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormCheck,
  CFormTextarea,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import type {
  AvailableBillingBatch,
  BillingIncidentResolution,
} from '../../../../services/billing.service'

type Props = {
  batches: AvailableBillingBatch[]
  selectedBatchIds: string[]
  notes: string
  saving: boolean
  resolvingIncidentId: string | null
  clientBillingReady: boolean
  estimatedNet: number
  onToggleBatch: (batchId: string) => void
  onNotesChange: (value: string) => void
  onCreateDraft: () => void
  onResolveIncident: (
    incidentId: string,
    resolution: Exclude<BillingIncidentResolution, 'PENDING_REVIEW'>,
  ) => void
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('es-CL')
}

const BillingBatchSelector = ({
  batches,
  selectedBatchIds,
  notes,
  saving,
  resolvingIncidentId,
  clientBillingReady,
  estimatedNet,
  onToggleBatch,
  onNotesChange,
  onCreateDraft,
  onResolveIncident,
}: Props) => {
  const selectedHasPending = batches.some(
    (batch) => selectedBatchIds.includes(batch.id) && !batch.billing_ready,
  )

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <strong>Lotes disponibles</strong>
      </CCardHeader>

      <CCardBody>
        {batches.length === 0 && (
          <CAlert color="info">
            El cliente no tiene lotes cerrados disponibles para facturación.
          </CAlert>
        )}

        <CTable hover responsive align="middle">
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>Seleccionar</CTableHeaderCell>

              <CTableHeaderCell>Lote</CTableHeaderCell>

              <CTableHeaderCell>Fecha cierre</CTableHeaderCell>

              <CTableHeaderCell>Estado comercial</CTableHeaderCell>

              <CTableHeaderCell>Cant. facturable</CTableHeaderCell>

              <CTableHeaderCell>Neto estimado</CTableHeaderCell>
            </CTableRow>
          </CTableHead>

          <CTableBody>
            {batches.map((batch) => (
              <React.Fragment key={batch.id}>
                <CTableRow>
                  <CTableDataCell>
                    <CFormCheck
                      checked={selectedBatchIds.includes(batch.id)}
                      disabled={!batch.billing_ready}
                      onChange={() => onToggleBatch(batch.id)}
                    />
                  </CTableDataCell>

                  <CTableDataCell>
                    <strong>{batch.batch_number}</strong>
                  </CTableDataCell>

                  <CTableDataCell>{formatDate(batch.closed_at)}</CTableDataCell>

                  <CTableDataCell>
                    <CBadge color={batch.billing_ready ? 'success' : 'warning'}>
                      {batch.billing_ready
                        ? 'Listo'
                        : `Revisión (${batch.pending_review_quantity})`}
                    </CBadge>
                  </CTableDataCell>

                  <CTableDataCell>{batch.billable_quantity}</CTableDataCell>

                  <CTableDataCell>{formatMoney(batch.estimated_net)}</CTableDataCell>
                </CTableRow>

                {batch.items
                  .filter((item) => item.incidents?.length > 0)
                  .map((item) => (
                    <CTableRow key={`${batch.id}-${item.garment_id}-incidents`}>
                      <CTableDataCell />

                      <CTableDataCell colSpan={5}>
                        <div className="border rounded p-3">
                          <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
                            <div>
                              <strong>
                                {item.garment_description || item.garment_code || 'Prenda'}
                              </strong>

                              <div className="small text-body-secondary">
                                Enviadas: {item.quantity_sent}
                                {' · '}
                                Cerradas: {item.closed_quantity}
                                {' · '}
                                Facturables: {item.billable_quantity}
                              </div>

                              <div className="small text-body-secondary">
                                Precio TL c/IVA: {formatMoney(item.gross_unit_value)}
                                {' · '}
                                Neto unitario: {formatMoney(item.unit_value)}
                              </div>
                            </div>

                            {item.pending_review_quantity > 0 && (
                              <CBadge color="warning">Requiere decisión comercial</CBadge>
                            )}
                          </div>

                          {item.incidents.map((incident) => (
                            <div key={incident.id} className="border-top pt-2 mt-2">
                              <div className="d-flex flex-wrap justify-content-between gap-2">
                                <div>
                                  <strong>Incidencia: {incident.quantity} unidad(es)</strong>

                                  <div className="small">Motivo: {incident.reason}</div>

                                  {incident.description && (
                                    <div className="small text-body-secondary">
                                      {incident.description}
                                    </div>
                                  )}
                                </div>

                                {incident.billing_resolution === 'PENDING_REVIEW' ? (
                                  <div className="d-flex gap-2 align-items-start">
                                    <CButton
                                      size="sm"
                                      color="success"
                                      variant="outline"
                                      disabled={resolvingIncidentId === incident.id}
                                      onClick={() => onResolveIncident(incident.id, 'BILLABLE')}
                                    >
                                      Facturar
                                    </CButton>

                                    <CButton
                                      size="sm"
                                      color="danger"
                                      variant="outline"
                                      disabled={resolvingIncidentId === incident.id}
                                      onClick={() => onResolveIncident(incident.id, 'NON_BILLABLE')}
                                    >
                                      No facturar
                                    </CButton>

                                    {resolvingIncidentId === incident.id && <CSpinner size="sm" />}
                                  </div>
                                ) : (
                                  <CBadge
                                    color={
                                      incident.billing_resolution === 'BILLABLE'
                                        ? 'success'
                                        : 'secondary'
                                    }
                                  >
                                    {incident.billing_resolution === 'BILLABLE'
                                      ? 'Facturable'
                                      : 'No facturable'}
                                  </CBadge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
              </React.Fragment>
            ))}
          </CTableBody>
        </CTable>

        {selectedBatchIds.length > 0 && (
          <div className="mt-4">
            <CCard>
              <CCardBody>
                <div className="d-flex justify-content-between">
                  <span>Lotes seleccionados</span>

                  <strong>{selectedBatchIds.length}</strong>
                </div>

                <div className="d-flex justify-content-between mt-2">
                  <span>Neto estimado</span>

                  <strong>{formatMoney(estimatedNet)}</strong>
                </div>
              </CCardBody>
            </CCard>
          </div>
        )}

        {selectedHasPending && (
          <CAlert color="warning" className="mt-3">
            Hay incidencias pendientes de revisión comercial.
          </CAlert>
        )}

        <div className="mt-4">
          <CFormTextarea
            label="Observaciones"
            rows={3}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Observaciones internas de facturación"
          />
        </div>

        <div className="mt-3">
          <CButton
            color="primary"
            disabled={
              saving || selectedBatchIds.length === 0 || !clientBillingReady || selectedHasPending
            }
            onClick={onCreateDraft}
          >
            {saving ? 'Creando...' : 'Crear borrador'}
          </CButton>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default BillingBatchSelector
