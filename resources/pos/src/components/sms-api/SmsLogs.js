import React, { useRef, useState } from 'react';
import { connect } from 'react-redux';
import moment from 'moment';
import MasterLayout from '../MasterLayout';
import ReactDataTable from '../../shared/table/ReactDataTable';
import TabTitle from '../../shared/tab-title/TabTitle';
import TopProgressBar from '../../shared/components/loaders/TopProgressBar';
import { getFormattedDate, getFormattedMessage, placeholderText } from '../../shared/sharedMethod';
import { fetchSmsLogs } from '../../store/action/SmsApiAction';

const statusBadge = {
    sent: 'bg-light-success',
    failed: 'bg-light-danger',
    skipped: 'bg-light-warning',
};

const SmsLogs = (props) => {
    const { smsLogs, totalRecord, isLoading, allConfigData, fetchSmsLogs } = props;
    const [status, setStatus] = useState('');
    const lastFilter = useRef({});

    const onChange = (filter) => {
        lastFilter.current = filter;
        fetchSmsLogs(filter, true, status);
    };

    const onStatusChange = (event) => {
        setStatus(event.target.value);
        fetchSmsLogs(lastFilter.current, true, event.target.value);
    };

    const itemsValue = (smsLogs || []).map((log) => ({
        id: log.id,
        date: getFormattedDate(log.created_at, allConfigData),
        time: moment(log.created_at).format('LT'),
        to: log.to,
        message: log.message,
        status: log.status,
        provider: log.provider,
        context_type: log.context_type,
        context_id: log.context_id,
        error: log.error,
    }));

    const columns = [
        {
            name: getFormattedMessage('sms-logs.sent-at.label'),
            sortField: 'created_at',
            sortable: true,
            cell: (row) => (
                <span className='badge bg-light-info'>
                    <div className='mb-1'>{row.time}</div>
                    {row.date}
                </span>
            ),
        },
        {
            name: getFormattedMessage('sms-logs.to.label'),
            selector: (row) => row.to,
            sortField: 'to',
            sortable: false,
        },
        {
            name: getFormattedMessage('sms-logs.message.label'),
            grow: 3,
            cell: (row) => <span className='sms-log-message' title={row.message}>{row.message}</span>,
        },
        {
            name: getFormattedMessage('sms-logs.status.label'),
            cell: (row) => (
                <span className={`badge ${statusBadge[row.status] || 'bg-light-secondary'}`}>
                    {getFormattedMessage(`sms-logs.status.${row.status}`)}
                </span>
            ),
        },
        {
            name: getFormattedMessage('sms-logs.related.label'),
            cell: (row) => (row.context_type
                ? <span>{getFormattedMessage(`sms-logs.type.${row.context_type}`)}{row.context_id ? ` #${row.context_id}` : ''}</span>
                : '-'),
        },
        {
            name: getFormattedMessage('sms-logs.provider.label'),
            selector: (row) => row.provider,
        },
        {
            name: getFormattedMessage('sms-logs.error.label'),
            grow: 2,
            cell: (row) => (row.error ? <span className='text-danger fs-small' title={row.error}>{row.error}</span> : '-'),
        },
    ];

    return (
        <MasterLayout>
            <TopProgressBar />
            <TabTitle title={placeholderText('sms-logs.title')} />
            <div className='d-flex justify-content-end mb-4'>
                <select className='form-select w-auto' value={status} onChange={onStatusChange}
                    aria-label={placeholderText('sms-logs.status.label')}>
                    <option value=''>{placeholderText('sms-logs.status.all')}</option>
                    <option value='sent'>{placeholderText('sms-logs.status.sent')}</option>
                    <option value='failed'>{placeholderText('sms-logs.status.failed')}</option>
                    <option value='skipped'>{placeholderText('sms-logs.status.skipped')}</option>
                </select>
            </div>
            <ReactDataTable
                columns={columns}
                items={itemsValue}
                onChange={onChange}
                isLoading={isLoading}
                totalRows={totalRecord}
                isShowDateRangeField
            />
        </MasterLayout>
    );
};

const mapStateToProps = (state) => {
    const { smsLogs, totalRecord, isLoading, allConfigData } = state;
    return { smsLogs, totalRecord, isLoading, allConfigData };
};

export default connect(mapStateToProps, { fetchSmsLogs })(SmsLogs);
