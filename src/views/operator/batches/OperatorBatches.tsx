import React, {
    useEffect,
    useState,
} from 'react'

import {
    CButton,
    CCard,
    CCardBody,
    CCardHeader,
    CCol,
    CFormInput,
    CFormSelect,
    CFormTextarea,
    CRow,
    CTable,
    CTableBody,
    CTableDataCell,
    CTableHead,
    CTableHeaderCell,
    CTableRow,
} from '@coreui/react'

import {
    useNavigate,
} from 'react-router-dom'

import {
    createOperatorBatch,
    getOperatorBatches,
    type OperatorBatch,
    evaluateOperatorBatch,
    changeOperatorBatchStatus,
    receiveOperatorBatch,
    previewOperatorBatchNumber,
} from '../../../services/operatorBatch.service'

import {
    getBatchItems,
} from '../../../services/operatorBatchItem.service'

import {
    getClients,
    type Client,
} from '../../../services/client.service'

import {
    getCurrentUser,
    isClientOperator,
    isAdmin,
    getCurrentRole,
} from '../../../services/auth.service'

import {
    useFeedback,
} from '../../../context/FeedbackContext'


/**
 * Formulario para creación de lote.
 *
 * El número de lote, origen y destino
 * son obtenidos desde el backend.
 */
const emptyForm = {
    client_id: '',
    batch_number: '',
    origin_location: 'Cliente',
    destination_location: 'Planta',
    notes: '',
}


const OperatorBatches = () => {

    const [
        batches,
        setBatches,
    ] = useState<OperatorBatch[]>([])

    const [
        clients,
        setClients,
    ] = useState<Client[]>([])

    const [
        form,
        setForm,
    ] = useState(emptyForm)

    const [
        loading,
        setLoading,
    ] = useState(false)


    const navigate =
        useNavigate()


    const currentUser =
        getCurrentUser()

    const clientOperator =
        isClientOperator()

    const adminUser =
        isAdmin()

    const role =
        getCurrentRole()


    /**
     * Administrador y operador cliente
     * pueden crear lotes.
     */
    const canCreateBatch =
        role === 'admin'
        ||
        role === 'client_operator'


    /**
     * Administrador y bodega/planta
     * pueden ejecutar operaciones de planta.
     */
    const canOperatePlant =
        role === 'admin'
        ||
        role === 'warehouse_operator'


    const {
        confirmAction,
        showAlert,
        showBackendError,
    } = useFeedback()


    /**
     * Obtiene las prendas del lote para
     * mostrarlas dentro de las confirmaciones.
     *
     * Ya NO existe garment.type.
     */
    const getBatchConfirmDetails =
        async (
            batchId: string,
        ) => {

            const items =
                await getBatchItems(
                    batchId,
                )


            return items.map(
                (item) => ({
                    item:
                        item.garment?.size
                        ||
                        item.garment?.description
                        ||
                        item.garment?.code
                        ||
                        'Artículo sin nombre',

                    quantity:
                        item.quantity_sent,
                }),
            )
        }


    /**
     * Cargar lotes y clientes.
     */
    const loadData =
        async () => {

            const [
                batchesData,
                clientsData,
            ] = await Promise.all([
                getOperatorBatches(),
                getClients(),
            ])


            setBatches(
                batchesData,
            )


            /**
             * Si es operador cliente,
             * solamente puede utilizar su
             * cliente asociado.
             */
            if (
                clientOperator
                &&
                currentUser?.client
            ) {

                setClients([
                    currentUser.client,
                ])


                setForm(
                    (prev) => ({
                        ...prev,

                        client_id:
                            currentUser
                                .client
                                .id,
                    }),
                )


                await loadBatchPreview(
                    currentUser
                        .client
                        .id,
                )

            } else {

                /**
                 * Administrador puede seleccionar
                 * cualquier cliente activo.
                 */
                setClients(
                    clientsData.filter(
                        (client) =>
                            client.active,
                    ),
                )
            }
        }


    /**
     * Obtener número de lote generado
     * por el backend.
     */
    const loadBatchPreview =
        async (
            clientId: string,
        ) => {

            if (!clientId) {

                setForm(
                    (prev) => ({
                        ...prev,

                        batch_number: '',

                        origin_location:
                            'Cliente',

                        destination_location:
                            'Planta',
                    }),
                )

                return
            }


            try {

                const preview =
                    await previewOperatorBatchNumber(
                        clientId,
                    )


                setForm(
                    (prev) => ({
                        ...prev,

                        batch_number:
                            preview
                                .batch_number,

                        origin_location:
                            preview
                                .origin_location,

                        destination_location:
                            preview
                                .destination_location,
                    }),
                )

            } catch (error) {

                console.error(
                    error,
                )

                showBackendError(
                    error,
                    'Error obteniendo número de lote',
                )
            }
        }


    /**
     * Acciones disponibles según
     * rol y estado del lote.
     */
    const getAvailableActions =
        (
            statusCode?: string,
        ) => {

            /**
             * Operador planta / bodega
             */
            if (
                role ===
                'warehouse_operator'
            ) {

                switch (
                statusCode
                ) {

                    case 'EN_PROCESO':

                        return [
                            {
                                label:
                                    'Enviar a reproceso',

                                code:
                                    'REPROCESO',

                                color:
                                    'warning',
                            },

                            {
                                label:
                                    'Preparar despacho',

                                code:
                                    'PREPARADO_DESPACHO',

                                color:
                                    'primary',
                            },
                        ]


                    case 'REPROCESO':

                        return [
                            {
                                label:
                                    'Volver a proceso',

                                code:
                                    'EN_PROCESO',

                                color:
                                    'primary',
                            },

                            {
                                label:
                                    'Preparar despacho',

                                code:
                                    'PREPARADO_DESPACHO',

                                color:
                                    'primary',
                            },
                        ]


                    case 'DERIVADO_EXTERNO':

                        return [
                            {
                                label:
                                    'Enviar a traslado',

                                code:
                                    'EN_TRASLADO',

                                color:
                                    'primary',
                            },
                        ]


                    case 'PREPARADO_DESPACHO':

                        return [
                            {
                                label:
                                    'Enviar a traslado',

                                code:
                                    'EN_TRASLADO',

                                color:
                                    'primary',
                            },
                        ]


                    case 'EN_TRASLADO':

                        return [
                            {
                                label:
                                    'Retornar cliente',

                                code:
                                    'RETORNADO_CLIENTE',

                                color:
                                    'success',
                            },
                        ]


                    default:

                        return []
                }
            }


            /**
             * Operador cliente.
             */
            if (
                role ===
                'client_operator'
            ) {

                if (
                    statusCode ===
                    'RETORNADO_CLIENTE'
                ) {

                    return [
                        {
                            label:
                                'Cerrar lote',

                            code:
                                'CERRADO',

                            color:
                                'success',
                        },
                    ]
                }


                return []
            }


            /**
             * Administrador.
             */
            if (
                role ===
                'admin'
            ) {

                switch (
                statusCode
                ) {

                    case 'EN_PROCESO':

                        return [
                            {
                                label:
                                    'Enviar a reproceso',

                                code:
                                    'REPROCESO',

                                color:
                                    'warning',
                            },

                            {
                                label:
                                    'Preparar despacho',

                                code:
                                    'PREPARADO_DESPACHO',

                                color:
                                    'primary',
                            },
                        ]


                    case 'REPROCESO':

                        return [
                            {
                                label:
                                    'Volver a proceso',

                                code:
                                    'EN_PROCESO',

                                color:
                                    'primary',
                            },

                            {
                                label:
                                    'Preparar despacho',

                                code:
                                    'PREPARADO_DESPACHO',

                                color:
                                    'primary',
                            },
                        ]


                    case 'DERIVADO_EXTERNO':
                    case 'PREPARADO_DESPACHO':

                        return [
                            {
                                label:
                                    'Enviar a traslado',

                                code:
                                    'EN_TRASLADO',

                                color:
                                    'primary',
                            },
                        ]


                    case 'EN_TRASLADO':

                        return [
                            {
                                label:
                                    'Retornar cliente',

                                code:
                                    'RETORNADO_CLIENTE',

                                color:
                                    'success',
                            },
                        ]


                    case 'RETORNADO_CLIENTE':

                        return [
                            {
                                label:
                                    'Cerrar lote',

                                code:
                                    'CERRADO',

                                color:
                                    'success',
                            },
                        ]


                    default:

                        return []
                }
            }


            return []
        }


    /**
     * Cambiar estado de lote.
     */
    const handleChangeStatus =
        async (
            batch:
                OperatorBatch,

            nextStatusCode:
                string,

            label:
                string,
        ) => {

            try {

                const details =
                    await getBatchConfirmDetails(
                        batch.id,
                    )


                const isClosed =
                    nextStatusCode ===
                    'CERRADO'


                const confirmed =
                    await confirmAction({
                        title:
                            label,

                        message:
                            isClosed
                                ? '¿Confirmas el cierre definitivo del lote recibido?'
                                : '¿Confirmas cambiar el estado del lote?',

                        showConformityCheck:
                            true,

                        observationLabel:
                            isClosed
                                ? 'Observaciones del cliente'
                                : undefined,

                        observationPlaceholder:
                            isClosed
                                ? 'Ejemplo: pedido recibido conforme'
                                : undefined,

                        confirmText:
                            isClosed
                                ? 'Cerrar lote'
                                : 'Confirmar',

                        color:
                            isClosed
                                ? 'danger'
                                : 'primary',

                        fields: [
                            {
                                label:
                                    'Lote',

                                value:
                                    batch
                                        .batch_number,
                            },

                            {
                                label:
                                    'Cliente',

                                value:
                                    batch
                                        .client
                                        ?.name,
                            },

                            {
                                label:
                                    'Estado actual',

                                value:
                                    batch
                                        .current_status
                                        ?.name,
                            },

                            {
                                label:
                                    'Nuevo estado',

                                value:
                                    nextStatusCode,
                            },
                        ],

                        details,
                    })


                if (
                    !confirmed
                ) {
                    return
                }


                await changeOperatorBatchStatus(
                    batch.id,

                    nextStatusCode,

                    confirmed
                        .observation,
                )


                showAlert(
                    'Estado actualizado correctamente',
                    'success',
                )


                await loadData()

            } catch (error) {

                showBackendError(
                    error,
                    'Error cambiando estado',
                )
            }
        }


    /**
     * Recepción de lote en planta.
     */
    const handleReceive =
        async (
            batch:
                OperatorBatch,
        ) => {

            try {

                const details =
                    await getBatchConfirmDetails(
                        batch.id,
                    )


                const confirmed =
                    await confirmAction({
                        title:
                            'Recepcionar lote',

                        message:
                            '¿Confirmas la recepción de este lote en planta?',

                        confirmText:
                            'Recepcionar',

                        color:
                            'primary',

                        fields: [
                            {
                                label:
                                    'Lote',

                                value:
                                    batch
                                        .batch_number,
                            },

                            {
                                label:
                                    'Cliente',

                                value:
                                    batch
                                        .client
                                        ?.name,
                            },

                            {
                                label:
                                    'Estado actual',

                                value:
                                    batch
                                        .current_status
                                        ?.name,
                            },
                        ],

                        details,
                    })


                if (
                    !confirmed
                ) {
                    return
                }


                await receiveOperatorBatch(
                    batch.id,
                )


                showAlert(
                    'Lote recepcionado correctamente',
                    'success',
                )


                await loadData()

            } catch (error) {

                showBackendError(
                    error,
                    'Error recepcionando lote',
                )
            }
        }


    /**
     * Evaluación de lote.
     */
    const handleEvaluate =
        async (
            batch:
                OperatorBatch,

            canProcess:
                boolean,
        ) => {

            try {

                const details =
                    await getBatchConfirmDetails(
                        batch.id,
                    )


                const confirmed =
                    await confirmAction({
                        title:
                            canProcess
                                ? 'Enviar a proceso'
                                : 'Derivar externo',

                        message:
                            canProcess
                                ? '¿Confirmas que este lote puede procesarse en planta?'
                                : '¿Confirmas que este lote debe derivarse externamente?',

                        confirmText:
                            canProcess
                                ? 'Procesar'
                                : 'Derivar',

                        color:
                            canProcess
                                ? 'primary'
                                : 'warning',

                        fields: [
                            {
                                label:
                                    'Lote',

                                value:
                                    batch
                                        .batch_number,
                            },

                            {
                                label:
                                    'Cliente',

                                value:
                                    batch
                                        .client
                                        ?.name,
                            },

                            {
                                label:
                                    'Estado actual',

                                value:
                                    batch
                                        .current_status
                                        ?.name,
                            },

                            {
                                label:
                                    'Nuevo estado',

                                value:
                                    canProcess
                                        ? 'En Proceso'
                                        : 'Derivado Externo',
                            },
                        ],

                        details,
                    })


                if (
                    !confirmed
                ) {
                    return
                }


                await evaluateOperatorBatch(
                    batch.id,
                    canProcess,
                )


                showAlert(
                    canProcess
                        ? 'Lote enviado a proceso correctamente'
                        : 'Lote derivado externamente correctamente',

                    'success',
                )


                await loadData()

            } catch (error) {

                showBackendError(
                    error,
                    'Error evaluando lote',
                )
            }
        }


    /**
     * Cambios del formulario.
     */
    const handleChange =
        (
            field:
                keyof typeof emptyForm,

            value:
                string,
        ) => {

            setForm(
                (prev) => ({
                    ...prev,
                    [field]: value,
                }),
            )
        }


    /**
     * Crear lote.
     */
    const handleSubmit =
        async () => {

            /**
             * El número viene desde el backend.
             */
            if (
                !form
                    .batch_number
                    .trim()
            ) {

                showAlert(
                    'Número de lote es obligatorio',
                    'warning',
                )

                return
            }


            /**
             * Administrador debe seleccionar cliente.
             */
            if (
                adminUser
                &&
                !form.client_id
            ) {

                showAlert(
                    'Cliente es obligatorio',
                    'warning',
                )

                return
            }


            /**
             * Operador cliente debe tener
             * cliente asociado.
             */
            if (
                clientOperator
                &&
                !currentUser
                    ?.client
                    ?.id
            ) {

                showAlert(
                    'Tu usuario no tiene cliente asociado',
                    'danger',
                )

                return
            }


            const selectedClientId =
                clientOperator
                    ? currentUser
                        ?.client
                        ?.id
                    : form
                        .client_id


            if (
                !selectedClientId
            ) {

                showAlert(
                    'Debe seleccionar un cliente',
                    'warning',
                )

                return
            }


            const selectedClient =
                clients.find(
                    (client) =>
                        client.id ===
                        selectedClientId,
                )


            const confirmed =
                await confirmAction({
                    title:
                        'Crear lote',

                    message:
                        'Se creará el siguiente lote:',

                    confirmText:
                        'Crear',

                    color:
                        'primary',

                    fields: [
                        {
                            label:
                                'Número',

                            value:
                                form
                                    .batch_number,
                        },

                        {
                            label:
                                'Cliente',

                            value:
                                selectedClient
                                    ?.name
                                ||
                                currentUser
                                    ?.client
                                    ?.name
                                ||
                                '-',
                        },

                        {
                            label:
                                'Origen',

                            value:
                                form
                                    .origin_location,
                        },

                        {
                            label:
                                'Destino',

                            value:
                                form
                                    .destination_location,
                        },
                    ],
                })


            if (
                !confirmed
            ) {
                return
            }


            try {

                setLoading(
                    true,
                )


                await createOperatorBatch({
                    client_id:
                        selectedClientId,

                    notes:
                        form.notes,
                })


                showAlert(
                    'Lote creado correctamente',
                    'success',
                )


                /**
                 * Limpiamos el formulario.
                 */
                setForm({
                    ...emptyForm,

                    client_id:
                        clientOperator
                            ? currentUser
                                ?.client
                                ?.id
                            || ''
                            : '',
                })


                /**
                 * Si es cliente, cargamos nuevamente
                 * el siguiente número disponible.
                 */
                if (
                    clientOperator
                    &&
                    currentUser
                        ?.client
                        ?.id
                ) {

                    await loadBatchPreview(
                        currentUser
                            .client
                            .id,
                    )
                }


                await loadData()

            } catch (error) {

                showBackendError(
                    error,
                    'Error creando lote',
                )

            } finally {

                setLoading(
                    false,
                )
            }
        }


    /**
     * Carga inicial.
     */
    useEffect(
        () => {

            const load =
                async () => {

                    try {

                        setLoading(
                            true,
                        )

                        await loadData()

                    } catch (error) {

                        showBackendError(
                            error,
                            'Error cargando lotes',
                        )

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


    return (

        <CCard>

            <CCardHeader>

                <strong>
                    Creación de lotes
                </strong>

            </CCardHeader>


            <CCardBody>

                {/*
                 * =====================================================
                 * CREACIÓN
                 * =====================================================
                 */}

                {
                    canCreateBatch
                    && (

                        <>

                            <CRow className="mb-3">

                                <CCol md={4}>

                                    <CFormSelect
                                        label="Cliente"
                                        value={
                                            form
                                                .client_id
                                        }

                                        /**
                                         * IMPORTANTE:
                                         *
                                         * Solo bloqueamos el cliente
                                         * para client_operator.
                                         *
                                         * El administrador puede elegir.
                                         */
                                        disabled={
                                            clientOperator
                                        }

                                        onChange={
                                            async (
                                                e,
                                            ) => {

                                                const clientId =
                                                    e.target.value


                                                handleChange(
                                                    'client_id',
                                                    clientId,
                                                )


                                                await loadBatchPreview(
                                                    clientId,
                                                )
                                            }
                                        }
                                    >

                                        <option value="">
                                            Seleccione cliente
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


                                <CCol md={3}>

                                    <CFormInput
                                        label="Número de lote"
                                        value={
                                            form
                                                .batch_number
                                        }
                                        disabled
                                    />

                                </CCol>


                                <CCol md={3}>

                                    <CFormInput
                                        label="Origen"
                                        value={
                                            form
                                                .origin_location
                                        }
                                        disabled
                                    />

                                </CCol>


                                <CCol md={2}>

                                    <CFormInput
                                        label="Destino"
                                        value={
                                            form
                                                .destination_location
                                        }
                                        disabled
                                    />

                                </CCol>

                            </CRow>


                            <CRow className="mb-4">

                                <CCol md={8}>

                                    <CFormTextarea
                                        label="Notas"
                                        rows={1}
                                        value={
                                            form.notes
                                        }
                                        onChange={
                                            (
                                                e,
                                            ) =>
                                                handleChange(
                                                    'notes',
                                                    e.target.value,
                                                )
                                        }
                                    />

                                </CCol>


                                <CCol
                                    md={4}
                                    className="d-flex align-items-end"
                                >

                                    <CButton
                                        color="primary"
                                        onClick={
                                            handleSubmit
                                        }
                                        disabled={
                                            loading
                                        }
                                    >

                                        {
                                            loading
                                                ? 'Guardando...'
                                                : 'Crear lote'
                                        }

                                    </CButton>

                                </CCol>

                            </CRow>

                        </>

                    )
                }


                {/*
                 * =====================================================
                 * LISTADO
                 * =====================================================
                 */}

                <CTable
                    hover
                    responsive
                >

                    <CTableHead>

                        <CTableRow>

                            <CTableHeaderCell>
                                N° Lote
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Cliente
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Origen
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Destino
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Estado
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Creado por
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Recepción
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Acciones
                            </CTableHeaderCell>

                        </CTableRow>

                    </CTableHead>


                    <CTableBody>

                        {
                            batches.map(
                                (
                                    batch,
                                ) => (

                                    <CTableRow
                                        key={
                                            batch.id
                                        }
                                    >

                                        <CTableDataCell>

                                            <strong>
                                                {
                                                    batch
                                                        .batch_number
                                                }
                                            </strong>

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            {
                                                batch
                                                    .client
                                                    ?.name
                                                || '-'
                                            }

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            {
                                                batch
                                                    .origin_location
                                                || '-'
                                            }

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            {
                                                batch
                                                    .destination_location
                                                || '-'
                                            }

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            {
                                                batch
                                                    .current_status
                                                    ?.name
                                                || '-'
                                            }

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            {
                                                batch
                                                    .creator
                                                    ?.name
                                                || '-'
                                            }

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            {
                                                batch
                                                    .received_at

                                                    ? new Date(
                                                        batch
                                                            .received_at,
                                                    )
                                                        .toLocaleString(
                                                            'es-CL',
                                                        )

                                                    : '-'
                                            }

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            <div className="d-flex gap-2 flex-wrap">

                                                <CButton
                                                    color="primary"
                                                    size="sm"
                                                    onClick={
                                                        () =>
                                                            navigate(
                                                                `/operator/batches/${batch.id}`,
                                                            )
                                                    }
                                                >

                                                    Ver detalle

                                                </CButton>


                                                {
                                                    canOperatePlant

                                                    &&

                                                    batch
                                                        .current_status
                                                        ?.code ===
                                                    'PENDIENTE_RECEPCION'

                                                    && (

                                                        <CButton
                                                            color="success"
                                                            size="sm"
                                                            onClick={
                                                                () =>
                                                                    handleReceive(
                                                                        batch,
                                                                    )
                                                            }
                                                        >

                                                            Recepcionar

                                                        </CButton>

                                                    )
                                                }


                                                {
                                                    canOperatePlant

                                                    &&

                                                    batch
                                                        .current_status
                                                        ?.code ===
                                                    'RECEPCIONADO'

                                                    && (

                                                        <>

                                                            <CButton
                                                                color="primary"
                                                                size="sm"
                                                                onClick={
                                                                    () =>
                                                                        handleEvaluate(
                                                                            batch,
                                                                            true,
                                                                        )
                                                                }
                                                            >

                                                                Procesar

                                                            </CButton>


                                                            <CButton
                                                                color="warning"
                                                                size="sm"
                                                                onClick={
                                                                    () =>
                                                                        handleEvaluate(
                                                                            batch,
                                                                            false,
                                                                        )
                                                                }
                                                            >

                                                                Derivar

                                                            </CButton>

                                                        </>

                                                    )
                                                }


                                                {
                                                    getAvailableActions(
                                                        batch
                                                            .current_status
                                                            ?.code,
                                                    )
                                                        .map(
                                                            (
                                                                action,
                                                            ) => (

                                                                <CButton
                                                                    key={
                                                                        action.code
                                                                    }
                                                                    color={
                                                                        action.color as any
                                                                    }
                                                                    size="sm"
                                                                    onClick={
                                                                        () =>
                                                                            handleChangeStatus(
                                                                                batch,
                                                                                action.code,
                                                                                action.label,
                                                                            )
                                                                    }
                                                                >

                                                                    {
                                                                        action.label
                                                                    }

                                                                </CButton>

                                                            ),
                                                        )
                                                }

                                            </div>

                                        </CTableDataCell>

                                    </CTableRow>

                                ),
                            )
                        }


                        {
                            batches.length ===
                            0
                            && (

                                <CTableRow>

                                    <CTableDataCell
                                        colSpan={
                                            8
                                        }
                                        className="text-center"
                                    >

                                        No hay lotes registrados

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


export default OperatorBatches