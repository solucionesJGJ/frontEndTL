import React, { useEffect, useState } from 'react'
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

import { getClients, type Client } from '../../../services/client.service'
import { getGarmentTypes, type GarmentType } from '../../../services/garmentType.service'

const emptyForm = {
    garment_type_id: '',
    code: '',
    description: '',
    size: '',
    color: '',
    barcode: '',
    active: true,
    value: 0,
}

const Garments = () => {
    const [garments, setGarments] = useState<Garment[]>([])
    const [clients, setClients] = useState<Client[]>([])
    const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([])
    const [form, setForm] = useState(emptyForm)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false);

    const loadData = async () => {
        const [garmentsData, clientsData, garmentTypesData] = await Promise.all([
            getGarments(),
            getClients(),
            getGarmentTypes(),
        ])

        setGarments(garmentsData)
        setClients(clientsData.filter((client) => client.active))
        setGarmentTypes(garmentTypesData.filter((type) => type.active))
    }

    const handleChange = (
        field: keyof typeof emptyForm,
        value: string | boolean,
    ) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handleSubmit = async () => {
        if (!form.garment_type_id || !form.code.trim()) {
            alert('Tipo de prenda y código son obligatorios')
            return
        }

        if (editingId) {
            await updateGarment(editingId, form)
        } else {
            await createGarment(form)
        }

        setForm(emptyForm)
        setEditingId(null)
        await loadData()
    }

    const handleEdit = (garment: Garment) => {
        setEditingId(garment.id)

        setForm({
            garment_type_id: garment.garment_type_id,
            code: garment.code || '',
            description: garment.description || '',
            size: garment.size || '',
            color: garment.color || '',
            barcode: garment.barcode || '',
            active: garment.active,
            value: Number(garment.value || 0),
        })
    }

    const handleDeactivate = async (id: string) => {
        const confirmDeactivate = window.confirm('¿Desactivar prenda?')

        if (!confirmDeactivate) return

        await deactivateGarment(id)
        await loadData()
    }

    const handleCancel = () => {
        setForm(emptyForm)
        setEditingId(null)
    }

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            loadData()
            setIsLoading(false)
        }
        if (!isLoading) {
            load();
        }
    }, [])

    return (
        <CCard>
            <CCardHeader>
                <strong>Prendas</strong>
            </CCardHeader>

            <CCardBody>
                <CRow className="mb-3">
                    {/* <CCol md={4}>
                        <CFormSelect
                            label="Cliente"
                            value={form.client_id}
                            onChange={(e) => handleChange('client_id', e.target.value)}
                        >
                            <option value="">Seleccione cliente</option>
                            {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                    {client.name} {client.rut ? `(${client.rut})` : ''}
                                </option>
                            ))}
                        </CFormSelect>
                    </CCol> */}

                    <CCol md={3}>
                        <CFormSelect
                            label="Tipo de prenda"
                            value={form.garment_type_id}
                            onChange={(e) => handleChange('garment_type_id', e.target.value)}
                        >
                            <option value="">Seleccione tipo</option>
                            {garmentTypes.map((type) => (
                                <option key={type.id} value={type.id}>
                                    {type.name}
                                </option>
                            ))}
                        </CFormSelect>
                    </CCol>

                    <CCol md={2}>
                        <CFormInput
                            label="Código"
                            value={form.code}
                            onChange={(e) => handleChange('code', e.target.value)}
                            placeholder="Ej: SAB-001"
                        />
                    </CCol>

                    <CCol md={3}>
                        <CFormInput
                            label="Código de barra"
                            value={form.barcode}
                            onChange={(e) => handleChange('barcode', e.target.value)}
                            placeholder="Opcional"
                        />
                    </CCol>
                </CRow>

                <CRow className="mb-3">
                    <CCol md={3}>
                        <CFormInput
                            label="Nombre"
                            value={form.size}
                            onChange={(e) => handleChange('size', e.target.value)}
                            placeholder="Ej: King, M, 180x200"
                        />
                    </CCol>

                    <CCol md={3}>
                        <CFormInput
                            label="Color"
                            value={form.color}
                            onChange={(e) => handleChange('color', e.target.value)}
                            placeholder="Ej: Blanco"
                        />
                    </CCol>

                    <CCol md={4}>
                        <CFormTextarea
                            label="Descripción"
                            rows={1}
                            value={form.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder="Descripción opcional"
                        />
                    </CCol>
                    <CCol md={2}>
                        <CFormInput
                            label="Valor"
                            type="number"
                            min={0}
                            value={form.value}
                            onChange={(e) => handleChange('value', e.target.value)}
                            placeholder="0"
                        />
                    </CCol>

                    <CCol md={2} className="d-flex align-items-end">
                        <CFormCheck
                            label="Activo"
                            checked={form.active}
                            onChange={(e) => handleChange('active', e.target.checked)}
                        />
                    </CCol>
                </CRow>

                <CRow className="mb-4">
                    <CCol md={12} className="d-flex gap-2">
                        <CButton color="primary" onClick={handleSubmit}>
                            {editingId ? 'Actualizar' : 'Crear'}
                        </CButton>

                        {editingId && (
                            <CButton color="secondary" onClick={handleCancel}>
                                Cancelar
                            </CButton>
                        )}
                    </CCol>
                </CRow>

                <CTable hover responsive>
                    <CTableHead>
                        <CTableRow>
                            <CTableHeaderCell>Tipo</CTableHeaderCell>
                            <CTableHeaderCell>Código</CTableHeaderCell>
                            <CTableHeaderCell>Descripción</CTableHeaderCell>
                            <CTableHeaderCell>Nombre</CTableHeaderCell>
                            <CTableHeaderCell>Color</CTableHeaderCell>
                            <CTableHeaderCell>Barcode</CTableHeaderCell>
                            <CTableHeaderCell>Activo</CTableHeaderCell>
                            <CTableHeaderCell>Valor</CTableHeaderCell>
                            <CTableHeaderCell>Acciones</CTableHeaderCell>
                        </CTableRow>
                    </CTableHead>

                    <CTableBody>
                        {garments.map((garment) => (
                            <CTableRow key={garment.id}>
                                <CTableDataCell>{garment.type?.name || '-'}</CTableDataCell>
                                <CTableDataCell>{garment.code}</CTableDataCell>
                                <CTableDataCell>{garment.description || '-'}</CTableDataCell>
                                <CTableDataCell>{garment.size || '-'}</CTableDataCell>
                                <CTableDataCell>{garment.color || '-'}</CTableDataCell>
                                <CTableDataCell>{garment.barcode || '-'}</CTableDataCell>
                                <CTableDataCell>{garment.active ? 'Sí' : 'No'}</CTableDataCell>
                                <CTableDataCell>
                                    ${Number(garment.value || 0).toLocaleString('es-CL')}
                                </CTableDataCell>
                                <CTableDataCell>
                                    <div className="d-flex gap-2">
                                        <CButton
                                            color="warning"
                                            size="sm"
                                            onClick={() => handleEdit(garment)}
                                        >
                                            Editar
                                        </CButton>

                                        {garment.active && (
                                            <CButton
                                                color="secondary"
                                                size="sm"
                                                onClick={() => handleDeactivate(garment.id)}
                                            >
                                                Desactivar
                                            </CButton>
                                        )}
                                    </div>
                                </CTableDataCell>
                            </CTableRow>
                        ))}
                    </CTableBody>
                </CTable>
            </CCardBody>
        </CCard>
    )
}

export default Garments