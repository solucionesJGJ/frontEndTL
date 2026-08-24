import { apiClient } from '../api/apiClient'


export type Vehicle = {
    id: string
    plate: string
    brand?: string | null
    model?: string | null
    year?: number | null
    active: boolean
}


export type VehiclePayload = {
    plate: string
    brand?: string
    model?: string
    year?: number | null
    active?: boolean
}


export async function getVehicles() {
    const { data } =
        await apiClient.get(
            '/vehicles',
        )

    return data.data as Vehicle[]
}


export async function createVehicle(
    payload: VehiclePayload,
) {
    const { data } =
        await apiClient.post(
            '/vehicles',
            payload,
        )

    return data.data as Vehicle
}


export async function updateVehicle(
    id: string,
    payload: VehiclePayload,
) {
    const { data } =
        await apiClient.put(
            `/vehicles/${id}`,
            payload,
        )

    return data.data as Vehicle
}


export async function deactivateVehicle(
    id: string,
) {
    const { data } =
        await apiClient.patch(
            `/vehicles/${id}/deactivate`,
        )

    return data.data as Vehicle
}