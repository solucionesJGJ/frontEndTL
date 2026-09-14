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
  CFormSelect,
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
  getClientBatchReport,
  type ClientReportRow,
  type ClientReportSummary,
} from '../../../services/clientReport.service'
import { useFeedback } from '../../../context/FeedbackContext'

type BatchOption = {
  id: string
  number: string
}

const EMPTY_SUMMARY: ClientReportSummary = {
  batch_count: 0,
  line_count: 0,
  quantity_sent: 0,
  quantity_received: 0,
  quantity_processed: 0,
  quantity_reprocessed: 0,
  quantity_returned: 0,
  total_value: 0,
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleDateString('es-CL')
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function getStatusColor(status?: string | null) {
  switch (status) {
    case 'BORRADOR_CLIENTE':
      return 'secondary'

    case 'PENDIENTE_RECEPCION':
      return 'warning'

    case 'RECEPCIONADO':
      return 'info'

    case 'EN_EVALUACION':
      return 'info'

    case 'EN_PROCESO':
      return 'primary'

    case 'REPROCESO':
      return 'warning'

    case 'DERIVADO_EXTERNO':
      return 'warning'

    case 'PREPARADO_DESPACHO':
      return 'info'

    case 'EN_TRASLADO':
      return 'primary'

    case 'RETORNADO_CLIENTE':
      return 'success'

    case 'CERRADO':
      return 'success'

    default:
      return 'secondary'
  }
}

const ClientReports = () => {
  const [rows, setRows] = useState<ClientReportRow[]>([])
  const [summary, setSummary] = useState<ClientReportSummary>(EMPTY_SUMMARY)

  /**
   * Guardamos los lotes encontrados
   * en la primera consulta sin filtros.
   *
   * De esta forma el selector no desaparece
   * cuando aplicamos un filtro de fecha.
   */
  const [batchOptions, setBatchOptions] = useState<BatchOption[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [batchId, setBatchId] = useState('')
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const { showAlert, showBackendError } = useFeedback()

  /**
   * Cantidad total de unidades que
   * actualmente aparecen en el resultado.
   */
  const totalOperations = useMemo(
    () => summary.quantity_sent + summary.quantity_reprocessed,
    [summary],
  )

  /**
   * Construimos lista única de lotes.
   */
  const buildBatchOptions = (reportRows: ClientReportRow[]) => {
    const map = new Map<string, string>()

    reportRows.forEach((row) => {
      if (row.batch_id && row.batch_number) {
        map.set(row.batch_id, row.batch_number)
      }
    })

    const options = Array.from(map.entries())
      .map(([id, number]) => ({
        id,
        number,
      }))
      .sort((a, b) =>
        b.number.localeCompare(a.number, 'es', {
          numeric: true,
        }),
      )

    setBatchOptions(options)
  }

  /**
   * Carga inicial:
   *
   * obtenemos todos los lotes permitidos
   * para el cliente autenticado.
   */
  const loadInitialData = async () => {
    try {
      setLoading(true)

      const result = await getClientBatchReport()

      setRows(result.rows)

      setSummary(result.summary)

      buildBatchOptions(result.rows)
    } catch (error) {
      showBackendError(error, 'Error cargando reportería')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Aplicar filtros.
   */
  const handleSearch = async () => {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      showAlert('La fecha desde no puede ser posterior a la fecha hasta', 'warning')

      return
    }

    try {
      setSearching(true)

      const result = await getClientBatchReport({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        batch_id: batchId || undefined,
      })

      setRows(result.rows)

      setSummary(result.summary)
    } catch (error) {
      showBackendError(error, 'Error obteniendo reportería')
    } finally {
      setSearching(false)
    }
  }

  /**
   * Volver a la consulta completa.
   */
  const handleClear = async () => {
    setDateFrom('')
    setDateTo('')
    setBatchId('')

    try {
      setSearching(true)

      const result = await getClientBatchReport()

      setRows(result.rows)

      setSummary(result.summary)

      buildBatchOptions(result.rows)
    } catch (error) {
      showBackendError(error, 'Error cargando reportería')
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <CSpinner />

        <span className="ms-3">Cargando reportería...</span>
      </div>
    )
  }

  return (
    <>
      {/*
       * =====================================================
       * FILTROS
       * =====================================================
       */}

      <CCard className="mb-4">
        <CCardHeader>
          <strong>Reportería de lotes</strong>
        </CCardHeader>

        <CCardBody>
          <CRow>
            <CCol md={3} className="mb-3">
              <CFormInput
                label="Fecha desde"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </CCol>

            <CCol md={3} className="mb-3">
              <CFormInput
                label="Fecha hasta"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </CCol>

            <CCol md={4} className="mb-3">
              <CFormSelect
                label="Lote"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
              >
                <option value="">Todos los lotes</option>

                {batchOptions.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.number}
                  </option>
                ))}
              </CFormSelect>
            </CCol>

            <CCol md={2} className="d-flex align-items-end gap-2 mb-3">
              <CButton color="primary" onClick={handleSearch} disabled={searching}>
                {searching ? 'Buscando...' : 'Buscar'}
              </CButton>

              <CButton
                color="secondary"
                variant="outline"
                onClick={handleClear}
                disabled={searching}
              >
                Limpiar
              </CButton>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/*
       * =====================================================
       * RESUMEN
       * =====================================================
       */}

      <CRow className="mb-4">
        <CCol sm={6} lg={3} className="mb-3">
          <CCard className="h-100">
            <CCardBody>
              <div className="text-body-secondary">Lotes</div>

              <div className="fs-3 fw-semibold">{summary.batch_count}</div>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol sm={6} lg={3} className="mb-3">
          <CCard className="h-100">
            <CCardBody>
              <div className="text-body-secondary">Unidades enviadas</div>

              <div className="fs-3 fw-semibold">
                {summary.quantity_sent.toLocaleString('es-CL')}
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol sm={6} lg={3} className="mb-3">
          <CCard className="h-100">
            <CCardBody>
              <div className="text-body-secondary">Unidades retornadas</div>

              <div className="fs-3 fw-semibold">
                {summary.quantity_returned.toLocaleString('es-CL')}
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol sm={6} lg={3} className="mb-3">
          <CCard className="h-100">
            <CCardBody>
              <div className="text-body-secondary">Valor histórico</div>

              <div className="fs-3 fw-semibold">{formatMoney(summary.total_value)}</div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/*
       * =====================================================
       * TABLA
       * =====================================================
       */}

      <CCard>
        <CCardHeader>
          <div className="d-flex justify-content-between align-items-center">
            <strong>Detalle</strong>

            <span className="text-body-secondary">
              {summary.line_count}

              {' línea(s)'}
            </span>
          </div>
        </CCardHeader>

        <CCardBody>
          {rows.length === 0 && (
            <CAlert color="info">No existen registros para los filtros seleccionados.</CAlert>
          )}

          <CTable hover responsive align="middle">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Fecha</CTableHeaderCell>

                <CTableHeaderCell>Lote</CTableHeaderCell>

                <CTableHeaderCell>Código</CTableHeaderCell>

                <CTableHeaderCell>Prenda</CTableHeaderCell>

                <CTableHeaderCell>Enviadas</CTableHeaderCell>

                <CTableHeaderCell>Recibidas</CTableHeaderCell>

                <CTableHeaderCell>Procesadas</CTableHeaderCell>

                <CTableHeaderCell>Reproceso</CTableHeaderCell>

                <CTableHeaderCell>Retornadas</CTableHeaderCell>

                <CTableHeaderCell>Valor unit.</CTableHeaderCell>

                <CTableHeaderCell>Total</CTableHeaderCell>

                <CTableHeaderCell>Estado</CTableHeaderCell>
              </CTableRow>
            </CTableHead>

            <CTableBody>
              {rows.map((row, index) => (
                <CTableRow key={`${row.batch_id}-${row.garment_id}-${index}`}>
                  <CTableDataCell>{formatDate(row.batch_date)}</CTableDataCell>

                  <CTableDataCell>
                    <strong>{row.batch_number}</strong>
                  </CTableDataCell>

                  <CTableDataCell>{row.garment_code || '-'}</CTableDataCell>

                  <CTableDataCell>
                    <div>{row.garment_description || '-'}</div>

                    <small className="text-body-secondary">
                      {[row.garment_size, row.garment_color].filter(Boolean).join(' / ') || ''}
                    </small>
                  </CTableDataCell>

                  <CTableDataCell>{row.quantity_sent}</CTableDataCell>

                  <CTableDataCell>{row.quantity_received}</CTableDataCell>

                  <CTableDataCell>{row.quantity_processed}</CTableDataCell>

                  <CTableDataCell>{row.quantity_reprocessed}</CTableDataCell>

                  <CTableDataCell>{row.quantity_returned}</CTableDataCell>

                  <CTableDataCell>{formatMoney(row.unit_value)}</CTableDataCell>

                  <CTableDataCell>
                    <strong>{formatMoney(row.calculated_total)}</strong>
                  </CTableDataCell>

                  <CTableDataCell>
                    <CBadge color={getStatusColor(row.status_code)}>
                      {row.status_name || '-'}
                    </CBadge>
                  </CTableDataCell>
                </CTableRow>
              ))}

              {rows.length === 0 && (
                <CTableRow>
                  <CTableDataCell colSpan={12} className="text-center">
                    Sin información
                  </CTableDataCell>
                </CTableRow>
              )}
            </CTableBody>
          </CTable>

          {rows.length > 0 && (
            <div className="mt-3 text-body-secondary">
              Total operaciones contabilizadas:{' '}
              <strong>{totalOperations.toLocaleString('es-CL')}</strong>
            </div>
          )}
        </CCardBody>
      </CCard>
    </>
  )
}

export default ClientReports
