import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import {
  getDispatchGuidePdf,
  getDispatchGuides,
  retryDispatchGuide,
  type DispatchGuide,
} from '../../../services/dispatchGuide.service'
import { useFeedback } from '../../../context/FeedbackContext'

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleString('es-CL')
}

function getStatusColor(status?: string | null) {
  switch (status) {
    case 'accepted':
      return 'success'

    case 'error':
    case 'rejected':
      return 'danger'

    case 'processing':
      return 'info'

    case 'pending':
      return 'warning'

    default:
      return 'secondary'
  }
}

function getStatusLabel(status?: string | null) {
  switch (status) {
    case 'accepted':
      return 'Aceptada'

    case 'error':
      return 'Error'

    case 'rejected':
      return 'Rechazada'

    case 'processing':
      return 'Procesando'

    case 'pending':
      return 'Pendiente'

    default:
      return status || '-'
  }
}

const DispatchGuides = () => {
  const [guides, setGuides] = useState<DispatchGuide[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [printingId, setPrintingId] = useState<string | null>(null)
  const { showAlert, showBackendError, confirmAction } = useFeedback()

  /**
   * =====================================================
   * CARGAR LISTADO
   * =====================================================
   */

  const loadGuides = async () => {
    try {
      setLoading(true)

      const data = await getDispatchGuides()

      setGuides(data)
    } catch (error) {
      showBackendError(error, 'Error cargando guías de despacho')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadGuides()
  }, [])

  /**
   * =====================================================
   * FILTRO LOCAL
   * =====================================================
   */

  const filteredGuides = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) {
      return guides
    }

    return guides.filter((guide) => {
      const values = [
        guide.batch?.batch_number,
        guide.receiver_name,
        guide.receiver_rut,
        guide.driver_name,
        guide.vehicle_plate,
        guide.engine_folio?.toString(),
        guide.status,
        guide.engine_status,
      ]

      return values.some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(term),
      )
    })
  }, [guides, search])

  /**
   * =====================================================
   * PDF
   * =====================================================
   */

  const handleOpenPdf = async (guide: DispatchGuide) => {
    if (!guide.engine_document_id) {
      showAlert('La guía todavía no tiene documento generado en el Motor', 'warning')

      return
    }

    /**
     * Abrimos antes del await para evitar
     * bloqueadores de popup.
     */
    const pdfWindow = window.open('', '_blank')

    if (!pdfWindow) {
      showAlert(
        'El navegador bloqueó la apertura del PDF. Habilite las ventanas emergentes.',
        'warning',
      )

      return
    }

    try {
      setPrintingId(guide.id)

      pdfWindow.document.write(`
                    <!doctype html>
                    <html>
                        <head>
                            <title>Cargando guía...</title>
                        </head>

                        <body
                            style="
                                font-family: Arial, sans-serif;
                                padding: 30px;
                            "
                        >
                            Cargando guía de despacho...
                        </body>
                    </html>
                `)

      const blob = await getDispatchGuidePdf(guide.id)
      const pdfUrl = URL.createObjectURL(blob)

      pdfWindow.location.href = pdfUrl

      window.setTimeout(() => {
        URL.revokeObjectURL(pdfUrl)
      }, 60_000)
    } catch (error) {
      pdfWindow.close()

      showBackendError(error, 'No fue posible obtener el PDF de la guía')
    } finally {
      setPrintingId(null)
    }
  }

  /**
   * =====================================================
   * RETRY
   * =====================================================
   */

  const handleRetry = async (guide: DispatchGuide) => {
    const confirmation = await confirmAction({
      title: 'Reintentar guía',
      message: `Se volverá a procesar la guía del lote ${guide.batch?.batch_number || '-'}.`,
      confirmText: 'Reintentar',
      color: 'warning',
    })

    if (!confirmation.confirmed) {
      return
    }

    try {
      setRetryingId(guide.id)

      const updated = await retryDispatchGuide(guide.id)

      setGuides((previous) => previous.map((item) => (item.id === updated.id ? updated : item)))

      if (updated.status === 'accepted') {
        showAlert(`Guía procesada correctamente. Folio ${updated.engine_folio ?? '-'}.`, 'success')
      } else {
        showAlert(`Guía procesada. Estado: ${updated.status}.`, 'info')
      }
    } catch (error) {
      showBackendError(error, 'Error reintentando guía')

      await loadGuides()
    } finally {
      setRetryingId(null)
    }
  }

  return (
    <CCard>
      <CCardHeader>
        <strong>Guías de despacho</strong>
      </CCardHeader>

      <CCardBody>
        <CRow className="mb-3">
          <CCol md={5}>
            <CFormInput
              placeholder="Buscar lote, cliente, RUT, conductor, patente o folio..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </CCol>

          <CCol md={7} className="d-flex justify-content-end">
            <CButton
              color="secondary"
              variant="outline"
              disabled={loading}
              onClick={() => void loadGuides()}
            >
              {loading ? 'Actualizando...' : 'Actualizar'}
            </CButton>
          </CCol>
        </CRow>

        {loading && guides.length === 0 && (
          <div className="py-4 text-center">
            <CSpinner />

            <div className="mt-2">Cargando guías...</div>
          </div>
        )}

        {!loading && guides.length === 0 && (
          <CAlert color="info">Todavía no existen guías de despacho.</CAlert>
        )}

        {guides.length > 0 && (
          <CTable hover responsive align="middle">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Fecha</CTableHeaderCell>

                <CTableHeaderCell>Lote</CTableHeaderCell>

                <CTableHeaderCell>Cliente</CTableHeaderCell>

                <CTableHeaderCell>Folio</CTableHeaderCell>

                <CTableHeaderCell>Estado</CTableHeaderCell>

                <CTableHeaderCell>Conductor</CTableHeaderCell>

                <CTableHeaderCell>Patente</CTableHeaderCell>

                <CTableHeaderCell>Track ID</CTableHeaderCell>

                <CTableHeaderCell>Acciones</CTableHeaderCell>
              </CTableRow>
            </CTableHead>

            <CTableBody>
              {filteredGuides.map((guide) => (
                <CTableRow key={guide.id}>
                  <CTableDataCell>
                    {formatDateTime(guide.requested_at || guide.createdAt)}
                  </CTableDataCell>

                  <CTableDataCell>
                    <strong>{guide.batch?.batch_number || '-'}</strong>
                  </CTableDataCell>

                  <CTableDataCell>
                    <div>{guide.receiver_name}</div>

                    <small className="text-body-secondary">{guide.receiver_rut}</small>
                  </CTableDataCell>

                  <CTableDataCell>{guide.engine_folio ?? '-'}</CTableDataCell>

                  <CTableDataCell>
                    <CBadge color={getStatusColor(guide.status)}>
                      {getStatusLabel(guide.status)}
                    </CBadge>

                    {guide.engine_error && (
                      <div className="small text-danger mt-1">{guide.engine_error}</div>
                    )}
                  </CTableDataCell>

                  <CTableDataCell>
                    {guide.driver_name || guide.assigned_driver?.name || '-'}
                  </CTableDataCell>

                  <CTableDataCell>
                    {guide.vehicle_plate || guide.vehicle?.plate || '-'}
                  </CTableDataCell>

                  <CTableDataCell>
                    <small>{guide.engine_track_id || '-'}</small>
                  </CTableDataCell>

                  <CTableDataCell>
                    <div className="d-flex gap-2 flex-wrap">
                      {guide.status === 'accepted' && guide.engine_document_id && (
                        <CButton
                          size="sm"
                          color="primary"
                          variant="outline"
                          disabled={printingId === guide.id}
                          onClick={() => void handleOpenPdf(guide)}
                        >
                          {printingId === guide.id ? 'Cargando...' : 'PDF'}
                        </CButton>
                      )}

                      {guide.status === 'error' && (
                        <CButton
                          size="sm"
                          color="warning"
                          disabled={retryingId === guide.id}
                          onClick={() => void handleRetry(guide)}
                        >
                          {retryingId === guide.id ? 'Procesando...' : 'Reintentar'}
                        </CButton>
                      )}
                    </div>
                  </CTableDataCell>
                </CTableRow>
              ))}

              {filteredGuides.length === 0 && (
                <CTableRow>
                  <CTableDataCell colSpan={9} className="text-center">
                    No hay guías que coincidan con la búsqueda
                  </CTableDataCell>
                </CTableRow>
              )}
            </CTableBody>
          </CTable>
        )}
      </CCardBody>
    </CCard>
  )
}

export default DispatchGuides
