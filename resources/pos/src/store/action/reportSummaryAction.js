import { useEffect, useState } from "react";
import apiConfig from "../../config/apiConfig";

const clean = (params = {}) =>
    Object.fromEntries(
        Object.entries(params).filter(
            ([, value]) =>
                value !== undefined &&
                value !== null &&
                value !== "" &&
                value !== "null"
        )
    );

// Fetches KPI cards + chart series for a report screen; refetches whenever
// the report's filters change (pass them in `params`).
export const useReportSummary = (type, params = {}) => {
    const [state, setState] = useState({ loading: true, data: null, error: null });
    const key = JSON.stringify(clean(params));

    useEffect(() => {
        let active = true;
        setState((prev) => ({ ...prev, loading: true, error: null }));
        apiConfig
            .get(`report-summary/${type}`, { params: clean(params) })
            .then((response) => {
                if (active) {
                    setState({ loading: false, data: response.data.data, error: null });
                }
            })
            .catch((error) => {
                if (active) {
                    setState({
                        loading: false,
                        data: null,
                        error: error?.response?.data?.message || "error",
                    });
                }
            });
        return () => {
            active = false;
        };
    }, [type, key]);

    return state;
};
