const service = require('./reservations.service');
const asyncErrorBoundary = require('../errors/asyncErrorBoundary');

// Middleware
const checkId = async (req, res, next) => {
  const { reservation_id } = req.params;
  const data = await service.read(reservation_id);
  if (!data)
    return next({
      status: 404,
      message: `Reservation Id: ${reservation_id} cannot be found.`,
    });
  else {
    res.locals.reservation = data;
    next();
  }
};

const restaurantHours = (req, res, next) => {
  const time = res.locals.newReservation.reservation_time;
  let hour = time[0] + time[1];
  let minutes = time[3] + time[4];
  hour = Number(hour);
  minutes = Number(minutes);

  if (hour < 10 || (hour <= 10 && minutes < 30))
    return next({ status: 400, message: "We're not open yet" });

  if (hour > 21 || (hour >= 21 && minutes > 30))
    return next({
      status: 400,
      message: 'Too close to closing time or closed!',
    });

  next();
};

const validReservation = async (req, res, next) => {
  if (!req.body) return next({ status: 400, message: 'Missing data' });

  const {
    data: {
      first_name,
      last_name,
      mobile_number,
      reservation_date,
      reservation_time,
      people,
      status,
    } = {},
  } = req.body;

  if (
    !first_name ||
    !last_name ||
    !mobile_number ||
    !reservation_date ||
    !reservation_time ||
    !people
  )
    return next({
      status: 400,
      message:
        'Include: first_name, last_name, mobile_number, people, reservation_date, and reservation_time.',
    });

  let today = new Date();
  if (reservation_date.slice(0, 4) < today.getFullYear()) {
    return next({
      status: 400,
      message: 'Please choose a future date.',
    });
  }

  let day = new Date(reservation_date).getDay() + 1;
  if (day === 2)
    return next({ status: 400, message: 'we are closed on tuesday' });

  if (!reservation_date.match(/\d{4}-\d{2}-\d{2}/))
    return next({ status: 400, message: 'reservation_date is invalid!' });

  if (!reservation_time.match(/\d{2}:\d{2}/))
    return next({ status: 400, message: 'reservation_time is invalid!' });

  if (typeof people !== 'number')
    return next({ status: 400, message: 'people is not a number!' });

  if (status === 'seated')
    return next({ status: 400, message: 'status can not be seated!' });

  if (status === 'finished')
    return next({ status: 400, message: 'status can not be finished!' });

  res.locals.newReservation = {
    first_name,
    last_name,
    mobile_number,
    reservation_date,
    reservation_time,
    people,
  };
  next();
};

const validStatus = async (req, res, next) => {
  const currentStatus = res.locals.reservation.status;
  const { status } = req.body.data;

  if (currentStatus === 'finished')
    return next({
      status: 400,
      message: 'finished reservation cannot be updated',
    });

  if (status === 'cancelled') return next();

  if (status !== 'booked' && status !== 'seated' && status !== 'finished')
    return next({ status: 400, message: 'unknown status' });

  next();
};

const validUpdate = async (req, res, next) => {
  if (!req.body.data) return next({ status: 400, message: 'Missing data' });

  const {
    first_name,
    last_name,
    mobile_number,
    reservation_date,
    reservation_time,
    people,
  } = req.body.data;

  if (
    !first_name ||
    !last_name ||
    !mobile_number ||
    !reservation_date ||
    !reservation_time ||
    !people
  ) {
    return next({
      status: 400,
      message:
        'Include: first_name, last_name, mobile_number, reservation_date, reservation_time, and people',
    });
  }
  if (!reservation_date.match(/\d{4}-\d{2}-\d{2}/)) {
    return next({ status: 400, message: 'invalid reservation_date' });
  }
  if (!reservation_time.match(/\d{2}:\d{2}/)) {
    return next({ status: 400, message: 'invalid reservation_time' });
  }
  if (typeof people !== 'number') {
    return next({ status: 400, message: 'people needs to be a number' });
  }
  res.locals.reservation = {
    first_name,
    last_name,
    mobile_number,
    reservation_date,
    reservation_time,
    people,
  };
  next();
};

// CRUD functions

const create = async (req, res) => {
  const data = await service.create(res.locals.newReservation);
  res.status(201).json({ data: data[0] });
};

const read = async (req, res) => {
  res.status(200).json({
    data: res.locals.reservation,
  });
};

const update = async (req, res, next) => {
  const { reservation_id } = req.params;
  const data = await service.update(reservation_id, res.locals.reservation);
  res.status(200).json({
    data: data[0],
  });
};

const updateStatus = async (req, res) => {
  const { reservation_id } = req.params;
  const status = req.body.data.status;
  const data = await service.updateStatus(reservation_id, status);

  res.status(200).json({
    data: { status: data[0] },
  });
};

const list = async (req, res) => {
  const { date, mobile_number } = req.query;

  if (date) {
    const data = await service.list(date);

    res.json({ data: data });
    return;
  }

  if (mobile_number) {
    const data = await service.listByPhoneNumber(mobile_number);

    res.json({ data: data });
    return;
  } else {
    res.json({ data: [] });
  }
};

module.exports = {
  create: [
    asyncErrorBoundary(validReservation),
    asyncErrorBoundary(restaurantHours),
    asyncErrorBoundary(create),
  ],
  read: [asyncErrorBoundary(checkId), asyncErrorBoundary(read)],
  update: [
    asyncErrorBoundary(checkId),
    asyncErrorBoundary(validUpdate),
    asyncErrorBoundary(update),
  ],
  updateStatus: [
    asyncErrorBoundary(checkId),
    asyncErrorBoundary(validStatus),
    asyncErrorBoundary(updateStatus),
  ],
  list: [asyncErrorBoundary(list)],
};
