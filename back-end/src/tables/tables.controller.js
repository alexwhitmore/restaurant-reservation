const service = require('./tables.service');
const asyncErrorBoundary = require('../errors/asyncErrorBoundary');
const reservationService = require('../reservations/reservations.service');

//Middleware
const checkId = async (req, res, next) => {
  const { table_id } = req.params;
  const data = await service.read(table_id);

  if (!data)
    return next({
      status: 404,
      message: `Table Id: ${table_id} cannot be found.`,
    });
  else {
    res.locals.table = data;
    next();
  }
};

const validateUpdate = async (req, res, next) => {
  if (!req.body.data) return next({ status: 400, message: 'Missing data' });

  const { reservation_id } = req.body.data;
  if (!reservation_id)
    return next({ status: 400, message: 'Missing reservation_id' });

  const reservation = await reservationService.read(reservation_id);
  if (!reservation)
    return next({ status: 404, message: `${reservation_id} does not exist` });

  if (reservation.status === 'seated')
    return next({ status: 400, message: 'Already seated' });

  res.locals.reservation = reservation;
  next();
};

const validateTable = async (req, res, next) => {
  if (!req.body.data) return next({ status: 400, message: 'Missing data' });

  const { table_name, capacity, reservation_id } = req.body.data;

  if (!table_name || table_name === '' || table_name.length === 1)
    return next({ status: 400, message: 'Invalid table_name' });

  if (!capacity || capacity < 1 || typeof capacity !== 'number')
    return next({ status: 400, message: 'Invalid capacity' });

  res.locals.newTable = { table_name, capacity };

  if (reservation_id) {
    res.locals.newTable.reservation_id = reservation_id;
    res.locals.newTable.occupied = true;
  }

  next();
};

const validateCapacity = async (req, res, next) => {
  const { table_id } = req.params;
  const table = await service.read(table_id);
  const reservation = res.locals.reservation;

  if (table.capacity < reservation.people)
    return next({
      status: 400,
      message: `${table.table_name} does not have the capacity.`,
    });

  if (table.occupied)
    return next({
      status: 400,
      message: `${table.table_name} is currently occupied.`,
    });

  next();
};

// CRUD functions

const create = async (req, res) => {
  const data = await service.create(res.locals.newTable);
  res.status(201).json({ data: data[0] });
};

const read = async (req, res) => {
  res.json({
    data: res.locals.table,
  });
};

const update = async (req, res) => {
  const data = await service.update(
    req.params.table_id,
    res.locals.reservation.reservation_id
  );
  await reservationService.updateStatus(
    res.locals.reservation.reservation_id,
    'seated'
  );

  res.status(200).json({
    data: data,
  });
};

const destroy = async (req, res, next) => {
  const table = await service.read(req.params.table_id);

  if (!table.occupied)
    return next({ status: 400, message: `${table.table_name} not occupied.` });

  const data = await service.destroy(table.table_id);
  await reservationService.updateStatus(table.reservation_id, 'finished');

  res.status(200).json({
    data: data,
  });
};

const list = async (req, res) => {
  const data = await service.list();
  res.json({ data: data });
};

module.exports = {
  create: [asyncErrorBoundary(validateTable), asyncErrorBoundary(create)],
  read: [asyncErrorBoundary(checkId), asyncErrorBoundary(read)],
  update: [
    asyncErrorBoundary(validateUpdate),
    asyncErrorBoundary(validateCapacity),
    asyncErrorBoundary(update),
  ],
  delete: [asyncErrorBoundary(checkId), asyncErrorBoundary(destroy)],
  list: asyncErrorBoundary(list),
};
