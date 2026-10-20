import React, { useState, useEffect } from 'react';
import { Card } from 'react-bootstrap';
import moment from 'moment';
import ReactApexChart from 'react-apexcharts';
import { getFormattedMessage } from '../../shared/sharedMethod';

const CHART_COLORS = ['#1E3A8A', '#0AC074', '#FFB821', '#0099FB', '#F62947', '#6275AD', '#9AA6CA'];

const TopCustomersChart = ( props ) => {
  const { frontSetting, topCustomers, allConfigData, languageCode } = props;
  const month = new Date();
  const currency = frontSetting ? frontSetting.value && frontSetting.value.currency_symbol : ' $'
  const allCustomerNames = topCustomers ? topCustomers.name : [];
  const allCustomerTotals = topCustomers ? topCustomers.grand_total : [];
  const [ series, setSeries ] = useState( [] );
  const [ labels, setLabels ] = useState( [] );

  useEffect( () => {
    if ( allCustomerTotals && allCustomerNames ) {
      setSeries( allCustomerTotals.map( ( value ) => Number( value.toFixed( 2 ) ) ) );
      setLabels( allCustomerNames );
    }
  }, [ topCustomers ] )

  const isCurrencyRight = allConfigData.is_currency_right === 'true';

  const options = {
    chart: {
        fontFamily: 'Poppins, Helvetica, sans-serif',
    },
    labels,
    colors: CHART_COLORS,
    legend: {
        position: 'right',
        markers: { radius: 12 },
    },
    dataLabels: { enabled: false },
    stroke: {
        width: 2,
        colors: ['#fff'],
    },
    tooltip: {
        theme: 'dark',
        y: {
            formatter: (value) => isCurrencyRight ? `${value} ${currency || ''}` : `${currency || ''} ${value}`,
        },
    },
    plotOptions: {
        pie: {
            donut: {
                size: '65%',
            },
        },
    },
  };

  return (
    <div className='col-xxl-4 col-12'>
      <Card>
        <Card.Header className='pb-0 px-0 justify-content-center'>
          <h5 className="mb-0">{getFormattedMessage( 'dashboard.top-customers.title' )} ({moment( month ).locale( languageCode ).format( 'MMMM' )})</h5>
        </Card.Header>
        <Card.Body className='p-3'>
          <ReactApexChart
            options={options}
            series={series}
            type="donut"
            height={400}
          />
        </Card.Body>
      </Card>
    </div>
  )
}

export default TopCustomersChart;
