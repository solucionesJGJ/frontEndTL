import React, {
    useEffect,
    useMemo,
    useState,
} from 'react'

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

import {
    getClients,
    type Client,
} from '../../../services/client.service'

import {
    getMovementStatuses,
    type MovementStatus,
} from '../../../services/movementStatus.service'

import {
    getStock,
    type StockItem,
} from '../../../services/stock.service'


const Stock = () => {

    const [
        stock,
        setStock,
    ] = useState<StockItem[]>([])

    const [
        clients,
        setClients,
    ] = useState<Client[]>([])

    const [
        statuses,
        setStatuses,
    ] = useState<MovementStatus[]>([])

    const [
        clientId,
        setClientId,
    ] = useState('')

    const [
        statusId,
        setStatusId,
    ] = useState('')

    const [
        loading,
        setLoading,
    ] = useState(false)


    /**
     * Total de unidades visibles
     * según los filtros aplicados.
     */
    const totalQuantity =
        useMemo(
            () => {

                return stock.reduce(
                    (
                        total,
                        item,
                    ) =>
                        total
                        +
                        Number(
                            item.quantity
                            || 0,
                        ),
                    0,
                )

            },
            [
                stock,
            ],
        )


    /**
     * Datos base para los filtros.
     */
    const loadBaseData =
        async () => {

            const [
                clientsData,
                statusesData,
            ] = await Promise.all([
                getClients(),
                getMovementStatuses(),
            ])


            setClients(
                clientsData.filter(
                    (client) =>
                        client.active,
                ),
            )


            setStatuses(
                statusesData,
            )
        }


    /**
     * Carga de stock.
     */
    const loadStock =
        async () => {

            const data =
                await getStock({
                    client_id:
                        clientId
                        || undefined,

                    status_id:
                        statusId
                        || undefined,
                })


            setStock(
                data,
            )
        }


    /**
     * Limpiar filtros.
     */
    const clearFilters =
        () => {

            setClientId(
                '',
            )

            setStatusId(
                '',
            )
        }


    /**
     * Carga inicial de clientes
     * y estados.
     */
    useEffect(
        () => {

            const load =
                async () => {

                    try {

                        setLoading(
                            true,
                        )

                        await loadBaseData()

                    } finally {

                        setLoading(
                            false,
                        )
                    }
                }


            load()

        },
        [],
    )


    /**
     * Recarga stock cuando
     * cambian los filtros.
     */
    useEffect(
        () => {

            const load =
                async () => {

                    try {

                        setLoading(
                            true,
                        )

                        await loadStock()

                    } finally {

                        setLoading(
                            false,
                        )
                    }
                }


            load()

        },
        [
            clientId,
            statusId,
        ],
    )


    return (

        <CCard>

            <CCardHeader>

                <strong>
                    Stock actual
                </strong>

            </CCardHeader>


            <CCardBody>

                {/*
                 * FILTROS
                 */}

                <CRow className="mb-4">

                    <CCol md={4}>

                        <CFormSelect
                            label="Cliente"
                            value={
                                clientId
                            }
                            onChange={
                                (
                                    e,
                                ) =>
                                    setClientId(
                                        e.target.value,
                                    )
                            }
                        >

                            <option value="">
                                Todos los clientes
                            </option>


                            {
                                clients.map(
                                    (
                                        client,
                                    ) => (

                                        <option
                                            key={
                                                client.id
                                            }
                                            value={
                                                client.id
                                            }
                                        >

                                            {
                                                client.name
                                            }

                                            {
                                                client.rut
                                                    ? ` (${client.rut})`
                                                    : ''
                                            }

                                        </option>

                                    ),
                                )
                            }

                        </CFormSelect>

                    </CCol>


                    <CCol md={4}>

                        <CFormSelect
                            label="Estado"
                            value={
                                statusId
                            }
                            onChange={
                                (
                                    e,
                                ) =>
                                    setStatusId(
                                        e.target.value,
                                    )
                            }
                        >

                            <option value="">
                                Todos los estados
                            </option>


                            {
                                statuses.map(
                                    (
                                        status,
                                    ) => (

                                        <option
                                            key={
                                                status.id
                                            }
                                            value={
                                                status.id
                                            }
                                        >

                                            {
                                                status.name
                                            }

                                        </option>

                                    ),
                                )
                            }

                        </CFormSelect>

                    </CCol>


                    <CCol
                        md={4}
                        className="d-flex align-items-end gap-2"
                    >

                        <CButton
                            color="secondary"
                            onClick={
                                clearFilters
                            }
                            disabled={
                                loading
                            }
                        >

                            Limpiar filtros

                        </CButton>

                    </CCol>

                </CRow>


                {/*
                 * RESUMEN
                 */}

                <div className="mb-3">

                    <strong>
                        Total unidades:
                    </strong>

                    {' '}

                    {
                        totalQuantity
                    }

                </div>


                {/*
                 * TABLA
                 */}

                <CTable
                    hover
                    responsive
                >

                    <CTableHead>

                        <CTableRow>

                            <CTableHeaderCell>
                                Cliente
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Código
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Nombre
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Descripción
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Color
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Estado
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Cantidad
                            </CTableHeaderCell>

                        </CTableRow>

                    </CTableHead>


                    <CTableBody>

                        {
                            stock.map(
                                (
                                    item,
                                ) => (

                                    <CTableRow
                                        key={
                                            item.id
                                        }
                                    >

                                        <CTableDataCell>

                                            {
                                                item.client
                                                    ?.name
                                                || '-'
                                            }

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            <strong>

                                                {
                                                    item.garment
                                                        ?.code
                                                    || '-'
                                                }

                                            </strong>

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            {
                                                item.garment
                                                    ?.size
                                                || '-'
                                            }

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            {
                                                item.garment
                                                    ?.description
                                                || '-'
                                            }

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            {
                                                item.garment
                                                    ?.color
                                                || '-'
                                            }

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            {
                                                item.status
                                                    ?.name
                                                || '-'
                                            }

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            <strong>

                                                {
                                                    item.quantity
                                                }

                                            </strong>

                                        </CTableDataCell>

                                    </CTableRow>

                                ),
                            )
                        }


                        {
                            stock.length ===
                            0
                            && (

                                <CTableRow>

                                    <CTableDataCell
                                        colSpan={
                                            7
                                        }
                                        className="text-center"
                                    >

                                        {
                                            loading
                                                ? 'Cargando stock...'
                                                : 'No hay stock registrado'
                                        }

                                    </CTableDataCell>

                                </CTableRow>

                            )
                        }

                    </CTableBody>

                </CTable>

            </CCardBody>

        </CCard>
    )
}


export default Stock