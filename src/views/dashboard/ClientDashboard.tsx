import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    CBadge,
    CButton,
    CCard,
    CCardBody,
    CCardHeader,
    CCol,
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
    getClientDashboard,
    type ClientDashboard,
} from '../../services/dashboard.service'
import { useFeedback } from '../../context/FeedbackContext'

const formatCurrency = (value: number) => {
    return `$${Number(value || 0).toLocaleString('es-CL')}`
}

const getStatusColor = (code?: string) => {
    switch (code) {
        case 'BORRADOR_CLIENTE':
            return 'secondary'
        case 'PENDIENTE_RECEPCION':
            return 'warning'
        case 'RECEPCIONADO':
            return 'info'
        case 'EN_PROCESO':
            return 'primary'
        case 'REPROCESO':
            return 'danger'
        case 'DERIVADO_EXTERNO':
            return 'dark'
        case 'PREPARADO_DESPACHO':
            return 'success'
        case 'EN_TRASLADO':
            return 'info'
        case 'RETORNADO_CLIENTE':
            return 'success'
        case 'CERRADO':
            return 'secondary'
        default:
            return 'secondary'
    }
}

const ClientDashboardView = () => {
    const [dashboard, setDashboard] = useState<ClientDashboard | null>(null)
    const [loading, setLoading] = useState(true)

    const navigate = useNavigate()
    const { showBackendError } = useFeedback()

    const loadDashboard = async () => {
        try {
            setLoading(true)
            const data = await getClientDashboard()
            setDashboard(data)
        } catch (error) {
            showBackendError(error, 'Error cargando dashboard cliente')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadDashboard()
    }, [])

    const activeBatches = useMemo(() => {
        return dashboard?.batches.filter(
            (batch) => batch.current_status?.code !== 'CERRADO',
        ).length || 0
    }, [dashboard])

    if (loading) {
        return (
            <div className="d-flex justify-content-center py-5">
                <CSpinner />
            </div>
        )
    }

    return (
        <>
            <CCard className="mb-4">
                <CCardBody>
                    <h4 className="mb-0">Dashboard Cliente</h4>
                    <div className="text-body-secondary">
                        {dashboard?.client.name} {dashboard?.client.rut ? `(${dashboard.client.rut})` : ''}
                    </div>
                </CCardBody>
            </CCard>

            <CRow className="mb-4">
                <CCol md={3}>
                    <CCard>
                        <CCardBody>
                            <div className="text-body-secondary">Total lotes</div>
                            <h2>{dashboard?.totalBatches || 0}</h2>
                        </CCardBody>
                    </CCard>
                </CCol>

                <CCol md={3}>
                    <CCard>
                        <CCardBody>
                            <div className="text-body-secondary">Lotes activos</div>
                            <h2>{activeBatches}</h2>
                        </CCardBody>
                    </CCard>
                </CCol>

                <CCol md={3}>
                    <CCard>
                        <CCardBody>
                            <div className="text-body-secondary">Lotes cerrados</div>
                            <h2>{dashboard?.closedBatches || 0}</h2>
                        </CCardBody>
                    </CCard>
                </CCol>

                <CCol md={3}>
                    <CCard>
                        <CCardBody>
                            <div className="text-body-secondary">Total estimado</div>
                            <h2>{formatCurrency(dashboard?.estimatedTotal || 0)}</h2>
                        </CCardBody>
                    </CCard>
                </CCol>
            </CRow>

            <CCard className="mb-4">
                <CCardHeader>
                    <strong>Resumen por estado</strong>
                </CCardHeader>

                <CCardBody>
                    <CRow>
                        {dashboard?.statusSummary.map((item) => (
                            <CCol md={3} sm={6} key={item.current_status.id}>
                                <CCard className="mb-3">
                                    <CCardBody>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div className="text-body-secondary">
                                                {item.current_status.name}
                                            </div>

                                            <CBadge color={getStatusColor(item.current_status.code)}>
                                                {item.current_status.code}
                                            </CBadge>
                                        </div>

                                        <h3 className="mt-2">{Number(item.total)}</h3>
                                    </CCardBody>
                                </CCard>
                            </CCol>
                        ))}

                        {dashboard?.statusSummary.length === 0 && (
                            <CCol>
                                <div className="text-body-secondary">
                                    No hay lotes registrados.
                                </div>
                            </CCol>
                        )}
                    </CRow>
                </CCardBody>
            </CCard>

            <CCard>
                <CCardHeader>
                    <strong>Mis lotes</strong>
                </CCardHeader>

                <CCardBody>
                    <CTable hover responsive>
                        <CTableHead>
                            <CTableRow>
                                <CTableHeaderCell>Lote</CTableHeaderCell>
                                <CTableHeaderCell>Estado</CTableHeaderCell>
                                <CTableHeaderCell>Creación</CTableHeaderCell>
                                <CTableHeaderCell>Recepción</CTableHeaderCell>
                                <CTableHeaderCell>Cierre</CTableHeaderCell>
                                <CTableHeaderCell>Acciones</CTableHeaderCell>
                            </CTableRow>
                        </CTableHead>

                        <CTableBody>
                            {dashboard?.batches.map((batch) => (
                                <CTableRow key={batch.id}>
                                    <CTableDataCell>{batch.batch_number}</CTableDataCell>

                                    <CTableDataCell>
                                        <CBadge color={getStatusColor(batch.current_status?.code)}>
                                            {batch.current_status?.name || '-'}
                                        </CBadge>
                                    </CTableDataCell>

                                    <CTableDataCell>
                                        {batch.createdAt
                                            ? new Date(batch.createdAt).toLocaleString()
                                            : '-'}
                                    </CTableDataCell>

                                    <CTableDataCell>
                                        {batch.received_at
                                            ? new Date(batch.received_at).toLocaleString()
                                            : '-'}
                                    </CTableDataCell>

                                    <CTableDataCell>
                                        {batch.closed_at
                                            ? new Date(batch.closed_at).toLocaleString()
                                            : '-'}
                                    </CTableDataCell>

                                    <CTableDataCell>
                                        <CButton
                                            color="primary"
                                            size="sm"
                                            onClick={() => navigate(`/operator/batches/${batch.id}`)}
                                        >
                                            Ver detalle
                                        </CButton>
                                    </CTableDataCell>
                                </CTableRow>
                            ))}

                            {dashboard?.batches.length === 0 && (
                                <CTableRow>
                                    <CTableDataCell colSpan={6} className="text-center">
                                        No tienes lotes registrados.
                                    </CTableDataCell>
                                </CTableRow>
                            )}
                        </CTableBody>
                    </CTable>
                </CCardBody>
            </CCard>
        </>
    )
}

export default ClientDashboardView