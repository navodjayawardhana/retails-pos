import React, { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';

const CHART_COLORS = ['#1E3A8A', '#0AC074', '#FFB821', '#0099FB', '#F62947', '#6275AD', '#9AA6CA'];

const TopSellingProductChart = ( props ) => {
  const { yearTopProduct } = props
  const allQuantity = yearTopProduct ? yearTopProduct.total_quantity : [];
  const allName = yearTopProduct ? yearTopProduct.name : [];
  const [ series, setSeries ] = useState( [] );
  const [ labels, setLabels ] = useState( [] );

  useEffect( () => {
    if ( allQuantity && allName ) {
      setSeries( allQuantity.map( ( value ) => Number( value ) ) );
      setLabels( allName );
    }
  }, [ yearTopProduct ] )

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
    <ReactApexChart
      options={options}
      series={series}
      type="donut"
      height={400}
    />
  );
};

export default TopSellingProductChart;
