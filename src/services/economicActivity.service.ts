import { apiClient } from "../api/apiClient";

export type EconomicActivity = {
    id: string;
    code: string;
    description: string;
    vat_affected?: string | null;
    tax_category?: string | null;
    internet_available?: string | null;
    active: boolean;
};

export async function getEconomicActivities(search = "") {
    const { data } = await apiClient.get("/economic-activities", {
        params: {
            search,
            limit: 50,
        },
    });

    return data.data as EconomicActivity[];
}