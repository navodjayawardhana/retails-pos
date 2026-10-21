import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { useIntl } from 'react-intl';
import { FiCheck, FiSend, FiCreditCard, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { getFormattedMessage, placeholderText } from '../../shared/sharedMethod';
import MasterLayout from '../MasterLayout';
import TabTitle from '../../shared/tab-title/TabTitle';
import {
    fetchSmsApiSetting,
    updateSmsApiSetting,
    sendTestSms,
    checkSmsBalance,
} from '../../store/action/SmsApiAction';

const emptyForm = {
    provider: 'smslenz',
    sms_enabled: false,
    smslenz_user_id: '',
    smslenz_api_key: '',
    smslenz_sender_id: 'SMSlenzDEMO',
    url: '',
    mobile_key: '',
    message_key: '',
    payload: '',
};

const ResultBox = ({ result }) => {
    if (!result) return null;
    return (
        <div className={`sms-result ${result.success ? 'sms-result--ok' : 'sms-result--error'}`}>
            {result.success ? <FiCheckCircle /> : <FiAlertCircle />}
            <div>{result.text}</div>
        </div>
    );
};

const SmsApi = (props) => {
    const { smsApiData, fetchSmsApiSetting, updateSmsApiSetting, sendTestSms, checkSmsBalance } = props;
    const intl = useIntl();
    const [form, setForm] = useState(emptyForm);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testTo, setTestTo] = useState('');
    const [testMessage, setTestMessage] = useState('');
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [checking, setChecking] = useState(false);
    const [balanceResult, setBalanceResult] = useState(null);

    useEffect(() => {
        fetchSmsApiSetting();
    }, []);

    useEffect(() => {
        if (smsApiData && smsApiData.provider) {
            setForm({ ...emptyForm, ...smsApiData, smslenz_api_key: '' });
            setDirty(false);
        }
    }, [smsApiData]);

    useEffect(() => {
        setTestMessage(intl.formatMessage({ id: 'sms-api.test.message.default' }));
    }, []);

    const onChange = (event) => {
        const { name, value, type, checked } = event.target;
        setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
        setDirty(true);
    };

    const onSave = async (event) => {
        event.preventDefault();
        setSaving(true);
        const saved = await updateSmsApiSetting(form);
        setSaving(false);
        if (saved) setDirty(false);
    };

    const onTest = async () => {
        setTesting(true);
        setTestResult(null);
        const response = await sendTestSms({ to: testTo, message: testMessage });
        const pages = response && response.data && response.data.data && response.data.data.pages;
        setTestResult({
            success: !!(response && response.success),
            text: response && response.success && pages
                ? `${response.message} (${pages} ${intl.formatMessage({ id: 'sms-api.result.pages' })})`
                : response && response.message,
        });
        setTesting(false);
    };

    const onBalance = async () => {
        setChecking(true);
        setBalanceResult(null);
        const response = await checkSmsBalance();
        if (response && response.success && response.data) {
            const senders = (response.data.sender_id_balances || [])
                .map((sender) => `${sender.sender_id}: ${sender.allocated_balance}`)
                .join(' · ');
            setBalanceResult({
                success: true,
                text: (
                    <>
                        <strong>{getFormattedMessage('sms-api.balance.label')}: Rs. {response.data.sms_credit_balance}</strong>
                        {response.data.active_plan ? <div>{response.data.active_plan}</div> : null}
                        {senders ? <div>{senders}</div> : null}
                    </>
                ),
            });
        } else {
            setBalanceResult({ success: false, text: response && response.message });
        }
        setChecking(false);
    };

    const isSmslenz = form.provider === 'smslenz';

    return (
        <MasterLayout>
            <TabTitle title={placeholderText('sms-api.title')} />
            <div className='row g-5 sms-api-page'>
                <div className='col-lg-7'>
                    <form className='card' onSubmit={onSave}>
                        <div className='card-header'>
                            <h5 className='mb-0'>{getFormattedMessage('sms-api.section.gateway')}</h5>
                        </div>
                        <div className='card-body'>
                            <div className='sms-toggle mb-6'>
                                <label className='form-check form-switch mb-0'>
                                    <input type='checkbox' className='form-check-input cursor-pointer' name='sms_enabled'
                                        checked={!!form.sms_enabled} onChange={onChange} />
                                </label>
                                <div>
                                    <div className='fw-600'>{getFormattedMessage('sms-api.enabled.label')}</div>
                                    <div className='text-gray-600 fs-small'>{getFormattedMessage('sms-api.enabled.help')}</div>
                                </div>
                            </div>

                            <div className='mb-5'>
                                <label className='form-label'>{getFormattedMessage('sms-api.provider.label')}</label>
                                <select className='form-select' name='provider' value={form.provider} onChange={onChange}>
                                    <option value='smslenz'>{placeholderText('sms-api.provider.smslenz')}</option>
                                    <option value='custom'>{placeholderText('sms-api.provider.custom')}</option>
                                </select>
                            </div>

                            {isSmslenz ? (
                                <>
                                    <p className='text-gray-600 fs-small mb-5'>{getFormattedMessage('sms-api.credentials.help')}</p>
                                    <div className='row'>
                                        <div className='col-md-6 mb-5'>
                                            <label className='form-label'>{getFormattedMessage('sms-api.user-id.label')}<span className='required' /></label>
                                            <input type='text' className='form-control' name='smslenz_user_id' autoComplete='off'
                                                value={form.smslenz_user_id} onChange={onChange} />
                                        </div>
                                        <div className='col-md-6 mb-5'>
                                            <label className='form-label'>{getFormattedMessage('sms-api.sender-id.label')}<span className='required' /></label>
                                            <input type='text' className='form-control' name='smslenz_sender_id' autoComplete='off'
                                                value={form.smslenz_sender_id} onChange={onChange} />
                                            <div className='form-text'>{getFormattedMessage('sms-api.sender-id.help')}</div>
                                        </div>
                                        <div className='col-12 mb-2'>
                                            <label className='form-label'>{getFormattedMessage('sms-api.api-key.label')}<span className='required' /></label>
                                            <input type='password' className='form-control' name='smslenz_api_key' autoComplete='new-password'
                                                placeholder={placeholderText('sms-api.api-key.placeholder')}
                                                value={form.smslenz_api_key} onChange={onChange} />
                                            {smsApiData && smsApiData.smslenz_api_key_set ? (
                                                <div className='form-text sms-key-saved'>
                                                    <FiCheckCircle />
                                                    {intl.formatMessage({ id: 'sms-api.api-key.saved' }, { masked: smsApiData.smslenz_api_key_masked })}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className='text-gray-600 fs-small mb-5'>{getFormattedMessage('sms-api.custom.help')}</p>
                                    <div className='mb-5'>
                                        <label className='form-label'>{getFormattedMessage('url.lable')}</label>
                                        <input type='text' className='form-control' name='url' value={form.url} onChange={onChange} />
                                    </div>
                                    <div className='row'>
                                        <div className='col-md-6 mb-5'>
                                            <label className='form-label'>{getFormattedMessage('mobile.key.lable')}</label>
                                            <input type='text' className='form-control' name='mobile_key' value={form.mobile_key} onChange={onChange} />
                                        </div>
                                        <div className='col-md-6 mb-5'>
                                            <label className='form-label'>{getFormattedMessage('message.key.lable')}</label>
                                            <input type='text' className='form-control' name='message_key' value={form.message_key} onChange={onChange} />
                                        </div>
                                    </div>
                                    <div className='mb-2'>
                                        <label className='form-label'>{getFormattedMessage('sms-api.payload.label')}</label>
                                        <textarea className='form-control font-monospace' rows='5' name='payload' value={form.payload} onChange={onChange} />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className='form-action-bar px-8 pb-6'>
                            <button type='submit' className='btn btn-primary' disabled={!dirty || saving}>
                                <FiCheck />
                                {saving ? placeholderText('globally-saving-btn-label') : placeholderText('globally.save-btn')}
                            </button>
                        </div>
                    </form>
                </div>

                <div className='col-lg-5'>
                    <div className='card'>
                        <div className='card-header'>
                            <h5 className='mb-0'>{getFormattedMessage('sms-api.section.test')}</h5>
                        </div>
                        <div className='card-body'>
                            {dirty ? <p className='text-warning fs-small mb-4'>{getFormattedMessage('sms-api.test.save-first')}</p> : null}
                            <div className='mb-4'>
                                <label className='form-label'>{getFormattedMessage('sms-api.test.to.label')}</label>
                                <input type='text' className='form-control' placeholder='077 123 4567'
                                    value={testTo} onChange={(event) => setTestTo(event.target.value)} />
                            </div>
                            <div className='mb-4'>
                                <label className='form-label'>{getFormattedMessage('sms-api.test.message.label')}</label>
                                <textarea className='form-control' rows='3' maxLength={1500}
                                    value={testMessage} onChange={(event) => setTestMessage(event.target.value)} />
                            </div>
                            <div className='d-flex flex-wrap gap-3'>
                                <button type='button' className='btn btn-primary' onClick={onTest}
                                    disabled={testing || dirty || !testTo.trim() || !testMessage.trim()}>
                                    <FiSend className='me-2' />
                                    {getFormattedMessage('sms-api.test.button')}
                                </button>
                                {isSmslenz ? (
                                    <button type='button' className='btn btn-outline-secondary' onClick={onBalance} disabled={checking || dirty}>
                                        <FiCreditCard className='me-2' />
                                        {getFormattedMessage('sms-api.balance.button')}
                                    </button>
                                ) : null}
                            </div>
                            <ResultBox result={testResult} />
                            <ResultBox result={balanceResult} />
                        </div>
                    </div>
                </div>
            </div>
        </MasterLayout>
    );
};

const mapStateToProps = (state) => {
    const { smsApiData } = state;
    return { smsApiData };
};

export default connect(mapStateToProps, { fetchSmsApiSetting, updateSmsApiSetting, sendTestSms, checkSmsBalance })(SmsApi);
