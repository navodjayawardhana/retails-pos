import React, {useEffect} from 'react';
import {connect} from 'react-redux';
import {Card} from 'react-bootstrap';
import DataTable from 'react-data-table-component';
import moment from 'moment';
import {Image} from 'react-bootstrap-v5';
import MasterLayout from '../MasterLayout';
import TabTitle from '../../shared/tab-title/TabTitle';
import HeaderTitle from '../header/HeaderTitle';
import EmployeeLinkButton from '../hrm/employees/EmployeeLinkButton';
import {getAvatarName, placeholderText} from '../../shared/sharedMethod';
import {getFormattedMessage} from '../../shared/sharedMethod';
import {useParams} from 'react-router-dom';
import {fetchUser} from '../../store/action/userAction';
import Spinner from "../../shared/components/loaders/Spinner";
import TopProgressBar from "../../shared/components/loaders/TopProgressBar";
import EmptyComponent from "../empty-component/EmptyComponent";

const UserDetail = (props) => {
    const {users, isLoading, fetchUser} = props;
    const {id} = useParams();
    const result = users.reduce((obj, cur) => ({...obj, [cur.type]: cur}), {});
    const user = result.users;

    useEffect(() => {
        fetchUser(id);
    }, []);

    const detailRows = [
        {
            label: getFormattedMessage('user.input.first-name.label'),
            value: user && user.attributes.first_name,
        },
        {
            label: getFormattedMessage('user.input.last-name.label'),
            value: user && user.attributes.last_name,
        },
        {
            label: getFormattedMessage('user.input.email.label'),
            value: user && user.attributes.email,
        },
        {
            label: getFormattedMessage('user.input.phone-number.label'),
            value: user && user.attributes.phone,
        },
        {
            label: getFormattedMessage('user-details.table.created-on.row.label'),
            value: moment(user && user.attributes.created_at).fromNow(),
        },
    ];

    const detailColumns = [
        {
            name: '',
            selector: (row) => row.label,
        },
        {
            name: '',
            selector: (row) => row.value,
        },
    ];

    return (
        <MasterLayout>
            <TopProgressBar />
            <HeaderTitle title={getFormattedMessage('user-details.title')} to='/app/users' editLink={`/app/users/edit/${id}`}/>
            <TabTitle title={placeholderText('user-details.title')}/>
            {isLoading ? <Spinner /> : <>
                <div>
                    <Card>
                        <Card.Body>
                            <div className='row'>
                                <div className='col-xxl-5 col-12'>
                                    <div
                                        className='d-sm-flex align-items-center mb-5 mb-xxl-0 flex-row text-sm-start'>
                                        <div
                                            className='image image-circle image-lg-small w-100px'>
                                            {user && user.attributes.image ?
                                                <Image src={user.attributes.image} alt='User Profile'
                                                       className='object-fit-cover'/> :
                                                <span className='user_avatar'>
                                                            {getAvatarName(user && user.attributes.first_name + ' ' + user.attributes.last_name)}
                                                        </span>
                                            }
                                        </div>
                                        <div className='ms-0 ms-md-10 mt-5 mt-sm-0'>
                                            <span className='badge bg-light-success mb-2'>Active</span>
                                            <h2> {user && user.attributes.first_name + ' ' + user.attributes.last_name}</h2>
                                            <a href={user && user.attributes.email}
                                               className='text-gray-600 text-decoration-none fs-4'>
                                                {user && user.attributes.email}
                                            </a>
                                            {user && (
                                                <div className='mt-4'>
                                                    <EmployeeLinkButton userId={user.id}
                                                                        employeeId={user.attributes.employee_id}
                                                                        withLabel/>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </div>
                <div className='pt-5'>
                    <Card>
                        <Card.Header as='h5'>{getFormattedMessage('user-details.table.title')}</Card.Header>
                        <Card.Body className='pt-0'>
                            <DataTable
                                columns={detailColumns}
                                data={detailRows}
                                noDataComponent={<EmptyComponent />}
                                pagination={false}
                                noTableHead
                            />
                        </Card.Body>
                    </Card>
                </div>
            </>
            }
        </MasterLayout>
    )
};

const mapStateToProps = state => {
    const {users, isLoading} = state;
    return {users, isLoading}
};

export default connect(mapStateToProps, {fetchUser})(UserDetail);
