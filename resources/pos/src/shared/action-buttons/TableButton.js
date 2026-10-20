import React from 'react';
import {Button} from 'react-bootstrap-v5';
import {FiPlus} from 'react-icons/fi';

const TableButton = ({ButtonValue, to}) => {
    return(
        <div className='text-end order-2 mb-2'>
            <Button type='button' variant='primary' href={to} className='table-toolbar__create'>
                <FiPlus/>{ButtonValue}
            </Button>
        </div>
    )
}

export default TableButton;
