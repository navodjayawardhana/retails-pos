import {useEffect, useRef, useState} from 'react';
import {useDispatch} from 'react-redux';
import {setLoading} from './loadingAction';
import apiConfig from '../../config/apiConfig';
import {toastType} from '../../constants';
import {addToast} from './toastAction';

// Shared PDF export for reports: `url` already carries the same filters the Excel export uses,
// `key` is the response field holding the generated file URL.
export const reportPdfAction = (url, key, onDone = () => {}, isLoading = true) => async (dispatch) => {
    if (isLoading) {
        dispatch(setLoading(true))
    }
    await apiConfig.get(url)
        .then((response) => {
            window.open(response.data.data[key], '_blank');
        })
        .catch(({response}) => {
            dispatch(addToast(
                {text: response?.data?.message, type: toastType.ERROR}));
        })
        .finally(() => {
            onDone(false);
            if (isLoading) {
                dispatch(setLoading(false))
            }
        });
};

// Returns a click handler for the table's PDF button. The table toolbar is memoised, so the click
// only raises a flag; the request is built after the next render from the current filters.
export const useReportPdf = (buildUrl, key) => {
    const dispatch = useDispatch();
    const [isPdf, setIsPdf] = useState(false);
    const buildUrlRef = useRef(buildUrl);
    buildUrlRef.current = buildUrl;

    useEffect(() => {
        if (isPdf === true) {
            dispatch(reportPdfAction(buildUrlRef.current(), key, setIsPdf));
        }
    }, [isPdf]);

    return () => setIsPdf(true);
};
