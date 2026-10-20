import React, {useEffect} from 'react';
import Select from 'react-select';
import {connect} from 'react-redux';
import {FiHome} from 'react-icons/fi';
import {fetchAllWarehouses} from '../../../store/action/warehouseAction';
import {getFormattedMessage, placeholderText} from '../../../shared/sharedMethod';

const selectStyles = {
    menuPortal: (base) => ({...base, zIndex: 9999}),
};

const WarehouseDropDown = (props) => {
    const {setSelectedOption, selectedOption, warehouses, fetchAllWarehouses} = props;

    const warehouseOption = warehouses && warehouses.map((warehouse) => {
        return {value: warehouse.id, label: warehouse.attributes.name}
    });

    useEffect(() => {
        fetchAllWarehouses();
    },[]);

    const onChangeWarehouse = (obj) => {
        setSelectedOption(obj);
    };

    return (
        <div className='xs-field'>
            <label className='xs-field__label'>
                <FiHome/> {getFormattedMessage('warehouse.title')}
            </label>
            <Select
                className='xs-select'
                classNamePrefix='xs-select'
                placeholder={placeholderText('warehouse.title')}
                value={selectedOption}
                onChange={onChangeWarehouse}
                options={warehouseOption}
                menuPortalTarget={document.body}
                styles={selectStyles}
                noOptionsMessage={() => getFormattedMessage('no-option.label')}
            />
        </div>
    )
};

const mapStateToProps = (state) => {
    const {warehouses} = state;
    return {warehouses}
};
export default connect(mapStateToProps, {fetchAllWarehouses})(WarehouseDropDown);
