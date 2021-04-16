import React from 'react';
import { Alert } from 'react-bootstrap';

const NoReservation = () => {
  const show = true;

  const showMessage = () => {
    if (show) {
      return (
        <Alert show={show} variant='info'>
          <Alert.Heading>
            Oh no, there are no reservations on this day!
          </Alert.Heading>
          <hr />
        </Alert>
      );
    }
  };

  return (
    <div className='d-flex justify-content-center mb-5'>
      <div className='mt-5 mb-5' style={{ width: '70%' }}>
        {showMessage()}
      </div>
    </div>
  );
};

export default NoReservation;
