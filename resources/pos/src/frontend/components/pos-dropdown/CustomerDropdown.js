import React, {useEffect} from 'react';
import Select from 'react-select';
import {connect} from 'react-redux';
import {FiUser, FiUserPlus, FiPhone, FiMail, FiMapPin} from 'react-icons/fi';
import {fetchAllCustomer} from '../../../store/action/customerAction';
import {getFormattedMessage, placeholderText} from '../../../shared/sharedMethod';

const selectStyles = {
    menuPortal: (base) => ({...base, zIndex: 9999}),
};

const CustomerDropDown = (props) => {
    const {setSelectedCustomerOption, selectedCustomerOption, fetchAllCustomer, customers, customerModel} = props;

    const customerOption = customers && customers.map((customer) => {
        return {value: customer.id, label: customer.attributes.name}
    });

    useEffect(() => {
        fetchAllCustomer();
    },[]);

    const onChangeCustomer = (obj) => {
        setSelectedCustomerOption(obj);
    };

    const selected = Array.isArray(selectedCustomerOption) ? selectedCustomerOption[0] : selectedCustomerOption;
    const selectedCustomer = selected && customers && customers.find((customer) => Number(customer.id) === Number(selected.value));
    const info = selectedCustomer ? selectedCustomer.attributes : null;
    const initials = (selected?.label || '').split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase();

    return (
        <div className='xs-field'>
            <label className='xs-field__label'>
                <FiUser/> {getFormattedMessage('customer.title')}
            </label>
            <div className='xs-field__row'>
                <Select
                    className='xs-select'
                    classNamePrefix='xs-select'
                    placeholder={placeholderText('customer.title')}
                    value={selectedCustomerOption}
                    onChange={onChangeCustomer}
                    options={customerOption}
                    menuPortalTarget={document.body}
                    styles={selectStyles}
                    noOptionsMessage={() => getFormattedMessage('no-option.label')}
                />
                <button type='button' className='xs-field__add' onClick={() => customerModel(true)}>
                    <FiUserPlus/>
                    <span>{getFormattedMessage('pos-touch.add-customer.label')}</span>
                </button>
            </div>
            {selected && (
                <div className='xs-customer-card'>
                    <div className='xs-customer-card__avatar'>{initials || <FiUser/>}</div>
                    <div className='xs-customer-card__body'>
                        <div className='xs-customer-card__name'>{selected.label}</div>
                        {info && (
                            <div className='xs-customer-card__meta'>
                                {info.phone && <span><FiPhone/> {info.phone}</span>}
                                {info.email && <span><FiMail/> {info.email}</span>}
                                {info.city && <span><FiMapPin/> {info.city}</span>}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
};

const mapStateToProps = (state) => {
    const {customers} = state;
    return {customers}
};
export default connect(mapStateToProps, {fetchAllCustomer})(CustomerDropDown);
