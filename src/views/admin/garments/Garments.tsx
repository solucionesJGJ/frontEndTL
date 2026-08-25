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
    CFormCheck,
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
    createGarment,
    deactivateGarment,
    getGarments,
    updateGarment,
    type Garment,
} from '../../../services/garment.service'

import {
    getClients,
    type Client,
} from '../../../services/client.service'

import {
    useFeedback,
} from '../../../context/FeedbackContext'


const emptyForm = {
    client_id: '',
    code: '',
    description: '',
    size: '',
    color: '',
    barcode: '',
    active: true,
    value: 0,
}


/**
 * Normaliza la parte manual del código.
 *
 * " sk 01 " -> "SK01"
 */
function normalizeManualCode(
    value: string,
): string {
    return value
        .toUpperCase()
        .replace(/\s+/g, '')
}


/**
 * Obtiene la parte manual de un código
 * ya almacenado.
 *
 * Ej:
 *
 * AH-SK01
 * prefijo AH
 *
 * resultado:
 * SK01
 */
function extractManualCode(
    fullCode: string,
    prefix?: string | null,
): string {

    if (!fullCode) {
        return ''
    }

    if (!prefix) {
        return fullCode
    }

    const normalizedPrefix =
        prefix
            .trim()
            .toUpperCase()

    const normalizedCode =
        fullCode
            .trim()
            .toUpperCase()

    const expectedStart =
        `${normalizedPrefix}-`

    if (
        normalizedCode.startsWith(
            expectedStart,
        )
    ) {
        return fullCode.slice(
            expectedStart.length,
        )
    }

    return fullCode
}


/**
 * Construye solamente el preview visual.
 *
 * El backend sigue siendo quien construye
 * y valida el código definitivo.
 */
function buildPreviewCode(
    prefix?: string | null,
    manualCode?: string,
): string {

    const finalPrefix =
        prefix
            ?.trim()
            .toUpperCase()
        || ''

    const finalManualCode =
        normalizeManualCode(
            manualCode || '',
        )

    if (!finalPrefix) {
        return finalManualCode
    }

    if (!finalManualCode) {
        return `${finalPrefix}-`
    }

    return `${finalPrefix}-${finalManualCode}`
}


const Garments = () => {

    const [
        garments,
        setGarments,
    ] = useState<Garment[]>([])

    const [
        clients,
        setClients,
    ] = useState<Client[]>([])

    const [
        form,
        setForm,
    ] = useState(emptyForm)

    const [
        editingId,
        setEditingId,
    ] = useState<string | null>(
        null,
    )

    const [
        isLoading,
        setIsLoading,
    ] = useState(false)

    const {
        confirmAction,
        showAlert,
        showBackendError,
    } = useFeedback()


    /**
     * Cliente actualmente seleccionado.
     */
    const selectedClient =
        useMemo(
            () =>
                clients.find(
                    (client) =>
                        client.id ===
                        form.client_id,
                ) || null,
            [
                clients,
                form.client_id,
            ],
        )


    /**
     * Preview del código completo.
     */
    const previewCode =
        useMemo(
            () =>
                buildPreviewCode(
                    selectedClient
                        ?.code_prefix,
                    form.code,
                ),
            [
                selectedClient,
                form.code,
            ],
        )


    /**
     * Carga prendas y clientes.
     */
    const loadData = async () => {

        try {

            setIsLoading(true)

            const [
                garmentsData,
                clientsData,
            ] = await Promise.all([
                getGarments(),
                getClients(),
            ])

            setGarments(
                garmentsData,
            )

            /**
             * Para nuevas prendas mostramos
             * solamente clientes activos.
             */
            setClients(
                clientsData.filter(
                    (client) =>
                        client.active,
                ),
            )

        } catch (error) {

            showBackendError(
                error,
                'Error cargando prendas',
            )

        } finally {

            setIsLoading(false)
        }
    }


    /**
     * Cambios del formulario.
     */
    const handleChange = (
        field:
            keyof typeof emptyForm,
        value:
            string | boolean,
    ) => {

        /**
         * Normalizamos solamente la parte
         * manual del código.
         */
        if (
            field === 'code' &&
            typeof value === 'string'
        ) {

            setForm(
                (prev) => ({
                    ...prev,

                    code:
                        normalizeManualCode(
                            value,
                        ),
                }),
            )

            return
        }


        setForm(
            (prev) => ({
                ...prev,
                [field]: value,
            }),
        )
    }


    /**
     * Crear o actualizar prenda.
     */
    const handleSubmit =
        async () => {

            if (
                !form.client_id
            ) {

                showAlert(
                    'Debe seleccionar un cliente',
                    'warning',
                )

                return
            }


            if (
                !form.code.trim()
            ) {

                showAlert(
                    'El código de la prenda es obligatorio',
                    'warning',
                )

                return
            }


            if (
                !selectedClient
            ) {

                showAlert(
                    'Cliente no válido',
                    'warning',
                )

                return
            }


            if (
                !selectedClient
                    .code_prefix
                    ?.trim()
            ) {

                showAlert(
                    'El cliente no tiene un prefijo configurado',
                    'warning',
                )

                return
            }


            if (
                Number(
                    form.value,
                ) < 0
            ) {

                showAlert(
                    'El valor no puede ser negativo',
                    'warning',
                )

                return
            }


            const confirmed =
                await confirmAction({
                    title:
                        editingId
                            ? 'Actualizar prenda'
                            : 'Crear prenda',

                    message:
                        'Se guardarán los siguientes datos:',

                    confirmText:
                        editingId
                            ? 'Actualizar'
                            : 'Crear',

                    color:
                        'primary',

                    fields: [
                        {
                            label:
                                'Cliente',

                            value:
                                selectedClient
                                    .name,
                        },

                        {
                            label:
                                'Código',

                            value:
                                previewCode,
                        },

                        {
                            label:
                                'Nombre',

                            value:
                                form.size,
                        },

                        {
                            label:
                                'Color',

                            value:
                                form.color,
                        },

                        {
                            label:
                                'Valor',

                            value:
                                `$${Number(
                                    form.value || 0,
                                ).toLocaleString(
                                    'es-CL',
                                )}`,
                        },
                    ],
                })


            if (!confirmed.confirmed) {
                return
            }


            /**
             * IMPORTANTE:
             *
             * Se envía solamente la parte
             * manual del código.
             *
             * El backend:
             *
             * client.code_prefix + code
             *
             * construye el código definitivo.
             */
            const payload = {

                client_id:
                    form.client_id,

                code:
                    normalizeManualCode(
                        form.code,
                    ),

                description:
                    form.description,

                size:
                    form.size,

                color:
                    form.color,

                barcode:
                    form.barcode,

                active:
                    form.active,

                value:
                    Number(
                        form.value || 0,
                    ),
            }


            try {

                if (
                    editingId
                ) {

                    await updateGarment(
                        editingId,
                        payload,
                    )

                    showAlert(
                        'Prenda actualizada correctamente',
                        'success',
                    )

                } else {

                    await createGarment(
                        payload,
                    )

                    showAlert(
                        'Prenda creada correctamente',
                        'success',
                    )
                }


                setForm(
                    emptyForm,
                )

                setEditingId(
                    null,
                )

                await loadData()

            } catch (error) {

                showBackendError(
                    error,
                    'Error guardando prenda',
                )
            }
        }


    /**
     * Editar prenda.
     */
    const handleEdit = (
        garment: Garment,
    ) => {

        setEditingId(
            garment.id,
        )


        const client =
            clients.find(
                (client) =>
                    client.id ===
                    garment.client_id,
            )


        /**
         * Si la respuesta backend trae
         * client incluido, usamos también
         * ese prefijo como respaldo.
         */
        const prefix =
            client
                ?.code_prefix
            ??
            garment.client
                ?.code_prefix
            ??
            ''


        setForm({
            client_id:
                garment.client_id,

            /**
             * Mostramos solamente la
             * parte manual.
             */
            code:
                extractManualCode(
                    garment.code,
                    prefix,
                ),

            description:
                garment.description
                || '',

            size:
                garment.size
                || '',

            color:
                garment.color
                || '',

            barcode:
                garment.barcode
                || '',

            active:
                garment.active,

            value:
                Number(
                    garment.value
                    || 0,
                ),
        })
    }


    /**
     * Desactivar prenda.
     */
    const handleDeactivate =
        async (
            id: string,
        ) => {

            const garment =
                garments.find(
                    (item) =>
                        item.id === id,
                )


            if (!garment) {

                showAlert(
                    'Prenda no encontrada',
                    'danger',
                )

                return
            }


            const confirmed =
                await confirmAction({
                    title:
                        'Desactivar prenda',

                    message:
                        '¿Seguro que deseas desactivar esta prenda?',

                    confirmText:
                        'Desactivar',

                    color:
                        'danger',

                    fields: [
                        {
                            label:
                                'Código',

                            value:
                                garment.code,
                        },

                        {
                            label:
                                'Prenda',

                            value:
                                garment.description
                                ||
                                garment.size
                                ||
                                '-',
                        },
                    ],
                })


            if (!confirmed.confirmed) {
                return
            }


            try {

                await deactivateGarment(
                    id,
                )

                showAlert(
                    'Prenda desactivada correctamente',
                    'success',
                )

                await loadData()

            } catch (error) {

                showBackendError(
                    error,
                    'Error desactivando prenda',
                )
            }
        }


    /**
     * Cancelar edición.
     */
    const handleCancel = () => {

        setForm(
            emptyForm,
        )

        setEditingId(
            null,
        )

        showAlert(
            'Edición cancelada',
            'success',
        )
    }


    /**
     * Carga inicial.
     */
    useEffect(() => {

        loadData()

    }, [])


    return (

        <CCard>

            <CCardHeader>

                <strong>
                    Prendas
                </strong>

            </CCardHeader>


            <CCardBody>

                {/*
                 * FILA 1
                 *
                 * Cliente
                 * Prefijo
                 * Código manual
                 * Código final
                 */}

                <CRow className="mb-3">

                    <CCol md={4}>

                        <CFormSelect
                            label="Cliente"
                            value={
                                form.client_id
                            }
                            onChange={
                                (e) =>
                                    handleChange(
                                        'client_id',
                                        e.target.value,
                                    )
                            }
                        >

                            <option value="">
                                Seleccione cliente
                            </option>

                            {
                                clients.map(
                                    (client) => (

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


                    <CCol md={2}>

                        <CFormInput
                            label="Prefijo"
                            value={
                                selectedClient
                                    ?.code_prefix
                                || ''
                            }
                            readOnly
                            placeholder="-"
                        />

                    </CCol>


                    <CCol md={3}>

                        <CFormInput
                            label="Código"
                            value={
                                form.code
                            }
                            onChange={
                                (e) =>
                                    handleChange(
                                        'code',
                                        e.target.value,
                                    )
                            }
                            placeholder="Ej: SK01"
                        />

                    </CCol>


                    <CCol md={3}>

                        <CFormInput
                            label="Código final"
                            value={
                                previewCode
                            }
                            readOnly
                            placeholder="Ej: AH-SK01"
                        />

                    </CCol>

                </CRow>


                {/*
                 * FILA 2
                 *
                 * Nombre
                 * Color
                 * Barcode
                 * Valor
                 */}

                <CRow className="mb-3">

                    <CCol md={3}>

                        <CFormInput
                            label="Nombre"
                            value={
                                form.size
                            }
                            onChange={
                                (e) =>
                                    handleChange(
                                        'size',
                                        e.target.value,
                                    )
                            }
                            placeholder="Ej: Sábana King"
                        />

                    </CCol>


                    <CCol md={2}>

                        <CFormInput
                            label="Color"
                            value={
                                form.color
                            }
                            onChange={
                                (e) =>
                                    handleChange(
                                        'color',
                                        e.target.value,
                                    )
                            }
                            placeholder="Ej: Blanco"
                        />

                    </CCol>


                    <CCol md={3}>

                        <CFormInput
                            label="Código de barra"
                            value={
                                form.barcode
                            }
                            onChange={
                                (e) =>
                                    handleChange(
                                        'barcode',
                                        e.target.value,
                                    )
                            }
                            placeholder="Opcional"
                        />

                    </CCol>


                    <CCol md={2}>

                        <CFormInput
                            label="Valor"
                            type="number"
                            min={0}
                            value={
                                form.value
                            }
                            onChange={
                                (e) =>
                                    handleChange(
                                        'value',
                                        e.target.value,
                                    )
                            }
                            placeholder="0"
                        />

                    </CCol>


                    <CCol
                        md={2}
                        className="d-flex align-items-end"
                    >

                        <CFormCheck
                            label="Activo"
                            checked={
                                form.active
                            }
                            onChange={
                                (e) =>
                                    handleChange(
                                        'active',
                                        e.target.checked,
                                    )
                            }
                        />

                    </CCol>

                </CRow>


                {/*
                 * DESCRIPCIÓN
                 */}

                <CRow className="mb-3">

                    <CCol md={12}>

                        <CFormTextarea
                            label="Descripción"
                            rows={2}
                            value={
                                form.description
                            }
                            onChange={
                                (e) =>
                                    handleChange(
                                        'description',
                                        e.target.value,
                                    )
                            }
                            placeholder="Descripción opcional"
                        />

                    </CCol>

                </CRow>


                {/*
                 * BOTONES
                 */}

                <CRow className="mb-4">

                    <CCol
                        md={12}
                        className="d-flex gap-2"
                    >

                        <CButton
                            color="primary"
                            onClick={
                                handleSubmit
                            }
                            disabled={
                                isLoading
                            }
                        >

                            {
                                editingId
                                    ? 'Actualizar'
                                    : 'Crear'
                            }

                        </CButton>


                        {
                            editingId
                            && (

                                <CButton
                                    color="secondary"
                                    onClick={
                                        handleCancel
                                    }
                                >

                                    Cancelar

                                </CButton>

                            )
                        }

                    </CCol>

                </CRow>


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
                                Barcode
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Valor actual
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Activo
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Acciones
                            </CTableHeaderCell>

                        </CTableRow>

                    </CTableHead>


                    <CTableBody>

                        {
                            garments.map(
                                (garment) => (

                                    <CTableRow
                                        key={
                                            garment.id
                                        }
                                    >

                                        <CTableDataCell>

                                            {
                                                garment
                                                    .client
                                                    ?.name
                                                || '-'
                                            }

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            <strong>

                                                {
                                                    garment.code
                                                }

                                            </strong>

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            {
                                                garment.size
                                                || '-'
                                            }

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            {
                                                garment.description
                                                || '-'
                                            }

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            {
                                                garment.color
                                                || '-'
                                            }

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            {
                                                garment.barcode
                                                || '-'
                                            }

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            {
                                                `$${Number(
                                                    garment.value
                                                    || 0,
                                                ).toLocaleString(
                                                    'es-CL',
                                                )}`
                                            }

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            {
                                                garment.active
                                                    ? 'Sí'
                                                    : 'No'
                                            }

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            <div className="d-flex gap-2">

                                                <CButton
                                                    color="warning"
                                                    size="sm"
                                                    onClick={
                                                        () =>
                                                            handleEdit(
                                                                garment,
                                                            )
                                                    }
                                                >

                                                    Editar

                                                </CButton>


                                                {
                                                    garment.active
                                                    && (

                                                        <CButton
                                                            color="secondary"
                                                            size="sm"
                                                            onClick={
                                                                () =>
                                                                    handleDeactivate(
                                                                        garment.id,
                                                                    )
                                                            }
                                                        >

                                                            Desactivar

                                                        </CButton>

                                                    )
                                                }

                                            </div>

                                        </CTableDataCell>

                                    </CTableRow>

                                ),
                            )
                        }

                    </CTableBody>

                </CTable>

            </CCardBody>

        </CCard>
    )
}


export default Garments