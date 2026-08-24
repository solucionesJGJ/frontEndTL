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
    createClient,
    updateClient,
    deleteClient,
    type Client,
} from '../../../services/client.service'

import {
    useFeedback,
} from '../../../context/FeedbackContext'


/**
 * Estado inicial del formulario.
 */
const emptyForm = {
    name: '',
    rut: '',
    address: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    code_prefix: '',
}


/**
 * Genera una propuesta de prefijo
 * a partir del nombre del cliente.
 *
 * Ejemplos:
 *
 * Apart Hotel
 * -> AH
 *
 * Hotel Central
 * -> HC
 *
 * Pressto
 * -> PR
 */
function generateClientPrefix(
    name: string,
): string {

    const cleanName = name
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

    if (!cleanName) {
        return ''
    }


    const words = cleanName
        .split(/\s+/)
        .filter(Boolean)


    /**
     * Si existe más de una palabra,
     * utilizamos la primera letra
     * de las primeras dos palabras.
     */
    if (words.length >= 2) {
        return (
            words[0].charAt(0) +
            words[1].charAt(0)
        )
    }


    /**
     * Si existe una sola palabra,
     * utilizamos sus primeras
     * dos letras.
     */
    return words[0]
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 2)
}


/**
 * Normalización manual del prefijo.
 *
 * Solo permitimos letras y números.
 */
function normalizePrefix(
    value: string,
): string {

    return value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 10)
}


const Clients = () => {

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
    ] = useState<string | null>(null)

    const [
        isLoading,
        setIsLoading,
    ] = useState(false)

    /**
     * Permite saber si el usuario
     * modificó manualmente el prefijo.
     *
     * Si lo hizo, no volveremos a
     * regenerarlo al cambiar el nombre.
     */
    const [
        prefixManuallyEdited,
        setPrefixManuallyEdited,
    ] = useState(false)

    const {
        confirmAction,
        showAlert,
        showBackendError,
    } = useFeedback()


    /**
     * Cargar clientes.
     */
    const loadClients = async () => {

        try {

            setIsLoading(true)

            const data =
                await getClients()

            setClients(data)

        } catch (error) {

            showBackendError(
                error,
                'Error cargando clientes',
            )

        } finally {

            setIsLoading(false)
        }
    }


    /**
     * Cambios normales del formulario.
     */
    const handleChange = (
        field: keyof typeof emptyForm,
        value: string,
    ) => {

        /**
         * Cambio del nombre.
         *
         * Si el usuario todavía no modificó
         * manualmente el prefijo, generamos
         * automáticamente una sugerencia.
         */
        if (field === 'name') {

            setForm((prev) => ({
                ...prev,

                name: value,

                code_prefix:
                    prefixManuallyEdited
                        ? prev.code_prefix
                        : generateClientPrefix(
                            value,
                        ),
            }))

            return
        }


        /**
         * Cambio manual del prefijo.
         */
        if (field === 'code_prefix') {

            setPrefixManuallyEdited(true)

            setForm((prev) => ({
                ...prev,

                code_prefix:
                    normalizePrefix(value),
            }))

            return
        }


        /**
         * Otros campos.
         */
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }))
    }


    /**
     * Crear / actualizar cliente.
     */
    const handleSubmit = async () => {

        if (!form.name.trim()) {

            showAlert(
                'El nombre es obligatorio',
                'warning',
            )

            return
        }


        if (!form.code_prefix.trim()) {

            showAlert(
                'El prefijo del cliente es obligatorio',
                'warning',
            )

            return
        }


        if (
            form.code_prefix.trim().length < 2
        ) {

            showAlert(
                'El prefijo debe tener al menos 2 caracteres',
                'warning',
            )

            return
        }


        /**
         * Verificamos localmente que otro
         * cliente no esté usando el prefijo.
         *
         * El backend también debe validar esto.
         */
        const duplicatePrefix =
            clients.find(
                (client) =>
                    client.code_prefix
                        ?.toUpperCase() ===
                    form.code_prefix
                        .trim()
                        .toUpperCase()
                    &&
                    client.id !== editingId,
            )


        if (duplicatePrefix) {

            showAlert(
                `El prefijo ${form.code_prefix.toUpperCase()} ya pertenece a ${duplicatePrefix.name}`,
                'warning',
            )

            return
        }


        const confirmed =
            await confirmAction({
                title:
                    editingId
                        ? 'Actualizar cliente'
                        : 'Crear cliente',

                message:
                    'Se guardarán los siguientes datos:',

                confirmText:
                    editingId
                        ? 'Actualizar'
                        : 'Crear',

                color: 'primary',

                fields: [
                    {
                        label: 'Nombre',
                        value:
                            form.name,
                    },

                    {
                        label: 'Prefijo',
                        value:
                            form.code_prefix
                                .toUpperCase(),
                    },

                    {
                        label: 'RUT',
                        value:
                            form.rut,
                    },

                    {
                        label: 'Contacto',
                        value:
                            form.contact_name,
                    },

                    {
                        label: 'Email',
                        value:
                            form.contact_email,
                    },

                    {
                        label: 'Teléfono',
                        value:
                            form.contact_phone,
                    },
                ],
            })


        if (!confirmed) {
            return
        }


        /**
         * Payload normalizado.
         */
        const payload = {

            ...form,

            name:
                form.name.trim(),

            code_prefix:
                normalizePrefix(
                    form.code_prefix,
                ),
        }


        try {

            if (editingId) {

                await updateClient(
                    editingId,
                    payload,
                )

                showAlert(
                    'Cliente actualizado correctamente',
                    'success',
                )

            } else {

                await createClient(
                    payload,
                )

                showAlert(
                    'Cliente creado correctamente',
                    'success',
                )
            }


            /**
             * Limpiar formulario.
             */
            setForm(emptyForm)

            setEditingId(null)

            setPrefixManuallyEdited(false)

            await loadClients()

        } catch (error) {

            showBackendError(
                error,
                'Error guardando cliente',
            )
        }
    }


    /**
     * Editar cliente.
     */
    const handleEdit = (
        client: Client,
    ) => {

        setEditingId(
            client.id,
        )


        /**
         * Cuando editamos un cliente existente,
         * consideramos el prefijo como manual.
         *
         * Así cambiar el nombre NO cambia
         * accidentalmente su prefijo histórico.
         */
        setPrefixManuallyEdited(true)


        setForm({
            name:
                client.name || '',

            rut:
                client.rut || '',

            address:
                client.address || '',

            contact_name:
                client.contact_name || '',

            contact_email:
                client.contact_email || '',

            contact_phone:
                client.contact_phone || '',

            code_prefix:
                client.code_prefix || '',
        })
    }


    /**
     * Desactivar cliente.
     */
    const handleDelete = async (
        id: string,
    ) => {

        const client =
            clients.find(
                (c) => c.id === id,
            )


        if (!client) {

            showAlert(
                'Cliente no encontrado',
                'danger',
            )

            return
        }


        const confirmed =
            await confirmAction({
                title:
                    'Desactivar cliente',

                message:
                    '¿Seguro que deseas desactivar este cliente?',

                confirmText:
                    'Desactivar',

                color:
                    'danger',

                fields: [
                    {
                        label:
                            'Cliente',

                        value:
                            client.name,
                    },

                    {
                        label:
                            'Prefijo',

                        value:
                            client.code_prefix,
                    },

                    {
                        label:
                            'RUT',

                        value:
                            client.rut,
                    },
                ],
            })


        if (!confirmed) {
            return
        }


        try {

            await deleteClient(id)

            showAlert(
                'Cliente desactivado correctamente',
                'success',
            )

            await loadClients()

        } catch (error) {

            showBackendError(
                error,
                'Error desactivando cliente',
            )
        }
    }


    /**
     * Cancelar edición.
     */
    const handleCancel = () => {

        setForm(emptyForm)

        setEditingId(null)

        setPrefixManuallyEdited(false)

        showAlert(
            'Edición cancelada',
            'success',
        )
    }


    /**
     * Carga inicial.
     */
    useEffect(() => {

        loadClients()

    }, [])


    return (

        <CCard>

            <CCardHeader>

                <strong>
                    Clientes
                </strong>

            </CCardHeader>


            <CCardBody>

                {/*
                 * FILA 1
                 *
                 * Nombre
                 * Prefijo
                 * RUT
                 * Contacto
                 */}

                <CRow className="mb-3">

                    <CCol md={4}>

                        <CFormInput
                            label="Nombre"
                            value={
                                form.name
                            }
                            onChange={
                                (e) =>
                                    handleChange(
                                        'name',
                                        e.target.value,
                                    )
                            }
                        />

                    </CCol>


                    <CCol md={2}>

                        <CFormInput
                            label="Prefijo"
                            value={
                                form.code_prefix
                            }
                            placeholder="AH"
                            maxLength={10}
                            onChange={
                                (e) =>
                                    handleChange(
                                        'code_prefix',
                                        e.target.value,
                                    )
                            }
                        />

                        <small className="text-body-secondary">

                            Se usará en los códigos de prendas.

                        </small>

                    </CCol>


                    <CCol md={2}>

                        <CFormInput
                            label="RUT"
                            value={
                                form.rut
                            }
                            onChange={
                                (e) =>
                                    handleChange(
                                        'rut',
                                        e.target.value,
                                    )
                            }
                        />

                    </CCol>


                    <CCol md={4}>

                        <CFormInput
                            label="Contacto"
                            value={
                                form.contact_name
                            }
                            onChange={
                                (e) =>
                                    handleChange(
                                        'contact_name',
                                        e.target.value,
                                    )
                            }
                        />

                    </CCol>

                </CRow>


                {/*
                 * FILA 2
                 *
                 * Email
                 * Dirección
                 * Teléfono
                 */}

                <CRow className="mb-3">

                    <CCol md={4}>

                        <CFormInput
                            label="Email"
                            value={
                                form.contact_email
                            }
                            onChange={
                                (e) =>
                                    handleChange(
                                        'contact_email',
                                        e.target.value,
                                    )
                            }
                        />

                    </CCol>


                    <CCol md={5}>

                        <CFormInput
                            label="Dirección"
                            value={
                                form.address
                            }
                            onChange={
                                (e) =>
                                    handleChange(
                                        'address',
                                        e.target.value,
                                    )
                            }
                        />

                    </CCol>


                    <CCol md={3}>

                        <CFormInput
                            label="Teléfono"
                            value={
                                form.contact_phone
                            }
                            onChange={
                                (e) =>
                                    handleChange(
                                        'contact_phone',
                                        e.target.value,
                                    )
                            }
                        />

                    </CCol>

                </CRow>


                {/*
                 * PREVIEW
                 */}

                <CRow className="mb-4">

                    <CCol md={6}>

                        {form.code_prefix && (

                            <div className="border rounded p-2">

                                <small className="text-body-secondary">

                                    Ejemplo de código de prenda

                                </small>

                                <div>

                                    <strong>

                                        {
                                            normalizePrefix(
                                                form.code_prefix,
                                            )
                                        }
                                        -XXXX

                                    </strong>

                                </div>

                            </div>

                        )}

                    </CCol>


                    <CCol
                        md={6}
                        className="d-flex align-items-end justify-content-end gap-2"
                    >

                        <CButton
                            color="primary"
                            onClick={
                                handleSubmit
                            }
                        >

                            {
                                editingId
                                    ? 'Actualizar'
                                    : 'Crear'
                            }

                        </CButton>


                        {editingId && (

                            <CButton
                                color="secondary"
                                onClick={
                                    handleCancel
                                }
                            >

                                Cancelar

                            </CButton>

                        )}

                    </CCol>

                </CRow>


                {/*
                 * TABLA CLIENTES
                 */}

                <CTable
                    hover
                    responsive
                >

                    <CTableHead>

                        <CTableRow>

                            <CTableHeaderCell>
                                Nombre
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Prefijo
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                RUT
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Contacto
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Email
                            </CTableHeaderCell>

                            <CTableHeaderCell>
                                Teléfono
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
                            clients.map(
                                (client) => (

                                    <CTableRow
                                        key={
                                            client.id
                                        }
                                    >

                                        <CTableDataCell>

                                            {
                                                client.name
                                            }

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            <strong>

                                                {
                                                    client.code_prefix
                                                    || '-'
                                                }

                                            </strong>

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            {
                                                client.rut
                                                || '-'
                                            }

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            {
                                                client.contact_name
                                                || '-'
                                            }

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            {
                                                client.contact_email
                                                || '-'
                                            }

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            {
                                                client.contact_phone
                                                || '-'
                                            }

                                        </CTableDataCell>


                                        <CTableDataCell>

                                            {
                                                client.active
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
                                                                client,
                                                            )
                                                    }
                                                >

                                                    Editar

                                                </CButton>


                                                <CButton
                                                    color="danger"
                                                    size="sm"
                                                    disabled={
                                                        !client.active
                                                    }
                                                    onClick={
                                                        () =>
                                                            handleDelete(
                                                                client.id,
                                                            )
                                                    }
                                                >

                                                    Desactivar

                                                </CButton>

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


export default Clients