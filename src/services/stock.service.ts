import { apiClient } from '../api/apiClient'

export type StockItem = {
    id: string
    client_id: string
    garment_id: string
    status_id: string
    quantity: number
    client?: {
        id: string
        name: string
        rut: string | null
    }
    garment?: {
        id: string
        code: string
        description?: string | null
        size?: string | null
        color?: string | null
        barcode?: string | null
        type?: {
            id: string
            name: string
        }
    }
    status?: {
        id: string
        code: string
        name: string
        sort_order: number
    }
}

export type StockFilters = {
    client_id?: string
    status_id?: string
    garment_id?: string
}

export async function getStock(filters: StockFilters = {}) {
    const { data } = await apiClient.get('/stock', {
        params: filters,
    })

    return data.data as StockItem[]
}