const express = require('express');
const router = express.Router();

const roleRoutes = require('./roleRoutes');
const categoryRoutes = require('./categoryRoutes');
const productRoutes = require('./productRoutes');
const cartRoutes = require('./cartRoutes');
const deliveryRoutes = require('./deliveryRoutes');
const orderRoutes = require('./orderRoutes');

router.use('/roles', roleRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/deliveries', deliveryRoutes);
router.use('/orders', orderRoutes);

module.exports = router;
