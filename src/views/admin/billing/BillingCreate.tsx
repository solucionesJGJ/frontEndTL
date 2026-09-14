import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormCheck,
  CFormInput,
  CFormSelect,
  CFormTextarea,
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
  cancelBillingDraft,
  confirmBillingDocument,
  createBillingDraft,
  getAvailableBillingBatches,
  getBillingDocument,
  sendBillingDocumentToEngine,
  updateBillingItemDiscount,
  getBillingDocuments,
  type AvailableBillingBatch,
  type BillingClientInfo,
  type BillingDocument,
  type BillingEngineResult,
  getBillingPdf,
  updateIncidentBillingResolution,
  type BillingIncidentResolution,
} from '../../../services/billing.service'
import { getClients, type Client } from '../../../services/client.service'
import { useFeedback } from '../../../context/FeedbackContext'
import BillingBatchSelector from './components/BillingBatchSelector'

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

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleDateString('es-CL')
}

const BillingCreate = () => {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [billingClient, setBillingClient] = useState<BillingClientInfo | null>(null)
  const [availableBatches, setAvailableBatches] = useState<AvailableBillingBatch[]>([])
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [currentDocument, setCurrentDocument] = useState<BillingDocument | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)
  const [sendingToEngine, setSendingToEngine] = useState(false)
  const [engineResult, setEngineResult] = useState<BillingEngineResult | null>(null)
  const [printingPdf, setPrintingPdf] = useState(false)
  const [billingHistory, setBillingHistory] = useState<BillingDocument[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [resolvingIncidentId, setResolvingIncidentId] = useState<string | null>(null)
  const { showAlert, showBackendError, confirmAction } = useFeedback()
  const isDraft = currentDocument?.status === 'draft'
  const isConfirmed = currentDocument?.status === 'confirmed'
  const isCompleted = currentDocument?.status === 'completed'
  const hasEngineError = currentDocument?.status === 'error'

  const selectedBatches = useMemo(
    () => availableBatches.filter((batch) => selectedBatchIds.includes(batch.id)),
    [availableBatches, selectedBatchIds],
  )

  const estimatedNet = useMemo(
    () => selectedBatches.reduce((total, batch) => total + Number(batch.estimated_net || 0), 0),
    [selectedBatches],
  )

  const loadClients = async () => {
    try {
      const data = await getClients()

      setClients(data)
    } catch (error) {
      showBackendError(error, 'Error cargando clientes')
    }
  }

  const handleClientChange = async (clientId: string) => {
    setSelectedClientId(clientId)

    setSelectedBatchIds([])
    setBillingClient(null)
    setAvailableBatches([])
    setCurrentDocument(null)
    setNotes('')
    setBillingHistory([])

    if (!clientId) {
      return
    }

    try {
      setLoading(true)
      setLoadingHistory(true)

      const [availableResult, historyResult] = await Promise.all([
        getAvailableBillingBatches(clientId),
        getBillingDocuments({
          client_id: clientId,
        }),
      ])

      setBillingClient(availableResult.client)

      setAvailableBatches(availableResult.batches)

      setBillingHistory(historyResult)
    } catch (error) {
      showBackendError(error, 'Error cargando información del cliente')
    } finally {
      setLoading(false)
      setLoadingHistory(false)
    }
  }

  const toggleBatch = (batchId: string) => {
    setSelectedBatchIds((previous) => {
      if (previous.includes(batchId)) {
        return previous.filter((id) => id !== batchId)
      }

      return [...previous, batchId]
    })
  }

  const refreshAvailableBatches = async () => {
    if (!selectedClientId) {
      return
    }

    const availableResult = await getAvailableBillingBatches(selectedClientId)

    setBillingClient(availableResult.client)

    setAvailableBatches(availableResult.batches)

    setSelectedBatchIds((previous) =>
      previous.filter((batchId) =>
        availableResult.batches.some((batch) => batch.id === batchId && batch.billing_ready),
      ),
    )
  }

  const handleResolveIncident = async (
    incidentId: string,
    resolution: Exclude<BillingIncidentResolution, 'PENDING_REVIEW'>,
  ) => {
    const result = await confirmAction({
      title: resolution === 'BILLABLE' ? 'Facturar incidencia' : 'No facturar incidencia',
      message:
        resolution === 'BILLABLE'
          ? 'La cantidad de esta incidencia se incluirá en la factura.'
          : 'La cantidad de esta incidencia quedará trazada, pero no se cobrará.',
      confirmText: resolution === 'BILLABLE' ? 'Marcar facturable' : 'Marcar no facturable',
      color: resolution === 'BILLABLE' ? 'success' : 'danger',
    })

    if (!result.confirmed) {
      return
    }

    try {
      setResolvingIncidentId(incidentId)

      await updateIncidentBillingResolution(incidentId, resolution)

      await refreshAvailableBatches()

      showAlert(
        resolution === 'BILLABLE'
          ? 'Incidencia marcada como facturable'
          : 'Incidencia marcada como no facturable',
        'success',
      )
    } catch (error) {
      showBackendError(error, 'Error resolviendo incidencia comercial')
    } finally {
      setResolvingIncidentId(null)
    }
  }

  const handleCreateDraft = async () => {
    if (!selectedClientId) {
      showAlert('Debe seleccionar un cliente', 'warning')

      return
    }

    if (selectedBatchIds.length === 0) {
      showAlert('Debe seleccionar al menos un lote', 'warning')

      return
    }

    if (billingClient && !billingClient.billing_ready) {
      showAlert(
        `Faltan antecedentes tributarios: ${billingClient.missing_fields.join(', ')}`,
        'warning',
      )

      return
    }

    const result = await confirmAction({
      title: 'Crear borrador de facturación',
      message:
        'Se crearán las líneas usando las cantidades comercialmente facturables. Los precios históricos de TL incluyen IVA y el backend extraerá su valor neto tributario.',
      confirmText: 'Crear borrador',
      color: 'primary',
      fields: [
        {
          label: 'Cliente',
          value: billingClient?.legal_name || billingClient?.name || '-',
        },
        {
          label: 'Lotes',
          value: selectedBatchIds.length,
        },
        {
          label: 'Neto estimado',
          value: formatMoney(estimatedNet),
        },
      ],
    })

    if (!result.confirmed) {
      return
    }

    try {
      setSaving(true)

      const created = await createBillingDraft({
        client_id: selectedClientId,
        batch_ids: selectedBatchIds,
        notes: notes.trim() || undefined,
      })

      const document = await getBillingDocument(created.id)

      setCurrentDocument(document)

      showAlert('Borrador de facturación creado correctamente', 'success')
    } catch (error) {
      showBackendError(error, 'Error creando facturación')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscount = async (itemId: string, value: string) => {
    if (!currentDocument) {
      return
    }

    const discount = Number(value)

    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      showAlert('El descuento debe estar entre 0 y 100', 'warning')

      return
    }

    try {
      setUpdatingItemId(itemId)

      await updateBillingItemDiscount(currentDocument.id, itemId, discount)

      const refreshed = await getBillingDocument(currentDocument.id)

      setCurrentDocument(refreshed)
    } catch (error) {
      showBackendError(error, 'Error actualizando descuento')
    } finally {
      setUpdatingItemId(null)
    }
  }

  const handleConfirmDocument = async () => {
    if (!currentDocument) {
      return
    }

    const result = await confirmAction({
      title: 'Confirmar facturación',
      message:
        'Después de confirmar no podrá modificar descuentos ni volver a utilizar estos lotes en otra facturación.',
      confirmText: 'Confirmar facturación',
      color: 'success',
      fields: [
        {
          label: 'Neto',
          value: formatMoney(currentDocument.net_amount),
        },
        {
          label: 'IVA',
          value: formatMoney(currentDocument.tax_amount),
        },
        {
          label: 'Total',
          value: formatMoney(currentDocument.total_amount),
        },
      ],
    })

    if (!result.confirmed) {
      return
    }

    try {
      setSaving(true)

      await confirmBillingDocument(currentDocument.id)

      const refreshed = await getBillingDocument(currentDocument.id)

      setCurrentDocument(refreshed)

      showAlert('Facturación confirmada correctamente', 'success')
    } catch (error) {
      showBackendError(error, 'Error confirmando facturación')
    } finally {
      setSaving(false)
    }
  }

  const handleSendToEngine = async () => {
    if (!currentDocument) {
      return
    }

    const result = await confirmAction({
      title: hasEngineError ? 'Reintentar facturación' : 'Enviar a facturación',
      message: hasEngineError
        ? 'Se reintentará el procesamiento del documento en el Motor de Facturación.'
        : 'La facturación será enviada al Motor, se asignará el folio y se procesará el DTE.',
      confirmText: hasEngineError ? 'Reintentar' : 'Enviar a facturación',
      color: hasEngineError ? 'warning' : 'primary',
      fields: [
        {
          label: 'Razón social',
          value: currentDocument.receiver_legal_name,
        },
        {
          label: 'Neto',
          value: formatMoney(currentDocument.net_amount),
        },
        {
          label: 'IVA',
          value: formatMoney(currentDocument.tax_amount),
        },
        {
          label: 'Total',
          value: formatMoney(currentDocument.total_amount),
        },
      ],
    })

    if (!result.confirmed) {
      return
    }

    try {
      setSendingToEngine(true)

      setEngineResult(null)

      const response = await sendBillingDocumentToEngine(currentDocument.id)

      setEngineResult(response)

      const refreshed = await getBillingDocument(currentDocument.id)

      setCurrentDocument(refreshed)

      if (response.status === 'completed') {
        showAlert(`Facturación procesada correctamente. Folio ${response.engine.folio}.`, 'success')
      } else {
        showAlert(`Documento enviado al Motor. Estado: ${response.engine.status}`, 'info')
      }
    } catch (error) {
      /*
       * Importante:
       *
       * Aunque falle la petición,
       * volvemos a consultar TL.
       *
       * Así podemos mostrar el
       * verdadero estado almacenado
       * por el backend.
       */

      try {
        const refreshed = await getBillingDocument(currentDocument.id)

        setCurrentDocument(refreshed)
      } catch {
        // No ocultamos el error original.
      }

      showBackendError(error, 'Error enviando facturación al Motor')
    } finally {
      setSendingToEngine(false)
    }
  }

  const handlePrintInvoice = async () => {
    if (!currentDocument) {
      return
    }

    if (!currentDocument.engine_document_id) {
      showAlert('La facturación todavía no tiene documento generado en el Motor', 'warning')

      return
    }

    /*
     * Abrimos la pestaña ANTES del await.
     *
     * Si hacemos window.open después
     * de esperar la petición HTTP,
     * algunos navegadores pueden
     * considerarlo un popup y bloquearlo.
     */

    const pdfWindow = window.open('', '_blank')

    if (!pdfWindow) {
      showAlert(
        'El navegador bloqueó la apertura del PDF. Habilite las ventanas emergentes para este sitio.',
        'warning',
      )

      return
    }

    try {
      setPrintingPdf(true)

      /*
       * Mientras esperamos mostramos
       * algo en la pestaña nueva.
       */

      pdfWindow.document.write(
        `
                <!doctype html>
                <html>
                    <head>
                        <title>Cargando factura...</title>
                    </head>
                    <body
                        style="
                            font-family: Arial, sans-serif;
                            padding: 30px;
                        "
                    >
                        Generando documento...
                    </body>
                </html>
                `,
      )

      const pdfBlob = await getBillingPdf(currentDocument.id)
      const pdfUrl = URL.createObjectURL(pdfBlob)

      pdfWindow.location.href = pdfUrl

      /*
       * El navegador necesita conservar
       * el Blob mientras el visor PDF
       * termina de cargarlo.
       */

      window.setTimeout(() => {
        URL.revokeObjectURL(pdfUrl)
      }, 60_000)
    } catch (error) {
      pdfWindow.close()

      showBackendError(error, 'No fue posible obtener la factura PDF')
    } finally {
      setPrintingPdf(false)
    }
  }

  const handleCancelDraft = async () => {
    if (!currentDocument) {
      return
    }

    const result = await confirmAction({
      title: 'Cancelar borrador',
      message: 'Los lotes seleccionados volverán a quedar disponibles para facturación.',
      confirmText: 'Cancelar borrador',
      color: 'danger',
    })

    if (!result.confirmed) {
      return
    }

    try {
      setSaving(true)

      await cancelBillingDraft(currentDocument.id)

      showAlert('Borrador cancelado correctamente', 'success')

      await handleClientChange(selectedClientId)
    } catch (error) {
      showBackendError(error, 'Error cancelando borrador')
    } finally {
      setSaving(false)
    }
  }

  const handleOpenBillingDocument = async (documentId: string) => {
    try {
      setLoading(true)

      const document = await getBillingDocument(documentId)

      setCurrentDocument(document)

      setEngineResult(null)
    } catch (error) {
      showBackendError(error, 'Error cargando facturación')
    } finally {
      setLoading(false)
    }
  }

  const handleCloseBillingDocument = () => {
    setCurrentDocument(null)

    setEngineResult(null)
  }

  useEffect(() => {
    loadClients()
  }, [])

  return (
    <>
      <CCard className="mb-4">
        <CCardHeader>
          <strong>Nueva facturación</strong>
        </CCardHeader>

        <CCardBody>
          <CRow>
            <CCol md={6} className="mb-3">
              <CFormSelect
                label="Cliente"
                value={selectedClientId}
                disabled={currentDocument !== null}
                onChange={(e) => handleClientChange(e.target.value)}
              >
                <option value="">Seleccione cliente</option>

                {clients
                  .filter((client) => client.active)
                  .map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}

                      {client.rut ? ` — ${client.rut}` : ''}
                    </option>
                  ))}
              </CFormSelect>
            </CCol>
          </CRow>

          {loading && (
            <div className="py-3">
              <CSpinner size="sm" />

              <span className="ms-2">Cargando lotes...</span>
            </div>
          )}

          {billingClient && !billingClient.billing_ready && (
            <CAlert color="warning">
              <strong>Cliente incompleto para facturación.</strong>

              <div className="mt-1">Faltan: {billingClient.missing_fields.join(', ')}</div>
            </CAlert>
          )}

          {billingClient && billingClient.billing_ready && (
            <CAlert color="success">Antecedentes tributarios completos.</CAlert>
          )}

          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={handleCloseBillingDocument}
          >
            Volver
          </CButton>
        </CCardBody>
      </CCard>
      {billingClient && !currentDocument && (
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Documentos emitidos</strong>
          </CCardHeader>

          <CCardBody>
            {loadingHistory ? (
              <div className="py-3">
                <CSpinner size="sm" />

                <span className="ms-2">Cargando documentos...</span>
              </div>
            ) : billingHistory.length === 0 ? (
              <CAlert color="info">Este cliente todavía no tiene documentos de facturación.</CAlert>
            ) : (
              <CTable hover responsive align="middle">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Fecha</CTableHeaderCell>

                    <CTableHeaderCell>Estado</CTableHeaderCell>

                    <CTableHeaderCell>Neto</CTableHeaderCell>

                    <CTableHeaderCell>IVA</CTableHeaderCell>

                    <CTableHeaderCell>Total</CTableHeaderCell>

                    <CTableHeaderCell>Motor</CTableHeaderCell>

                    <CTableHeaderCell>Acciones</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>

                <CTableBody>
                  {billingHistory.map((document) => (
                    <CTableRow key={document.id}>
                      <CTableDataCell>{formatDate(document.createdAt)}</CTableDataCell>

                      <CTableDataCell>
                        <CBadge
                          color={
                            document.status === 'completed'
                              ? 'success'
                              : document.status === 'error'
                                ? 'danger'
                                : document.status === 'draft'
                                  ? 'warning'
                                  : document.status === 'confirmed'
                                    ? 'info'
                                    : 'secondary'
                          }
                        >
                          {document.status}
                        </CBadge>
                      </CTableDataCell>

                      <CTableDataCell>{formatMoney(document.net_amount)}</CTableDataCell>

                      <CTableDataCell>{formatMoney(document.tax_amount)}</CTableDataCell>

                      <CTableDataCell>
                        <strong>{formatMoney(document.total_amount)}</strong>
                      </CTableDataCell>

                      <CTableDataCell>{document.engine_status || '-'}</CTableDataCell>

                      <CTableDataCell>
                        <CButton
                          size="sm"
                          color="primary"
                          variant="outline"
                          onClick={() => handleOpenBillingDocument(document.id)}
                        >
                          Ver
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            )}
          </CCardBody>
        </CCard>
      )}

      {billingClient && !currentDocument && (
        <BillingBatchSelector
          batches={availableBatches}
          selectedBatchIds={selectedBatchIds}
          notes={notes}
          saving={saving}
          resolvingIncidentId={resolvingIncidentId}
          clientBillingReady={billingClient.billing_ready}
          estimatedNet={estimatedNet}
          onToggleBatch={toggleBatch}
          onNotesChange={setNotes}
          onCreateDraft={handleCreateDraft}
          onResolveIncident={handleResolveIncident}
        />
      )}

      {currentDocument && (
        <>
          <CCard className="mb-4">
            <CCardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <strong>Detalle de facturación</strong>

                <CBadge
                  color={
                    currentDocument.status === 'draft'
                      ? 'warning'
                      : currentDocument.status === 'confirmed'
                        ? 'info'
                        : currentDocument.status === 'completed'
                          ? 'success'
                          : currentDocument.status === 'error'
                            ? 'danger'
                            : currentDocument.status === 'pending_engine' ||
                                currentDocument.status === 'engine_processing'
                              ? 'primary'
                              : 'secondary'
                  }
                >
                  {currentDocument.status}
                </CBadge>
              </div>
            </CCardHeader>

            <CCardBody>
              <CRow>
                <CCol md={4}>
                  <strong>Razón social</strong>

                  <div>{currentDocument.receiver_legal_name}</div>
                </CCol>

                <CCol md={2}>
                  <strong>RUT</strong>

                  <div>{currentDocument.receiver_rut}</div>
                </CCol>

                <CCol md={3}>
                  <strong>Giro</strong>

                  <div>{currentDocument.receiver_business_activity}</div>
                </CCol>

                <CCol md={3}>
                  <strong>Comuna</strong>

                  <div>{currentDocument.receiver_commune}</div>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>

          <CCard className="mb-4">
            <CCardHeader>
              <strong>Prendas a facturar</strong>
            </CCardHeader>

            <CCardBody>
              <CTable responsive hover align="middle">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Lote</CTableHeaderCell>

                    <CTableHeaderCell>Código</CTableHeaderCell>

                    <CTableHeaderCell>Prenda</CTableHeaderCell>

                    <CTableHeaderCell>Cantidad</CTableHeaderCell>

                    <CTableHeaderCell>Unitario</CTableHeaderCell>

                    <CTableHeaderCell>Subtotal</CTableHeaderCell>

                    <CTableHeaderCell style={{ minWidth: '120px' }}>Desc. %</CTableHeaderCell>

                    <CTableHeaderCell>Descuento</CTableHeaderCell>

                    <CTableHeaderCell>Neto línea</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>

                <CTableBody>
                  {currentDocument.items?.map((item) => (
                    <CTableRow key={item.id}>
                      <CTableDataCell>{item.batch?.batch_number || '-'}</CTableDataCell>

                      <CTableDataCell>{item.garment_code}</CTableDataCell>

                      <CTableDataCell>{item.garment_description}</CTableDataCell>

                      <CTableDataCell>{item.quantity}</CTableDataCell>

                      <CTableDataCell>{formatMoney(item.unit_value)}</CTableDataCell>

                      <CTableDataCell>{formatMoney(item.line_subtotal)}</CTableDataCell>

                      <CTableDataCell>
                        <CFormInput
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          defaultValue={item.discount_percentage}
                          disabled={!isDraft || updatingItemId === item.id}
                          onBlur={(e) => handleDiscount(item.id, e.target.value)}
                        />
                      </CTableDataCell>

                      <CTableDataCell>{formatMoney(item.discount_amount)}</CTableDataCell>

                      <CTableDataCell>
                        <strong>{formatMoney(item.line_total)}</strong>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>

          <CRow>
            <CCol lg={7} className="mb-4">
              <CCard className="h-100">
                <CCardHeader>
                  <strong>Lotes incluidos</strong>
                </CCardHeader>

                <CCardBody>
                  {currentDocument.batches?.map((record) => (
                    <div
                      key={record.id}
                      className="border-bottom py-2 d-flex justify-content-between"
                    >
                      <span>{record.batch?.batch_number || record.batch_id}</span>

                      <span className="text-body-secondary">
                        {formatDate(record.batch?.closed_at)}
                      </span>
                    </div>
                  ))}
                </CCardBody>
              </CCard>
            </CCol>

            <CCol lg={5} className="mb-4">
              <CCard>
                <CCardHeader>
                  <strong>Totales</strong>
                </CCardHeader>

                <CCardBody>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Subtotal</span>

                    <strong>{formatMoney(currentDocument.subtotal)}</strong>
                  </div>

                  <div className="d-flex justify-content-between mb-2">
                    <span>Descuentos</span>

                    <strong>- {formatMoney(currentDocument.discount_total)}</strong>
                  </div>

                  <hr />

                  <div className="d-flex justify-content-between mb-2">
                    <span>Neto</span>

                    <strong>{formatMoney(currentDocument.net_amount)}</strong>
                  </div>

                  <div className="d-flex justify-content-between mb-2">
                    <span>IVA {currentDocument.tax_rate}%</span>

                    <strong>{formatMoney(currentDocument.tax_amount)}</strong>
                  </div>

                  <hr />

                  <div className="d-flex justify-content-between fs-5">
                    <strong>TOTAL</strong>

                    <strong>{formatMoney(currentDocument.total_amount)}</strong>
                  </div>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>
          {engineResult && (
            <CAlert color={engineResult.status === 'completed' ? 'success' : 'info'}>
              <div>
                <strong>Facturación electrónica</strong>
              </div>

              <div className="mt-2">
                Folio: <strong>{engineResult.engine.folio}</strong>
              </div>

              <div>
                Estado Motor: <strong>{engineResult.engine.status}</strong>
              </div>

              <div>
                Estado SII: <strong>{engineResult.engine.sii.status}</strong>
              </div>

              {engineResult.engine.sii.track_id && (
                <div>
                  Track ID: <strong>{engineResult.engine.sii.track_id}</strong>
                </div>
              )}
            </CAlert>
          )}

          {isDraft && (
            <div className="d-flex gap-2">
              <CButton color="success" disabled={saving} onClick={handleConfirmDocument}>
                Confirmar facturación
              </CButton>

              <CButton
                color="danger"
                variant="outline"
                disabled={saving}
                onClick={handleCancelDraft}
              >
                Cancelar borrador
              </CButton>
            </div>
          )}

          {(isConfirmed || hasEngineError) && (
            <div className="d-flex gap-2">
              <CButton
                color={hasEngineError ? 'warning' : 'primary'}
                disabled={sendingToEngine}
                onClick={handleSendToEngine}
              >
                {sendingToEngine ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    Procesando...
                  </>
                ) : hasEngineError ? (
                  'Reintentar facturación'
                ) : (
                  'Enviar a facturación'
                )}
              </CButton>
            </div>
          )}
          {isCompleted &&
            currentDocument.engine_document_id &&
            currentDocument.engine_status === 'accepted' && (
              <div className="d-flex gap-2 mt-3">
                <CButton color="secondary" onClick={handlePrintInvoice} disabled={printingPdf}>
                  {printingPdf ? (
                    <>
                      <CSpinner size="sm" className="me-2" />
                      Generando PDF...
                    </>
                  ) : (
                    'Ver / imprimir factura'
                  )}
                </CButton>
              </div>
            )}
        </>
      )}
    </>
  )
}

export default BillingCreate
