import React, { useEffect, useMemo, useState } from 'react'
import {
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
    getPlantDashboard,
    type PlantDashboard,
} from '../../services/dashboard.service'

import { useFeedback } from '../../context/FeedbackContext'

const formatCurrency = (value: number) => {
    return `$${Number(value || 0).toLocaleString('es-CL')}`
}

const PlantDashboardView = () => {
    const [dashboard, setDashboard] = useState<PlantDashboard | null>(null)
    const [loading, setLoading] = useState(true)

    const { showBackendError } = useFeedback()

    const loadDashboard = async () => {
        try {
            setLoading(true)
            const data = await getPlantDashboard()
            setDashboard(data)
        } catch (error) {
            showBackendError(error, 'Error cargando dashboard')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadDashboard()
    }, [])

    const totalInStatus = useMemo(() => {
        return (
            dashboard?.statusSummary.reduce(
                (total, item) => total + Number(item.total || 0),
                0,
            ) || 0
        )
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
        {!loading && (
        <>
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
                            <h2>{totalInStatus}</h2>
                        </CCardBody>
                    </CCard>
                </CCol>

                <CCol md={3}>
                    <CCard>
                        <CCardBody>
                            <div className="text-body-secondary">Ingresos estimados</div>
                            <h2>{formatCurrency(dashboard?.estimatedRevenue || 0)}</h2>
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
                                        <div className="text-body-secondary">
                                            {item.current_status.name}
                                        </div>
                                        <h3>{Number(item.total)}</h3>
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
                    <strong>Últimos lotes</strong>
                </CCardHeader>

                <CCardBody>
                    <CTable hover responsive>
                        <CTableHead>
                            <CTableRow>
                                <CTableHeaderCell>Lote</CTableHeaderCell>
                                <CTableHeaderCell>Cliente</CTableHeaderCell>
                                <CTableHeaderCell>Estado</CTableHeaderCell>
                                <CTableHeaderCell>Creación</CTableHeaderCell>
                                <CTableHeaderCell>Recepción</CTableHeaderCell>
                                <CTableHeaderCell>Cierre</CTableHeaderCell>
                            </CTableRow>
                        </CTableHead>

                        <CTableBody>
                            {dashboard?.recentBatches.map((batch) => (
                                <CTableRow key={batch.id}>
                                    <CTableDataCell>{batch.batch_number}</CTableDataCell>
                                    <CTableDataCell>{batch.client?.name || '-'}</CTableDataCell>
                                    <CTableDataCell>
                                        {batch.current_status?.name || '-'}
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
                                </CTableRow>
                            ))}

                            {dashboard?.recentBatches.length === 0 && (
                                <CTableRow>
                                    <CTableDataCell colSpan={6} className="text-center">
                                        No hay lotes recientes.
                                    </CTableDataCell>
                                </CTableRow>
                            )}
                        </CTableBody>
                    </CTable>
                </CCardBody>
            </CCard>
        </>)}
        </>
    )
}

export default PlantDashboardView