import React, { useEffect, useMemo, useState } from 'react'
import {
    CButton,
    CCard,
    CCardBody,
    CCardHeader,
    CCol,
    CFormSelect,
    CRow,
    CTable,
    CTableBody,
    CTableDataCell,
    CTableHead,
    CTableHeaderCell,
    CTableRow,
} from '@coreui/react'

import { getClients, type Client } from '../../../services/client.service'
import {
    getMovementStatuses,
    type MovementStatus,
} from '../../../services/movementStatus.service'
import { getStock, type StockItem } from '../../../services/stock.service'

const Stock = () => {
    const [stock, setStock] = useState<StockItem[]>([])
    const [clients, setClients] = useState<Client[]>([])
    const [statuses, setStatuses] = useState<MovementStatus[]>([])

    const [clientId, setClientId] = useState('')
    const [statusId, setStatusId] = useState('')
    const [loading, setLoading] = useState(false)

    const totalQuantity = useMemo(() => {
        return stock.reduce((total, item) => total + item.quantity, 0)
    }, [stock])

    const loadBaseData = async () => {
        const [clientsData, statusesData] = await Promise.all([
            getClients(),
            getMovementStatuses(),
        ])

        setClients(clientsData.filter((client) => client.active))
        setStatuses(statusesData)
    }

    const loadStock = async () => {
        const data = await getStock({
            client_id: clientId || undefined,
            status_id: statusId || undefined,
        })

        setStock(data)
    }

    const clearFilters = async () => {
        setClientId('')
        setStatusId('')
    }

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            await loadBaseData()
            setLoading(false)
        }
        if (!loading)
            load()
    }, [])

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            await loadStock()
            setLoading(false)
        }
        if (!loading)
            load()
    }, [clientId, statusId])

    return (
        <CCard>
            <CCardHeader>
                <strong>Stock actual</strong>
            </CCardHeader>

            <CCardBody>
                <CRow className="mb-4">
                    <CCol md={4}>
                        <CFormSelect
                            label="Cliente"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                        >
                            <option value="">Todos los clientes</option>
                            {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                    {client.name} {client.rut ? `(${client.rut})` : ''}
                                </option>
                            ))}
                        </CFormSelect>
                    </CCol>

                    <CCol md={4}>
                        <CFormSelect
                            label="Estado"
                            value={statusId}
                            onChange={(e) => setStatusId(e.target.value)}
                        >
                            <option value="">Todos los estados</option>
                            {statuses.map((status) => (
                                <option key={status.id} value={status.id}>
                                    {status.name}
                                </option>
                            ))}
                        </CFormSelect>
                    </CCol>

                    <CCol md={4} className="d-flex align-items-end gap-2">
                        <CButton color="secondary" onClick={clearFilters}>
                            Limpiar filtros
                        </CButton>
                    </CCol>
                </CRow>

                <div className="mb-3">
                    <strong>Total unidades:</strong> {totalQuantity}
                </div>

                <CTable hover responsive>
                    <CTableHead>
                        <CTableRow>
                            <CTableHeaderCell>Cliente</CTableHeaderCell>
                            <CTableHeaderCell>Código</CTableHeaderCell>
                            <CTableHeaderCell>Tipo</CTableHeaderCell>
                            <CTableHeaderCell>Descripción</CTableHeaderCell>
                            <CTableHeaderCell>Talla</CTableHeaderCell>
                            <CTableHeaderCell>Color</CTableHeaderCell>
                            <CTableHeaderCell>Estado</CTableHeaderCell>
                            <CTableHeaderCell>Cantidad</CTableHeaderCell>
                        </CTableRow>
                    </CTableHead>

                    <CTableBody>
                        {stock.map((item) => (
                            <CTableRow key={item.id}>
                                <CTableDataCell>{item.client?.name || '-'}</CTableDataCell>
                                <CTableDataCell>{item.garment?.code || '-'}</CTableDataCell>
                                <CTableDataCell>{item.garment?.type?.name || '-'}</CTableDataCell>
                                <CTableDataCell>
                                    {item.garment?.description || '-'}
                                </CTableDataCell>
                                <CTableDataCell>{item.garment?.size || '-'}</CTableDataCell>
                                <CTableDataCell>{item.garment?.color || '-'}</CTableDataCell>
                                <CTableDataCell>{item.status?.name || '-'}</CTableDataCell>
                                <CTableDataCell>
                                    <strong>{item.quantity}</strong>
                                </CTableDataCell>
                            </CTableRow>
                        ))}

                        {stock.length === 0 && (
                            <CTableRow>
                                <CTableDataCell colSpan={8} className="text-center">
                                    No hay stock registrado
                                </CTableDataCell>
                            </CTableRow>
                        )}
                    </CTableBody>
                </CTable>
            </CCardBody>
        </CCard>
    )
}

export default Stock